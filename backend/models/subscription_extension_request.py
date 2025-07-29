from datetime import datetime
from backend.database import db

class SubscriptionExtensionRequest(db.Model):
    __tablename__ = 'subscription_extension_requests'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    months = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending', nullable=False)  # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime, nullable=True)
    processed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Nouveau champ pour stocker l'ID du plan d'abonnement choisi
    subscription_plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id'), nullable=True)
    calculated_price = db.Column(db.Float, nullable=True)  # Prix calculé pour la prolongation

    company = db.relationship('Company')
    processed_by_user = db.relationship('User')
    subscription_plan = db.relationship('SubscriptionPlan')

    def to_dict(self):
        plan_info = None
        if self.subscription_plan:
            plan_info = {
                'id': self.subscription_plan.id,
                'name': self.subscription_plan.name,
                'price': self.subscription_plan.price
            }
            
        return {
            'id': self.id,
            'company_id': self.company_id,
            'company_name': self.company.name if self.company else None,
            'months': self.months,
            'reason': self.reason,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'processed_by': self.processed_by,
            'subscription_plan_id': self.subscription_plan_id,
            'subscription_plan': plan_info,
            'calculated_price': self.calculated_price
        }

    def __repr__(self):
        return f'<SubscriptionExtensionRequest {self.company_id} +{self.months}m status={self.status}>'
