import os
import sys
from pathlib import Path
import datetime

# Correction du chemin d'importation pour trouver le module backend
# On ajoute le répertoire racine du projet au sys.path
project_root = Path(__file__).parent.parent.parent  # Remonte à la racine du projet
sys.path.insert(0, str(project_root))  # Ajoute la racine au path

# Maintenant on peut importer depuis le backend
from backend import config  # Test d'importation
from flask import Flask
from flask_mail import Mail
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Créer une instance de l'application Flask pour les tests
app = Flask(__name__)
# Import direct de la classe de configuration
from backend.config import TestingConfig
app.config.from_object(TestingConfig)

# Configuration spéciale pour les tests d'email
app.config['MAIL_SERVER'] = 'localhost'
app.config['MAIL_PORT'] = 1025  # Port Mailhog par défaut
app.config['MAIL_USERNAME'] = None
app.config['MAIL_PASSWORD'] = None
app.config['MAIL_DEFAULT_SENDER'] = 'test@pointflex.com'
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_DEBUG'] = True
app.config['MAIL_SUPPRESS_SEND'] = False  # Configurer à True pour ne pas envoyer réellement

# Pour les tests, on peut écrire les emails dans un fichier au lieu de les envoyer
app.config['MAIL_SUPPRESS_SEND'] = True
mail = Mail(app)

class TestMailer:
    """Classe utilitaire pour tester l'envoi d'emails"""
    
    def __init__(self, app):
        self.app = app
        self.outbox = []
    
    def intercept_emails(self):
        """Intercepte les emails envoyés via Flask-Mail"""
        return mail.record_messages()
    
    def test_subscription_expiration_emails(self):
        """Teste les emails d'expiration d'abonnement"""
        with app.app_context():
            # Importation des modèles et services
            try:
                from backend.database import db
                
                # Afficher un message pour indiquer où nous en sommes
                logger.info("Initialisation de la base de données pour le test...")
                
                # Initialiser la base de données pour le test
                db.init_app(app)
                
                # Vérifier si les modèles peuvent être importés
                try:
                    from backend.models.company import Company
                    from backend.models.user import User
                    logger.info("Modèles importés avec succès")
                except ImportError as e:
                    logger.error(f"Erreur lors de l'importation des modèles: {e}")
                    return
                
                try:
                    from backend.models.notification_settings import NotificationSettings
                except ImportError:
                    # Si le modèle NotificationSettings n'existe pas, créons une classe temporaire
                    logger.warning("Modèle NotificationSettings non trouvé, création d'un modèle temporaire")
                    class NotificationSettings(db.Model):
                        __tablename__ = 'notification_settings'
                        id = db.Column(db.Integer, primary_key=True)
                        user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
                        email_notifications = db.Column(db.Boolean, default=True)
                        push_notifications = db.Column(db.Boolean, default=True)
                
                # Créer les tables
                logger.info("Création des tables de test...")
                db.create_all()
            except Exception as e:
                logger.error(f"Erreur lors de l'initialisation: {e}")
                return
            
            try:
                # Créer des données de test avec des dates d'expiration variables
                today = datetime.date.today()
                
                # Créer des utilisateurs admin
                admin1 = User(
                    email="admin1@test.com",
                    prenom="Admin",
                    nom="Test1",
                    password_hash="hashed_password",
                    role="admin",
                    is_active=True
                )
                db.session.add(admin1)
                db.session.flush()  # Pour obtenir l'ID de l'utilisateur
                
                # Créer des préférences de notification (activer les emails)
                notif_settings = NotificationSettings(
                    user_id=admin1.id,
                    email_notifications=True,
                    push_notifications=True
                )
                db.session.add(notif_settings)
                
                # Créer des entreprises avec différentes dates d'expiration
                company1 = Company(
                    name="Test Entreprise 7j",
                    subscription_plan="Standard",
                    subscription_end_date=(today + datetime.timedelta(days=7))
                )
                company1.users.append(admin1)
                db.session.add(company1)
                
                company2 = Company(
                    name="Test Entreprise 1j",
                    subscription_plan="Premium",
                    subscription_end_date=(today + datetime.timedelta(days=1))
                )
                admin2 = User(
                    email="admin2@test.com",
                    prenom="Admin",
                    nom="Test2",
                    password_hash="hashed_password",
                    role="admin",
                    is_active=True
                )
                db.session.add(admin2)
                notif_settings2 = NotificationSettings(
                    user_id=admin2.id,
                    email_notifications=True,
                    push_notifications=True
                )
                db.session.add(notif_settings2)
                company2.users.append(admin2)
                db.session.add(company2)
                
                company3 = Company(
                    name="Test Entreprise Expirée",
                    subscription_plan="Enterprise",
                    subscription_end_date=(today - datetime.timedelta(days=1))
                )
                admin3 = User(
                    email="admin3@test.com",
                    prenom="Admin",
                    nom="Test3",
                    password_hash="hashed_password",
                    role="admin",
                    is_active=True
                )
                db.session.add(admin3)
                notif_settings3 = NotificationSettings(
                    user_id=admin3.id,
                    email_notifications=True,
                    push_notifications=True
                )
                db.session.add(notif_settings3)
                company3.users.append(admin3)
                db.session.add(company3)
                
                # Ajouter un super admin pour tester les notifications admin
                super_admin = User(
                    email="superadmin@test.com",
                    prenom="Super",
                    nom="Admin",
                    password_hash="hashed_password",
                    is_superadmin=True,
                    role="superadmin",
                    is_active=True
                )
                db.session.add(super_admin)
                
                db.session.commit()
                
                # Maintenant, tester l'envoi d'emails
                logger.info("Données de test créées. Test de l'envoi d'emails d'expiration...")
                
                # Importer la fonction de vérification des abonnements
                from backend.tasks.subscription_tasks import check_expiring_subscriptions
                
                # Intercepter les emails
                with mail.record_messages() as outbox:
                    # Exécuter la vérification des abonnements
                    result, message = check_expiring_subscriptions()
                    
                    # Vérifier les résultats
                    if result:
                        logger.info(f"Vérification réussie: {message}")
                    else:
                        logger.error(f"Échec de la vérification: {message}")
                    
                    # Afficher les emails qui auraient été envoyés
                    logger.info(f"Nombre d'emails interceptés: {len(outbox)}")
                    for i, email in enumerate(outbox):
                        logger.info(f"\nEmail {i+1}:")
                        logger.info(f"De: {email.sender}")
                        logger.info(f"À: {email.recipients}")
                        logger.info(f"Sujet: {email.subject}")
                        logger.info(f"Corps HTML: {email.html[:200]}...")  # Afficher les 200 premiers caractères
                
            except Exception as e:
                logger.error(f"Erreur lors du test: {e}")
                db.session.rollback()
            finally:
                # Nettoyer la base de données
                db.session.remove()
                db.drop_all()

if __name__ == "__main__":
    # Exécuter le test
    tester = TestMailer(app)
    tester.test_subscription_expiration_emails()
