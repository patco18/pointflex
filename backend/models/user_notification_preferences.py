"""
Modèle pour les préférences de notification par utilisateur
"""

from backend.database import db
from datetime import datetime

class UserNotificationPreferences(db.Model):
    """
    Modèle pour stocker les préférences de notification par utilisateur
    """
    __tablename__ = 'user_notification_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Canaux de notification
    email_notifications = db.Column(db.Boolean, default=True)
    push_notifications = db.Column(db.Boolean, default=True)
    in_app_notifications = db.Column(db.Boolean, default=True)
    
    # Types de notifications
    attendance_notifications = db.Column(db.Boolean, default=True)
    leave_notifications = db.Column(db.Boolean, default=True)
    subscription_notifications = db.Column(db.Boolean, default=True)
    system_notifications = db.Column(db.Boolean, default=True)
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref=db.backref('notification_preferences', uselist=False, cascade='all, delete-orphan'))
    
    def __init__(self, user_id, **kwargs):
        self.user_id = user_id
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self):
        """Convertit l'instance en dictionnaire"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'email_notifications': self.email_notifications,
            'push_notifications': self.push_notifications,
            'in_app_notifications': self.in_app_notifications,
            'attendance_notifications': self.attendance_notifications,
            'leave_notifications': self.leave_notifications,
            'subscription_notifications': self.subscription_notifications,
            'system_notifications': self.system_notifications,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
