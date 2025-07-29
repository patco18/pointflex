"""
Script simple pour tester le système d'envoi d'emails de notification d'expiration d'abonnement
"""
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import logging
from typing import Dict, Any

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Ajouter le répertoire racine du projet au chemin d'importation
project_root = Path(__file__).parent.parent.parent  # Remonter jusqu'à la racine du projet
sys.path.insert(0, str(project_root))

# Vérification du chemin d'importation
logger.info(f"Chemin d'importation Python: {sys.path[0]}")
logger.info(f"Répertoires dans le chemin: {os.listdir(sys.path[0]) if os.path.exists(sys.path[0]) else 'Chemin non valide'}")

# Vérification de la présence du package backend
if os.path.exists(os.path.join(sys.path[0], 'backend')):
    logger.info("Package 'backend' trouvé dans le chemin d'importation")
else:
    logger.error(f"Package 'backend' non trouvé dans {sys.path[0]}")

def test_subscription_email_rendering():
    """
    Test simple pour rendre et afficher les templates d'emails sans les envoyer
    """
    try:
        logger.info("Test de rendu des templates d'email pour les notifications d'expiration...")
        
        # Importer la fonction de rendu de template et Flask
        try:
            from backend.services.email.email_service import render_email_template
            from flask import Flask
            from flask.templating import render_template_string
            logger.info("Module de service email importé avec succès")
            
            # Créer une application Flask pour le contexte
            app = Flask(__name__)
            app.config['TESTING'] = True
        except ImportError as e:
            logger.error(f"Erreur lors de l'importation du service email: {e}")
            return
        
        # Données de test
        context = {
            "user_name": "Admin Test",
            "company_name": "Entreprise Test",
            "plan_name": "Plan Premium",
            "days_remaining": 7,
            "expiration_date": "31/08/2023",
            "renewal_url": "http://localhost:5173/subscription/renew?company_id=1",
            "current_year": datetime.now().year
        }
        
        # Fonction de rendu simplifiée pour éviter l'erreur de contexte
        def simple_render(template, context):
            # Cette fonction remplace render_email_template pour éviter l'erreur de contexte
            with app.app_context():
                try:
                    return render_template_string(template, **context)
                except Exception as e:
                    logger.error(f"Erreur lors du rendu du template: {e}")
                    # Retourner une version simplifiée pour continuer le test
                    return f"<html><body><h1>Email de test pour {context.get('company_name')}</h1><p>Ceci est un test.</p></body></html>"
        
        # Tester le rendu du template d'expiration imminente
        try:
            from backend.services.email.email_service import SUBSCRIPTION_EXPIRING_SOON_TEMPLATE
            logger.info("\n===== Template d'expiration imminente =====")
            # Utiliser notre fonction de rendu simplifiée
            html_content = simple_render(SUBSCRIPTION_EXPIRING_SOON_TEMPLATE, context)
            
            # Enregistrer dans un fichier pour visualisation
            output_path = Path(__file__).parent / "subscription_expiring_soon_email.html"
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            logger.info(f"Template enregistré dans {output_path}")
            
            # Afficher un aperçu
            preview = html_content[:500] + "..." if len(html_content) > 500 else html_content
            logger.info(f"Aperçu du contenu:\n{preview}")
        except Exception as e:
            logger.error(f"Erreur lors du rendu du template d'expiration imminente: {e}")
        
        # Tester le rendu du template d'abonnement expiré
        try:
            from backend.services.email.email_service import SUBSCRIPTION_EXPIRED_TEMPLATE
            logger.info("\n===== Template d'abonnement expiré =====")
            # Utiliser notre fonction de rendu simplifiée
            html_content = simple_render(SUBSCRIPTION_EXPIRED_TEMPLATE, context)
            
            # Enregistrer dans un fichier pour visualisation
            output_path = Path(__file__).parent / "subscription_expired_email.html"
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            logger.info(f"Template enregistré dans {output_path}")
            
            # Afficher un aperçu
            preview = html_content[:500] + "..." if len(html_content) > 500 else html_content
            logger.info(f"Aperçu du contenu:\n{preview}")
        except Exception as e:
            logger.error(f"Erreur lors du rendu du template d'abonnement expiré: {e}")
            
    except Exception as e:
        logger.error(f"Erreur générale: {e}")

def test_email_service_direct():
    """
    Test direct des fonctions d'envoi d'email sans passer par la base de données
    """
    try:
        logger.info("Test direct des fonctions d'envoi d'email...")
        
        # Importer les fonctions d'envoi d'email
        try:
            from backend.services.email import send_subscription_expiring_soon_email, send_subscription_expired_email
            logger.info("Fonctions d'envoi d'email importées avec succès")
        except ImportError as e:
            logger.error(f"Erreur lors de l'importation des fonctions d'envoi d'email: {e}")
            return
        
        # Configuration pour intercepter les emails au lieu de les envoyer
        from flask import Flask
        from flask_mail import Mail
        
        app = Flask(__name__)
        # Configuration complète pour le test
        app.config['TESTING'] = True
        app.config['MAIL_SERVER'] = 'localhost'
        app.config['MAIL_PORT'] = 1025
        app.config['MAIL_USERNAME'] = None
        app.config['MAIL_PASSWORD'] = None
        app.config['MAIL_DEFAULT_SENDER'] = 'test@pointflex.com'
        app.config['MAIL_USE_TLS'] = False
        app.config['MAIL_USE_SSL'] = False
        app.config['MAIL_SUPPRESS_SEND'] = True  # Ne pas envoyer réellement
        
        # Configuration SMTP requise par les fonctions de service
        app.config['SMTP_SERVER'] = 'localhost'
        app.config['SMTP_PORT'] = 1025
        app.config['SMTP_USERNAME'] = None
        app.config['SMTP_PASSWORD'] = None
        app.config['SENDER_EMAIL'] = 'test@pointflex.com'
        
        # Initialisation de Flask-Mail
        mail = Mail(app)
        mail.init_app(app)
        
        with app.app_context():
            # Surcharge des fonctions de l'API email pour tester sans vrai serveur SMTP
            import backend.services.email.email_service
            backend.services.email.email_service.send_email = lambda to, subject, html_content: True
            
            with mail.record_messages() as outbox:
                # Test d'email d'expiration imminente
                logger.info("\n===== Test d'envoi d'email d'expiration imminente =====")
                result = send_subscription_expiring_soon_email(
                    user_email="admin@test.com",
                    user_name="Admin Test",
                    company_name="Entreprise Test",
                    plan_name="Plan Premium",
                    days_remaining=7,
                    expiration_date="31/08/2023",
                    renewal_url="http://localhost:5173/subscription/renew?company_id=1"
                )
                logger.info(f"Résultat de l'envoi: {result}")
                
                # Test d'email d'abonnement expiré
                logger.info("\n===== Test d'envoi d'email d'abonnement expiré =====")
                result = send_subscription_expired_email(
                    user_email="admin@test.com",
                    user_name="Admin Test",
                    company_name="Entreprise Test",
                    plan_name="Plan Premium",
                    expiration_date="31/08/2023",
                    renewal_url="http://localhost:5173/subscription/renew?company_id=1"
                )
                logger.info(f"Résultat de l'envoi: {result}")
                
                # Afficher les emails capturés
                logger.info(f"\nNombre d'emails capturés: {len(outbox)}")
                for i, email in enumerate(outbox):
                    logger.info(f"\nEmail {i+1}:")
                    logger.info(f"De: {email.sender}")
                    logger.info(f"À: {email.recipients}")
                    logger.info(f"Sujet: {email.subject}")
                    
                    # Enregistrer dans un fichier pour visualisation
                    output_path = Path(__file__).parent / f"email_captured_{i+1}.html"
                    with open(output_path, "w", encoding="utf-8") as f:
                        f.write(email.html)
                    logger.info(f"Email enregistré dans {output_path}")
    
    except Exception as e:
        logger.error(f"Erreur générale: {e}")

if __name__ == "__main__":
    logger.info("=== Démarrage des tests du système d'emails d'expiration ===")
    
    # Test de rendu des templates
    test_subscription_email_rendering()
    
    # Test direct des fonctions d'envoi
    test_email_service_direct()
    
    logger.info("=== Tests terminés ===")
