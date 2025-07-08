"""
Modèle Office - Gestion des bureaux et sites
"""

from database import db
from datetime import datetime
import json

class Office(db.Model):
    """Modèle pour les bureaux et sites de l'entreprise"""
    
    __tablename__ = 'offices'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    
    # Informations générales
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.Text, nullable=True)
    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(2), nullable=True)  # Code ISO à 2 lettres
    
    # Coordonnées géographiques
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    # Rayon autorisé pour le pointage en mètres
    radius = db.Column(db.Integer, default=200, nullable=False)
    
    # Informations complémentaires
    timezone = db.Column(db.String(50), default='Europe/Paris', nullable=False)
    capacity = db.Column(db.Integer, default=50, nullable=True)
    amenities = db.Column(db.Text, nullable=True)  # JSON serialized
    manager_name = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    
    # Statut et métadonnées
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_main = db.Column(db.Boolean, default=False, nullable=False)  # Siège social
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    company = db.relationship('Company', backref='offices', lazy=True)
    
    def __init__(self, **kwargs):
        """Initialisation avec valeurs par défaut"""
        super(Office, self).__init__(**kwargs)
    
    def to_dict(self):
        """Convertit le bureau en dictionnaire"""
        # Désérialiser les amenities
        amenities_list = []
        if self.amenities:
            try:
                amenities_list = json.loads(self.amenities)
            except (json.JSONDecodeError, TypeError):
                amenities_list = []
        
        return {
            'id': self.id,
            'company_id': self.company_id,
            'name': self.name,
            'address': self.address,
            'city': self.city,
            'country': self.country,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'radius': self.radius,
            'timezone': self.timezone,
            'capacity': self.capacity,
            'amenities': amenities_list,
            'manager_name': self.manager_name,
            'phone': self.phone,
            'is_active': self.is_active,
            'is_main': self.is_main,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Office {self.name} - {self.company_id}>'