"""
Modèle SystemSettings - Paramètres système configurables
"""

from backend.database import db
from datetime import datetime
import json

class SystemSettings(db.Model):
    """Modèle pour les paramètres système configurables"""
    
    __tablename__ = 'system_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False, index=True)  # general, security, notifications, etc.
    key = db.Column(db.String(100), nullable=False, index=True)
    value = db.Column(db.Text, nullable=False)  # JSON serialized
    description = db.Column(db.Text, nullable=True)
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Index unique sur category + key
    __table_args__ = (
        db.UniqueConstraint('category', 'key', name='unique_category_key'),
    )
    
    def __init__(self, **kwargs):
        """Initialisation avec sérialisation automatique de la valeur"""
        if 'value' in kwargs and not isinstance(kwargs['value'], str):
            kwargs['value'] = json.dumps(kwargs['value'])
        super(SystemSettings, self).__init__(**kwargs)
    
    @property
    def parsed_value(self):
        """Retourne la valeur désérialisée"""
        try:
            return json.loads(self.value)
        except (json.JSONDecodeError, TypeError):
            return self.value
    
    def set_value(self, value):
        """Définit la valeur avec sérialisation automatique"""
        self.value = json.dumps(value)
        self.updated_at = datetime.utcnow()
    
    @classmethod
    def get_setting(cls, category, key, default=None):
        """Récupère une valeur de paramètre"""
        setting = cls.query.filter_by(category=category, key=key).first()
        if setting:
            return setting.parsed_value
        return default
    
    @classmethod
    def set_setting(cls, category, key, value, description=None):
        """Définit une valeur de paramètre"""
        setting = cls.query.filter_by(category=category, key=key).first()
        
        if setting:
            setting.set_value(value)
            if description:
                setting.description = description
        else:
            setting = cls(
                category=category,
                key=key,
                value=json.dumps(value),
                description=description
            )
            db.session.add(setting)
        
        return setting
    
    @classmethod
    def get_category_settings(cls, category):
        """Récupère tous les paramètres d'une catégorie"""
        settings = cls.query.filter_by(category=category).all()
        return {setting.key: {
            'value': setting.parsed_value,
            'description': setting.description,
            'updated_at': setting.updated_at.isoformat()
        } for setting in settings}
    
    @classmethod
    def get_all_settings(cls):
        """Récupère tous les paramètres groupés par catégorie"""
        settings = cls.query.all()
        result = {}
        
        for setting in settings:
            if setting.category not in result:
                result[setting.category] = {}
            
            result[setting.category][setting.key] = {
                'value': setting.parsed_value,
                'description': setting.description,
                'updated_at': setting.updated_at.isoformat()
            }
        
        return result
    
    @classmethod
    def reset_to_defaults(cls):
        """Remet tous les paramètres aux valeurs par défaut"""
        # Supprimer tous les paramètres existants
        cls.query.delete()
        
        # Recréer les paramètres par défaut
        from backend.database import init_db
        # Note: Cette méthode nécessiterait une refactorisation pour éviter la dépendance circulaire
        
    def to_dict(self):
        """Convertit le paramètre en dictionnaire"""
        return {
            'id': self.id,
            'category': self.category,
            'key': self.key,
            'value': self.parsed_value,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def __repr__(self):        return f'<SystemSettings {self.category}.{self.key}>'