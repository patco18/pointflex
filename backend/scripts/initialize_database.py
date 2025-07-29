"""
Script pour initialiser la base de données avec toutes les tables nécessaires.
"""

from backend.app import create_app
from backend.database import db
from backend.models.company import Company
from backend.models.subscription_plan import SubscriptionPlan
import traceback

def initialize_database():
    """Initialise la base de données avec toutes les tables nécessaires"""
    try:
        print("Création de l'application Flask...")
        app = create_app()
        
        # Surcharger la configuration pour pointer vers la base de données spécifique
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///D:/PROJET SAAS/tests/pointflex-15/backend/instance/pointflex.db'
        print(f"URI de base de données utilisée: {app.config['SQLALCHEMY_DATABASE_URI']}")
        
        with app.app_context():
            print("Création des tables dans la base de données...")
            db.create_all()
            print("Tables créées avec succès!")
            
            # Vérifier si des plans d'abonnement existent
            plans = SubscriptionPlan.query.all()
            if not plans:
                print("Aucun plan d'abonnement trouvé. Création des plans par défaut...")
                # Créer les plans par défaut
                basic_plan = SubscriptionPlan(
                    name='basic',
                    duration_months=1,
                    price=9.99,
                    max_employees=10,
                    description="Plan de base avec fonctionnalités essentielles",
                    features='["pointage_basic"]',
                    is_active=True
                )
                
                premium_plan = SubscriptionPlan(
                    name='premium',
                    duration_months=1,
                    price=19.99,
                    max_employees=50,
                    description="Plan premium avec fonctionnalités avancées",
                    features='["pointage_basic", "rapports", "geofencing"]',
                    is_active=True
                )
                
                enterprise_plan = SubscriptionPlan(
                    name='enterprise',
                    duration_months=1,
                    price=49.99,
                    max_employees=999,
                    description="Plan entreprise avec fonctionnalités complètes",
                    features='["pointage_basic", "rapports", "geofencing", "api", "sso"]',
                    is_active=True,
                    is_featured=True
                )
                
                db.session.add_all([basic_plan, premium_plan, enterprise_plan])
                db.session.commit()
                print("Plans par défaut créés avec succès.")
                
            # Vérifier si des entreprises existent
            companies = Company.query.all()
            print(f"Nombre d'entreprises dans la base: {len(companies)}")
                
    except Exception as e:
        print(f"Erreur lors de l'initialisation de la base de données: {str(e)}")
        print(traceback.format_exc())
        raise

if __name__ == "__main__":
    initialize_database()
