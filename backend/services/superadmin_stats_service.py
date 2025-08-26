"""
Script de correction pour les routes SuperAdmin
pour gérer les erreurs de colonnes manquantes dans les requêtes
"""

import os
import sys

# Ajouter le chemin du projet pour les imports
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.models.company import Company
from backend.models.user import User
from backend.models.pointage import Pointage
from backend.database import db
from datetime import datetime, timedelta
from flask import current_app
import traceback
import sqlite3

def get_plan_prices():
    """Version sécurisée de la fonction pour obtenir les prix des plans"""
    try:
        from backend.models.subscription_plan import SubscriptionPlan
        plans = SubscriptionPlan.query.filter_by(duration_months=1).all()
        prices = {}
        
        for plan in plans:
            plan_name = plan.name.lower()
            prices[plan_name] = float(plan.price)
        
        default_prices = {
            'basic': 29.0,
            'premium': 99.0,
            'enterprise': 299.0,
            'starter': 29.99,
            'standard': 49.99
        }
        
        for key, value in default_prices.items():
            if key not in prices:
                prices[key] = value
                
        return prices
    except Exception as e:
        print(f"Erreur lors de la récupération des prix des plans: {str(e)}")
        return {
            'basic': 29.0,
            'premium': 99.0,
            'enterprise': 299.0,
            'starter': 29.99,
            'standard': 49.99
        }

def get_companies_safe():
    """Version sécurisée pour récupérer les entreprises sans dépendre des colonnes manquantes"""
    try:
        # Utiliser une requête SQL directe qui évite les colonnes manquantes
        conn = db.engine.raw_connection()
        cursor = conn.cursor()
        
        # Récupérer seulement les colonnes essentielles
        cursor.execute("""
            SELECT 
                id, 
                name, 
                subscription_plan, 
                subscription_status,
                subscription_start,
                subscription_end,
                is_active,
                created_at
            FROM companies
        """)
        
        # Créer des objets simplifiés avec les données récupérées
        companies = []
        for row in cursor.fetchall():
            # Convertir en objet de type dict pour faciliter l'accès
            company = {
                'id': row[0],
                'name': row[1],
                'subscription_plan': row[2],
                'subscription_status': row[3],
                'subscription_start': row[4],
                'subscription_end': row[5],
                'is_active': bool(row[6]),
                'created_at': row[7]
            }
            companies.append(company)
            
        cursor.close()
        return companies
    
    except Exception as e:
        print(f"Erreur lors de la récupération des entreprises: {str(e)}")
        traceback.print_exc()
        return []

def get_global_stats_safe():
    """Version sécurisée des statistiques globales"""
    try:
        # Statistiques de base
        total_companies = db.session.query(db.func.count(Company.id)).scalar()
        active_companies = db.session.query(db.func.count(Company.id)).filter(Company.is_active == True).scalar()
        total_users = db.session.query(db.func.count(User.id)).scalar()
        active_users = db.session.query(db.func.count(User.id)).filter(User.is_active == True).scalar()
        
        # Utiliser une requête SQL directe pour les pointages
        conn = db.engine.raw_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM pointages")
        total_pointages = cursor.fetchone()[0]
        cursor.close()
        
        # Statistiques par plan
        plans_distribution = {}
        for plan in ['basic', 'premium', 'enterprise']:
            count = db.session.query(db.func.count(Company.id)).filter(Company.subscription_plan == plan).scalar()
            plans_distribution[plan] = count
        
        # Revenus calculés avec les tarifs actuels
        plan_prices = get_plan_prices()
        monthly_revenue = sum(
            plans_distribution[plan] * plan_prices.get(plan.lower(), 0) 
            for plan in plans_distribution
        )
        
        # Statistiques temporelles
        today = datetime.utcnow().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        new_companies_week = db.session.query(db.func.count(Company.id)).filter(Company.created_at >= week_ago).scalar()
        new_users_week = db.session.query(db.func.count(User.id)).filter(User.created_at >= week_ago).scalar()
        
        # Pointages aujourd'hui avec requête SQL directe
        conn = db.engine.raw_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM pointages WHERE date_pointage = ?", (today.isoformat(),))
        pointages_today = cursor.fetchone()[0]
        cursor.close()
        
        return {
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
        }
        
    except Exception as e:
        print(f"Erreur lors de la récupération des statistiques: {str(e)}")
        traceback.print_exc()
        return {
            'stats': {
                'total_companies': 0,
                'active_companies': 0,
                'total_users': 0,
                'active_users': 0,
                'total_pointages': 0,
                'plans_distribution': {'basic': 0, 'premium': 0, 'enterprise': 0},
                'revenue_monthly': 0,
                'new_companies_week': 0,
                'new_users_week': 0,
                'pointages_today': 0,
                'error': str(e)
            }
        }

def get_subscription_stats_safe():
    """Version sécurisée des statistiques d'abonnement"""
    try:
        # Récupérer les entreprises avec la fonction sécurisée
        companies = get_companies_safe()
        
        total_subscriptions = len(companies)
        active_subscriptions = 0
        trial_subscriptions = 0
        expired_subscriptions = 0
        revenue_monthly = 0
        
        plan_distribution = {
            'basic': 0,
            'premium': 0,
            'enterprise': 0
        }
        
        renewal_upcoming_30_days = 0
        
        today = datetime.now().date()
        thirty_days_future = today + timedelta(days=30)
        
        # Calculer les métriques
        for company in companies:
            # Distribution des plans
            plan = company.get('subscription_plan', 'basic')
            if plan in plan_distribution:
                plan_distribution[plan] += 1
            else:
                plan_distribution[plan] = 1
            
            # Statut et revenus
            if company.get('is_active', False):
                # Vérifier si on est en période d'essai (moins de 30 jours depuis le début)
                is_trial = False
                subscription_start = company.get('subscription_start')
                if subscription_start:
                    try:
                        if isinstance(subscription_start, str):
                            subscription_start = datetime.strptime(subscription_start, '%Y-%m-%d').date()
                        days_since_start = (today - subscription_start).days
                        is_trial = days_since_start <= 30 and company.get('subscription_status') != 'expired'
                    except Exception:
                        pass
                
                if is_trial:
                    trial_subscriptions += 1
                else:
                    active_subscriptions += 1
                    
                    # Tarifs mensuels pour calculer les revenus récurrents
                    plan_prices = get_plan_prices()
                    plan_price = plan_prices.get(plan.lower(), 0)
                    revenue_monthly += plan_price
            
            # Vérifier si l'abonnement est expiré
            subscription_end = company.get('subscription_end')
            if subscription_end:
                try:
                    if isinstance(subscription_end, str):
                        subscription_end = datetime.strptime(subscription_end, '%Y-%m-%d').date()
                    
                    if subscription_end < today:
                        expired_subscriptions += 1
                    
                    # Vérifier les renouvellements à venir
                    if (subscription_end > today and subscription_end <= thirty_days_future):
                        renewal_upcoming_30_days += 1
                except Exception:
                    pass
        
        stats = {
            'total_subscriptions': total_subscriptions,
            'active_subscriptions': active_subscriptions,
            'trial_subscriptions': trial_subscriptions,
            'expired_subscriptions': expired_subscriptions,
            'revenue_monthly': revenue_monthly,
            'plan_distribution': plan_distribution,
            'renewal_upcoming_30_days': renewal_upcoming_30_days
        }
        
        return {
            'success': True,
            'stats': stats
        }
        
    except Exception as e:
        print(f"Erreur lors de la récupération des statistiques d'abonnement: {str(e)}")
        traceback.print_exc()
        return {
            'success': False,
            'message': f"Erreur lors de la récupération des statistiques: {str(e)}",
            'stats': {
                'total_subscriptions': 0,
                'active_subscriptions': 0,
                'trial_subscriptions': 0,
                'expired_subscriptions': 0,
                'revenue_monthly': 0,
                'plan_distribution': {'basic': 0, 'premium': 0, 'enterprise': 0},
                'renewal_upcoming_30_days': 0,
                'error': str(e)
            }
        }
