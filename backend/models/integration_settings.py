"""
Modèle pour les paramètres d'intégration de l'entreprise
"""

from backend.database import db
import json

class IntegrationSettings(db.Model):
    __tablename__ = 'integration_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, unique=True)
    
    # Intégrations avec services tiers
    slack_enabled = db.Column(db.Boolean, default=False)
    slack_webhook_url = db.Column(db.String(255), nullable=True)
    microsoft_teams_enabled = db.Column(db.Boolean, default=False)
    microsoft_teams_webhook_url = db.Column(db.String(255), nullable=True)
    zapier_enabled = db.Column(db.Boolean, default=False)
    zapier_webhook_url = db.Column(db.String(255), nullable=True)
    
    # Synchronisations calendrier
    google_calendar_sync = db.Column(db.Boolean, default=False)
    outlook_calendar_sync = db.Column(db.Boolean, default=False)
    
    # API
    api_key_enabled = db.Column(db.Boolean, default=False)
    api_key = db.Column(db.String(64), nullable=True)
    
    # Configuration avancée (stockée en JSON)
    webhook_events = db.Column(db.Text, nullable=True)  # Stocke une liste JSON des événements configurés
    
    # Relations
    company = db.relationship('Company', backref=db.backref('integration_settings', uselist=False, cascade='all, delete-orphan'))
    
    def __init__(self, company_id, **kwargs):
        self.company_id = company_id
        
        # Gérer les champs JSON séparément
        webhook_events = kwargs.pop('webhook_events', [])
        if webhook_events:
            self.set_webhook_events(webhook_events)
        
        # Assigner les autres propriétés
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def set_webhook_events(self, events):
        """Stocke la liste des événements en JSON"""
        self.webhook_events = json.dumps(events)
    
    def get_webhook_events(self):
        """Récupère la liste des événements depuis le JSON"""
        if self.webhook_events:
            return json.loads(self.webhook_events)
        return []
    
    def to_dict(self):
        """Convertit l'instance en dictionnaire"""
        return {
            'id': self.id,
            'company_id': self.company_id,
            'slack_enabled': self.slack_enabled,
            'slack_webhook_url': self.slack_webhook_url or '',
            'microsoft_teams_enabled': self.microsoft_teams_enabled,
            'microsoft_teams_webhook_url': self.microsoft_teams_webhook_url or '',
            'zapier_enabled': self.zapier_enabled,
            'zapier_webhook_url': self.zapier_webhook_url or '',
            'google_calendar_sync': self.google_calendar_sync,
            'outlook_calendar_sync': self.outlook_calendar_sync,
            'api_key_enabled': self.api_key_enabled,
            'api_key': self.api_key or '',
            'webhook_events': self.get_webhook_events()
        }
