"""
Routes Admin - Gestion des entreprises
"""

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from middleware.auth import require_admin, require_manager_or_above, get_current_user
from middleware.audit import log_user_action
from models.user import User
from models.company import Company
from models.office import Office
from models.department import Department
from models.service import Service
from models.position import Position
from models.pointage import Pointage
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.platypus import Paragraph, Spacer # Keep only what's directly used here
from reportlab.lib.units import inch # Keep only what's directly used here
# Removed other direct reportlab imports as they are now in pdf_utils
from datetime import datetime
from backend.utils.pdf_utils import build_pdf_document, create_styled_table, get_report_styles, generate_report_title_elements
from database import db
import json
from flask import current_app # Added for FRONTEND_URL

# Import stripe service and mapping (assuming it's moved or accessible)
# For now, direct import, consider refactoring STRIPE_PRICE_TO_PLAN_MAPPING if it grows
from backend.services import stripe_service
from backend.routes.stripe_routes import STRIPE_PRICE_TO_PLAN_MAPPING


admin_bp = Blueprint('admin', __name__)

# Helper to get company for current admin user
def get_admin_company():
    current_user = get_current_user()
    if not current_user.company_id:
        return None, jsonify(message="Aucune entreprise associée à cet utilisateur administrateur"), 400
    company = Company.query.get(current_user.company_id)
    if not company:
        return None, jsonify(message="Entreprise non trouvée"), 404
    return company, None


@admin_bp.route('/subscription', methods=['GET'])
@require_admin
def get_company_subscription():
    """Récupère les informations d'abonnement de l'entreprise et les plans disponibles."""
    company, error_response = get_admin_company()
    if error_response:
        return error_response

    available_plans = []
    for price_id, details in STRIPE_PRICE_TO_PLAN_MAPPING.items():
        available_plans.append({
            "stripe_price_id": price_id,
            "name": details["name"],
            "max_employees": details["max_employees"],
            "amount_eur": details["amount_eur"],
            "interval_months": details["interval_months"],
            "description": f"Plan {details['name'].capitalize()} - {details['amount_eur']}€ / {details['interval_months']} mois, jusqu'à {details['max_employees']} employés."
        })

    # Get frontend URL for constructing success/cancel URLs
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173') # Fallback

    return jsonify({
        "subscription_plan": company.subscription_plan,
        "subscription_status": company.subscription_status,
        "subscription_start": company.subscription_start.isoformat() if company.subscription_start else None,
        "subscription_end": company.subscription_end.isoformat() if company.subscription_end else None,
        "stripe_customer_id": company.stripe_customer_id,
        "stripe_subscription_id": company.stripe_subscription_id,
        "active_stripe_price_id": company.active_stripe_price_id,
        "max_employees": company.max_employees,
        "can_add_employee": company.can_add_employee,
        "available_plans": available_plans,
        "billing_portal_enabled": bool(company.stripe_customer_id) # Enable portal link if customer ID exists
    }), 200


@admin_bp.route('/subscription/checkout-session', methods=['POST'])
@require_admin
def create_company_subscription_checkout_session():
    """Crée une session de checkout Stripe pour un abonnement."""
    company, error_response = get_admin_company()
    if error_response:
        return error_response

    data = request.get_json()
    stripe_price_id = data.get('stripe_price_id')

    if not stripe_price_id or stripe_price_id not in STRIPE_PRICE_TO_PLAN_MAPPING:
        return jsonify(message="ID de plan Stripe (stripe_price_id) valide requis."), 400

    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
    # Define success and cancel URLs for Stripe Checkout
    # These URLs should be pages on your frontend that handle the result
    success_url = f"{frontend_url}/company/billing?session_id={{CHECKOUT_SESSION_ID}}&status=success"
    cancel_url = f"{frontend_url}/company/billing?status=cancel"

    try:
        # The get_or_create_stripe_customer within create_subscription_checkout_session
        # might set company.stripe_customer_id. We need to commit this.
        initial_stripe_customer_id = company.stripe_customer_id

        session = stripe_service.create_subscription_checkout_session(
            company=company,
            stripe_price_id=stripe_price_id,
            success_url=success_url,
            cancel_url=cancel_url
        )

        # If stripe_customer_id was newly created, commit it to the database.
        if company.stripe_customer_id and company.stripe_customer_id != initial_stripe_customer_id:
            try:
                db.session.add(company) # Add company to session if it wasn't already
                db.session.commit()
                current_app.logger.info(f"Committed new Stripe Customer ID {company.stripe_customer_id} for company {company.id}")
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Failed to commit new Stripe Customer ID for company {company.id}: {e}")
                # Don't fail the whole request, session might still be usable, but log error.
                # Or decide to return an error if this commit is critical before redirect.

        return jsonify({'checkout_session_id': session.id, 'checkout_url': session.url}), 200

    except stripe.error.StripeError as e:
        current_app.logger.error(f"Stripe API error for company {company.id}: {e}")
        return jsonify(message=f"Erreur Stripe: {str(e)}"), 500
    except RuntimeError as e: # For "Stripe package not available"
        current_app.logger.error(f"Stripe runtime error for company {company.id}: {e}")
        return jsonify(message=str(e)), 500
    except Exception as e:
        current_app.logger.error(f"Error creating checkout session for company {company.id}: {e}")
        db.session.rollback() # Rollback if any db change was attempted (like stripe_customer_id)
        return jsonify(message="Erreur interne du serveur lors de la création de la session de paiement."), 500


@admin_bp.route('/subscription/customer-portal', methods=['POST'])
@require_admin
def create_company_customer_portal_session():
    """Crée une session de portail client Stripe."""
    company, error_response = get_admin_company()
    if error_response:
        return error_response

    if not company.stripe_customer_id:
        return jsonify(message="Aucun client Stripe associé à cette entreprise. Veuillez d'abord souscrire à un plan."), 400

    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
    # Define return URL for Stripe Customer Portal
    return_url = f"{frontend_url}/company/billing"

    try:
        portal_session = stripe_service.create_customer_portal_session(
            stripe_customer_id=company.stripe_customer_id,
            return_url=return_url
        )
        return jsonify({'portal_url': portal_session.url}), 200
    except stripe.error.StripeError as e:
        current_app.logger.error(f"Stripe API error creating portal for company {company.id}: {e}")
        return jsonify(message=f"Erreur Stripe: {str(e)}"), 500
    except ValueError as e: # For missing customer ID
        current_app.logger.error(f"ValueError creating portal for company {company.id}: {e}")
        return jsonify(message=str(e)), 400
    except RuntimeError as e: # For "Stripe package not available"
        current_app.logger.error(f"Stripe runtime error for company {company.id}: {e}")
        return jsonify(message=str(e)), 500
    except Exception as e:
        current_app.logger.error(f"Error creating customer portal for company {company.id}: {e}")
        return jsonify(message="Erreur interne du serveur lors de la création du portail client."), 500


@admin_bp.route('/employees', methods=['GET'])
@require_manager_or_above
def get_employees():
    """Récupère les employés de l'entreprise"""
    try:
        current_user = get_current_user()
        
        # SuperAdmin peut voir tous les utilisateurs
        if current_user.role == 'superadmin':
            query = User.query
        else:
            # Admin d'entreprise ne voit que ses employés
            query = User.query.filter_by(company_id=current_user.company_id)
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        employees = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'employees': [emp.to_dict() for emp in employees.items],
            'pagination': {
                'page': page,
                'pages': employees.pages,
                'per_page': per_page,
                'total': employees.total
            }
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des employés: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/employees', methods=['POST'])
@require_admin
def create_employee():
    """Crée un nouvel employé"""
    try:
        data = request.get_json()
        current_user = get_current_user()
        
        # Validation des données requises
        required_fields = ['email', 'nom', 'prenom', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify(message=f"Le champ {field} est requis"), 400
        
        # Vérifier si l'email existe déjà
        if User.query.filter_by(email=data['email']).first():
            return jsonify(message="Un utilisateur avec cet email existe déjà"), 409
        
        # Déterminer l'entreprise
        if current_user.role == 'superadmin':
            company_id = data.get('company_id')
        else:
            company_id = current_user.company_id
        
        # Vérifier les limites de l'entreprise
        if company_id:
            company = Company.query.get(company_id)
            if company and not company.can_add_employee:
                return jsonify(message="Limite d'employés atteinte pour cette entreprise"), 409
        
        # Créer l'employé
        employee = User(
            email=data['email'],
            nom=data['nom'],
            prenom=data['prenom'],
            role=data.get('role', 'employee'),
            company_id=company_id,
            phone=data.get('phone'),
            password=data['password']
        )
        
        db.session.add(employee)
        db.session.flush()  # Pour obtenir l'ID
        
        # Logger l'action
        log_user_action(
            action='CREATE',
            resource_type='User',
            resource_id=employee.id,
            new_values=employee.to_dict()
        )
        
        db.session.commit()

        # Dispatch webhook event for user creation
        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='user.created',
                payload_data=employee.to_dict(include_sensitive=False), # Avoid sending sensitive data like password hash
                company_id=employee.company_id
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch user.created webhook for user {employee.id}: {webhook_error}")
            # Do not fail the main request if webhook dispatch fails

        return jsonify({
            'message': 'Employé créé avec succès',
            'employee': employee.to_dict()
        }), 201
        
    except Exception as e:
        print(f"Erreur lors de la création de l'employé: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/employees/<int:employee_id>', methods=['PUT'])
@require_admin
def update_employee(employee_id):
    """Met à jour un employé"""
    try:
        current_user = get_current_user()
        employee = User.query.get_or_404(employee_id)
        
        # Vérifier les permissions
        if current_user.role != 'superadmin' and employee.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403
        
        data = request.get_json()
        
        # Sauvegarder les anciennes valeurs pour l'audit
        old_values = employee.to_dict()
        
        # Mettre à jour les champs
        updatable_fields = ['nom', 'prenom', 'phone', 'role', 'is_active']
        
        for field in updatable_fields:
            if field in data:
                setattr(employee, field, data[field])
        
        # Changer le mot de passe si fourni
        if data.get('password'):
            employee.set_password(data['password'])
        
        # Logger l'action
        log_user_action(
            action='UPDATE',
            resource_type='User',
            resource_id=employee.id,
            old_values=old_values,
            new_values=employee.to_dict()
        )
        
        db.session.commit()

        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='user.updated',
                payload_data=employee.to_dict(include_sensitive=False),
                company_id=employee.company_id
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch user.updated webhook for user {employee.id}: {webhook_error}")

        return jsonify({
            'message': 'Employé mis à jour avec succès',
            'employee': employee.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour de l'employé: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/employees/<int:employee_id>', methods=['DELETE'])
@require_admin
def delete_employee(employee_id):
    """Supprime un employé"""
    try:
        current_user = get_current_user()
        employee = User.query.get_or_404(employee_id)
        
        # Vérifier les permissions
        if current_user.role != 'superadmin' and employee.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403
        
        # Empêcher la suppression de soi-même
        if employee.id == current_user.id:
            return jsonify(message="Vous ne pouvez pas vous supprimer vous-même"), 409
        
        # Sauvegarder pour l'audit
        old_values = employee.to_dict()
        
        # Logger l'action avant suppression
        log_user_action(
            action='DELETE',
            resource_type='User',
            resource_id=employee.id,
            old_values=old_values
        )
        
        db.session.delete(employee)
        db.session.commit()

        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='user.deleted',
                # old_values contains the state of the user before deletion
                payload_data=old_values, # Send the data of the deleted user
                company_id=old_values.get('company_id') # Get company_id from the old data
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch user.deleted webhook for user ID {employee_id}: {webhook_error}")
        
        return jsonify(message="Employé supprimé avec succès"), 200
        
    except Exception as e:
        print(f"Erreur lors de la suppression de l'employé: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/organization-data', methods=['GET'])
@require_admin
def get_organization_data():
    """Récupère les données organisationnelles (départements, services, etc.)"""
    try:
        current_user = get_current_user()

        if current_user.role == 'superadmin':
            departments = Department.query.all()
            services = Service.query.all()
            positions = Position.query.all()
        else:
            departments = Department.query.filter_by(company_id=current_user.company_id).all()
            services = Service.query.filter_by(company_id=current_user.company_id).all()
            positions = Position.query.filter_by(company_id=current_user.company_id).all()

        return jsonify({
            'departments': [d.to_dict() for d in departments],
            'services': [s.to_dict() for s in services],
            'positions': [p.to_dict() for p in positions]
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des données organisationnelles: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/departments', methods=['GET'])
@require_admin
def get_departments():
    """Liste les départements de l'entreprise."""
    try:
        current_user = get_current_user()
        if current_user.role == 'superadmin':
            departments = Department.query.all()
        else:
            departments = Department.query.filter_by(company_id=current_user.company_id).all()
        return jsonify({'departments': [d.to_dict() for d in departments]}), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des départements: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/departments', methods=['POST'])
@require_admin
def create_department():
    """Crée un département."""
    try:
        data = request.get_json()
        current_user = get_current_user()

        if current_user.role == 'superadmin':
            company_id = data.get('company_id')
            if not company_id:
                return jsonify(message="company_id requis"), 400
        else:
            company_id = current_user.company_id

        department = Department(
            company_id=company_id,
            name=data.get('name'),
            description=data.get('description'),
            manager_name=data.get('manager_name'),
            is_active=data.get('is_active', True),
        )
        db.session.add(department)
        db.session.flush()

        log_user_action(
            action='CREATE',
            resource_type='Department',
            resource_id=department.id,
            new_values=department.to_dict(),
        )

        db.session.commit()
        return jsonify({'department': department.to_dict(), 'message': 'Département créé'}), 201
    except Exception as e:
        print(f"Erreur lors de la création du département: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/departments/<int:department_id>', methods=['PUT'])
@require_admin
def update_department(department_id):
    """Met à jour un département."""
    try:
        department = Department.query.get_or_404(department_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and department.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        data = request.get_json()
        old = department.to_dict()
        for field in ['name', 'description', 'manager_name', 'is_active']:
            if field in data:
                setattr(department, field, data[field])

        log_user_action(
            action='UPDATE',
            resource_type='Department',
            resource_id=department.id,
            old_values=old,
            new_values=department.to_dict(),
        )

        db.session.commit()
        return jsonify({'department': department.to_dict(), 'message': 'Département mis à jour'}), 200
    except Exception as e:
        print(f"Erreur lors de la mise à jour du département: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/departments/<int:department_id>', methods=['DELETE'])
@require_admin
def delete_department(department_id):
    """Supprime un département."""
    try:
        department = Department.query.get_or_404(department_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and department.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        old = department.to_dict()
        log_user_action(
            action='DELETE',
            resource_type='Department',
            resource_id=department.id,
            old_values=old,
        )
        db.session.delete(department)
        db.session.commit()
        return jsonify(message='Département supprimé'), 200
    except Exception as e:
        print(f"Erreur lors de la suppression du département: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/services', methods=['GET'])
@require_admin
def get_services():
    """Liste les services."""
    try:
        current_user = get_current_user()
        query = Service.query
        if current_user.role != 'superadmin':
            query = query.filter_by(company_id=current_user.company_id)
        department_id = request.args.get('department_id', type=int)
        if department_id:
            query = query.filter_by(department_id=department_id)
        services = query.all()
        return jsonify({'services': [s.to_dict() for s in services]}), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des services: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/services', methods=['POST'])
@require_admin
def create_service():
    """Crée un service."""
    try:
        data = request.get_json()
        current_user = get_current_user()

        if current_user.role == 'superadmin':
            company_id = data.get('company_id')
            if not company_id:
                return jsonify(message="company_id requis"), 400
        else:
            company_id = current_user.company_id

        service = Service(
            company_id=company_id,
            department_id=data.get('department_id'),
            name=data.get('name'),
            description=data.get('description'),
            manager_name=data.get('manager_name'),
            is_active=data.get('is_active', True),
        )
        db.session.add(service)
        db.session.flush()

        log_user_action(
            action='CREATE',
            resource_type='Service',
            resource_id=service.id,
            new_values=service.to_dict(),
        )

        db.session.commit()
        return jsonify({'service': service.to_dict(), 'message': 'Service créé'}), 201
    except Exception as e:
        print(f"Erreur lors de la création du service: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/services/<int:service_id>', methods=['PUT'])
@require_admin
def update_service(service_id):
    """Met à jour un service."""
    try:
        service = Service.query.get_or_404(service_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and service.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        data = request.get_json()
        old = service.to_dict()
        for field in ['name', 'description', 'manager_name', 'department_id', 'is_active']:
            if field in data:
                setattr(service, field, data[field])

        log_user_action(
            action='UPDATE',
            resource_type='Service',
            resource_id=service.id,
            old_values=old,
            new_values=service.to_dict(),
        )

        db.session.commit()
        return jsonify({'service': service.to_dict(), 'message': 'Service mis à jour'}), 200
    except Exception as e:
        print(f"Erreur lors de la mise à jour du service: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/services/<int:service_id>', methods=['DELETE'])
@require_admin
def delete_service(service_id):
    """Supprime un service."""
    try:
        service = Service.query.get_or_404(service_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and service.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        old = service.to_dict()
        log_user_action(
            action='DELETE',
            resource_type='Service',
            resource_id=service.id,
            old_values=old,
        )
        db.session.delete(service)
        db.session.commit()
        return jsonify(message='Service supprimé'), 200
    except Exception as e:
        print(f"Erreur lors de la suppression du service: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/positions', methods=['GET'])
@require_admin
def get_positions():
    """Liste les postes."""
    try:
        current_user = get_current_user()
        if current_user.role == 'superadmin':
            positions = Position.query.all()
        else:
            positions = Position.query.filter_by(company_id=current_user.company_id).all()
        return jsonify({'positions': [p.to_dict() for p in positions]}), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des postes: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/positions', methods=['POST'])
@require_admin
def create_position():
    """Crée un poste."""
    try:
        data = request.get_json()
        current_user = get_current_user()

        if current_user.role == 'superadmin':
            company_id = data.get('company_id')
            if not company_id:
                return jsonify(message="company_id requis"), 400
        else:
            company_id = current_user.company_id

        position = Position(
            company_id=company_id,
            name=data.get('name'),
            description=data.get('description'),
            level=data.get('level'),
            salary_min=data.get('salary_min'),
            salary_max=data.get('salary_max'),
            requirements=data.get('requirements'),
            is_active=data.get('is_active', True),
        )
        db.session.add(position)
        db.session.flush()

        log_user_action(
            action='CREATE',
            resource_type='Position',
            resource_id=position.id,
            new_values=position.to_dict(),
        )

        db.session.commit()
        return jsonify({'position': position.to_dict(), 'message': 'Poste créé'}), 201
    except Exception as e:
        print(f"Erreur lors de la création du poste: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/positions/<int:position_id>', methods=['PUT'])
@require_admin
def update_position(position_id):
    """Met à jour un poste."""
    try:
        position = Position.query.get_or_404(position_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and position.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        data = request.get_json()
        old = position.to_dict()
        for field in ['name', 'description', 'level', 'salary_min', 'salary_max', 'requirements', 'is_active']:
            if field in data:
                setattr(position, field, data[field])

        log_user_action(
            action='UPDATE',
            resource_type='Position',
            resource_id=position.id,
            old_values=old,
            new_values=position.to_dict(),
        )

        db.session.commit()
        return jsonify({'position': position.to_dict(), 'message': 'Poste mis à jour'}), 200
    except Exception as e:
        print(f"Erreur lors de la mise à jour du poste: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/positions/<int:position_id>', methods=['DELETE'])
@require_admin
def delete_position(position_id):
    """Supprime un poste."""
    try:
        position = Position.query.get_or_404(position_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and position.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        old = position.to_dict()
        log_user_action(
            action='DELETE',
            resource_type='Position',
            resource_id=position.id,
            old_values=old,
        )
        db.session.delete(position)
        db.session.commit()
        return jsonify(message='Poste supprimé'), 200
    except Exception as e:
        print(f"Erreur lors de la suppression du poste: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/offices', methods=['GET'])
@require_admin
def get_offices():
    """Récupère les bureaux de l'entreprise"""
    try:
        current_user = get_current_user()
        
        # SuperAdmin peut voir tous les bureaux
        if current_user.role == 'superadmin':
            offices = Office.query.all()
        else:
            # Admin d'entreprise ne voit que ses bureaux
            offices = Office.query.filter_by(company_id=current_user.company_id).all()
        
        return jsonify({
            'offices': [office.to_dict() for office in offices]
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des bureaux: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/offices', methods=['POST'])
@require_admin
def create_office():
    """Crée un nouveau bureau"""
    try:
        data = request.get_json()
        current_user = get_current_user()
        
        # Validation des données requises
        required_fields = ['name', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data:
                return jsonify(message=f"Le champ {field} est requis"), 400
        
        # Déterminer l'entreprise
        if current_user.role == 'superadmin':
            company_id = data.get('company_id')
            if not company_id:
                return jsonify(message="L'ID de l'entreprise est requis pour un SuperAdmin"), 400
        else:
            company_id = current_user.company_id
        
        # Traiter les amenities pour s'assurer qu'elles sont stockées comme JSON
        amenities = data.get('amenities')
        if amenities and not isinstance(amenities, str):
            amenities = json.dumps(amenities)
        
        # Créer le bureau
        office = Office(
            company_id=company_id,
            name=data['name'],
            address=data.get('address'),
            city=data.get('city'),
            country=data.get('country'),
            latitude=data['latitude'],
            longitude=data['longitude'],
            radius=data.get('radius', 100),
            timezone=data.get('timezone', 'Europe/Paris'),
            capacity=data.get('capacity'),
            amenities=amenities,
            manager_name=data.get('manager_name'),
            phone=data.get('phone'),
            is_active=data.get('is_active', True),
            is_main=data.get('is_main', False)
        )
        
        db.session.add(office)
        db.session.flush()  # Pour obtenir l'ID
        
        # Logger l'action
        log_user_action(
            action='CREATE',
            resource_type='Office',
            resource_id=office.id,
            new_values=office.to_dict()
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Bureau créé avec succès',
            'office': office.to_dict()
        }), 201
        
    except Exception as e:
        print(f"Erreur lors de la création du bureau: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/offices/<int:office_id>', methods=['PUT'])
@require_admin
def update_office(office_id):
    """Met à jour un bureau"""
    try:
        current_user = get_current_user()
        office = Office.query.get_or_404(office_id)
        
        # Vérifier les permissions
        if current_user.role != 'superadmin' and office.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403
        
        data = request.get_json()
        
        # Sauvegarder les anciennes valeurs pour l'audit
        old_values = office.to_dict()
        
        # Traiter les amenities pour s'assurer qu'elles sont stockées comme JSON
        if 'amenities' in data and not isinstance(data['amenities'], str):
            data['amenities'] = json.dumps(data['amenities'])
        
        # Mettre à jour les champs
        updatable_fields = [
            'name', 'address', 'city', 'country', 'latitude', 'longitude',
            'radius', 'timezone', 'capacity', 'amenities', 'manager_name',
            'phone', 'is_active', 'is_main'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(office, field, data[field])
        
        # Logger l'action
        log_user_action(
            action='UPDATE',
            resource_type='Office',
            resource_id=office.id,
            old_values=old_values,
            new_values=office.to_dict()
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Bureau mis à jour avec succès',
            'office': office.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour du bureau: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/offices/<int:office_id>', methods=['DELETE'])
@require_admin
def delete_office(office_id):
    """Supprime un bureau"""
    try:
        current_user = get_current_user()
        office = Office.query.get_or_404(office_id)
        
        # Vérifier les permissions
        if current_user.role != 'superadmin' and office.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403
        
        # Sauvegarder pour l'audit
        old_values = office.to_dict()
        
        # Logger l'action avant suppression
        log_user_action(
            action='DELETE',
            resource_type='Office',
            resource_id=office.id,
            old_values=old_values
        )
        
        db.session.delete(office)
        db.session.commit()
        
        return jsonify(message="Bureau supprimé avec succès"), 200
        
    except Exception as e:
        print(f"Erreur lors de la suppression du bureau: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/company/settings', methods=['GET'])
@require_admin
def get_company_settings():
    """Récupère les paramètres de l'entreprise"""
    current_user = get_current_user()

    if not current_user.company_id:
        return jsonify(message="Aucune entreprise associée à cet utilisateur"), 400

    company = Company.query.get_or_404(current_user.company_id)

    return jsonify({'company': company.to_dict(include_sensitive=True)}), 200


@admin_bp.route('/company/settings', methods=['PUT'])
@require_admin
def update_company_settings():
    """Met à jour les paramètres de l'entreprise"""
    try:
        current_user = get_current_user()
        
        # Vérifier que l'utilisateur a une entreprise
        if not current_user.company_id:
            return jsonify(message="Aucune entreprise associée à cet utilisateur"), 400
        
        company = Company.query.get_or_404(current_user.company_id)
        data = request.get_json()
        
        # Sauvegarder les anciennes valeurs pour l'audit
        old_values = company.to_dict()
        
        # Mettre à jour les champs
        updatable_fields = [
            'office_latitude', 'office_longitude', 'office_radius',
            'work_start_time', 'late_threshold', 'logo_url', 'theme_color'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(company, field, data[field])
        
        # Logger l'action
        log_user_action(
            action='UPDATE_COMPANY_SETTINGS',
            resource_type='Company',
            resource_id=company.id,
            old_values=old_values,
            new_values=company.to_dict()
        )
        
        db.session.commit()

        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='company.updated', # Or more specific like 'company.settings_updated'
                payload_data=company.to_dict(include_sensitive=False), # Send updated, non-sensitive company data
                company_id=company.id
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch company.updated webhook for company {company.id} after settings update: {webhook_error}")

        return jsonify({
            'message': 'Paramètres de l\'entreprise mis à jour avec succès',
            'company': company.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour des paramètres: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/stats', methods=['GET'])
@require_admin
def get_company_stats():
    """Récupère les statistiques de l'entreprise"""
    try:
        current_user = get_current_user()
        
        # Vérifier que l'utilisateur a une entreprise
        if not current_user.company_id:
            return jsonify(message="Aucune entreprise associée à cet utilisateur"), 400
        
        company = Company.query.get_or_404(current_user.company_id)
        
        # Récupérer les statistiques
        total_employees = User.query.filter_by(company_id=company.id).count()
        active_employees = User.query.filter_by(company_id=company.id, is_active=True).count()
        
        # Statistiques simulées pour la démo
        stats = {
            'total_employees': total_employees,
            'active_employees': active_employees,
            'departments': 5,  # Simulé
            'services': 12,    # Simulé
            'offices': Office.query.filter_by(company_id=company.id).count(),
            'attendance_rate': 94.5,  # Simulé
            'retention_rate': 97.2,   # Simulé
            'growth_rate': 12.5       # Simulé
        }
        
        return jsonify({
            'stats': stats
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des statistiques: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/attendance-report/pdf', methods=['GET'])
@require_admin
def attendance_report_pdf():
    """Génère un rapport PDF détaillé des pointages de l'entreprise."""
    try:
        current_user = get_current_user()
        company_id = current_user.company_id

        if not company_id:
            return jsonify(message="Aucune entreprise associée"), 400

        company = Company.query.get(company_id)
        if not company:
            return jsonify(message="Entreprise non trouvée"), 404

        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        query = Pointage.query.join(User).filter(User.company_id == company_id)

        date_filter_text = "toutes périodes"
        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage.between(start_date, end_date))
            date_filter_text = f"du {start_date.strftime('%d/%m/%Y')} au {end_date.strftime('%d/%m/%Y')}"
        elif start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage >= start_date)
            date_filter_text = f"à partir du {start_date.strftime('%d/%m/%Y')}"
        elif end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage <= end_date)
            date_filter_text = f"jusqu'au {end_date.strftime('%d/%m/%Y')}"

        pointages = query.order_by(User.nom, User.prenom, Pointage.date_pointage, Pointage.heure_arrivee).all()

        buffer = BytesIO()
        styles = get_report_styles() # Get styles from pdf_utils

        story = generate_report_title_elements(
            title_str="Rapport de Présence",
            period_str=date_filter_text,
            company_name=company.name
        )

        if not pointages:
            story.append(Paragraph("Aucun pointage trouvé pour la période sélectionnée.", styles['Normal']))
        else:
            table_data = [
                # Header Row - Using Paragraphs for potential styling and consistency
                [
                    Paragraph("Employé", styles['SmallText']),
                    Paragraph("Date", styles['SmallText']),
                    Paragraph("Arrivée", styles['SmallText']),
                    Paragraph("Départ", styles['SmallText']),
                    Paragraph("Durée (H)", styles['SmallText']),
                    Paragraph("Type", styles['SmallText']),
                    Paragraph("Retard (min)", styles['SmallText']),
                    Paragraph("Commentaire", styles['SmallText'])
                ]
            ]

            for p in pointages:
                user_name = f"{p.user.prenom} {p.user.nom}" if p.user else str(p.user_id)
                heure_arrivee_str = p.heure_arrivee.strftime('%H:%M') if p.heure_arrivee else "N/A"
                heure_depart_str = p.heure_depart.strftime('%H:%M') if p.heure_depart else "N/A"

                duration_hours_str = ""
                if p.heure_arrivee and p.heure_depart:
                    try:
                        # Ensure date_pointage is a date object, heure_arrivee/depart are time objects
                        datetime_arrivee = datetime.combine(p.date_pointage, p.heure_arrivee)
                        datetime_depart = datetime.combine(p.date_pointage, p.heure_depart)
                        if datetime_depart < datetime_arrivee: # Handles overnight case if checkout is next day, though not typical for pointage
                             datetime_depart += timedelta(days=1)
                        duration = datetime_depart - datetime_arrivee
                        duration_hours = duration.total_seconds() / 3600
                        duration_hours_str = f"{duration_hours:.2f}"
                    except TypeError: # In case date_pointage, heure_arrivee or heure_depart is None
                        duration_hours_str = "Erreur"

                retard_str = str(p.minutes_retard) if p.minutes_retard is not None else "0"

                table_data.append([
                    Paragraph(user_name, styles['SmallText']),
                    p.date_pointage.strftime('%d/%m/%y'), # Shorter date format
                    heure_arrivee_str,
                    heure_depart_str,
                    duration_hours_str,
                    Paragraph(p.type_pointage or "N/A", styles['SmallText']),
                    retard_str,
                    Paragraph(p.commentaire or "", styles['SmallText'])
                ])

            col_widths = [1.4*inch, 0.7*inch, 0.7*inch, 0.7*inch, 0.6*inch, 0.7*inch, 0.6*inch, 1.9*inch]

            # Define any custom style commands for this specific table
            custom_table_styles = [
                ('ALIGN', (0, 1), (0, -1), 'LEFT'),      # Align Employee Name to left
                ('ALIGN', (1, 1), (1, -1), 'CENTER'),    # Align Date to center
                ('ALIGN', (2, 1), (2, -1), 'CENTER'),    # Align Arrivee to center
                ('ALIGN', (3, 1), (3, -1), 'CENTER'),    # Align Depart to center
                ('ALIGN', (4, 1), (4, -1), 'RIGHT'),     # Align Duree to right
                ('ALIGN', (5, 1), (5, -1), 'CENTER'),    # Align Type to center
                ('ALIGN', (6, 1), (6, -1), 'RIGHT'),     # Align Retard to right
                ('ALIGN', (7, 1), (7, -1), 'LEFT'),      # Align Commentaire to left
                ('FONTSIZE', (0,0), (-1,-1), 7),         # Smaller font for all cells
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F0F0F0')), # Light grey background for data rows
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]), # Alternating rows
            ]

            attendance_table = create_styled_table(table_data, col_widths=col_widths, style_commands=custom_table_styles)
            story.append(attendance_table)

        # Build the PDF using the utility function
        final_pdf_buffer = build_pdf_document(
            buffer,
            story,
            title=f"Rapport Présence - {company.name}",
            author="PointFlex Application"
        )

        return send_file(final_pdf_buffer, mimetype='application/pdf',
                         as_attachment=True,
                         download_name=f'rapport_presence_{company.name.replace(" ", "_")}_{datetime.now().strftime("%Y%m%d")}.pdf')

    except Exception as e:
        current_app.logger.error(f"Erreur génération PDF pour l'entreprise {current_user.company_id if 'current_user' in locals() and current_user else 'N/A'}: {e}", exc_info=True)
        return jsonify(message="Erreur interne du serveur lors de la génération du PDF."), 500


@admin_bp.route('/employees/<int:employee_id>/manager', methods=['PUT'])
@require_admin # Only company admins can change managers for now
def set_employee_manager(employee_id):
    """Sets or changes the manager for an employee."""
    current_admin = get_current_user()
    data = request.get_json()
    new_manager_id = data.get('manager_id') # Can be None to remove manager

    target_employee = User.query.get_or_404(employee_id)

    # Permission check: Admin must belong to the same company as the employee
    if target_employee.company_id != current_admin.company_id:
        return jsonify(message="Accès non autorisé à cet employé."), 403

    if employee_id == new_manager_id:
        return jsonify(message="Un employé ne peut pas être son propre manager."), 400

    old_manager_id = target_employee.manager_id
    old_values_details = {'manager_id': old_manager_id}


    if new_manager_id is not None:
        new_manager = User.query.get(new_manager_id)
        if not new_manager:
            return jsonify(message=f"Manager avec ID {new_manager_id} non trouvé."), 404
        if new_manager.company_id != current_admin.company_id:
            return jsonify(message="Le manager sélectionné n'appartient pas à la même entreprise."), 403
        # TODO: Check for circular dependencies (e.g., A manages B, B manages A) - more complex logic needed

        target_employee.manager_id = new_manager_id
        new_values_details = {'manager_id': new_manager_id, 'manager_name': f"{new_manager.prenom} {new_manager.nom}"}
    else:
        target_employee.manager_id = None # Remove manager
        new_values_details = {'manager_id': None, 'manager_name': None}

    try:
        db.session.commit()
        log_user_action(
            action='SET_EMPLOYEE_MANAGER',
            resource_type='User',
            resource_id=target_employee.id,
            old_values=old_values_details,
            new_values=new_values_details,
            details=f"Manager set for employee {target_employee.email} to manager_id {new_manager_id}"
        )
        # db.session.commit() # For audit log if not covered by main commit
        return jsonify({
            'message': 'Manager de l\'employé mis à jour avec succès.',
            'employee': target_employee.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la définition du manager pour l'employé {employee_id}: {e}", exc_info=True)
        return jsonify(message="Erreur interne du serveur."), 500


@admin_bp.route('/employees/<int:employee_id>/attendance-report/pdf', methods=['GET'])
@require_admin # Ensures current_user is at least an admin of their company
def employee_attendance_report_pdf(employee_id):
    """Génère un rapport PDF des pointages pour un employé spécifique."""
    try:
        current_user = get_current_user() # This is the admin/manager performing the action

        # Fetch the target employee
        target_employee = User.query.get(employee_id)
        if not target_employee:
            return jsonify(message="Employé non trouvé."), 404

        # Permission check: Admin can only generate reports for employees in their own company
        if target_employee.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé à cet employé (hors entreprise)."), 403

        # Manager Scoping
        if current_user.role == 'manager':
            # Need to import or define get_managed_user_ids similar to leave_routes
            # For now, assuming a simplified check or that this endpoint is primarily for admins
            # A proper solution would be to share/import get_managed_user_ids or use a service
            # Let's add a placeholder for now and it can be refined.
            # This would require User model to be imported to get current_user.direct_reports
            is_managed_by_current_user = False
            if hasattr(current_user, 'direct_reports'): # Check if the relationship is loaded/available
                 managed_ids = [report.id for report in current_user.direct_reports]
                 if target_employee.id in managed_ids:
                    is_managed_by_current_user = True

            if not is_managed_by_current_user:
                 # Check if the target_employee's manager is the current_user
                if target_employee.manager_id != current_user.id:
                    return jsonify(message="Accès non autorisé. Le manager ne peut voir que les rapports de son équipe."), 403

        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        query = Pointage.query.filter_by(user_id=employee_id)

        date_filter_text = "toutes périodes"
        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage.between(start_date, end_date))
            date_filter_text = f"du {start_date.strftime('%d/%m/%Y')} au {end_date.strftime('%d/%m/%Y')}"
        # Add other date filter conditions as in my_attendance_report_pdf if needed

        pointages = query.order_by(Pointage.date_pointage, Pointage.heure_arrivee).all()

        buffer = BytesIO()
        styles = get_report_styles()

        story = generate_report_title_elements(
            title_str=f"Rapport de Présence - {target_employee.prenom} {target_employee.nom}",
            period_str=date_filter_text,
            company_name=target_employee.company.name if target_employee.company else "N/A"
        )

        if not pointages:
            story.append(Paragraph("Aucun pointage trouvé pour cet employé pour la période sélectionnée.", styles['Normal']))
        else:
            table_data = [
                [Paragraph(col, styles['SmallText']) for col in ["Date", "Arrivée", "Départ", "Durée (H)", "Type", "Retard (min)", "Lieu/Mission", "Statut"]]
            ]

            for p in pointages:
                heure_arrivee_str = p.heure_arrivee.strftime('%H:%M') if p.heure_arrivee else "N/A"
                heure_depart_str = p.heure_depart.strftime('%H:%M') if p.heure_depart else "N/A"
                duration_hours_str = ""
                if p.heure_arrivee and p.heure_depart:
                    try:
                        datetime_arrivee = datetime.combine(p.date_pointage, p.heure_arrivee)
                        datetime_depart = datetime.combine(p.date_pointage, p.heure_depart)
                        if datetime_depart < datetime_arrivee: datetime_depart += timedelta(days=1)
                        duration = datetime_depart - datetime_arrivee
                        duration_hours_str = f"{(duration.total_seconds() / 3600):.2f}"
                    except TypeError: duration_hours_str = "Erreur"

                retard_str = str(p.delay_minutes) if p.delay_minutes is not None else "0"
                lieu_mission_str = p.office.name if p.type == 'office' and p.office else (p.mission_order_number or "N/A")

                table_data.append([
                    p.date_pointage.strftime('%d/%m/%y'),
                    heure_arrivee_str,
                    heure_depart_str,
                    duration_hours_str,
                    Paragraph(p.type or "N/A", styles['SmallText']),
                    retard_str,
                    Paragraph(lieu_mission_str, styles['SmallText']),
                    Paragraph(p.statut or "", styles['SmallText'])
                ])

            col_widths = [0.7*inch, 0.7*inch, 0.7*inch, 0.6*inch, 0.7*inch, 0.6*inch, 1.5*inch, 1.8*inch]
            custom_table_styles = [
                ('ALIGN', (1, 1), (1, -1), 'CENTER'), ('ALIGN', (2, 1), (2, -1), 'CENTER'),
                ('ALIGN', (3, 1), (3, -1), 'CENTER'), ('ALIGN', (4, 1), (4, -1), 'RIGHT'),
                ('ALIGN', (5, 1), (5, -1), 'CENTER'), ('ALIGN', (6, 1), (6, -1), 'RIGHT'),
                ('ALIGN', (7, 1), (7, -1), 'LEFT'), ('ALIGN', (8, 1), (8, -1), 'LEFT'),
                ('FONTSIZE', (0,0), (-1,-1), 7),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]),
            ]
            attendance_table = create_styled_table(table_data, col_widths=col_widths, style_commands=custom_table_styles)
            story.append(attendance_table)

        final_pdf_buffer = build_pdf_document(
            buffer, story,
            title=f"Rapport Présence - {target_employee.prenom} {target_employee.nom}",
            author="PointFlex Application"
        )

        return send_file(final_pdf_buffer, mimetype='application/pdf',
                         as_attachment=True,
                         download_name=f'rapport_presence_{target_employee.nom.lower()}_{employee_id}_{datetime.now().strftime("%Y%m%d")}.pdf')

    except Exception as e:
        current_app.logger.error(f"Erreur génération PDF pour employé {employee_id}: {e}", exc_info=True)
        return jsonify(message="Erreur interne du serveur lors de la génération du PDF."), 500

# --- Company Leave Policy Management ---
from backend.models.company_holiday import CompanyHoliday

@admin_bp.route('/company/leave-policy', methods=['GET'])
@require_admin
def get_company_leave_policy():
    current_admin = get_current_user()
    company = Company.query.get_or_404(current_admin.company_id)

    company_holidays = CompanyHoliday.query.filter_by(company_id=company.id).order_by(CompanyHoliday.date).all()

    return jsonify({
        'work_days': company.work_days,
        'default_country_code_for_holidays': company.default_country_code_for_holidays,
        'company_holidays': [h.to_dict() for h in company_holidays]
    }), 200

@admin_bp.route('/company/leave-policy', methods=['PUT'])
@require_admin
def update_company_leave_policy():
    current_admin = get_current_user()
    company = Company.query.get_or_404(current_admin.company_id)
    data = request.get_json()

    old_policy_data = {
        'work_days': company.work_days,
        'default_country_code_for_holidays': company.default_country_code_for_holidays
    }

    if 'work_days' in data:
        # Basic validation: comma-separated string of numbers 0-6
        work_days_str = data['work_days']
        try:
            days_list = [int(d.strip()) for d in work_days_str.split(',') if d.strip()]
            if not all(0 <= day <= 6 for day in days_list):
                raise ValueError("Work days must be between 0 (Monday) and 6 (Sunday).")
            if len(set(days_list)) != len(days_list): # Check for duplicates
                 raise ValueError("Work days must not contain duplicates.")
            company.work_days = ",".join(map(str, sorted(days_list)))
        except ValueError as e:
            return jsonify(message=f"Invalid work_days format: {e}. Expected comma-separated numbers (0-6)."), 400

    if 'default_country_code_for_holidays' in data:
        country_code = data['default_country_code_for_holidays']
        if not country_code or len(country_code) > 10: # Basic validation
            return jsonify(message="Invalid country code format."), 400
        # Further validation against 'holidays' library supported countries could be added
        company.default_country_code_for_holidays = country_code.upper()

    try:
        db.session.commit()
        log_user_action(
            action='UPDATE_LEAVE_POLICY_SETTINGS',
            resource_type='Company',
            resource_id=company.id,
            old_values=old_policy_data,
            new_values={
                'work_days': company.work_days,
                'default_country_code_for_holidays': company.default_country_code_for_holidays
            }
        )
        # Dispatch webhook after successful commit
        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='company.updated', # Specific event: 'company.leave_policy_updated'
                payload_data=company.to_dict(include_sensitive=False), # Send updated company data
                company_id=company.id
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch company.updated (leave_policy) webhook for company {company.id}: {webhook_error}")

        return jsonify({
            'message': 'Leave policy updated successfully.',
            'work_days': company.work_days,
            'default_country_code_for_holidays': company.default_country_code_for_holidays
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating leave policy for company {company.id}: {e}", exc_info=True)
        return jsonify(message="Erreur interne du serveur."), 500


@admin_bp.route('/company/holidays', methods=['POST'])
@require_admin
def add_company_holiday():
    current_admin = get_current_user()
    company_id = current_admin.company_id
    data = request.get_json()

    if not data.get('date') or not data.get('name'):
        return jsonify(message="'date' and 'name' are required for company holiday."), 400

    try:
        holiday_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify(message="Invalid date format for holiday. Use YYYY-MM-DD."), 400

    # Check if holiday with same date and name already exists for the company
    existing_holiday = CompanyHoliday.query.filter_by(
        company_id=company_id,
        date=holiday_date,
        name=data['name'] # Allow same date if name is different, or make date unique per company
    ).first()
    if existing_holiday:
        return jsonify(message="A company holiday with this date and name already exists."), 409

    new_holiday = CompanyHoliday(
        company_id=company_id,
        date=holiday_date,
        name=data['name']
    )

    try:
        db.session.add(new_holiday)
        db.session.commit()
        log_user_action(
            action='ADD_COMPANY_HOLIDAY',
            resource_type='CompanyHoliday',
            resource_id=new_holiday.id,
            new_values=new_holiday.to_dict(),
            details={'company_id': company_id}
        )
        return jsonify(new_holiday.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding company holiday for company {company_id}: {e}", exc_info=True)
        return jsonify(message="Erreur interne du serveur."), 500


@admin_bp.route('/company/holidays/<int:holiday_id>', methods=['DELETE'])
@require_admin
def delete_company_holiday(holiday_id):
    current_admin = get_current_user()
    holiday = CompanyHoliday.query.get_or_404(holiday_id)

    if holiday.company_id != current_admin.company_id:
        return jsonify(message="Permission denied. Holiday does not belong to your company."), 403

    old_holiday_data = holiday.to_dict()
    try:
        db.session.delete(holiday)
        db.session.commit()
        log_user_action(
            action='DELETE_COMPANY_HOLIDAY',
            resource_type='CompanyHoliday',
            resource_id=holiday_id, # Use holiday_id from path as object is deleted
            old_values=old_holiday_data,
            details={'company_id': current_admin.company_id}
        )
        return jsonify(message="Company holiday deleted successfully."), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting company holiday {holiday_id}: {e}", exc_info=True)
        return jsonify(message="Erreur interne du serveur."), 500
