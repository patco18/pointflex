import sys
import os
import datetime
from pathlib import Path

# Ajouter le répertoire parent au chemin pour pouvoir importer les modules du backend
sys.path.insert(0, str(Path(__file__).parent.parent))

from flask import Flask
from flask_mail import Mail
import logging

from models.company import Company
from models.user import User
from database import db
from extensions import mail
from config import TestingConfig

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Créer une instance de l'application Flask pour les tests
app = Flask(__name__)
app.config.from_object(TestingConfig)

# Configurer l'application pour rediriger les emails vers la console ou un fichier
app.config['MAIL_SUPPRESS_SEND'] = True  # Ne pas envoyer de vrais emails
app.config['MAIL_DEBUG'] = 1  # Afficher les détails de debug

# Initialiser les extensions
db.init_app(app)
mail.init_app(app)

def setup_test_data():
    """Configurer des données de test avec différentes dates d'expiration"""
    with app.app_context():
        # Supprimer toutes les données existantes
        User.query.delete()
        Company.query.delete()
        db.session.commit()
        
        # Créer des entreprises avec différentes dates d'expiration
        today = datetime.date.today()
        
        # Une entreprise dont l'abonnement expire dans 7 jours
        company1 = Company(
            name="TestEntreprise7Jours",
            subscription_plan_id=1,
            subscription_plan="Standard",
            subscription_status="active",
            subscription_expiration_date=(today + datetime.timedelta(days=7)).isoformat(),
            max_employees=10
        )
        
        # Une entreprise dont l'abonnement expire dans 3 jours
        company2 = Company(
            name="TestEntreprise3Jours",
            subscription_plan_id=2,
            subscription_plan="Premium",
            subscription_status="active",
            subscription_expiration_date=(today + datetime.timedelta(days=3)).isoformat(),
            max_employees=25
        )
        
        # Une entreprise dont l'abonnement expire dans 1 jour
        company3 = Company(
            name="TestEntreprise1Jour",
            subscription_plan_id=1,
            subscription_plan="Standard",
            subscription_status="active",
            subscription_expiration_date=(today + datetime.timedelta(days=1)).isoformat(),
            max_employees=5
        )
        
        # Une entreprise dont l'abonnement est déjà expiré
        company4 = Company(
            name="TestEntrepriseExpiré",
            subscription_plan_id=3,
            subscription_plan="Enterprise",
            subscription_status="expired",
            subscription_expiration_date=(today - datetime.timedelta(days=2)).isoformat(),
            max_employees=50
        )
        
        # Ajouter des utilisateurs admin pour chaque entreprise
        user1 = User(
            email="admin1@test.com",
            first_name="Admin",
            last_name="Un",
            password="test123",
            role="admin",
            company_id=1,
            is_active=True
        )
        
        user2 = User(
            email="admin2@test.com",
            first_name="Admin",
            last_name="Deux",
            password="test123",
            role="admin",
            company_id=2,
            is_active=True
        )
        
        user3 = User(
            email="admin3@test.com",
            first_name="Admin",
            last_name="Trois",
            password="test123",
            role="admin",
            company_id=3,
            is_active=True
        )
        
        user4 = User(
            email="admin4@test.com",
            first_name="Admin",
            last_name="Quatre",
            password="test123",
            role="admin",
            company_id=4,
            is_active=True
        )
        
        db.session.add_all([company1, company2, company3, company4])
        db.session.add_all([user1, user2, user3, user4])
        db.session.commit()
        
        logger.info("Données de test créées avec succès")
        logger.info(f"Entreprise 1: expire dans 7 jours - {company1.subscription_expiration_date}")
        logger.info(f"Entreprise 2: expire dans 3 jours - {company2.subscription_expiration_date}")
        logger.info(f"Entreprise 3: expire dans 1 jour - {company3.subscription_expiration_date}")
        logger.info(f"Entreprise 4: déjà expirée - {company4.subscription_expiration_date}")

def import_and_run_subscription_check():
    """Importer et exécuter le code de vérification d'abonnement"""
    try:
        # Importer dynamiquement le module qui contient la logique de vérification des abonnements
        # Note: ajustez le chemin d'importation en fonction de votre structure de code
        from tasks.subscription_tasks import check_subscription_expirations
        
        with app.app_context():
            # Exécuter la fonction de vérification des abonnements
            logger.info("Exécution de la vérification des abonnements...")
            
            # Intercepter les emails
            with mail.record_messages() as outbox:
                check_subscription_expirations()
                
                # Afficher les détails des emails qui auraient été envoyés
                logger.info(f"Nombre d'emails qui auraient été envoyés: {len(outbox)}")
                for i, email in enumerate(outbox):
                    logger.info(f"Email {i+1}:")
                    logger.info(f"  Destinataire: {email.recipients}")
                    logger.info(f"  Sujet: {email.subject}")
                    logger.info(f"  Corps: {email.body}")
    
    except ImportError as e:
        logger.error(f"Erreur lors de l'importation du module: {e}")
        logger.info("Assurez-vous que le module de vérification d'abonnement existe.")
    except Exception as e:
        logger.error(f"Erreur lors de l'exécution de la vérification: {e}")

def test_subscription_notification_emails():
    """Fonction principale pour tester le système de notification d'abonnement"""
    try:
        # Configurer les données de test
        setup_test_data()
        
        # Exécuter la vérification des abonnements
        import_and_run_subscription_check()
        
        logger.info("Test terminé avec succès")
    except Exception as e:
        logger.error(f"Erreur lors du test: {e}")

if __name__ == "__main__":
    # Exécuter le test
    test_subscription_notification_emails()
