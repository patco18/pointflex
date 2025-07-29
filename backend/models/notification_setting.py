from ..database import db
from datetime import datetime

class NotificationSetting(db.Model):
    __tablename__ = 'notification_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    email_notifications = db.Column(db.Boolean, default=True)
    push_notifications = db.Column(db.Boolean, default=True)
    sms_notifications = db.Column(db.Boolean, default=False)
    attendance_alerts = db.Column(db.Boolean, default=True)
    leave_alerts = db.Column(db.Boolean, default=True)
    system_notifications = db.Column(db.Boolean, default=True)
    daily_summary = db.Column(db.Boolean, default=True)
    invoice_notifications = db.Column(db.Boolean, default=True)
    subscription_alerts = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'email_notifications': self.email_notifications,
            'push_notifications': self.push_notifications,
            'sms_notifications': self.sms_notifications,
            'attendance_alerts': self.attendance_alerts,
            'leave_alerts': self.leave_alerts,
            'system_notifications': self.system_notifications,
            'daily_summary': self.daily_summary,
            'invoice_notifications': self.invoice_notifications,
            'subscription_alerts': self.subscription_alerts
        }
