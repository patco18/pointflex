"""
Script de migration pour associer les entreprises aux plans d'abonnement

Ce script est destiné à être exécuté une seule fois pour mettre à jour la base de données
en associant les entreprises existantes à leurs plans d'abonnement respectifs.
"""
from flask import current_app
from backend.database import db
from backend.models.company import Company
from backend.models.subscription_plan import SubscriptionPlan
import json
import click

def migrate_subscription_plans():
    """Migre les données d'abonnement des entreprises vers le nouveau modèle"""
    
    # 1. Créer les plans d'abonnement par défaut s'ils n'existent pas déjà
    create_default_plans()
    
    # 2. Mettre à jour les références de subscription_plan_id pour les entreprises existantes
    migrate_company_subscriptions()
    
    return True

def create_default_plans():
    """Crée les plans d'abonnement par défaut dans la base de données"""
    
    # Vérifier si des plans existent déjà
    existing_plans = SubscriptionPlan.query.count()
    if existing_plans > 0:
        click.echo(f"{existing_plans} plans d'abonnement trouvés. Aucun plan par défaut ne sera créé.")
        return
        
    click.echo("Création des plans d'abonnement par défaut...")
    
    # Définir les plans par défaut
    default_plans = [
        {
            'name': 'basic',
            'stripe_price_id': None,
            'duration_months': 1,
            'price': 9.99,
            'max_employees': 10,
            'description': 'Plan de démarrage pour les très petites entreprises',
            'features': json.dumps([
                'Pointage géolocalisé',
                'Gestion des congés',
                'Rapports basiques'
            ]),
            'is_active': True,
            'is_featured': False
        },
        {
            'name': 'premium',
            'stripe_price_id': None,
            'duration_months': 1,
            'price': 19.99,
            'max_employees': 50,
            'description': 'Plan idéal pour les PME',
            'features': json.dumps([
                'Pointage géolocalisé',
                'Gestion des congés',
                'Rapports avancés',
                'Missions et déplacements',
                'Notifications'
            ]),
            'is_active': True,
            'is_featured': True  # Plan mis en avant
        },
        {
            'name': 'enterprise',
            'stripe_price_id': None,
            'duration_months': 1,
            'price': 49.99,
            'max_employees': 999,
            'description': 'Plan pour les grandes entreprises avec besoins spécifiques',
            'features': json.dumps([
                'Pointage géolocalisé',
                'Gestion des congés',
                'Rapports avancés',
                'Missions et déplacements',
                'Notifications',
                'API et webhooks',
                'Support dédié',
                'Personnalisation complète'
            ]),
            'is_active': True,
            'is_featured': False
        }
    ]
    
    # Créer les plans dans la base de données
    for plan_data in default_plans:
        plan = SubscriptionPlan(**plan_data)
        db.session.add(plan)
    
    try:
        db.session.commit()
        click.echo(f"{len(default_plans)} plans d'abonnement créés avec succès.")
    except Exception as e:
        db.session.rollback()
        click.echo(f"Erreur lors de la création des plans : {str(e)}")
        
        # Vérifier si les plans d'abonnement existent
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
            plans = [basic_plan, premium_plan, enterprise_plan]
        
        # Créer un dictionnaire pour faciliter l'accès aux plans par nom
        plan_dict = {plan.name.lower(): plan for plan in plans}
        
def migrate_company_subscriptions():
    """Migre les données d'abonnement des entreprises existantes en utilisant SQLite directement"""
    
    # Obtenir les plans d'abonnement existants
    plans = {plan.name.lower(): plan for plan in SubscriptionPlan.query.all()}
    if not plans:
        click.echo("Aucun plan d'abonnement trouvé. Impossible de migrer les entreprises.")
        return
    
    # Plan par défaut en cas de correspondance non trouvée
    default_plan = SubscriptionPlan.query.filter_by(is_featured=True).first()
    if not default_plan:
        default_plan = SubscriptionPlan.query.first()
    
    # Utiliser SQLite directement pour contourner les limitations de SQLAlchemy
    import sqlite3
    import os
    
    # Chemin de la base de données
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(current_dir, "instance", "pointflex.db")
    
    try:
        # Connexion directe à SQLite
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Récupérer toutes les entreprises
        cursor.execute("SELECT id, name, subscription_plan, max_employees FROM companies")
        companies_data = cursor.fetchall()
        click.echo(f"{len(companies_data)} entreprises à migrer...")
        
        # Compteur pour les mises à jour
        updated_count = 0
        errors = []
        
        # Mise à jour de chaque entreprise
        for company_id, company_name, plan_name, max_employees in companies_data:
            try:
                # Convertir le nom du plan en minuscule pour la correspondance
                plan_name_lower = plan_name.lower() if plan_name else 'basic'
                
                # Associer au plan correspondant ou au plan par défaut
                if plan_name_lower in plans:
                    plan_id = plans[plan_name_lower].id
                else:
                    click.echo(f"Plan '{plan_name}' non trouvé pour l'entreprise {company_name}, utilisation du plan par défaut")
                    plan_id = default_plan.id
                
                # Mettre à jour directement dans la base de données
                cursor.execute(
                    "UPDATE companies SET subscription_plan_id = ? WHERE id = ?",
                    (plan_id, company_id)
                )
                updated_count += 1
            except Exception as e:
                errors.append(f"Erreur pour l'entreprise {company_id} ({company_name}): {str(e)}")
        
        # Valider les modifications
        conn.commit()
        conn.close()
        
        click.echo(f"{updated_count} entreprises migrées avec succès.")
        
        # Afficher les erreurs éventuelles
        if errors:
            click.echo(f"\nErreurs rencontrées ({len(errors)}):")
            for error in errors:
                click.echo(f"- {error}")
                
    except Exception as e:
        click.echo(f"Erreur lors de la connexion à la base de données: {str(e)}")
        import traceback
        click.echo(traceback.format_exc())
        
    # Ces lignes sont maintenant remplacées par la nouvelle implémentation avec SQLite directe
    # Ces lignes sont maintenant remplacées par la nouvelle implémentation avec SQLite directe

if __name__ == "__main__":
    # En cas d'exécution directe du script
    from backend.app import create_app
    app = create_app()
    with app.app_context():
        migrate_subscription_plans()
