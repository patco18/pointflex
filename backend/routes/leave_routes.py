"""
Routes for Leave Management (Leave Types, Balances, Requests)
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from sqlalchemy import or_
from datetime import datetime, date

from backend.middleware.auth import get_current_user, require_admin, require_superadmin_or_admin # A new decorator might be needed
from backend.models.user import User
from backend.models.company import Company
from backend.models.leave_type import LeaveType
from backend.models.leave_balance import LeaveBalance
from backend.models.leave_request import LeaveRequest, calculate_workdays
from backend.database import db
from backend.utils.notification_utils import send_notification

leave_bp = Blueprint('leave_bp', __name__)

# --- Leave Type Management ---
@leave_bp.route('/types', methods=['GET'])
@jwt_required()
def list_leave_types():
    current_user = get_current_user()
    company_id = current_user.company_id

    query = LeaveType.query.filter(LeaveType.is_active == True)
    if company_id:
        # Users see global types AND their company-specific types
        query = query.filter(or_(LeaveType.company_id == None, LeaveType.company_id == company_id))
    else: # Superadmin without a company context sees only global types by default, or can specify
        query = query.filter(LeaveType.company_id == None)
        if request.args.get('include_all_companies_for_superadmin') == 'true' and current_user.role == 'superadmin':
            query = LeaveType.query.filter(LeaveType.is_active == True) # Superadmin sees all if requested

    leave_types = query.all()
    return jsonify([lt.to_dict() for lt in leave_types]), 200

@leave_bp.route('/types', methods=['POST'])
@jwt_required() # require_superadmin_or_admin would be better
def create_leave_type():
    # TODO: Add role check (SuperAdmin or Company Admin)
    current_user = get_current_user()
    data = request.get_json()

    if not data.get('name'):
        return jsonify(message="Leave type name is required."), 400

    company_id_for_type = data.get('company_id')
    if current_user.role == 'admin_rh':
        if company_id_for_type and company_id_for_type != current_user.company_id:
            return jsonify(message="Admin can only create leave types for their own company."), 403
        company_id_for_type = current_user.company_id # Force admin to create for their company
    elif current_user.role != 'superadmin' and company_id_for_type is not None:
         return jsonify(message="Only SuperAdmin can create company-specific types for other companies."), 403


    new_type = LeaveType(
        name=data['name'],
        description=data.get('description'),
        company_id=company_id_for_type, # Null for global, or company_id
        is_paid=data.get('is_paid', True),
        requires_approval=data.get('requires_approval', True),
        is_active=data.get('is_active', True)
    )
    db.session.add(new_type)
    db.session.commit()

    log_user_action(
        action='CREATE_LEAVE_TYPE',
        resource_type='LeaveType',
        resource_id=new_type.id,
        new_values=new_type.to_dict(),
        # company_id might be relevant if this is a company-specific type
        details={'target_company_id': company_id_for_type} if company_id_for_type else {'scope': 'global'}
    )
    # db.session.commit() # Covered by main commit

    try:
        from backend.utils.webhook_utils import dispatch_webhook_event
        dispatch_webhook_event(
            event_type='leave_type.created',
            payload_data=new_type.to_dict(),
            company_id=company_id_for_type # This can be None for global types
        )
    except Exception as webhook_error:
        current_app.logger.error(f"Failed to dispatch leave_type.created webhook for type {new_type.id}: {webhook_error}")

    return jsonify(new_type.to_dict()), 201

# PUT and DELETE for leave types would follow similar logic with role checks.

# --- Employee-facing Leave Request Endpoints ---

@leave_bp.route('/requests', methods=['POST'])
@jwt_required()
def submit_leave_request():
    current_user = get_current_user()
    data = request.get_json()

    required_fields = ['leave_type_id', 'start_date', 'end_date']
    for field in required_fields:
        if field not in data:
            return jsonify(message=f"Field '{field}' is required."), 400

    try:
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify(message="Invalid date format. Use YYYY-MM-DD."), 400

    if start_date > end_date:
        return jsonify(message="Start date cannot be after end date."), 400

    leave_type = LeaveType.query.get(data['leave_type_id'])
    if not leave_type:
        return jsonify(message="Invalid leave type ID."), 404

    # Check company association for leave type
    if leave_type.company_id is not None and leave_type.company_id != current_user.company_id:
        return jsonify(message="This leave type is not available for your company."), 403

    # Calculate requested workdays
    country_code = current_user.company.country if current_user.company and current_user.company.country else 'FR'
    requested_days = calculate_workdays(start_date, end_date, country_code)
    if requested_days <= 0:
        return jsonify(message="Requested leave period contains no workdays or is invalid."), 400

    # Check balance if leave is paid
    if leave_type.is_paid:
        balance = LeaveBalance.query.filter_by(user_id=current_user.id, leave_type_id=leave_type.id).first()
        if not balance or balance.balance_days < requested_days:
            return jsonify(message=f"Insufficient leave balance for {leave_type.name}. Available: {balance.balance_days if balance else 0}, Requested: {requested_days}."), 400

    leave_request = LeaveRequest(
        user_id=current_user.id,
        leave_type_id=data['leave_type_id'],
        start_date=start_date,
        end_date=end_date,
        reason=data.get('reason'),
        status='pending', # Default, can be auto-approved if leave_type.requires_approval is False
        requested_days=requested_days
    )

    if not leave_type.requires_approval:
        leave_request.status = 'approved'
        # Deduct from balance if auto-approved and paid
        if leave_type.is_paid and balance: # balance should exist from check above
            balance.balance_days -= requested_days
            db.session.add(balance)

    db.session.add(leave_request)
    db.session.commit()

    # Notify manager/admin (TODO: determine who to notify)
    # send_notification(manager_id, f"New leave request from {current_user.prenom} {current_user.nom}")

    log_user_action(
        action='SUBMIT_LEAVE_REQUEST',
        resource_type='LeaveRequest',
        resource_id=leave_request.id,
        new_values=leave_request.to_dict(),
        details={'auto_approved': not leave_type.requires_approval}
    )

    # Dispatch webhook event for leave_request.created
    try:
        from backend.utils.webhook_utils import dispatch_webhook_event
        dispatch_webhook_event(
            event_type='leave_request.created',
            payload_data=leave_request.to_dict(),
            company_id=current_user.company_id
        )
    except Exception as webhook_error:
        current_app.logger.error(f"Failed to dispatch leave_request.created webhook for request {leave_request.id}: {webhook_error}")

    return jsonify(leave_request.to_dict()), 201


@leave_bp.route('/requests', methods=['GET'])
@jwt_required()
def get_my_leave_requests():
    current_user = get_current_user()

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status_filter = request.args.get('status')

    query = LeaveRequest.query.filter_by(user_id=current_user.id)
    if status_filter:
        query = query.filter(LeaveRequest.status == status_filter)

    requests_page = query.order_by(LeaveRequest.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'requests': [r.to_dict() for r in requests_page.items],
        'pagination': {
            'page': requests_page.page,
            'per_page': requests_page.per_page,
            'total_pages': requests_page.pages,
            'total_items': requests_page.total
        }
    }), 200

@leave_bp.route('/balances', methods=['GET'])
@jwt_required()
def get_my_leave_balances():
    current_user = get_current_user()
    balances = LeaveBalance.query.filter_by(user_id=current_user.id).join(LeaveType).filter(LeaveType.is_active==True).all()
    return jsonify([b.to_dict() for b in balances]), 200


# --- Admin/Manager Leave Management Endpoints ---

def get_managed_user_ids(manager):
    """
    Placeholder: Determines which user IDs a manager can manage.
    In a real system, this would query a direct_reports table or similar.
    For now, if manager, they can manage users in their own company.
    Admins can manage all in their company. SuperAdmins can manage all.
    """
    if manager.role == 'superadmin':
        # Superadmin can see all users if no specific company filter is applied from request
        # This function might need company_id context if superadmin is acting for a company
        return [u.id for u in User.query.all()]

    if not manager.company_id:
        return [] # No company, no one to manage in this context

    if manager.role == 'admin_rh': # Company Admin sees all in their company
        return [u.id for u in User.query.filter_by(company_id=manager.company_id).all()]

    if manager.role == 'manager':
        # A manager sees their direct reports
        # The 'direct_reports' backref was defined on the User model for the manager relationship
        return [report.id for report in manager.direct_reports]

    return [] # Default to no one if role doesn't fit known management patterns

@leave_bp.route('/admin/requests', methods=['GET'])
@jwt_required() # Should be @require_manager_or_admin or similar
def admin_get_leave_requests():
    current_user = get_current_user()

    if not (current_user.role in ['admin_rh', 'manager', 'superadmin']):
        return jsonify(message="Permission denied."), 403

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status_filter = request.args.get('status')
    user_id_filter = request.args.get('user_id', type=int)
    # Date range filters can be added: start_date_filter, end_date_filter

    query = LeaveRequest.query

    if current_user.role == 'admin_rh' or current_user.role == 'manager':
        if not current_user.company_id:
             return jsonify(requests=[], pagination={}), 200 # No company, no requests to manage

        # Filter by users in the admin/manager's company
        query = query.join(User).filter(User.company_id == current_user.company_id)

        if current_user.role == 'manager':
            managed_ids = get_managed_user_ids(current_user)
            if not managed_ids: # Manager manages no one
                return jsonify(requests=[], pagination={'page': page, 'per_page': per_page, 'total_pages': 0, 'total_items': 0}), 200
            query = query.filter(LeaveRequest.user_id.in_(managed_ids))

    if user_id_filter:
        # Ensure the filtered user_id is within the manager/admin's scope
        is_allowed_to_filter_user = False
        if current_user.role == 'superadmin':
            is_allowed_to_filter_user = True
        elif current_user.role == 'admin_rh':
            user_to_check = User.query.get(user_id_filter)
            if user_to_check and user_to_check.company_id == current_user.company_id:
                is_allowed_to_filter_user = True
        elif current_user.role == 'manager':
            managed_ids = get_managed_user_ids(current_user)
            if user_id_filter in managed_ids:
                is_allowed_to_filter_user = True

        if not is_allowed_to_filter_user:
            return jsonify(message="Vous n'êtes pas autorisé à filtrer par cet ID utilisateur ou l'utilisateur n'est pas géré par vous."), 403
        query = query.filter(LeaveRequest.user_id == user_id_filter)

    if status_filter:
        query = query.filter(LeaveRequest.status == status_filter)

    requests_page = query.order_by(LeaveRequest.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'requests': [r.to_dict() for r in requests_page.items],
        'pagination': {
            'page': requests_page.page,
            'per_page': requests_page.per_page,
            'total_pages': requests_page.pages,
            'total_items': requests_page.total
        }
    }), 200


@leave_bp.route('/admin/requests/<int:request_id>/status', methods=['PUT'])
@jwt_required() # Should be @require_manager_or_admin
def admin_update_leave_request_status(request_id):
    current_user = get_current_user() # This is the approver
    data = request.get_json()

    new_status = data.get('status')
    approver_comments = data.get('approver_comments')

    if not new_status or new_status not in ['approved', 'rejected']:
        return jsonify(message="Invalid status. Must be 'approved' or 'rejected'."), 400

    leave_request = LeaveRequest.query.get_or_404(request_id)
    requester = leave_request.user

    # Permission Check
    if not (current_user.role in ['admin_rh', 'manager', 'superadmin']):
        return jsonify(message="Permission denied."), 403

    if current_user.role != 'superadmin' and requester.company_id != current_user.company_id:
        return jsonify(message="Cannot manage requests for this company."), 403

    if current_user.role == 'manager':
        managed_ids = get_managed_user_ids(current_user)
        if requester.id not in managed_ids:
            return jsonify(message="You do not manage this employee's leave requests."), 403

    if leave_request.status not in ['pending', 'approved']: # Can't reject an already rejected, or re-approve a cancelled.
        return jsonify(message=f"Cannot change status of a request that is already '{leave_request.status}'."), 400

    original_status = leave_request.status
    original_requested_days = leave_request.requested_days # Days originally requested

    leave_request.status = new_status
    leave_request.approved_by_id = current_user.id
    leave_request.approver_comments = approver_comments

    # Balance adjustment
    if leave_request.leave_type.is_paid:
        balance = LeaveBalance.query.filter_by(
            user_id=requester.id,
            leave_type_id=leave_request.leave_type_id
        ).first()

        if not balance: # Should ideally not happen if request was submitted for paid leave
            balance = LeaveBalance(user_id=requester.id, leave_type_id=leave_request.leave_type_id, balance_days=0)
            db.session.add(balance)
            current_app.logger.warning(f"Created missing leave balance for user {requester.id}, type {leave_request.leave_type_id} during approval.")

        if new_status == 'approved':
            # If it was already approved, no change. If it was pending, deduct.
            if original_status == 'pending':
                if balance.balance_days < original_requested_days:
                    # This check should ideally be done again, though it was done at submission
                    db.session.rollback() # Rollback status change
                    return jsonify(message=f"Insufficient balance ({balance.balance_days}) to approve {original_requested_days} days."), 400
                balance.balance_days -= original_requested_days
        elif new_status == 'rejected':
            # If it was previously 'approved', add back the days.
            if original_status == 'approved':
                balance.balance_days += original_requested_days

        db.session.add(balance)

    db.session.add(leave_request)
    db.session.commit()

    # Send notification to employee
    send_notification(
        requester.id,
        f"Your leave request from {leave_request.start_date.strftime('%d/%m')} to {leave_request.end_date.strftime('%d/%m')} has been {new_status}.",
        title="Leave Request Update"
    )

    log_user_action(
        action=f'LEAVE_REQUEST_{new_status.upper()}', # e.g., LEAVE_REQUEST_APPROVED
        resource_type='LeaveRequest',
        resource_id=leave_request.id,
        details={
            'requester_id': requester.id,
            'approver_comments': approver_comments,
            'new_status': new_status,
            'original_status': original_status
        },
        # new_values could be the updated leave_request.to_dict()
        # old_values could be captured before modification if needed, but details cover much of it.
        new_values=leave_request.to_dict()
    )

    # Dispatch webhook for leave_request status update
    webhook_event_type = 'leave_request.approved' if new_status == 'approved' else 'leave_request.rejected'
    try:
        from backend.utils.webhook_utils import dispatch_webhook_event
        dispatch_webhook_event(
            event_type=webhook_event_type,
            payload_data=leave_request.to_dict(), # Contains the new status and approver info
            company_id=requester.company_id
        )
    except Exception as webhook_error:
        current_app.logger.error(f"Failed to dispatch {webhook_event_type} webhook for request {leave_request.id}: {webhook_error}")

    return jsonify(leave_request.to_dict()), 200


@leave_bp.route('/admin/users/<int:user_id>/balances', methods=['GET'])
@jwt_required() # Should be @require_admin or more specific
def admin_get_user_leave_balances(user_id):
    current_user = get_current_user() # This is the admin performing the action
    target_user = User.query.get_or_404(user_id)

    # Permission Check
    if current_user.role == 'superadmin':
        pass # Superadmin can see anyone
    elif current_user.role == 'admin_rh':
        if target_user.company_id != current_user.company_id:
            return jsonify(message="Permission denied. Admin can only view balances for users in their own company."), 403
    elif current_user.role == 'manager':
        managed_ids = get_managed_user_ids(current_user)
        if target_user.id not in managed_ids:
            return jsonify(message="Permission denied. Manager can only view balances for their direct reports."), 403
    else: # Other roles (e.g. employee) cannot access this endpoint for others
        return jsonify(message="Permission denied."), 403


    balances = LeaveBalance.query.filter_by(user_id=target_user.id).join(LeaveType).filter(LeaveType.is_active==True).all()
    return jsonify([b.to_dict() for b in balances]), 200


@leave_bp.route('/admin/users/<int:user_id>/balances', methods=['POST'])
@jwt_required() # Should be @require_admin
def admin_adjust_user_leave_balance(user_id):
    current_admin = get_current_user()
    target_user = User.query.get_or_404(user_id)
    data = request.get_json()

    leave_type_id = data.get('leave_type_id')
    new_balance_days = data.get('balance_days') # The new absolute balance
    adjustment_reason = data.get('reason', 'Administrative adjustment')

    if leave_type_id is None or new_balance_days is None:
        return jsonify(message="Fields 'leave_type_id' and 'balance_days' are required."), 400

    try:
        new_balance_days = float(new_balance_days)
        if new_balance_days < 0:
             return jsonify(message="Balance days cannot be negative."), 400
    except ValueError:
        return jsonify(message="Field 'balance_days' must be a number."), 400

    # Permission Check: Admin for the same company or SuperAdmin (Managers typically don't adjust accruals)
    if not (current_admin.role == 'superadmin' or \
            (current_admin.role == 'admin_rh' and target_user.company_id == current_admin.company_id)):
        return jsonify(message="Permission denied to adjust leave balances."), 403

    leave_type = LeaveType.query.get(leave_type_id)
    if not leave_type:
        return jsonify(message="Invalid leave type ID."), 404

    # Ensure leave type is valid for the target user's company (if applicable)
    if leave_type.company_id is not None and leave_type.company_id != target_user.company_id:
         return jsonify(message=f"Leave type '{leave_type.name}' is not applicable to company '{target_user.company.name if target_user.company else 'N/A'}'."), 403


    balance = LeaveBalance.query.filter_by(user_id=target_user.id, leave_type_id=leave_type.id).first()
    if not balance:
        balance = LeaveBalance(user_id=target_user.id, leave_type_id=leave_type.id)
        db.session.add(balance)
        current_app.logger.info(f"Created new leave balance for user {target_user.id}, type {leave_type.id} during admin adjustment.")

    old_balance_value = balance.balance_days
    balance.balance_days = new_balance_days
    balance.last_updated = datetime.utcnow()

    # Log this adjustment
    log_user_action(
        action='ADJUST_LEAVE_BALANCE',
        resource_type='LeaveBalance',
        resource_id=balance.id, # Log against the balance record ID
        details={
            'target_user_id': target_user.id,
            'leave_type_id': leave_type.id,
            'leave_type_name': leave_type.name,
            'reason': adjustment_reason
        },
        old_values={'balance_days': old_balance_value},
        new_values={'balance_days': new_balance_days}
    )

    try:
        db.session.commit()
        # Notify user? Maybe if it's a significant manual change.
        # send_notification(target_user.id, f"Your leave balance for {leave_type.name} has been updated to {new_balance_days} days.")

        # Dispatch webhook for leave_balance.updated
        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='leave_balance.updated',
                payload_data=balance.to_dict(), # Send the updated balance
                company_id=target_user.company_id
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch leave_balance.updated webhook for balance {balance.id}: {webhook_error}")

        return jsonify(balance.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adjusting leave balance for user {target_user.id}: {e}")
        return jsonify(message="Failed to adjust leave balance."), 500


# TODO: Add a decorator @require_superadmin_or_admin for type creation/management.
# For now, using @jwt_required() and manual role checks.
# def require_superadmin_or_admin(fn):
#     @jwt_required()
#     def wrapper(*args, **kwargs):
#         current_user = get_current_user()
#         if not (current_user.role == 'superadmin' or current_user.role == 'admin_rh'):
#             return jsonify(message="Permission denied."), 403
#         return fn(*args, **kwargs)
#     return wrapper
