"""
Routes pour la gestion des plans d'abonnement
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from backend.middleware.auth import require_superadmin, get_current_user
from backend.middleware.audit import log_user_action
from backend.models.subscription_plan import SubscriptionPlan
from backend.models.company import Company
from backend.database import db
import stripe
import os
import json
from datetime import datetime, timedelta

# Créer le blueprint pour les routes de plans d'abonnement
subscription_plan_bp = Blueprint('subscription_plans', __name__)

# Route de débogage (temporaire)
@subscription_plan_bp.route('/superadmin/subscription-plans', methods=['GET'])
@jwt_required()
@require_superadmin
def get_all_plans_admin():
    """Récupère tous les plans d'abonnement (version admin)"""
    try:
        plans = SubscriptionPlan.query.order_by(SubscriptionPlan.display_order).all()
        return jsonify({
            'success': True,
            'plans': [plan.to_dict() for plan in plans]
        })
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des plans: {str(e)}")
        return jsonify({
            'success': False, 
            'message': f"Une erreur est survenue: {str(e)}"
        }), 500

@subscription_plan_bp.route('/debug/plans', methods=['GET'])
def debug_get_plans():
    """Route de débogage pour récupérer les plans sans authentification"""
    try:
        print("Exécution de debug_get_plans")
        
        # Utiliser une méthode directe pour accéder à la base de données
        all_plans = []
        
        # Accès direct à la base de données via SQLite
        import sqlite3
        
        # Chemin direct vers la base de données correcte
        db_path = "instance/pointflex.db"
        print(f"Tentative d'accès à: {db_path}")
        
        if os.path.exists(db_path):
            print(f"✅ Base de données trouvée à {db_path}")
            
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM subscription_plans")
            
            rows = cursor.fetchall()
            print(f"Plans trouvés: {len(rows)}")
            
            for row in rows:
                plan_dict = dict(row)
                
                # Traiter les features
                if 'features' in plan_dict and plan_dict['features']:
                    try:
                        plan_dict['features'] = json.loads(plan_dict['features'])
                    except Exception as e:
                        print(f"Erreur parse JSON: {e}")
                        plan_dict['features'] = []
                else:
                    plan_dict['features'] = []
                    
                all_plans.append(plan_dict)
            
            conn.close()
        else:
            print(f"❌ Base de données non trouvée à {db_path}")
        
        # Approche ORM traditionnelle pour comparaison
        plans = SubscriptionPlan.query.all()
        
        plan_dicts = []
        for plan in plans:
            try:
                # Récupération manuelle des attributs
                features = []
                if plan.features:
                    try:
                        features = json.loads(plan.features)
                    except json.JSONDecodeError as json_error:
                        print(f"Erreur décodage JSON pour plan {plan.id}: {json_error}")
                        features = plan.features.split('\n') if plan.features else []
                    
                plan_dict = {
                    'id': plan.id,
                    'name': plan.name,
                    'stripe_price_id': plan.stripe_price_id,
                    'duration_months': plan.duration_months,
                    'price': float(plan.price),
                    'max_employees': plan.max_employees,
                    'description': plan.description,
                    'features': features,
                    'is_active': bool(plan.is_active),
                    'is_featured': bool(plan.is_featured),
                    'total_price': float(plan.price) * plan.duration_months,
                    'created_at': plan.created_at.isoformat() if plan.created_at else None,
                    'updated_at': plan.updated_at.isoformat() if plan.updated_at else None
                }
                
                plan_dicts.append(plan_dict)
            except Exception as conv_error:
                print(f"Erreur conversion plan {plan.id}: {conv_error}")
                
        return jsonify({
            'plans': all_plans,  # Utiliser les plans récupérés avec SQL direct
            'orm_plans': plan_dicts,  # Les plans récupérés avec l'ORM pour comparaison
            'message': f'Route de débogage - {len(all_plans)} plans récupérés avec SQL direct, {len(plan_dicts)} plans avec ORM'
        }), 200
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Erreur débogage: {e}")
        print(error_traceback)
        return jsonify({
            'error': str(e),
            'traceback': error_traceback,
            'message': 'Erreur lors du débogage'
        }), 500

@subscription_plan_bp.route('/plans', methods=['GET'])
@jwt_required()
def get_all_plans():
    """Récupère tous les plans d'abonnement"""
    try:
        print("Exécution de get_all_plans")
        # Déterminer les droits de l'utilisateur
        try:
            current_user = get_current_user()
            is_superadmin = current_user.is_superadmin
            print(f"Utilisateur authentifié: ID {current_user.id}, superadmin: {is_superadmin}")
        except Exception as auth_error:
            print(f"Erreur d'authentification: {auth_error}")
            is_superadmin = True  # Par défaut, afficher tous les plans
        
        # Accès direct à la base de données via SQLite
        import sqlite3
        
        # Chemin direct vers la base de données correcte
        db_path = "instance/pointflex.db"
        print(f"Tentative d'accès à: {db_path}")
        
        manual_plans = []
        
        if os.path.exists(db_path):
            print(f"✅ Base de données trouvée à {db_path}")
            
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            
            cursor = conn.cursor()
            if is_superadmin:
                cursor.execute("SELECT * FROM subscription_plans")
            else:
                cursor.execute("SELECT * FROM subscription_plans WHERE is_active = 1")
                
            rows = cursor.fetchall()
            print(f"Plans trouvés: {len(rows)}")
            
            for row in rows:
                plan_dict = dict(row)
                
                # Traiter les features
                if 'features' in plan_dict and plan_dict['features']:
                    try:
                        plan_dict['features'] = json.loads(plan_dict['features'])
                    except Exception as e:
                        print(f"Erreur parse JSON: {e}")
                        plan_dict['features'] = []
                else:
                    plan_dict['features'] = []
                    
                manual_plans.append(plan_dict)
            
            conn.close()
            
            # Retourner directement les plans trouvés via SQLite
            print(f"SQLite direct: {len(manual_plans)} plans")
            return jsonify({
                'plans': manual_plans
            }), 200
        else:
            print(f"❌ Base de données non trouvée à {db_path}")
            
        # Méthode ORM standard (comme fallback)
        if not is_superadmin:
            plans = SubscriptionPlan.query.filter_by(is_active=True).all()
        else:
            # Les superadmins voient tous les plans
            plans = SubscriptionPlan.query.all()
            
        print(f"ORM: trouvé {len(plans)} plans")
        
        plan_dicts = []
        for plan in plans:
            try:
                plan_dict = plan.to_dict()
                plan_dicts.append(plan_dict)
            except Exception as conv_error:
                print(f"Erreur conversion plan {plan.id}: {conv_error}")
                # Conversion simplifiée sans features
                plan_dicts.append({
                    'id': plan.id,
                    'name': plan.name,
                    'duration_months': plan.duration_months,
                    'price': plan.price,
                    'max_employees': plan.max_employees,
                    'description': plan.description,
                    'features': []
                })
        
        print(f"Plans récupérés avec succès: {len(plan_dicts)} plans")
        return jsonify({
            'plans': plan_dicts
        }), 200
    except Exception as e:
        import traceback
        print(f"Erreur lors de la récupération des plans: {e}")
        print(traceback.format_exc())
        return jsonify(message=f"Erreur interne du serveur: {str(e)}"), 500


@subscription_plan_bp.route('/plans', methods=['POST'])
@jwt_required()
@require_superadmin
def create_plan():
    """Crée un nouveau plan d'abonnement"""
    try:
        data = request.get_json()
        
        # Validation des données
        required_fields = ['name', 'duration_months', 'price', 'max_employees']
        for field in required_fields:
            if field not in data:
                return jsonify(message=f"Le champ '{field}' est requis"), 400
        
        # Convertir les fonctionnalités en JSON texte si présent
        features = data.get('features')
        features_text = None
        if features:
            import json
            features_text = json.dumps(features)
        
        # Créer le plan dans la base de données
        new_plan = SubscriptionPlan(
            name=data['name'],
            duration_months=data['duration_months'],
            price=data['price'],
            max_employees=data['max_employees'],
            description=data.get('description'),
            features=features_text,
            is_active=data.get('is_active', True),
            is_featured=data.get('is_featured', False)
        )
        
        # Si Stripe est configuré, créer aussi le plan dans Stripe
        stripe_key = os.environ.get('STRIPE_SECRET_KEY')
        if stripe_key and data.get('create_in_stripe', False):
            stripe.api_key = stripe_key
            
            # Créer le produit Stripe si nécessaire
            product_name = f"{data['name']} ({data['duration_months']} mois)"
            product = stripe.Product.create(
                name=product_name,
                description=data.get('description', f"Plan {data['name']} pour {data['duration_months']} mois")
            )
            
            # Créer le prix Stripe
            price = stripe.Price.create(
                product=product.id,
                unit_amount=int(data['price'] * 100 * data['duration_months']),  # En centimes
                currency='eur',
                recurring=None if data['duration_months'] > 1 else {
                    'interval': 'month',
                    'interval_count': 1
                }
            )
            
            # Stocker l'ID du prix Stripe
            new_plan.stripe_price_id = price.id
        
        db.session.add(new_plan)
        db.session.commit()
        
        log_user_action(
            action='CREATE_SUBSCRIPTION_PLAN',
            resource_type='SubscriptionPlan',
            resource_id=new_plan.id,
            details={'name': new_plan.name, 'duration_months': new_plan.duration_months, 'price': new_plan.price}
        )
        
        return jsonify({
            'message': 'Plan créé avec succès',
            'plan': new_plan.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Erreur lors de la création du plan: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@subscription_plan_bp.route('/plans/<int:plan_id>', methods=['PUT', 'PATCH'])
@jwt_required()
@require_superadmin
def update_plan(plan_id):
    """Met à jour un plan d'abonnement existant"""
    try:
        plan = SubscriptionPlan.query.get_or_404(plan_id)
        data = request.get_json()
        
        # Mettre à jour les champs fournis
        if 'name' in data:
            plan.name = data['name']
        if 'duration_months' in data:
            plan.duration_months = data['duration_months']
        if 'price' in data:
            plan.price = data['price']
        if 'max_employees' in data:
            plan.max_employees = data['max_employees']
        if 'description' in data:
            plan.description = data['description']
        if 'features' in data:
            import json
            features = data['features']
            plan.features = json.dumps(features) if features else None
        if 'is_active' in data:
            plan.is_active = data['is_active']
        if 'is_featured' in data:
            plan.is_featured = data['is_featured']
            
        # Mettre à jour dans Stripe si demandé et si un ID Stripe existe
        if data.get('update_in_stripe', False) and plan.stripe_price_id:
            stripe_key = os.environ.get('STRIPE_SECRET_KEY')
            if stripe_key:
                stripe.api_key = stripe_key
                
                # On ne peut pas mettre à jour un prix dans Stripe, donc on doit 
                # en créer un nouveau et mettre à jour les références
                try:
                    # Récupérer le produit du prix actuel
                    current_price = stripe.Price.retrieve(plan.stripe_price_id)
                    product_id = current_price.product
                    
                    # Créer un nouveau prix
                    new_price = stripe.Price.create(
                        product=product_id,
                        unit_amount=int(plan.price * 100 * plan.duration_months),  # En centimes
                        currency='eur',
                        recurring=None if plan.duration_months > 1 else {
                            'interval': 'month',
                            'interval_count': 1
                        }
                    )
                    
                    # Archiver l'ancien prix
                    stripe.Price.modify(
                        plan.stripe_price_id,
                        active=False
                    )
                    
                    # Mettre à jour l'ID de prix dans notre base
                    plan.stripe_price_id = new_price.id
                    
                except stripe.error.StripeError as e:
                    print(f"Erreur Stripe lors de la mise à jour du prix: {e}")
        
        db.session.commit()
        
        log_user_action(
            action='UPDATE_SUBSCRIPTION_PLAN',
            resource_type='SubscriptionPlan',
            resource_id=plan.id,
            details={'id': plan.id, 'name': plan.name}
        )
        
        return jsonify({
            'message': 'Plan mis à jour avec succès',
            'plan': plan.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Erreur lors de la mise à jour du plan: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@subscription_plan_bp.route('/plans/<int:plan_id>', methods=['DELETE'])
@jwt_required()
@require_superadmin
def delete_plan(plan_id):
    """Supprime un plan d'abonnement"""
    try:
        plan = SubscriptionPlan.query.get_or_404(plan_id)
        
        # Vérifier si des entreprises utilisent ce plan
        companies_using_plan = Company.query.filter_by(subscription_plan=plan.name).count()
        if companies_using_plan > 0:
            return jsonify(message=f"Ce plan est utilisé par {companies_using_plan} entreprise(s) et ne peut pas être supprimé"), 400
        
        # Désactiver dans Stripe si un ID Stripe existe
        if plan.stripe_price_id:
            stripe_key = os.environ.get('STRIPE_SECRET_KEY')
            if stripe_key:
                stripe.api_key = stripe_key
                try:
                    # Désactiver le prix dans Stripe
                    stripe.Price.modify(
                        plan.stripe_price_id,
                        active=False
                    )
                except stripe.error.StripeError as e:
                    print(f"Erreur Stripe lors de la désactivation du prix: {e}")
        
        # Supprimer de la base de données
        db.session.delete(plan)
        db.session.commit()
        
        log_user_action(
            action='DELETE_SUBSCRIPTION_PLAN',
            resource_type='SubscriptionPlan',
            resource_id=plan_id,
            details={'id': plan_id}
        )
        
        return jsonify({
            'message': 'Plan supprimé avec succès'
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Erreur lors de la suppression du plan: {e}")
        return jsonify(message="Erreur interne du serveur"), 500
