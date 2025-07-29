"""
Modèle pour les paramètres de notification de l'entreprise
"""

from backend.database import db

class NotificationSettings(db.Model):
    __tablename__ = 'notification_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, unique=True)
    
    # Canaux de notification
    email_notifications = db.Column(db.Boolean, default=True)
    sms_notifications = db.Column(db.Boolean, default=False)
    push_notifications = db.Column(db.Boolean, default=True)
    
    # Résumés et alertes
    daily_summary = db.Column(db.Boolean, default=True)
    attendance_alerts = db.Column(db.Boolean, default=True)
    leave_request_notifications = db.Column(db.Boolean, default=True)
    invoice_notifications = db.Column(db.Boolean, default=True)
    subscription_alerts = db.Column(db.Boolean, default=True)
    
    # Relations
    company = db.relationship('Company', backref=db.backref('notification_settings', uselist=False, cascade='all, delete-orphan'))
    
    def __init__(self, company_id, **kwargs):
        self.company_id = company_id
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self):
        """Convertit l'instance en dictionnaire"""
        return {
            'id': self.id,
            'company_id': self.company_id,
            'email_notifications': self.email_notifications,
            'sms_notifications': self.sms_notifications,
            'push_notifications': self.push_notifications,
            'daily_summary': self.daily_summary,
            'attendance_alerts': self.attendance_alerts,
            'leave_request_notifications': self.leave_request_notifications,
            'invoice_notifications': self.invoice_notifications,
            'subscription_alerts': self.subscription_alerts
        }
