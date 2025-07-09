"""
PushSubscription Model - Manages device tokens for push notifications
"""
from backend.database import db
from datetime import datetime

class PushSubscription(db.Model):
    __tablename__ = 'push_subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(512), nullable=False, unique=True) # FCM tokens can be long
    device_type = db.Column(db.String(50), nullable=False, default='web') # e.g., 'web', 'android', 'ios'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    user = db.relationship('User', backref=db.backref('push_subscriptions', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'device_type': self.device_type,
            'created_at': self.created_at.isoformat(),
            'last_used_at': self.last_used_at.isoformat(),
            'is_active': self.is_active
            # Token is intentionally not exposed here for security
        }

    def __repr__(self):
        return f'<PushSubscription User {self.user_id} Device {self.device_type} Active {self.is_active}>'
