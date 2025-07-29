"""
Modèle pour suivre l'historique des changements de plan d'abonnement
"""

from datetime import datetime
from backend.database import db

class SubscriptionPlanChangeHistory(db.Model):
    """
    Modèle pour enregistrer l'historique des changements de plan d'abonnement
    """
    __tablename__ = 'subscription_plan_change_history'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True) # L'utilisateur qui a effectué le changement
    
    old_plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id', ondelete='SET NULL'), nullable=True)
    new_plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id', ondelete='SET NULL'), nullable=True)
    
    old_plan_name = db.Column(db.String(100), nullable=True) # Pour conserver l'historique même si le plan est supprimé
    new_plan_name = db.Column(db.String(100), nullable=True)
    
    old_max_employees = db.Column(db.Integer, nullable=True)
    new_max_employees = db.Column(db.Integer, nullable=True)
    
    change_reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    company = db.relationship('Company', backref=db.backref('subscription_changes', lazy=True))
    user = db.relationship('User', backref=db.backref('subscription_changes_made', lazy=True))
    old_plan = db.relationship('SubscriptionPlan', foreign_keys=[old_plan_id], backref=db.backref('changes_from', lazy=True))
    new_plan = db.relationship('SubscriptionPlan', foreign_keys=[new_plan_id], backref=db.backref('changes_to', lazy=True))
    
    def __repr__(self):
        return f'<SubscriptionPlanChangeHistory {self.id}: {self.old_plan_name} -> {self.new_plan_name}>'
    
    def to_dict(self):
        """Convertit l'objet en dictionnaire pour l'API"""
        return {
            'id': self.id,
            'company_id': self.company_id,
            'company_name': self.company.name if self.company else None,
            'user_id': self.user_id,
            'user_name': f"{self.user.prenom} {self.user.nom}" if self.user else None,
            'old_plan_id': self.old_plan_id,
            'new_plan_id': self.new_plan_id,
            'old_plan_name': self.old_plan_name,
            'new_plan_name': self.new_plan_name,
            'old_max_employees': self.old_max_employees,
            'new_max_employees': self.new_max_employees,
            'change_reason': self.change_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
