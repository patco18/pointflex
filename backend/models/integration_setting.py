from ..database import db
from datetime import datetime
import json

class IntegrationSetting(db.Model):
    __tablename__ = 'integration_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    webhook_enabled = db.Column(db.Boolean, default=False)
    webhook_url = db.Column(db.String(255), nullable=True)
    webhook_events = db.Column(db.Text, nullable=True)  # Stored as JSON string
    mobile_money_enabled = db.Column(db.Boolean, default=False)
    api_enabled = db.Column(db.Boolean, default=False)
    api_key = db.Column(db.String(255), nullable=True)
    api_key_created_at = db.Column(db.DateTime, nullable=True)
    slack_enabled = db.Column(db.Boolean, default=False)
    slack_webhook_url = db.Column(db.String(255), nullable=True)
    google_calendar_sync = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        events = []
        if self.webhook_events:
            try:
                events = json.loads(self.webhook_events)
            except:
                events = []
                
        return {
            'webhook_enabled': self.webhook_enabled,
            'webhook_url': self.webhook_url,
            'webhook_events': events,
            'mobile_money_enabled': self.mobile_money_enabled,
            'api_enabled': self.api_enabled,
            'slack_enabled': self.slack_enabled,
            'slack_webhook_url': self.slack_webhook_url,
            'google_calendar_sync': self.google_calendar_sync
        }
