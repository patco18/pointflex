"""Modèle pour les paramètres de notification de l'entreprise."""

from datetime import datetime

from backend.database import db


class NotificationSettings(db.Model):
    __tablename__ = 'notification_settings'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, unique=True)

    # Canaux de notification
    email_notifications = db.Column(db.Boolean, default=True, nullable=False)
    sms_notifications = db.Column(db.Boolean, default=False, nullable=False)
    push_notifications = db.Column(db.Boolean, default=True, nullable=False)

    # Résumés et alertes
    daily_summary = db.Column(db.Boolean, default=True, nullable=False)
    attendance_alerts = db.Column(db.Boolean, default=True, nullable=False)
    leave_alerts = db.Column(db.Boolean, default=True, nullable=False)
    system_notifications = db.Column(db.Boolean, default=True, nullable=False)
    invoice_notifications = db.Column(db.Boolean, default=True, nullable=False)
    subscription_alerts = db.Column(db.Boolean, default=True, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relations
    company = db.relationship(
        'Company',
        backref=db.backref('notification_settings', uselist=False, cascade='all, delete-orphan')
    )

    def __init__(self, company_id, **kwargs):
        self.company_id = company_id
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)

    # Compatibilité ascendante avec l'ancien nom de champ
    @property
    def leave_request_notifications(self):
        return self.leave_alerts

    @leave_request_notifications.setter
    def leave_request_notifications(self, value):
        self.leave_alerts = value

    def to_dict(self):
        """Convertit l'instance en dictionnaire sérialisable."""
        return {
            'id': self.id,
            'company_id': self.company_id,
            'email_notifications': self.email_notifications,
            'sms_notifications': self.sms_notifications,
            'push_notifications': self.push_notifications,
            'daily_summary': self.daily_summary,
            'attendance_alerts': self.attendance_alerts,
            'leave_alerts': self.leave_alerts,
            'system_notifications': self.system_notifications,
            'invoice_notifications': self.invoice_notifications,
            'subscription_alerts': self.subscription_alerts
        }
