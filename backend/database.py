"""
Configuration et initialisation de la base de données
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
from flask import current_app

db = SQLAlchemy()

def init_db():
    """Initialise la base de données avec les données de test"""
    try:
        from backend.models.user import User
        from backend.models.company import Company
        from backend.models.pointage import Pointage
        from backend.models.system_settings import SystemSettings
        from backend.models.audit_log import AuditLog
        from backend.models.office import Office
        from backend.models.mission import Mission
        from backend.models.invoice import Invoice
        from backend.models.payment import Payment
        from backend.models.notification import Notification
        from backend.models.push_subscription import PushSubscription
        from backend.models.leave_type import LeaveType
        from backend.models.leave_balance import LeaveBalance
        from backend.models.leave_request import LeaveRequest
        from backend.models.webhook_subscription import WebhookSubscription
        from backend.models.webhook_delivery_log import WebhookDeliveryLog
        from backend.models.company_holiday import CompanyHoliday
        from backend.models.password_history import PasswordHistory # Added PasswordHistory
        
        # Créer toutes les tables
        db.create_all()
        
        # Vérifier si les données de test existent déjà
        if User.query.first():
            current_app.logger.info("✅ Base de données déjà initialisée")
            return

        current_app.logger.info("🔧 Initialisation de la base de données...")
        
        # Créer les entreprises de test
        companies_data = [
            {
                'name': 'Entreprise Démo',
                'email': 'contact@entreprise-demo.com',
                'phone': '+33 1 23 45 67 89',
                'address': '123 Rue de la Démo, 75001 Paris',
                'city': 'Paris',
                'country': 'FR',
                'industry': 'tech',
                'website': 'www.entreprise-demo.com',
                'tax_id': 'FR12345678900',
                'subscription_plan': 'premium',
                'subscription_status': 'active',
                'max_employees': 50,
                'is_active': True,
                'notes': 'Entreprise de démonstration pour PointFlex',
                'equalization_threshold': 5
            },
            {
                'name': 'TechCorp Solutions',
                'email': 'info@techcorp.com',
                'phone': '+33 1 98 76 54 32',
                'address': '456 Avenue de la Tech, 69000 Lyon',
                'city': 'Lyon',
                'country': 'FR',
                'industry': 'tech',
                'website': 'www.techcorp.com',
                'tax_id': 'FR98765432100',
                'subscription_plan': 'enterprise',
                'subscription_status': 'active',
                'max_employees': 200,
                'is_active': True,
                'notes': 'Grande entreprise technologique',
                'equalization_threshold': 5
            }
        ]
        
        companies = []
        for company_data in companies_data:
            company = Company(**company_data)
            db.session.add(company)
            companies.append(company)
        
        db.session.flush()  # Pour obtenir les IDs
        
        # Créer les bureaux de test
        offices_data = [
            {
                'company_id': companies[0].id,
                'name': 'Siège Social Paris',
                'address': '123 Rue de la Démo, 75001 Paris',
                'city': 'Paris',
                'country': 'FR',
                'latitude': 48.8566,
                'longitude': 2.3522,
                'radius': 200,
                'timezone': 'Europe/Paris',
                'capacity': 150,
                'amenities': json.dumps(['wifi', 'parking', 'cafeteria', 'security']),
                'manager_name': 'Marie Dubois',
                'phone': '+33 1 23 45 67 89',
                'is_active': True,
                'is_main': True
            },
            {
                'company_id': companies[0].id,
                'name': 'Bureau Lyon',
                'address': '456 Avenue de la Tech, 69000 Lyon',
                'city': 'Lyon',
                'country': 'FR',
                'latitude': 45.7640,
                'longitude': 4.8357,
                'radius': 150,
                'timezone': 'Europe/Paris',
                'capacity': 50,
                'amenities': json.dumps(['wifi', 'parking']),
                'manager_name': 'Jean Martin',
                'phone': '+33 4 56 78 90 12',
                'is_active': True,
                'is_main': False
            },
            {
                'company_id': companies[1].id,
                'name': 'Siège TechCorp',
                'address': '456 Avenue de la Tech, 69000 Lyon',
                'city': 'Lyon',
                'country': 'FR',
                'latitude': 45.7640,
                'longitude': 4.8357,
                'radius': 200,
                'timezone': 'Europe/Paris',
                'capacity': 200,
                'amenities': json.dumps(['wifi', 'parking', 'cafeteria', 'gym', 'security']),
                'manager_name': 'Sophie Lefebvre',
                'phone': '+33 4 56 78 90 12',
                'is_active': True,
                'is_main': True
            }
        ]

        for office_data in offices_data:
            office = Office(**office_data)
            db.session.add(office)

        # Créer des missions de test
        missions_data = [
            {
                'company_id': companies[0].id,
                'order_number': 'M2024-001',
                'title': 'Installation client Paris',
                'description': 'Déploiement du nouveau système',
                'status': 'planned'
            },
            {
                'company_id': companies[0].id,
                'order_number': 'M2024-002',
                'title': 'Audit sécurité',
                'description': 'Audit annuel des infrastructures',
                'status': 'planned'
            }
        ]

        for mission_data in missions_data:
            mission = Mission(**mission_data)
            db.session.add(mission)
        
        # Créer les utilisateurs de test
        users_data = [
            {
                'email': 'superadmin@pointflex.com',
                'nom': 'Super',
                'prenom': 'Admin',
                'role': 'superadmin',
                'company_id': None,  # SuperAdmin n'appartient à aucune entreprise
                'is_active': True
            },
            {
                'email': 'admin@pointflex.com',
                'nom': 'Administrateur',
                'prenom': 'Principal',
                'role': 'admin_rh',
                'company_id': companies[0].id,
                'is_active': True
            },
            {
                'email': 'employee@pointflex.com',
                'nom': 'Employé',
                'prenom': 'Test',
                'role': 'employee',
                'company_id': companies[0].id,
                'is_active': True
            },
            {
                'email': 'manager@pointflex.com',
                'nom': 'Manager',
                'prenom': 'Équipe',
                'role': 'manager',
                'company_id': companies[0].id,
                'is_active': True
            }
        ]
        
        for user_data in users_data:
            # Extraire le mot de passe avant de créer l'utilisateur
            password = (
                'superadmin123' if user_data['email'] == 'superadmin@pointflex.com' else
                'admin123' if user_data['email'] == 'admin@pointflex.com' else
                'employee123' if user_data['email'] == 'employee@pointflex.com' else
                'manager123'
            )

            # Créer l'utilisateur sans le mot de passe dans le constructeur
            user = User(**user_data)

            # Définir le mot de passe avant d'insérer en base
            # `set_password` ajoute l'utilisateur à la session et flush si nécessaire
            user.set_password(password)
        
        # Créer les paramètres système par défaut
        default_settings = [
            # Paramètres généraux
            ('general', 'platform_name', 'PointFlex SaaS', 'Nom de la plateforme'),
            ('general', 'platform_version', '2.0.0', 'Version de la plateforme'),
            ('general', 'default_timezone', 'Europe/Paris', 'Fuseau horaire par défaut'),
            ('general', 'default_language', 'fr', 'Langue par défaut'),
            ('general', 'max_companies', 1000, 'Nombre maximum d\'entreprises'),
            ('general', 'max_users_per_company', 999, 'Utilisateurs max par entreprise'),
            
            # Paramètres de sécurité
            ('security', 'password_min_length', 8, 'Longueur minimale du mot de passe'),
            ('security', 'password_require_uppercase', True, 'Majuscule obligatoire'),
            ('security', 'password_require_numbers', True, 'Chiffres obligatoires'),
            ('security', 'require_2fa', False, 'Authentification 2FA obligatoire'),
            ('security', 'session_timeout', 1440, 'Timeout session (minutes)'),
            ('security', 'max_login_attempts', 5, 'Tentatives de connexion max'),
            ('security', 'lockout_duration', 30, 'Durée de verrouillage (minutes)'),
            
            # Paramètres de notifications
            ('notifications', 'email_notifications_enabled', True, 'Notifications email'),
            ('notifications', 'push_notifications_enabled', True, 'Notifications push'),
            ('notifications', 'sms_notifications_enabled', False, 'Notifications SMS'),
            ('notifications', 'notification_retention_days', 30, 'Rétention notifications (jours)'),
            
            # Paramètres d'intégrations
            ('integrations', 'smtp_host', '', 'Serveur SMTP'),
            ('integrations', 'smtp_port', 587, 'Port SMTP'),
            ('integrations', 'smtp_use_tls', True, 'Utiliser TLS'),
            ('integrations', 'api_rate_limit', 1000, 'Limite API (requêtes/heure)'),
            ('integrations', 'webhook_timeout', 30, 'Timeout webhooks (secondes)'),
            
            # Paramètres avancés
            ('advanced', 'debug_mode_enabled', False, 'Mode debug'),
            ('advanced', 'auto_backup_enabled', True, 'Sauvegarde automatique'),
            ('advanced', 'auto_backup_frequency', 24, 'Fréquence sauvegarde (heures)'),
            ('advanced', 'log_retention_days', 90, 'Rétention logs (jours)'),
            ('advanced', 'backup_retention_days', 30, 'Rétention sauvegardes (jours)'),
        ]
        
        for category, key, value, description in default_settings:
            # Use the set_setting method to avoid unique constraint violations
            SystemSettings.set_setting(category, key, value, description)
        
        # Sauvegarder toutes les données
        db.session.commit()
        current_app.logger.info("✅ Base de données initialisée avec succès!")
        current_app.logger.info(f"   - {len(companies)} entreprises créées")
        current_app.logger.info(f"   - {len(offices_data)} bureaux créés")
        current_app.logger.info(f"   - {len(missions_data)} missions créées")
        current_app.logger.info(f"   - {len(users_data)} utilisateurs créés")
        current_app.logger.info(f"   - {len(default_settings)} paramètres système créés")
        
    except Exception as e:
        current_app.logger.error(
            f"❌ Erreur lors de l'initialisation de la base de données: {str(e)}"
        )
        current_app.logger.error(f"   Type d'erreur: {type(e).__name__}")
        
        # Rollback de la session en cas d'erreur
        try:
            db.session.rollback()
            current_app.logger.info("   Session de base de données annulée")
        except Exception as rollback_error:
            current_app.logger.error(
                f"   Erreur lors du rollback: {str(rollback_error)}"
            )
        
        # Ne pas lever l'exception pour permettre au serveur de démarrer
        # L'application peut fonctionner sans données de test
        current_app.logger.info(
            "   L'application va continuer sans les données de test"
        )
        current_app.logger.info(
            "   Vous pouvez créer manuellement les données nécessaires"
        )