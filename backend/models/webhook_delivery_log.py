"""
WebhookDeliveryLog Model - Logs attempts to deliver webhooks
"""
from backend.database import db # Corrected import
from datetime import datetime
import json

class WebhookDeliveryLog(db.Model):
    __tablename__ = 'webhook_delivery_logs'

    id = db.Column(db.Integer, primary_key=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey('webhook_subscriptions.id'), nullable=False, index=True)

    event_type = db.Column(db.String(100), nullable=False, index=True)
    payload = db.Column(db.Text, nullable=False) # JSON string of the payload that was sent
    target_url = db.Column(db.String(2048), nullable=False) # Copied for historical record

    attempted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    duration_ms = db.Column(db.Integer, nullable=True) # Duration of the request in milliseconds

    response_status_code = db.Column(db.Integer, nullable=True)
    response_headers = db.Column(db.Text, nullable=True) # Store response headers as JSON string
    response_body = db.Column(db.Text, nullable=True) # Store part of response body for debugging

    is_success = db.Column(db.Boolean, default=False, nullable=False, index=True)
    error_message = db.Column(db.Text, nullable=True) # If any exception occurred during sending

    # For retry logic
    retry_attempt = db.Column(db.Integer, default=0, nullable=False)

    subscription = db.relationship('WebhookSubscription', backref=db.backref('delivery_logs', lazy='dynamic', cascade='all, delete-orphan'))

    @property
    def parsed_payload(self):
        try:
            return json.loads(self.payload)
        except (json.JSONDecodeError, TypeError):
            return self.payload # Or None / error

    @property
    def parsed_response_headers(self):
        try:
            return json.loads(self.response_headers) if self.response_headers else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'subscription_id': self.subscription_id,
            'event_type': self.event_type,
            'payload': self.parsed_payload, # Or keep as string depending on use case
            'target_url': self.target_url,
            'attempted_at': self.attempted_at.isoformat(),
            'duration_ms': self.duration_ms,
            'response_status_code': self.response_status_code,
            'response_headers': self.parsed_response_headers,
            # 'response_body': self.response_body, # Potentially large, exclude by default
            'is_success': self.is_success,
            'error_message': self.error_message,
            'retry_attempt': self.retry_attempt
        }

    def __repr__(self):
        status = "Success" if self.is_success else f"Failed ({self.response_status_code or 'No Response'})"
        return f'<WebhookDeliveryLog {self.id} - Event {self.event_type} to {self.target_url[:30]} - {status}>'
