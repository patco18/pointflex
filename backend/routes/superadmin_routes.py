"""
Routes SuperAdmin - Gestion globale de la plateforme
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from middleware.auth import require_superadmin, get_current_user
from middleware.audit import log_user_action
from backend.models.company import Company
from backend.models.user import User
from backend.models.pointage import Pointage
from backend.models.system_settings import SystemSettings
from backend.models.audit_log import AuditLog
from backend.models.invoice import Invoice
from backend.models.payment import Payment
from backend.models.subscription_extension_request import SubscriptionExtensionRequest
from services.stripe_service import create_checkout_session, verify_webhook
from backend.database import db
from datetime import datetime, timedelta
import json

superadmin_bp = Blueprint('superadmin', __name__)

# Tarifs mensuels par plan d'abonnement
PLAN_PRICES = {
    'basic': 10.0,
    'premium': 20.0,
    'enterprise': 50.0,
}

# ===== GESTION DES ENTREPRISES =====

@superadmin_bp.route('/companies', methods=['GET'])
@require_superadmin
def get_companies():
    """Récupère toutes les entreprises"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        companies = Company.query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Pour chaque entreprise, récupérer l'administrateur principal
        companies_with_admin = []
        for company in companies.items:
            company_dict = company.to_dict(include_sensitive=True)
            
            # Trouver l'administrateur principal (premier admin_rh trouvé)
            admin = User.query.filter_by(
                company_id=company.id, 
                role='admin_rh',
                is_active=True
            ).first()
            
            if admin:
                company_dict['admin_id'] = admin.id
                company_dict['admin_email'] = admin.email
                company_dict['admin_name'] = f"{admin.prenom} {admin.nom}"
                company_dict['admin_phone'] = admin.phone
            
            companies_with_admin.append(company_dict)
        
        return jsonify({
            'companies': companies_with_admin,
            'pagination': {
                'page': page,
                'pages': companies.pages,
                'per_page': per_page,
                'total': companies.total
            }
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des entreprises: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@superadmin_bp.route('/companies', methods=['POST'])
@require_superadmin
def create_company():
    """Crée une nouvelle entreprise"""
    try:
        data = request.get_json()
        current_user = get_current_user()
        
        # Validation des données requises
        required_fields = ['name', 'email']
        for field in required_fields:
            if not data.get(field):
                return jsonify(message=f"Le champ {field} est requis"), 400
        
        # Vérifier si l'email existe déjà
        if Company.query.filter_by(email=data['email']).first():
            return jsonify(message="Une entreprise avec cet email existe déjà"), 409
        
        # Extraire les champs supportés pour l'entreprise
        company_fields = [
            'name', 'email', 'phone', 'address', 'city', 'country',
            'industry', 'website', 'tax_id', 'notes',
            'subscription_plan', 'max_employees'
        ]
        
        company_data = {k: v for k, v in data.items() if k in company_fields}
        
        # Créer l'entreprise
        company = Company(**company_data)
        
        db.session.add(company)
        db.session.flush()  # Pour obtenir l'ID
        
        # Créer l'administrateur de l'entreprise si les informations sont fournies
        admin = None
        
        # Vérifier si les informations admin sont fournies
        if data.get('admin_email'):
            # Vérifier si l'email admin existe déjà
            if User.query.filter_by(email=data['admin_email']).first():
                return jsonify(message="Un utilisateur avec cet email existe déjà"), 409
            
            # Extraire le nom et prénom
            admin_nom = data.get('admin_nom', '')
            admin_prenom = data.get('admin_prenom', '')
            
            # Si admin_name est fourni mais pas nom/prenom, essayer de les extraire
            if not (admin_nom and admin_prenom) and data.get('admin_name'):
                name_parts = data['admin_name'].split()
                if len(name_parts) > 1:
                    admin_prenom = name_parts[0]
                    admin_nom = ' '.join(name_parts[1:])
                else:
                    admin_prenom = data['admin_name']
                    admin_nom = 'Admin'
            
            admin = User(
                email=data['admin_email'],
                nom=admin_nom or 'Admin',
                prenom=admin_prenom or 'Admin',
                role='admin_rh',
                company_id=company.id,
                phone=data.get('admin_phone'),
                is_active=True
            )
            
            # Définir le mot de passe
            admin_password = data.get('admin_password', 'admin123')

            # Validate password before setting it
            from backend.utils.security_utils import validate_password_policy
            # For a new admin user, history check is not applicable with user_object=None
            policy_errors = validate_password_policy(admin_password, user_object=None)
            if policy_errors:
                # Important: if this fails, we might have already added the company.
                # This transaction should be all or nothing.
                # Consider moving db.session.add(company) and flush after admin creation/validation,
                # or ensuring rollback if admin creation fails.
                # For now, this error will prevent commit.
                return jsonify(message="Validation du mot de passe administrateur échouée.", errors=policy_errors), 400

            admin.set_password(admin_password)
            
            db.session.add(admin)
            db.session.flush() # Ensure admin has an ID if needed for payload
        
        # Logger l'action
        log_user_action(
            action='CREATE',
            resource_type='Company',
            resource_id=company.id,
            new_values=company.to_dict()
        )
        
        db.session.commit()

        # Dispatch webhook for company creation
        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='company.created',
                payload_data=company.to_dict(include_sensitive=False), # Basic company data
                company_id=company.id
            )
            if admin: # If an admin user was also created
                dispatch_webhook_event(
                    event_type='user.created',
                    payload_data=admin.to_dict(include_sensitive=False),
                    company_id=company.id # Admin is associated with this new company
                )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch company/user created webhook for company {company.id}: {webhook_error}")

        
        # Préparer la réponse avec les informations de l'admin
        company_dict = company.to_dict(include_sensitive=True)
        if admin:
            company_dict['admin_id'] = admin.id
            company_dict['admin_email'] = admin.email
            company_dict['admin_name'] = f"{admin.prenom} {admin.nom}"
            company_dict['admin_phone'] = admin.phone
        
        return jsonify({
            'message': 'Entreprise créée avec succès',
            'company': company_dict
        }), 201
        
    except Exception as e:
        print(f"Erreur lors de la création de l'entreprise: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

from io import BytesIO
from flask import send_file, current_app
from backend.utils.pdf_utils import build_pdf_document, create_styled_table, get_report_styles, generate_report_title_elements
from reportlab.platypus import Paragraph, Spacer
from reportlab.lib.units import inch
from reportlab.lib import colors # For custom table styles if needed

@superadmin_bp.route('/system/audit-log-report/pdf', methods=['GET'])
@require_superadmin
def audit_log_report_pdf():
    """Génère un rapport PDF des logs d'audit."""
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        user_email_filter = request.args.get('user_email')
        action_filter = request.args.get('action')
        resource_type_filter = request.args.get('resource_type')

        query = AuditLog.query

        report_filters = []
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query = query.filter(AuditLog.created_at >= datetime.combine(start_date, datetime.min.time()))
            report_filters.append(f"Début: {start_date.strftime('%d/%m/%Y')}")
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(AuditLog.created_at <= datetime.combine(end_date, datetime.max.time()))
            report_filters.append(f"Fin: {end_date.strftime('%d/%m/%Y')}")
        if user_email_filter:
            query = query.filter(AuditLog.user_email.ilike(f'%{user_email_filter}%'))
            report_filters.append(f"Email: {user_email_filter}")
        if action_filter:
            query = query.filter(AuditLog.action.ilike(f'%{action_filter}%'))
            report_filters.append(f"Action: {action_filter}")
        if resource_type_filter:
            query = query.filter(AuditLog.resource_type.ilike(f'%{resource_type_filter}%'))
            report_filters.append(f"Ressource: {resource_type_filter}")

        date_filter_text = ", ".join(report_filters) if report_filters else "toutes périodes"

        logs = query.order_by(AuditLog.created_at.desc()).all() # Get all for PDF, no pagination

        buffer = BytesIO()
        styles = get_report_styles()

        story = generate_report_title_elements(
            title_str="Rapport des Logs d'Audit",
            period_str=date_filter_text
        )

        if not logs:
            story.append(Paragraph("Aucun log d'audit trouvé pour les filtres sélectionnés.", styles['Normal']))
        else:
            table_data = [
                # Header Row
                [Paragraph(col, styles['SmallText']) for col in ["Date/Heure", "Utilisateur", "Action", "Ressource", "ID Ress.", "Détails Changement", "IP"]]
            ]

            for log in logs:
                # Summarize details, old_values, new_values to keep PDF readable
                changes_summary = []
                if log.parsed_details: changes_summary.append(f"Détails: {json.dumps(log.parsed_details, ensure_ascii=False, default=str)[:100]}") # Truncate
                if log.parsed_old_values: changes_summary.append(f"Ancien: {json.dumps(log.parsed_old_values, ensure_ascii=False, default=str)[:100]}")
                if log.parsed_new_values: changes_summary.append(f"Nouveau: {json.dumps(log.parsed_new_values, ensure_ascii=False, default=str)[:100]}")

                change_str = "; ".join(changes_summary)
                if not change_str: change_str = "N/A"

                table_data.append([
                    Paragraph(log.created_at.strftime('%d/%m/%y %H:%M:%S'), styles['SmallText']),
                    Paragraph(log.user_email, styles['SmallText']),
                    Paragraph(log.action, styles['SmallText']),
                    Paragraph(log.resource_type, styles['SmallText']),
                    Paragraph(str(log.resource_id) if log.resource_id is not None else "N/A", styles['SmallText']),
                    Paragraph(change_str, styles['SmallText']), # Summary of changes
                    Paragraph(log.ip_address or "N/A", styles['SmallText'])
                ])

            col_widths = [1.2*inch, 1.5*inch, 0.8*inch, 0.8*inch, 0.6*inch, 2.2*inch, 0.7*inch]

            custom_table_styles = [
                ('FONTSIZE', (0,0), (-1,-1), 6), # Even smaller font for audit logs
                ('VALIGN', (0,0), (-1,-1), 'TOP'), # Align content to top for long text cells
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]),
                 ('ALIGN', (0, 1), (0, -1), 'LEFT'),  # Date
                 ('ALIGN', (1, 1), (1, -1), 'LEFT'),  # User
                 ('ALIGN', (2, 1), (2, -1), 'LEFT'),  # Action
                 ('ALIGN', (3, 1), (3, -1), 'LEFT'),  # Resource Type
                 ('ALIGN', (4, 1), (4, -1), 'CENTER'),# Resource ID
                 ('ALIGN', (5, 1), (5, -1), 'LEFT'),  # Details
                 ('ALIGN', (6, 1), (6, -1), 'LEFT'),  # IP
            ]
            audit_table = create_styled_table(table_data, col_widths=col_widths, style_commands=custom_table_styles)
            story.append(audit_table)

        final_pdf_buffer = build_pdf_document(
            buffer, story,
            title="Rapport Logs d'Audit",
            author="PointFlex Application"
        )

        return send_file(final_pdf_buffer, mimetype='application/pdf',
                         as_attachment=True,
                         download_name=f'rapport_audit_logs_{datetime.now().strftime("%Y%m%d")}.pdf')

    except Exception as e:
        current_app.logger.error(f"Erreur génération PDF des logs d'audit: {e}", exc_info=True)
        return jsonify(message="Erreur interne du serveur lors de la génération du PDF des logs d'audit."), 500

@superadmin_bp.route('/companies/<int:company_id>', methods=['PUT'])
@require_superadmin
def update_company(company_id):
    """Met à jour une entreprise"""
    try:
        company = Company.query.get_or_404(company_id)
        data = request.get_json()
        
        # Sauvegarder les anciennes valeurs pour l'audit
        old_values = company.to_dict()
        
        # Mettre à jour les champs
        updatable_fields = [
            'name', 'email', 'phone', 'address', 'city', 'country',
            'industry', 'website', 'tax_id', 'notes',
            'subscription_plan', 'max_employees', 'is_active'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(company, field, data[field])
        
        # Mettre à jour l'administrateur si fourni
        if 'admin_email' in data or 'admin_name' in data or 'admin_prenom' in data or 'admin_nom' in data:
            # Chercher l'administrateur existant
            admin = User.query.filter_by(
                company_id=company.id, 
                role='admin_rh'
            ).first()
            
            if admin:
                # Mettre à jour l'administrateur existant
                if data.get('admin_email'):
                    # Vérifier si le nouvel email existe déjà pour un autre utilisateur
                    existing_user = User.query.filter_by(email=data['admin_email']).first()
                    if existing_user and existing_user.id != admin.id:
                        return jsonify(message="Un utilisateur avec cet email existe déjà"), 409
                    
                    admin.email = data['admin_email']
                
                if data.get('admin_name'):
                    name_parts = data['admin_name'].split()
                    if len(name_parts) > 1:
                        admin.prenom = name_parts[0]
                        admin.nom = ' '.join(name_parts[1:])
                    else:
                        admin.prenom = data['admin_name']
                
                if data.get('admin_prenom'):
                    admin.prenom = data['admin_prenom']
                
                if data.get('admin_nom'):
                    admin.nom = data['admin_nom']
                
                if data.get('admin_phone'):
                    admin.phone = data['admin_phone']
                
                if data.get('admin_password'):
                    from backend.utils.security_utils import validate_password_policy
                    policy_errors = validate_password_policy(data['admin_password'], user_object=admin)
                    if policy_errors:
                         return jsonify(message="Validation du nouveau mot de passe administrateur échouée.", errors=policy_errors), 400
                    admin.set_password(data['admin_password'])
            else:
                # Créer un nouvel administrateur si l'email est fourni
                if data.get('admin_email'):
                    # Vérifier si l'email existe déjà
                    if User.query.filter_by(email=data['admin_email']).first():
                        return jsonify(message="Un utilisateur avec cet email existe déjà"), 409
                    
                    # Extraire le nom et prénom
                    admin_nom = data.get('admin_nom', '')
                    admin_prenom = data.get('admin_prenom', '')
                    
                    # Si admin_name est fourni mais pas nom/prenom, essayer de les extraire
                    if not (admin_nom and admin_prenom) and data.get('admin_name'):
                        name_parts = data['admin_name'].split()
                        if len(name_parts) > 1:
                            admin_prenom = name_parts[0]
                            admin_nom = ' '.join(name_parts[1:])
                        else:
                            admin_prenom = data['admin_name']
                            admin_nom = 'Admin'
                    
                    admin = User(
                        email=data['admin_email'],
                        nom=admin_nom or 'Admin',
                        prenom=admin_prenom or 'Admin',
                        role='admin_rh',
                        company_id=company.id,
                        phone=data.get('admin_phone'),
                        is_active=True
                    )
                    
                    # Définir le mot de passe
                    admin_password = data.get('admin_password', 'admin123')

                    # Validate password before setting it
                    from backend.utils.security_utils import validate_password_policy
                    policy_errors = validate_password_policy(admin_password, user_object=None) # New user, no history check against self
                    if policy_errors:
                        return jsonify(message="Validation du mot de passe du nouvel administrateur échouée.", errors=policy_errors), 400

                    admin.set_password(admin_password)
                    
                    db.session.add(admin)
        
        # Logger l'action
        log_user_action(
            action='UPDATE',
            resource_type='Company',
            resource_id=company.id,
            old_values=old_values,
            new_values=company.to_dict()
        )
        
        db.session.commit()

        # Dispatch webhook for company update
        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='company.updated',
                payload_data=company.to_dict(include_sensitive=False),
                company_id=company.id
            )
            # Note: If admin user details were changed as part of this company update,
            # a 'user.updated' event for that admin might also be relevant.
            # This would require tracking if admin details were actually part of the 'data' payload.
            # For simplicity, we'll assume the primary event is company.updated.
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch company.updated webhook for company {company.id}: {webhook_error}")
        
        # Préparer la réponse avec les informations de l'admin
        company_dict = company.to_dict(include_sensitive=True)
        
        # Récupérer l'administrateur pour la réponse (it might have been created/updated)
        admin_user_for_response = User.query.filter_by(company_id=company.id, role='admin_rh').first()
        if admin_user_for_response:
            company_dict['admin_id'] = admin_user_for_response.id
            company_dict['admin_email'] = admin_user_for_response.email
            company_dict['admin_name'] = f"{admin_user_for_response.prenom} {admin_user_for_response.nom}"
            company_dict['admin_phone'] = admin_user_for_response.phone
        
        return jsonify({
            'message': 'Entreprise mise à jour avec succès',
            'company': company_dict
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour de l'entreprise: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@superadmin_bp.route('/companies/<int:company_id>', methods=['DELETE'])
@require_superadmin
def delete_company(company_id):
    """Supprime une entreprise"""
    try:
        company = Company.query.get_or_404(company_id)
        
        # Vérifier s'il y a des utilisateurs actifs
        active_users = User.query.filter_by(company_id=company_id, is_active=True).count()
        if active_users > 0:
            # Supprimer tous les utilisateurs associés
            users = User.query.filter_by(company_id=company_id).all()
            for user in users:
                db.session.delete(user)
        
        # Sauvegarder pour l'audit
        old_values = company.to_dict()
        
        # Logger l'action avant suppression
        log_user_action(
            action='DELETE',
            resource_type='Company',
            resource_id=company.id,
            old_values=old_values
        )
        
        users_in_company = User.query.filter_by(company_id=company_id).all()
        user_ids_deleted = [user.id for user in users_in_company] # Store ids before they are deleted
        old_user_values_map = {user.id: user.to_dict(include_sensitive=False) for user in users_in_company}


        db.session.delete(company) # This should cascade delete users if relationships are set up with cascade delete
                                   # Or users need to be deleted manually in a loop if not.
                                   # Assuming cascade delete for users based on company deletion.
                                   # If not, a loop `for user in users_in_company: db.session.delete(user)` is needed before company delete.
        db.session.commit()

        # Dispatch webhooks for deleted users
        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            for user_id in user_ids_deleted:
                user_data = old_user_values_map.get(user_id)
                if user_data:
                    dispatch_webhook_event(
                        event_type='user.deleted',
                        payload_data=user_data, # Send data of the user that was deleted
                        company_id=company_id # Company context
                    )
            # Dispatch company.deleted event
            dispatch_webhook_event(
                event_type='company.deleted',
                payload_data=old_values, # old_values of the company
                company_id=company_id
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch user.deleted/company.deleted webhook during company {company_id} deletion: {webhook_error}")
        
        return jsonify(message="Entreprise supprimée avec succès"), 200
        
    except Exception as e:
        print(f"Erreur lors de la suppression de l'entreprise: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@superadmin_bp.route('/companies/<int:company_id>/extend-subscription', methods=['PUT'])
@require_superadmin
def extend_subscription(company_id):
    """Prolonge l'abonnement d'une entreprise"""
    try:
        company = Company.query.get_or_404(company_id)
        data = request.get_json()
        
        months = data.get('months', 1)
        if months < 1 or months > 24:
            return jsonify(message="Le nombre de mois doit être entre 1 et 24"), 400
        
        # Sauvegarder l'ancien état
        old_values = company.to_dict()
        
        # Prolonger l'abonnement
        company.extend_subscription(months)

        # Créer la facture correspondante
        amount = PLAN_PRICES.get(company.subscription_plan, 10.0) * months
        invoice = Invoice(
            company_id=company.id,
            amount=amount,
            months=months,
            description=data.get('reason'),
            due_date=datetime.utcnow().date(),
        )
        db.session.add(invoice)
        db.session.flush()  # ensure defaults like dates are populated

        log_user_action(
            action='CREATE_INVOICE',
            resource_type='Invoice',
            resource_id=None,
            details=invoice.to_dict(),
        )
        
        # Logger l'action
        log_user_action(
            action='EXTEND_SUBSCRIPTION',
            resource_type='Company',
            resource_id=company.id,
            details={'months_added': months, 'reason': data.get('reason')},
            old_values=old_values,
            new_values=company.to_dict()
        )
        
        db.session.commit()

        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='invoice.created',
                payload_data=invoice.to_dict(),
                company_id=company.id
            )
            # Also dispatch subscription.updated as extend_subscription changes it
            dispatch_webhook_event(
                event_type='subscription.updated', # Or a more specific 'subscription.extended'
                payload_data=company.to_dict(include_sensitive=True), # Send updated company subscription details
                company_id=company.id
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch invoice/subscription webhook for company {company.id} during extension: {webhook_error}")

        
        # Préparer la réponse avec les informations de l'admin
        company_dict = company.to_dict(include_sensitive=True)
        
        # Récupérer l'administrateur pour la réponse
        admin = User.query.filter_by(
            company_id=company.id, 
            role='admin_rh'
        ).first()
        
        if admin:
            company_dict['admin_id'] = admin.id
            company_dict['admin_email'] = admin.email
            company_dict['admin_name'] = f"{admin.prenom} {admin.nom}"
            company_dict['admin_phone'] = admin.phone
        
        return jsonify({
            'message': f'Abonnement prolongé de {months} mois',
            'company': company_dict,
            'invoice': invoice.to_dict(),
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la prolongation: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@superadmin_bp.route('/subscription-extension-requests', methods=['GET'])
@require_superadmin
def list_subscription_extension_requests():
    """Liste les demandes de prolongation d'abonnement."""
    status = request.args.get('status')
    query = SubscriptionExtensionRequest.query
    if status:
        query = query.filter_by(status=status)
    requests_list = query.order_by(SubscriptionExtensionRequest.created_at.desc()).all()
    return jsonify({'requests': [r.to_dict() for r in requests_list]}), 200


@superadmin_bp.route('/subscription-extension-requests/<int:req_id>/approve', methods=['PUT'])
@require_superadmin
def approve_subscription_extension_request(req_id):
    """Approuve une demande de prolongation et étend l'abonnement."""
    req = SubscriptionExtensionRequest.query.get_or_404(req_id)
    if req.status != 'pending':
        return jsonify(message='Demande déjà traitée'), 400
    company = Company.query.get_or_404(req.company_id)

    old_values = company.to_dict()
    company.extend_subscription(req.months)

    amount = PLAN_PRICES.get(company.subscription_plan, 10.0) * req.months
    invoice = Invoice(
        company_id=company.id,
        amount=amount,
        months=req.months,
        description=req.reason,
        due_date=datetime.utcnow().date(),
    )
    db.session.add(invoice)
    db.session.flush()

    log_user_action(action='CREATE_INVOICE', resource_type='Invoice', resource_id=None, details=invoice.to_dict())
    log_user_action(action='EXTEND_SUBSCRIPTION', resource_type='Company', resource_id=company.id, details={'months_added': req.months, 'reason': req.reason}, old_values=old_values, new_values=company.to_dict())

    req.status = 'approved'
    req.processed_at = datetime.utcnow()
    req.processed_by = get_current_user().id

    db.session.commit()

    return jsonify({'message': 'Demande approuvée', 'company': company.to_dict(include_sensitive=True), 'invoice': invoice.to_dict(), 'request': req.to_dict()}), 200


@superadmin_bp.route('/subscription-extension-requests/<int:req_id>/reject', methods=['PUT'])
@require_superadmin
def reject_subscription_extension_request(req_id):
    """Rejette une demande de prolongation."""
    req = SubscriptionExtensionRequest.query.get_or_404(req_id)
    if req.status != 'pending':
        return jsonify(message='Demande déjà traitée'), 400
    req.status = 'rejected'
    req.processed_at = datetime.utcnow()
    req.processed_by = get_current_user().id
    db.session.commit()
    log_user_action(action='REJECT_SUBSCRIPTION_EXTENSION', resource_type='SubscriptionExtensionRequest', resource_id=req.id, old_values=None, new_values=req.to_dict())
    return jsonify({'message': 'Demande rejetée', 'request': req.to_dict()}), 200

@superadmin_bp.route('/companies/<int:company_id>/status', methods=['PUT'])
@require_superadmin
def toggle_company_status(company_id):
    """Active/Suspend une entreprise"""
    try:
        company = Company.query.get_or_404(company_id)
        data = request.get_json()
        
        suspend = data.get('suspend', False)
        reason = data.get('reason', '')
        notify_admin = data.get('notify_admin', True)
        
        # Sauvegarder l'ancien état
        old_values = company.to_dict()
        
        if suspend:
            company.suspend(reason)
            action_message = "Entreprise suspendue"
        else:
            company.reactivate()
            action_message = "Entreprise réactivée"
        
        # Logger l'action
        log_user_action(
            action='TOGGLE_STATUS',
            resource_type='Company',
            resource_id=company.id,
            details={
                'action': 'suspend' if suspend else 'reactivate',
                'reason': reason,
                'notify_admin': notify_admin
            },
            old_values=old_values,
            new_values=company.to_dict()
        )
        
        db.session.commit()
        
        # Préparer la réponse avec les informations de l'admin
        company_dict = company.to_dict(include_sensitive=True)
        
        # Récupérer l'administrateur pour la réponse
        admin = User.query.filter_by(
            company_id=company.id, 
            role='admin_rh'
        ).first()
        
        if admin:
            company_dict['admin_id'] = admin.id
            company_dict['admin_email'] = admin.email
            company_dict['admin_name'] = f"{admin.prenom} {admin.nom}"
            company_dict['admin_phone'] = admin.phone
        
        return jsonify({
            'message': action_message,
            'company': company_dict
        }), 200
        
    except Exception as e:
        print(f"Erreur lors du changement de statut: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

# ===== FACTURATION =====

@superadmin_bp.route('/companies/<int:company_id>/invoices', methods=['GET'])
@require_superadmin
def get_company_invoices(company_id):
    """Liste les factures d'une entreprise"""
    try:
        Company.query.get_or_404(company_id)
        invoices = Invoice.query.filter_by(company_id=company_id).order_by(Invoice.created_at.desc()).all()
        return jsonify({'invoices': [inv.to_dict() for inv in invoices]}), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des factures: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@superadmin_bp.route('/companies/<int:company_id>/payments', methods=['GET'])
@require_superadmin
def get_company_payments(company_id):
    """Liste les paiements d'une entreprise"""
    try:
        Company.query.get_or_404(company_id)
        payments = Payment.query.filter_by(company_id=company_id).order_by(Payment.created_at.desc()).all()
        return jsonify({'payments': [p.to_dict() for p in payments]}), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des paiements: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@superadmin_bp.route('/invoices/<int:invoice_id>/pay', methods=['POST'])
@require_superadmin
def pay_invoice(invoice_id):
    """Enregistre le paiement d'une facture"""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        if invoice.status == 'paid':
            return jsonify(message='Facture déjà payée'), 400

        data = request.get_json() or {}
        amount = data.get('amount', invoice.amount)
        method = data.get('method', 'manual')

        payment = Payment(
            invoice_id=invoice.id,
            company_id=invoice.company_id,
            amount=amount,
            payment_method=method,
        )
        db.session.add(payment)

        invoice.mark_paid()

        log_user_action(
            action='PAY_INVOICE',
            resource_type='Invoice',
            resource_id=invoice.id,
            details={'amount': amount, 'method': method},
        )

        db.session.commit()

        return jsonify({
            'invoice': invoice.to_dict(),
            'payment': payment.to_dict()
        }), 200
    except Exception as e:
        print(f"Erreur lors de l'enregistrement du paiement: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@superadmin_bp.route('/invoices/<int:invoice_id>/stripe-session', methods=['POST'])
@require_superadmin
def create_stripe_session(invoice_id):
    """Create a Stripe Checkout session for an invoice."""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        if invoice.status == 'paid':
            return jsonify(message='Facture déjà payée'), 400

        data = request.get_json() or {}
        success_url = data.get('success_url', 'https://example.com/success')
        cancel_url = data.get('cancel_url', 'https://example.com/cancel')

        session = create_checkout_session(invoice, success_url, cancel_url)

        return jsonify({'session_id': session.id, 'checkout_url': session.url}), 200
    except Exception as e:
        print(f"Erreur lors de la création de session Stripe: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@superadmin_bp.route('/stripe/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events."""
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature', '')

    try:
        event = verify_webhook(payload, sig_header)
    except Exception as e:
        print(f"Webhook signature verification failed: {e}")
        return jsonify(message='Invalid payload'), 400

    if event['type'] == 'checkout.session.completed':
        session_data = event['data']['object']
        invoice_id = session_data.get('metadata', {}).get('invoice_id')
        transaction_id = session_data.get('payment_intent')
        invoice = Invoice.query.get(invoice_id)
        if invoice and invoice.status != 'paid':
            payment = Payment(
                invoice_id=invoice.id,
                company_id=invoice.company_id,
                amount=invoice.amount,
                payment_method='stripe',
                transaction_id=transaction_id,
            )
            db.session.add(payment)
            invoice.mark_paid()
            db.session.commit()

    return jsonify({'status': 'success'}), 200

# ===== STATISTIQUES GLOBALES =====

@superadmin_bp.route('/stats', methods=['GET'])
@require_superadmin
def get_global_stats():
    """Récupère les statistiques globales de la plateforme"""
    try:
        # Statistiques de base
        total_companies = Company.query.count()
        active_companies = Company.query.filter_by(is_active=True).count()
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        total_pointages = Pointage.query.count()
        
        # Statistiques par plan
        plans_distribution = {}
        for plan in ['basic', 'premium', 'enterprise']:
            count = Company.query.filter_by(subscription_plan=plan).count()
            plans_distribution[plan] = count
        
        # Revenus estimés (simulation)
        plan_prices = {'basic': 29, 'premium': 99, 'enterprise': 299}
        monthly_revenue = sum(
            plans_distribution[plan] * plan_prices[plan] 
            for plan in plans_distribution
        )
        
        # Statistiques temporelles
        today = datetime.utcnow().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        new_companies_week = Company.query.filter(Company.created_at >= week_ago).count()
        new_users_week = User.query.filter(User.created_at >= week_ago).count()
        pointages_today = Pointage.query.filter(Pointage.date_pointage == today).count()
        
        return jsonify({
            'stats': {
                'total_companies': total_companies,
                'active_companies': active_companies,
                'total_users': total_users,
                'active_users': active_users,
                'total_pointages': total_pointages,
                'plans_distribution': plans_distribution,
                'revenue_monthly': monthly_revenue,
                'new_companies_week': new_companies_week,
                'new_users_week': new_users_week,
                'pointages_today': pointages_today
            }
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des statistiques: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

# ===== CONFIGURATION SYSTÈME =====

@superadmin_bp.route('/system/settings', methods=['GET'])
@require_superadmin
def get_system_settings():
    """Récupère tous les paramètres système"""
    try:
        settings = SystemSettings.get_all_settings()
        
        return jsonify({
            'settings': settings
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des paramètres: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@superadmin_bp.route('/system/settings', methods=['PUT'])
@require_superadmin
def update_system_settings():
    """Met à jour les paramètres système"""
    try:
        data = request.get_json()
        current_user = get_current_user()
        
        updated_settings = []
        
        for category, settings in data.items():
            for key, value in settings.items():
                # Récupérer l'ancien paramètre pour l'audit
                old_setting = SystemSettings.query.filter_by(category=category, key=key).first()
                old_value = old_setting.parsed_value if old_setting else None
                
                # Mettre à jour ou créer le paramètre
                setting = SystemSettings.set_setting(category, key, value)
                updated_settings.append(f"{category}.{key}")
                
                # Logger l'action
                log_user_action(
                    action='UPDATE_SYSTEM_SETTING',
                    resource_type='SystemSettings',
                    resource_id=setting.id,
                    details={
                        'category': category,
                        'key': key,
                        'old_value': old_value,
                        'new_value': value
                    }
                )
        
        db.session.commit()
        
        return jsonify({
            'message': f'{len(updated_settings)} paramètres mis à jour',
            'updated_settings': updated_settings
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour des paramètres: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@superadmin_bp.route('/system/backup', methods=['POST'])
@require_superadmin
def create_system_backup():
    """Crée une sauvegarde du système"""
    try:
        current_user = get_current_user()
        
        # Générer un ID de sauvegarde
        backup_id = f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Simuler la création de sauvegarde
        # En production, ceci déclencherait un processus de sauvegarde réel
        
        # Logger l'action
        log_user_action(
            action='CREATE_BACKUP',
            resource_type='System',
            details={
                'backup_id': backup_id,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Sauvegarde créée avec succès',
            'backup_id': backup_id,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la création de sauvegarde: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@superadmin_bp.route('/system/maintenance', methods=['POST'])
@require_superadmin
def toggle_maintenance_mode():
    """Active/Désactive le mode maintenance"""
    try:
        data = request.get_json()
        enabled = data.get('enabled', False)
        message = data.get('message', '')
        
        # Mettre à jour le paramètre de maintenance
        SystemSettings.set_setting('system', 'maintenance_mode', enabled)
        if message:
            SystemSettings.set_setting('system', 'maintenance_message', message)
        
        # Logger l'action
        log_user_action(
            action='TOGGLE_MAINTENANCE',
            resource_type='System',
            details={
                'enabled': enabled,
                'message': message
            }
        )
        
        db.session.commit()
        
        return jsonify({
            'message': f'Mode maintenance {"activé" if enabled else "désactivé"}',
            'maintenance_mode': enabled
        }), 200
        
    except Exception as e:
        print(f"Erreur lors du changement de mode maintenance: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@superadmin_bp.route('/system/health', methods=['GET'])
@require_superadmin
def get_system_health():
    """Récupère l'état de santé du système"""
    try:
        # Vérifier l'état de la base de données
        try:
            db.session.execute('SELECT 1')
            db_status = 'healthy'
        except:
            db_status = 'error'
        
        # Calculer l'uptime (simulation)
        uptime = "7 jours, 14 heures"
        
        # Métriques système
        total_companies = Company.query.count()
        total_users = User.query.count()
        total_pointages = Pointage.query.count()
        
        # Utilisateurs actifs aujourd'hui (simulation)
        today = datetime.utcnow().date()
        daily_active_users = User.query.filter(User.last_login >= today).count()
        
        # Dernière sauvegarde (simulation)
        last_backup = (datetime.utcnow() - timedelta(hours=6)).isoformat()
        
        # Mode maintenance
        maintenance_mode = SystemSettings.get_setting('system', 'maintenance_mode', False)
        
        return jsonify({
            'health': {
                'api_status': 'healthy',
                'database_status': db_status,
                'storage_usage': 65,  # Simulation
                'uptime': uptime,
                'response_time': '120ms',
                'active_connections': 45,
                'max_connections': 100,
                'metrics': {
                    'total_companies': total_companies,
                    'total_users': total_users,
                    'total_pointages': total_pointages,
                    'daily_active_users': daily_active_users,
                    'error_rate': '0.1%'
                },
                'last_backup': last_backup,
                'maintenance_mode': maintenance_mode
            }
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la vérification de santé: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@superadmin_bp.route('/system/audit-logs', methods=['GET'])
@require_superadmin
def get_audit_logs():
    """Récupère les logs d'audit"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        action = request.args.get('action')
        user_id = request.args.get('user_id', type=int)
        
        query = AuditLog.query
        
        # Filtres
        if action:
            query = query.filter(AuditLog.action.ilike(f'%{action}%'))
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        # Ordonner par date décroissante
        query = query.order_by(AuditLog.created_at.desc())
        
        logs = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'logs': [log.to_dict() for log in logs.items],
            'pagination': {
                'page': page,
                'pages': logs.pages,
                'per_page': per_page,
                'total': logs.total
            }
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des logs: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@superadmin_bp.route('/system/reset-settings', methods=['POST'])
@require_superadmin
def reset_system_settings():
    """Remet les paramètres système aux valeurs par défaut"""
    try:
        data = request.get_json()
        confirm = data.get('confirm', False)
        
        if not confirm:
            return jsonify(message="Confirmation requise pour cette action"), 400
        
        # Logger l'action avant la réinitialisation
        log_user_action(
            action='RESET_SYSTEM_SETTINGS',
            resource_type='System',
            details={'confirmed': True}
        )
        
        # Supprimer tous les paramètres existants
        SystemSettings.query.delete()
        
        # Recréer les paramètres par défaut
        # (Ceci nécessiterait d'appeler la fonction d'initialisation)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Paramètres système réinitialisés aux valeurs par défaut'
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la réinitialisation: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500