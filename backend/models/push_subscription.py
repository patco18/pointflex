"""
PushSubscription Model - Manages push notification subscriptions for various device types
"""
from backend.database import db
from datetime import datetime
import json

class PushSubscription(db.Model):
    __tablename__ = 'push_subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(512), nullable=False, unique=True) # FCM tokens can be long
    subscription_json = db.Column(db.Text, nullable=True) # Stores full web push subscription object
    endpoint = db.Column(db.String(512), nullable=True) # Extracted endpoint for easier querying
    device_type = db.Column(db.String(50), nullable=False, default='web') # e.g., 'web', 'android', 'ios'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    user = db.relationship('User', backref=db.backref('push_subscriptions', lazy='dynamic'))

    def set_web_push_subscription(self, subscription_data):
        """Set the web push subscription data and extract endpoint"""
        if isinstance(subscription_data, str):
            subscription_data = json.loads(subscription_data)
        
        self.subscription_json = json.dumps(subscription_data)
        # Extract and store endpoint for easier querying
        if subscription_data and 'endpoint' in subscription_data:
            self.endpoint = subscription_data['endpoint']
            # Use endpoint as token for web push subscriptions
            self.token = subscription_data['endpoint']

    def get_web_push_subscription(self):
        """Get the web push subscription data as a dictionary"""
        if not self.subscription_json:
            return None
        return json.loads(self.subscription_json)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'device_type': self.device_type,
            'created_at': self.created_at.isoformat(),
            'last_used_at': self.last_used_at.isoformat(),
            'is_active': self.is_active,
            'endpoint': self.endpoint
            # Token and subscription_json are intentionally not exposed here for security
        }

    def __repr__(self):
        return f'<PushSubscription User {self.user_id} Device {self.device_type} Active {self.is_active}>'
