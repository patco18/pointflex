"""
WebhookSubscription Model - Manages webhook configurations for companies
"""
from database import db # Corrected import
from datetime import datetime
import secrets # For generating secrets
import hmac
import hashlib
import json

class WebhookSubscription(db.Model):
    __tablename__ = 'webhook_subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, index=True)
    target_url = db.Column(db.String(2048), nullable=False)

    # Storing as JSON string, could also use db.JSON if database supports it well (e.g., PostgreSQL)
    # For SQLite, Text is fine.
    _subscribed_events = db.Column("subscribed_events", db.Text, nullable=False) # e.g., '["user.created", "invoice.paid"]'

    secret = db.Column(db.String(128), nullable=False, default=lambda: secrets.token_hex(32))
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = db.relationship('Company', backref=db.backref('webhook_subscriptions', lazy='dynamic'))

    @property
    def subscribed_events(self):
        try:
            return json.loads(self._subscribed_events) if self._subscribed_events else []
        except json.JSONDecodeError:
            return [] # Or raise an error / log

    @subscribed_events.setter
    def subscribed_events(self, value):
        if isinstance(value, list):
            self._subscribed_events = json.dumps(value)
        elif isinstance(value, str):
             # Try to parse to ensure it's a valid JSON list string, then re-dump for consistency
            try:
                parsed_value = json.loads(value)
                if not isinstance(parsed_value, list):
                    raise ValueError("Subscribed events must be a list.")
                self._subscribed_events = json.dumps(parsed_value)
            except json.JSONDecodeError:
                raise ValueError("Invalid JSON string for subscribed events.")
        else:
            raise ValueError("Subscribed events must be a list or a valid JSON string representation of a list.")

    def generate_signature(self, payload_body: bytes) -> str:
        """Generates an HMAC SHA256 signature for the payload."""
        if not self.secret:
            # This should ideally not happen if secret has a default and is not nullable
            raise ValueError("Webhook secret is not set.")

        hashed = hmac.new(self.secret.encode('utf-8'), payload_body, hashlib.sha256)
        return hashed.hexdigest()

    def to_dict(self, include_secret=False):
        data = {
            'id': self.id,
            'company_id': self.company_id,
            'target_url': self.target_url,
            'subscribed_events': self.subscribed_events,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        if include_secret: # Only for initial display after creation, perhaps
            data['secret'] = self.secret
        return data

    def __repr__(self):
        return f'<WebhookSubscription {self.id} for Company {self.company_id} to {self.target_url[:30]}>'
