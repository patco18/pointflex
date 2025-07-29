"""
Script pour créer des plans d'abonnement de test
"""
import os
import sys
import json

# Ajouter le répertoire parent au path pour importer les modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import db
from backend.app import app
from backend.models.subscription_plan import SubscriptionPlan

# Plans d'abonnement à créer
test_plans = [
    {
        'name': 'Starter',
        'duration_months': 1,
        'price': 29.99,
        'max_employees': 10,
        'description': 'Plan de démarrage idéal pour les petites entreprises',
        'features': ['Pointage de base', 'Gestion des employés', 'Rapports mensuels'],
        'is_active': True,
        'is_featured': False
    },
    {
        'name': 'Starter',
        'duration_months': 3,
        'price': 24.99,  # Prix mensuel réduit pour abonnement plus long
        'max_employees': 10,
        'description': 'Plan de démarrage pour 3 mois avec tarif réduit',
        'features': ['Pointage de base', 'Gestion des employés', 'Rapports mensuels'],
        'is_active': True,
        'is_featured': False
    },
    {
        'name': 'Standard',
        'duration_months': 1,
        'price': 49.99,
        'max_employees': 25,
        'description': 'Plan standard avec plus de fonctionnalités',
        'features': ['Pointage avancé', 'Gestion des employés', 'Rapports détaillés', 'Géolocalisation', 'Gestion des congés'],
        'is_active': True,
        'is_featured': True
    },
    {
        'name': 'Standard',
        'duration_months': 6,
        'price': 39.99,  # Prix mensuel réduit pour abonnement plus long
        'max_employees': 25,
        'description': 'Plan standard pour 6 mois avec tarif réduit',
        'features': ['Pointage avancé', 'Gestion des employés', 'Rapports détaillés', 'Géolocalisation', 'Gestion des congés'],
        'is_active': True,
        'is_featured': False
    },
    {
        'name': 'Premium',
        'duration_months': 1,
        'price': 99.99,
        'max_employees': 50,
        'description': 'Plan premium avec toutes les fonctionnalités',
        'features': ['Pointage avancé', 'Gestion des employés', 'Rapports détaillés', 'Géolocalisation', 'Gestion des congés', 'API Webhooks', 'Support prioritaire', 'Intégrations'],
        'is_active': True,
        'is_featured': False
    },
    {
        'name': 'Premium',
        'duration_months': 12,
        'price': 79.99,  # Prix mensuel réduit pour abonnement plus long
        'max_employees': 50,
        'description': 'Plan premium pour 12 mois avec tarif réduit',
        'features': ['Pointage avancé', 'Gestion des employés', 'Rapports détaillés', 'Géolocalisation', 'Gestion des congés', 'API Webhooks', 'Support prioritaire', 'Intégrations'],
        'is_active': True,
        'is_featured': False
    },
    {
        'name': 'Enterprise',
        'duration_months': 12,
        'price': 199.99,
        'max_employees': 200,
        'description': 'Plan entreprise pour les grandes organisations',
        'features': ['Pointage avancé', 'Gestion des employés', 'Rapports détaillés', 'Géolocalisation', 'Gestion des congés', 'API Webhooks', 'Support dédié 24/7', 'Intégrations personnalisées', 'Formations', 'Déploiement personnalisé'],
        'is_active': True,
        'is_featured': False
    }
]

with app.app_context():
    print("Création des plans d'abonnement de test...")
    
    # Supprimer les plans existants
    SubscriptionPlan.query.delete()
    
    # Créer les nouveaux plans
    for plan_data in test_plans:
        # Convertir la liste de fonctionnalités en JSON
        features_json = json.dumps(plan_data['features'])
        
        plan = SubscriptionPlan(
            name=plan_data['name'],
            duration_months=plan_data['duration_months'],
            price=plan_data['price'],
            max_employees=plan_data['max_employees'],
            description=plan_data['description'],
            features=features_json,
            is_active=plan_data['is_active'],
            is_featured=plan_data['is_featured']
        )
        db.session.add(plan)
    
    # Enregistrer les modifications
    db.session.commit()
    
    # Vérification
    count = SubscriptionPlan.query.count()
    print(f"{count} plans d'abonnement créés avec succès.")
