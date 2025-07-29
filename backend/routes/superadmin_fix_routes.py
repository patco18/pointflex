"""
Routes de secours pour le superadmin pour contourner le problème de colonne manquante
Cette version n'utilise pas la colonne subscription_plan_id qui n'existe pas dans la base de données
"""

from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required
from backend.middleware.auth import require_superadmin
from backend.database import db
from backend.models.company import Company
from backend.models.user import User
from backend.middleware.audit import log_user_action
from backend.models.subscription_plan import SubscriptionPlan
from datetime import datetime, timedelta

superadmin_fix_bp = Blueprint('superadmin_fix', __name__)

@superadmin_fix_bp.route('/subscription/companies', methods=['GET'])
@jwt_required()
@require_superadmin
def get_company_subscriptions_fixed():
    """Version corrigée de la route qui récupère les informations d'abonnement de toutes les entreprises"""
    try:
        # Récupération des entreprises avec leurs informations d'abonnement
        companies = Company.query.all()
        subscriptions = []
        
        today = datetime.now().date()
        
        for company in companies:
            # Calcul des jours restants
            days_remaining = 0
            if company.subscription_end:
                days_remaining = (company.subscription_end - today).days
                days_remaining = max(0, days_remaining)  # Pas de nombre négatif
            
            # Déterminer le statut
            status = 'active'
            
            # Vérifier si on est en période d'essai (moins de 30 jours depuis le début)
            is_trial = False
            if company.subscription_start:
                days_since_start = (today - company.subscription_start).days
                is_trial = days_since_start <= 30 and company.subscription_status != 'expired'
                
            if is_trial:
                status = 'trial'
            elif not company.is_active:
                status = 'cancelled'
            elif days_remaining <= 0:
                status = 'expired'
            
            subscriptions.append({
                'id': company.id,
                'company_id': company.id,
                'company_name': company.name,
                'plan': company.subscription_plan,
                'status': status,
                'start_date': company.subscription_start.isoformat() if company.subscription_start else '',
                'end_date': company.subscription_end.isoformat() if company.subscription_end else '',
                'amount_paid': company.subscription_amount or 0,
                'days_remaining': days_remaining,
                'auto_renew': company.subscription_auto_renew or False
            })
        
        log_user_action(
            action='VIEW_COMPANY_SUBSCRIPTIONS',
            resource_type='Subscription',
            details=f"Consultation des abonnements des entreprises"
        )
        
        return jsonify({
            'success': True,
            'subscriptions': subscriptions
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des abonnements: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Une erreur est survenue: {str(e)}"
        }), 500

@superadmin_fix_bp.route('/subscription/stats', methods=['GET'])
@jwt_required()
@require_superadmin
def get_subscription_stats_fixed():
    """Version corrigée de la route qui récupère les statistiques globales des abonnements"""
    try:
        # Comptage des abonnements
        companies = Company.query.all()
        
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
        
        # Récupérer les tarifs mensuels depuis la base de données
        plan_prices = {}
        try:
            # Récupérer tous les plans avec une durée d'1 mois (tarifs mensuels standard)
            plans_db = SubscriptionPlan.query.filter_by(duration_months=1).all()
            
            # Créer un mapping nom de plan -> prix
            for plan_db in plans_db:
                plan_name = plan_db.name.lower()  # Normaliser les noms (basic, premium, etc.)
                plan_prices[plan_name] = float(plan_db.price)
            
            # Valeurs par défaut si certains plans ne sont pas trouvés dans la base de données
            default_prices = {
                'basic': 29.0,
                'premium': 99.0,
                'enterprise': 299.0,
                'starter': 29.99,
                'standard': 49.99
            }
            
            # S'assurer que tous les plans de base ont un prix défini
            for key, value in default_prices.items():
                if key not in plan_prices:
                    plan_prices[key] = value
                    
        except Exception as e:
            current_app.logger.error(f"Erreur lors de la récupération des prix des plans: {str(e)}")
            # Retourner les prix par défaut en cas d'erreur
            plan_prices = {
                'basic': 29.0,
                'premium': 99.0,
                'enterprise': 299.0,
                'starter': 29.99,
                'standard': 49.99
            }
        
        # Calculer les métriques
        for company in companies:
            # Distribution des plans
            plan = company.subscription_plan
            if plan in plan_distribution:
                plan_distribution[plan] += 1
            else:
                plan_distribution[plan] = 1
            
            # Statut et revenus
            if company.is_active:
                # Vérifier si on est en période d'essai (moins de 30 jours depuis le début)
                is_trial = False
                if company.subscription_start:
                    days_since_start = (today - company.subscription_start).days
                    is_trial = days_since_start <= 30 and company.subscription_status != 'expired'
                
                if is_trial:
                    trial_subscriptions += 1
                else:
                    active_subscriptions += 1
                    
                    # Récupérer le prix du plan
                    plan_price = plan_prices.get(plan.lower(), 0)
                    revenue_monthly += plan_price
            
            # Vérifier si l'abonnement est expiré
            if company.subscription_end and company.subscription_end < today:
                expired_subscriptions += 1
            
            # Vérifier les renouvellements à venir
            if (company.subscription_end and 
                company.subscription_end > today and 
                company.subscription_end <= thirty_days_future):
                renewal_upcoming_30_days += 1
        
        stats = {
            'total_subscriptions': total_subscriptions,
            'active_subscriptions': active_subscriptions,
            'trial_subscriptions': trial_subscriptions,
            'expired_subscriptions': expired_subscriptions,
            'revenue_monthly': revenue_monthly,
            'plan_distribution': plan_distribution,
            'renewal_upcoming_30_days': renewal_upcoming_30_days
        }
        
        log_user_action(
            action='VIEW_SUBSCRIPTION_STATS',
            resource_type='SubscriptionStats',
            details=f"Consultation des statistiques d'abonnement"
        )
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des statistiques d'abonnement: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Une erreur est survenue: {str(e)}"
        }), 500
