"""
Modèle AuditLog - Journalisation des actions utilisateurs
"""

from database import db
from datetime import datetime
import json

class AuditLog(db.Model):
    """Modèle pour l'audit et la journalisation des actions"""
    
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Utilisateur qui a effectué l'action
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    user_email = db.Column(db.String(120), nullable=False)  # Stocké pour historique même si user supprimé
    
    # Action effectuée
    action = db.Column(db.String(100), nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, etc.
    resource_type = db.Column(db.String(50), nullable=False)  # User, Company, Pointage, etc.
    resource_id = db.Column(db.Integer, nullable=True)  # ID de la ressource concernée
    
    # Détails de l'action
    details = db.Column(db.Text, nullable=True)  # JSON avec les détails
    old_values = db.Column(db.Text, nullable=True)  # Anciennes valeurs (pour UPDATE)
    new_values = db.Column(db.Text, nullable=True)  # Nouvelles valeurs (pour UPDATE/CREATE)
    
    # Informations de contexte
    ip_address = db.Column(db.String(45), nullable=True)  # IPv4 ou IPv6
    user_agent = db.Column(db.Text, nullable=True)
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relations
    user = db.relationship('User', backref='audit_logs', lazy=True)
    
    def __init__(self, **kwargs):
        """Initialisation avec sérialisation automatique des détails"""
        # Sérialiser les objets complexes
        for field in ['details', 'old_values', 'new_values']:
            if field in kwargs and kwargs[field] is not None and not isinstance(kwargs[field], str):
                kwargs[field] = json.dumps(kwargs[field], default=str)
        
        super(AuditLog, self).__init__(**kwargs)
    
    @property
    def parsed_details(self):
        """Retourne les détails désérialisés"""
        if self.details:
            try:
                return json.loads(self.details)
            except (json.JSONDecodeError, TypeError):
                return self.details
        return None
    
    @property
    def parsed_old_values(self):
        """Retourne les anciennes valeurs désérialisées"""
        if self.old_values:
            try:
                return json.loads(self.old_values)
            except (json.JSONDecodeError, TypeError):
                return self.old_values
        return None
    
    @property
    def parsed_new_values(self):
        """Retourne les nouvelles valeurs désérialisées"""
        if self.new_values:
            try:
                return json.loads(self.new_values)
            except (json.JSONDecodeError, TypeError):
                return self.new_values
        return None
    
    @classmethod
    def log_action(cls, user_email, action, resource_type, resource_id=None, 
                   details=None, old_values=None, new_values=None, 
                   ip_address=None, user_agent=None, user_id=None):
        """Méthode utilitaire pour créer un log d'audit"""
        
        log = cls(
            user_id=user_id,
            user_email=user_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.session.add(log)
        return log
    
    @classmethod
    def log_login(cls, user, ip_address=None, user_agent=None, success=True):
        """Log spécifique pour les connexions"""
        action = 'LOGIN_SUCCESS' if success else 'LOGIN_FAILED'
        details = {
            'success': success,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return cls.log_action(
            user_email=user.email,
            user_id=user.id,
            action=action,
            resource_type='User',
            resource_id=user.id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @classmethod
    def log_create(cls, user_email, resource_type, resource_id, new_values, 
                   ip_address=None, user_agent=None, user_id=None):
        """Log spécifique pour les créations"""
        return cls.log_action(
            user_email=user_email,
            user_id=user_id,
            action='CREATE',
            resource_type=resource_type,
            resource_id=resource_id,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @classmethod
    def log_update(cls, user_email, resource_type, resource_id, old_values, new_values,
                   ip_address=None, user_agent=None, user_id=None):
        """Log spécifique pour les modifications"""
        return cls.log_action(
            user_email=user_email,
            user_id=user_id,
            action='UPDATE',
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @classmethod
    def log_delete(cls, user_email, resource_type, resource_id, old_values,
                   ip_address=None, user_agent=None, user_id=None):
        """Log spécifique pour les suppressions"""
        return cls.log_action(
            user_email=user_email,
            user_id=user_id,
            action='DELETE',
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=old_values,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    def to_dict(self):
        """Convertit le log en dictionnaire"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_email': self.user_email,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'details': self.parsed_details,
            'old_values': self.parsed_old_values,
            'new_values': self.parsed_new_values,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<AuditLog {self.action} on {self.resource_type} by {self.user_email}>'