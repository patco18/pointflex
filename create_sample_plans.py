"""
Script pour créer des plans d'abonnement d'exemple dans la base de données
"""
import os
import json
import sys
import datetime

# Ajouter le répertoire parent au path pour importer les modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from backend.app import app
    from backend.database import db
    from backend.models.subscription_plan import SubscriptionPlan
except ImportError as e:
    print(f"Erreur d'importation des modules: {e}")
    sys.exit(1)

# Plans d'abonnement d'exemple
SAMPLE_PLANS = [
    {
        "name": "Starter",
        "duration_months": 1,
        "price": 29.99,
        "max_employees": 10,
        "description": "Plan de base pour les petites entreprises",
        "features": ["Pointage de base", "Gestion des employés", "Rapports mensuels"],
        "is_active": True,
        "is_featured": False
    },
    {
        "name": "Starter",
        "duration_months": 3,
        "price": 24.99,  # Prix mensuel réduit pour engagement 3 mois
        "max_employees": 10,
        "description": "Plan de base pour les petites entreprises (engagement 3 mois)",
        "features": ["Pointage de base", "Gestion des employés", "Rapports mensuels"],
        "is_active": True,
        "is_featured": False
    },
    {
        "name": "Standard",
        "duration_months": 1,
        "price": 49.99,
        "max_employees": 25,
        "description": "Plan standard avec fonctionnalités avancées",
        "features": ["Pointage avancé", "Gestion des employés", "Rapports détaillés", "Géolocalisation", "Gestion des congés"],
        "is_active": True,
        "is_featured": True
    },
    {
        "name": "Standard",
        "duration_months": 6,
        "price": 39.99,  # Prix mensuel réduit pour engagement 6 mois
        "max_employees": 25,
        "description": "Plan standard avec fonctionnalités avancées (engagement 6 mois)",
        "features": ["Pointage avancé", "Gestion des employés", "Rapports détaillés", "Géolocalisation", "Gestion des congés"],
        "is_active": True,
        "is_featured": False
    },
    {
        "name": "Premium",
        "duration_months": 1,
        "price": 89.99,
        "max_employees": 50,
        "description": "Plan premium avec toutes les fonctionnalités",
        "features": ["Pointage avancé", "Gestion des employés", "Rapports détaillés", "Géolocalisation", "Gestion des congés", "API Webhooks", "Support prioritaire", "Intégrations"],
        "is_active": True,
        "is_featured": False
    },
    {
        "name": "Premium",
        "duration_months": 12,
        "price": 69.99,  # Prix mensuel réduit pour engagement 12 mois
        "max_employees": 50,
        "description": "Plan premium avec toutes les fonctionnalités (engagement 12 mois)",
        "features": ["Pointage avancé", "Gestion des employés", "Rapports détaillés", "Géolocalisation", "Gestion des congés", "API Webhooks", "Support prioritaire", "Intégrations"],
        "is_active": True,
        "is_featured": False
    },
    {
        "name": "Enterprise",
        "duration_months": 12,
        "price": 149.99,
        "max_employees": 100,
        "description": "Plan entreprise personnalisable",
        "features": ["Pointage avancé", "Gestion des employés", "Rapports détaillés", "Géolocalisation", "Gestion des congés", "API Webhooks", "Support dédié 24/7", "Intégrations personnalisées", "Formations", "Déploiement personnalisé"],
        "is_active": True,
        "is_featured": False
    }
]

def create_sample_plans():
    """Créer des plans d'abonnement d'exemple dans la base de données"""
    with app.app_context():
        print(f"Base de données: {os.environ.get('DATABASE_URI', 'Non défini dans les variables d\'environnement')}")
        
        # Vérifier si des plans existent déjà
        existing_plans = SubscriptionPlan.query.count()
        print(f"Plans existants: {existing_plans}")
        
        if existing_plans > 0:
            print("Des plans existent déjà dans la base de données, mais ils ne sont pas visibles dans l'API.")
            print("Suppression des plans existants pour en créer de nouveaux...")
            
            # Supprimer tous les plans existants
            print("Suppression des plans existants...")
            SubscriptionPlan.query.delete()
            db.session.commit()
        
        # Créer les nouveaux plans
        print("Création des nouveaux plans d'abonnement...")
        for plan_data in SAMPLE_PLANS:
            # Convertir les features en JSON
            features_json = json.dumps(plan_data["features"])
            
            new_plan = SubscriptionPlan(
                name=plan_data["name"],
                duration_months=plan_data["duration_months"],
                price=plan_data["price"],
                max_employees=plan_data["max_employees"],
                description=plan_data["description"],
                features=features_json,
                is_active=plan_data["is_active"],
                is_featured=plan_data["is_featured"],
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            
            db.session.add(new_plan)
            print(f"Plan ajouté: {plan_data['name']} ({plan_data['duration_months']} mois)")
        
        # Sauvegarder les modifications
        try:
            db.session.commit()
            print("Plans d'abonnement créés avec succès!")
        except Exception as e:
            db.session.rollback()
            print(f"Erreur lors de la création des plans: {e}")

if __name__ == "__main__":
    create_sample_plans()
