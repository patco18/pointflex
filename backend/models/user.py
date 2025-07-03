"""
Modèle User - Gestion des utilisateurs
"""

from database import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import secrets
import string

class User(db.Model):
    """Modèle pour les utilisateurs du système"""
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    nom = db.Column(db.String(80), nullable=False)
    prenom = db.Column(db.String(80), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='employee')
    
    # Informations de l'entreprise
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=True)
    employee_number = db.Column(db.String(50), unique=True, nullable=True)
    
    # Informations personnelles
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    date_birth = db.Column(db.Date, nullable=True)
    date_hire = db.Column(db.Date, nullable=True)
    
    # Statut et sécurité
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    company = db.relationship('Company', backref='users', lazy=True)
    pointages = db.relationship('Pointage', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, **kwargs):
        """Initialisation avec génération automatique du numéro d'employé"""
        # Extraire le mot de passe s'il est fourni
        password = kwargs.pop('password', None)
        
        super(User, self).__init__(**kwargs)
        
        if password:
            self.set_password(password)
        
        if not self.employee_number and self.company_id:
            self.employee_number = self.generate_employee_number()
    
    def set_password(self, password):
        """Définit le mot de passe hashé"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Vérifie le mot de passe"""
        return check_password_hash(self.password_hash, password)
    
    def generate_employee_number(self):
        """Génère un numéro d'employé unique"""
        if self.company_id:
            # Format: EMP-{company_id}-{random}
            random_part = ''.join(secrets.choice(string.digits) for _ in range(4))
            return f"EMP-{self.company_id}-{random_part}"
        return None
    
    def is_locked(self):
        """Vérifie si le compte est verrouillé"""
        if self.locked_until:
            return datetime.utcnow() < self.locked_until
        return False
    
    def lock_account(self, duration_minutes=30):
        """Verrouille le compte pour une durée donnée"""
        from datetime import timedelta
        self.locked_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
        self.failed_login_attempts = 0
    
    def unlock_account(self):
        """Déverrouille le compte"""
        self.locked_until = None
        self.failed_login_attempts = 0
    
    def increment_failed_attempts(self):
        """Incrémente le nombre de tentatives échouées"""
        self.failed_login_attempts += 1
    
    def reset_failed_attempts(self):
        """Remet à zéro les tentatives échouées"""
        self.failed_login_attempts = 0
    
    def update_last_login(self):
        """Met à jour la date de dernière connexion"""
        self.last_login = datetime.utcnow()
    
    def to_dict(self, include_sensitive=False):
        """Convertit l'utilisateur en dictionnaire"""
        data = {
            'id': self.id,
            'email': self.email,
            'nom': self.nom,
            'prenom': self.prenom,
            'role': self.role,
            'company_id': self.company_id,
            'company_name': self.company.name if self.company else None,
            'company_logo_url': self.company.logo_url if self.company else None,
            'company_theme_color': self.company.theme_color if self.company else None,
            'employee_number': self.employee_number,
            'phone': self.phone,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_sensitive:
            data.update({
                'failed_login_attempts': self.failed_login_attempts,
                'locked_until': self.locked_until.isoformat() if self.locked_until else None,
                'address': self.address,
                'date_birth': self.date_birth.isoformat() if self.date_birth else None,
                'date_hire': self.date_hire.isoformat() if self.date_hire else None
            })
        
        return data
    
    def __repr__(self):
        return f'<User {self.email}>'