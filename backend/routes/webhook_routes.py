"""
Routes for managing Webhook Subscriptions and viewing Delivery Logs
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
import jsonschema  # For validating subscribed_events structure
from datetime import datetime

from backend.middleware.auth import get_current_user, require_admin
from backend.models.company import Company
from backend.models.webhook_subscription import WebhookSubscription
from backend.models.webhook_delivery_log import WebhookDeliveryLog
from backend.database import db

webhook_bp = Blueprint('webhook_bp', __name__)

# Define a list of valid event types your system can emit.
# This should be kept in sync with the events you actually trigger.
VALID_EVENT_TYPES = [
    "user.created", "user.updated", "user.deleted",
    "company.created", "company.updated",
    "pointage.created", "pointage.updated",
    "invoice.created", "invoice.paid", "invoice.payment_failed",
    "subscription.created", "subscription.updated", "subscription.cancelled",
    "leave_request.created", "leave_request.approved", "leave_request.rejected",
    "mission.created", "mission.updated",
    "ping.test"
    # Add more as your system evolves
]

subscribed_events_schema = {
    "type": "array",
    "items": {"type": "string", "enum": VALID_EVENT_TYPES},
    "minItems": 1,
    "uniqueItems": True
}


@webhook_bp.route('/subscriptions', methods=['POST'])
@require_admin # Company admin can manage webhooks for their company
def create_webhook_subscription():
    current_user = get_current_user()
    data = request.get_json()

    target_url = data.get('target_url')
    subscribed_events = data.get('subscribed_events') # Should be a list of event strings

    if not target_url or not subscribed_events:
        return jsonify(message="target_url and subscribed_events are required."), 400

    # Validate target_url format (basic check)
    if not (target_url.startswith('http://') or target_url.startswith('https://')):
        return jsonify(message="Invalid target_url format. Must be http or https."), 400

    # Validate subscribed_events
    try:
        jsonschema.validate(instance=subscribed_events, schema=subscribed_events_schema)
    except jsonschema.exceptions.ValidationError as e:
        return jsonify(message=f"Invalid subscribed_events: {e.message}"), 400

    if not current_user.company_id:
        return jsonify(message="User must be associated with a company to create webhooks."), 400

    subscription = WebhookSubscription(
        company_id=current_user.company_id,
        target_url=target_url
    )
    subscription.subscribed_events = subscribed_events # Use the setter for JSON conversion

    db.session.add(subscription)
    db.session.commit()

    try:
        from backend.middleware.audit import log_user_action
        log_user_action(
            action='CREATE_WEBHOOK_SUBSCRIPTION',
            resource_type='WebhookSubscription',
            resource_id=subscription.id,
            new_values=subscription.to_dict(include_secret=False), # Don't log the secret itself
            details={'target_url': subscription.target_url, 'events': subscription.subscribed_events}
        )
        # db.session.commit() # Covered by main commit
    except Exception as e:
        current_app.logger.error(f"Error logging webhook creation for sub {subscription.id}: {e}")


    # Return the secret only upon creation. It won't be shown again.
    return jsonify(subscription.to_dict(include_secret=True)), 201


@webhook_bp.route('/subscriptions', methods=['GET'])
@require_admin
def list_webhook_subscriptions():
    current_user = get_current_user()
    if not current_user.company_id:
         return jsonify(message="User must be associated with a company."), 400

    subscriptions = WebhookSubscription.query.filter_by(
        company_id=current_user.company_id,
        is_active=True # Optionally filter by active, or add a query param
    ).order_by(WebhookSubscription.created_at.desc()).all()

    # Exclude secret by default when listing
    return jsonify([sub.to_dict(include_secret=False) for sub in subscriptions]), 200


@webhook_bp.route('/subscriptions/<int:sub_id>', methods=['GET'])
@require_admin
def get_webhook_subscription_details(sub_id):
    current_user = get_current_user()
    if not current_user.company_id:
         return jsonify(message="User must be associated with a company."), 400

    subscription = WebhookSubscription.query.get_or_404(sub_id)

    if subscription.company_id != current_user.company_id:
        return jsonify(message="Access to this webhook subscription is denied."), 403

    # Exclude secret by default
    return jsonify(subscription.to_dict(include_secret=False)), 200


@webhook_bp.route('/subscriptions/<int:sub_id>', methods=['PUT'])
@require_admin
def update_webhook_subscription(sub_id):
    current_user = get_current_user()
    if not current_user.company_id:
         return jsonify(message="User must be associated with a company."), 400

    subscription = WebhookSubscription.query.get_or_404(sub_id)

    if subscription.company_id != current_user.company_id:
        return jsonify(message="Access to this webhook subscription is denied."), 403

    data = request.get_json()
    old_values = subscription.to_dict(include_secret=False) # For audit log

    if 'target_url' in data:
        target_url = data['target_url']
        if not (target_url.startswith('http://') or target_url.startswith('https://')):
            return jsonify(message="Invalid target_url format. Must be http or https."), 400
        subscription.target_url = target_url

    if 'subscribed_events' in data:
        subscribed_events = data['subscribed_events']
        try:
            jsonschema.validate(instance=subscribed_events, schema=subscribed_events_schema)
            subscription.subscribed_events = subscribed_events # Use setter for validation/conversion
        except jsonschema.exceptions.ValidationError as e:
            return jsonify(message=f"Invalid subscribed_events: {e.message}"), 400
        except ValueError as e: # From setter if not list or valid JSON string
             return jsonify(message=str(e)), 400


    if 'is_active' in data:
        if not isinstance(data['is_active'], bool):
            return jsonify(message="is_active must be a boolean."), 400
        subscription.is_active = data['is_active']

    try:
        db.session.commit()
        log_user_action(
            action='UPDATE_WEBHOOK_SUBSCRIPTION',
            resource_type='WebhookSubscription',
            resource_id=subscription.id,
            old_values=old_values,
            new_values=subscription.to_dict(include_secret=False)
        )
        return jsonify(subscription.to_dict(include_secret=False)), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating webhook subscription {sub_id}: {e}", exc_info=True)
        return jsonify(message="Failed to update webhook subscription."), 500


@webhook_bp.route('/subscriptions/<int:sub_id>', methods=['DELETE'])
@require_admin
def delete_webhook_subscription(sub_id):
    current_user = get_current_user()
    if not current_user.company_id:
         return jsonify(message="User must be associated with a company."), 400

    subscription = WebhookSubscription.query.get_or_404(sub_id)

    if subscription.company_id != current_user.company_id:
        return jsonify(message="Access to this webhook subscription is denied."), 403

    old_values = subscription.to_dict(include_secret=False) # For audit log

    try:
        # Delivery logs might have a cascade delete due to model relationship,
        # or they might be kept with a nullable subscription_id if preferred (current model cascades).
        db.session.delete(subscription)
        db.session.commit()
        log_user_action(
            action='DELETE_WEBHOOK_SUBSCRIPTION',
            resource_type='WebhookSubscription',
            resource_id=sub_id, # Use sub_id from path as object is deleted
            old_values=old_values
        )
        return jsonify(message="Webhook subscription deleted successfully."), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting webhook subscription {sub_id}: {e}", exc_info=True)
        return jsonify(message="Failed to delete webhook subscription."), 500


@webhook_bp.route('/subscriptions/<int:sub_id>/delivery-logs', methods=['GET'])
@require_admin
def get_webhook_delivery_logs(sub_id):
    current_user = get_current_user()
    if not current_user.company_id:
         return jsonify(message="User must be associated with a company."), 400

    subscription = WebhookSubscription.query.get_or_404(sub_id)
    if subscription.company_id != current_user.company_id:
        return jsonify(message="Access to this webhook subscription's logs is denied."), 403

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100) # Max 100 logs per page

    logs_page = WebhookDeliveryLog.query.filter_by(subscription_id=sub_id)\
        .order_by(WebhookDeliveryLog.attempted_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'logs': [log.to_dict() for log in logs_page.items],
        'pagination': {
            'page': logs_page.page,
            'per_page': logs_page.per_page,
            'total_pages': logs_page.pages,
            'total_items': logs_page.total
        }
    }), 200


@webhook_bp.route('/subscriptions/<int:sub_id>/ping', methods=['POST'])
@require_admin
def ping_webhook_subscription(sub_id):
    current_user = get_current_user()
    if not current_user.company_id:
         return jsonify(message="User must be associated with a company."), 400

    subscription = WebhookSubscription.query.get_or_404(sub_id)
    if subscription.company_id != current_user.company_id:
        return jsonify(message="Access to this webhook subscription is denied."), 403

    if not subscription.is_active:
        return jsonify(message="Cannot ping an inactive webhook subscription."), 400

    try:
        from backend.utils.webhook_utils import dispatch_webhook_event
        from backend.middleware.audit import log_user_action

        test_event_type = "ping.test"
        test_payload = {
            "message": "Webhook test ping from PointFlex.",
            "subscription_id": sub_id,
            "timestamp": datetime.utcnow().isoformat()
        }

        dispatch_webhook_event(
            event_type=test_event_type,
            payload_data=test_payload,
            company_id=subscription.company_id
        )

        log_user_action(
            action='PING_WEBHOOK_SUBSCRIPTION',
            resource_type='WebhookSubscription',
            resource_id=sub_id,
            details={'target_url': subscription.target_url}
        )

        return jsonify(message=f"Test ping event dispatched to {subscription.target_url}. Check delivery logs for status."), 200
    except Exception as e:
        current_app.logger.error(f"Error sending ping for webhook subscription {sub_id}: {e}", exc_info=True)
        return jsonify(message="Failed to send ping test event."), 500
