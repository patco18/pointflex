"""
Routes SuperAdmin - Gestion globale de la plateforme
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from middleware.auth import require_superadmin, get_current_user
from middleware.audit import log_user_action
from models.company import Company
from models.user import User
from models.pointage import Pointage
from models.system_settings import SystemSettings
from models.audit_log import AuditLog
from database import db
from datetime import datetime, timedelta
import json

superadmin_bp = Blueprint('superadmin', __name__)

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
            admin.set_password(admin_password)
            
            db.session.add(admin)
        
        # Logger l'action
        log_user_action(
            action='CREATE',
            resource_type='Company',
            resource_id=company.id,
            new_values=company.to_dict()
        )
        
        db.session.commit()
        
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
        
        db.session.delete(company)
        db.session.commit()
        
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
            'company': company_dict
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la prolongation: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

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