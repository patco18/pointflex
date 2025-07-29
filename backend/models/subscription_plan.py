"""
Model SubscriptionPlan - Configuration des plans d'abonnement
"""

from backend.database import db
from datetime import datetime

class SubscriptionPlan(db.Model):
    """Modèle pour les plans d'abonnement configurables"""
    
    __tablename__ = 'subscription_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)  # starter, standard, premium, enterprise
    stripe_price_id = db.Column(db.String(100), nullable=True)  # ID du prix dans Stripe
    duration_months = db.Column(db.Integer, nullable=False)  # 1, 3, 6, 12
    price = db.Column(db.Float, nullable=False)  # Prix mensuel en EUR
    max_employees = db.Column(db.Integer, nullable=False, default=10)  # Nombre maximum d'employés
    description = db.Column(db.Text, nullable=True)  # Description du plan
    features = db.Column(db.Text, nullable=True)  # Fonctionnalités incluses (stockées sous forme de JSON en texte)
    is_active = db.Column(db.Boolean, default=True)  # Si le plan est actif
    is_featured = db.Column(db.Boolean, default=False)  # Plan mis en avant
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convertit le plan en dictionnaire"""
        import json
        
        # Traiter les fonctionnalités
        features_list = []
        if self.features:
            try:
                features_list = json.loads(self.features)
                # S'assurer que c'est bien une liste
                if not isinstance(features_list, list):
                    features_list = [str(features_list)]
            except Exception as e:
                print(f"Erreur parsing features du plan {self.id}: {e}")
                # Si le parsing échoue, on utilise le texte brut ou une liste vide
                features_list = self.features.split('\n') if self.features else []
        
        # Gérer les dates None
        created_at = self.created_at.isoformat() if self.created_at else None
        updated_at = self.updated_at.isoformat() if self.updated_at else None
        
        # S'assurer que les valeurs booléennes sont bien des booléens
        is_active = bool(self.is_active)
        is_featured = bool(self.is_featured)
        
        # S'assurer que le prix est un nombre flottant
        try:
            price = float(self.price)
            total_price = price * self.duration_months
        except (TypeError, ValueError):
            price = 0.0
            total_price = 0.0
            print(f"Erreur conversion prix du plan {self.id}")
        
        # Construire le dictionnaire résultat avec des valeurs sûres
        return {
            'id': self.id,
            'name': self.name,
            'stripe_price_id': self.stripe_price_id,
            'duration_months': self.duration_months,
            'price': price,
            'max_employees': self.max_employees,
            'description': self.description,
            'features': features_list,
            'is_active': is_active,
            'is_featured': is_featured,
            'total_price': total_price,
            'created_at': created_at,
            'updated_at': updated_at
        }
    
    def __repr__(self):
        return f'<SubscriptionPlan {self.name} {self.duration_months}m ${self.price}>'
