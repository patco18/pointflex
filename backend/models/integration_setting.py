from ..database import db
from datetime import datetime
import json

class IntegrationSetting(db.Model):
    """Company integration settings"""

    __tablename__ = 'integration_settings'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, unique=True)

    # Webhook configuration
    webhook_enabled = db.Column(db.Boolean, default=False)
    webhook_url = db.Column(db.String(255), nullable=True)
    _webhook_events = db.Column('webhook_events', db.Text, default='[]')

    # Payment / API integrations
    mobile_money_enabled = db.Column(db.Boolean, default=False)
    api_enabled = db.Column(db.Boolean, default=False)
    api_key = db.Column(db.String(255), nullable=True)
    api_key_created_at = db.Column(db.DateTime, nullable=True)

    # Third party integrations
    slack_enabled = db.Column(db.Boolean, default=False)
    slack_webhook_url = db.Column(db.String(255), nullable=True)
    microsoft_teams_enabled = db.Column(db.Boolean, default=False)
    microsoft_teams_webhook_url = db.Column(db.String(255), nullable=True)
    zapier_enabled = db.Column(db.Boolean, default=False)
    zapier_webhook_url = db.Column(db.String(255), nullable=True)

    # Calendars
    google_calendar_sync = db.Column(db.Boolean, default=False)
    outlook_calendar_sync = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = db.relationship(
        'Company',
        backref=db.backref('integration_settings', uselist=False, cascade='all, delete-orphan')
    )

    def __init__(self, company_id, **kwargs):
        self.company_id = company_id

        events = kwargs.pop('webhook_events', [])
        self.webhook_events = events

        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)

    @property
    def webhook_events(self):
        if self._webhook_events:
            try:
                return json.loads(self._webhook_events)
            except Exception:
                return []
        return []

    @webhook_events.setter
    def webhook_events(self, events):
        self._webhook_events = json.dumps(events or [])

    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'webhook_enabled': self.webhook_enabled,
            'webhook_url': self.webhook_url,
            'webhook_events': self.webhook_events,
            'mobile_money_enabled': self.mobile_money_enabled,
            'api_enabled': self.api_enabled,
            'api_key': self.api_key or '',
            'api_key_created_at': self.api_key_created_at.isoformat() if self.api_key_created_at else None,
            'slack_enabled': self.slack_enabled,
            'slack_webhook_url': self.slack_webhook_url or '',
            'microsoft_teams_enabled': self.microsoft_teams_enabled,
            'microsoft_teams_webhook_url': self.microsoft_teams_webhook_url or '',
            'zapier_enabled': self.zapier_enabled,
            'zapier_webhook_url': self.zapier_webhook_url or '',
            'google_calendar_sync': self.google_calendar_sync,
            'outlook_calendar_sync': self.outlook_calendar_sync,
        }
