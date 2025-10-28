"""
Configuration centralisée de l'application
"""

import os
from datetime import timedelta

class Config:
    """Configuration de base"""

    ENV = os.environ.get('FLASK_ENV') or os.environ.get('POINTFLEX_ENV') or 'development'
    # Base de données
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///pointflex.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Sécurité
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
    
    # Pagination
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    
    # Upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = 'uploads'
    
    # Email (pour les notifications)
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
    # Configuration SMTP pour l'envoi d'emails
    SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT') or 587)
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME') or os.environ.get('MAIL_USERNAME')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD') or os.environ.get('MAIL_PASSWORD')
    SENDER_EMAIL = os.environ.get('SENDER_EMAIL') or 'noreply@pointflex.com'
    
    # URL frontend pour les liens dans les emails
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

    # Push Notifications
    FCM_SERVER_KEY = os.environ.get('FCM_SERVER_KEY')
    
    # VAPID Keys pour Web Push
    VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '6WSow_cxqauhPFor3NzLif55vAxoMh2d5yHEFGupMS8')
    VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', 'BJm3weyGSlTMs2Dk7_fWXdpC6kM8mEi7l1sqKGdTm_7L2t65tm9MnO2L3fdRiQSDxsGsgCYp58C8kbsZvzE8ibA') 
    VAPID_CLAIMS = {
        "sub": f"mailto:{os.environ.get('VAPID_CONTACT_EMAIL', 'admin@pointflex.com')}"
    }
    
    # Limites système
    MAX_COMPANIES = 1000
    MAX_USERS_PER_COMPANY = 999

    # Géolocalisation
    GEOLOCATION_MAX_ACCURACY = int(os.environ.get('GEOLOCATION_MAX_ACCURACY') or 100)
    
    # Sécurité des mots de passe
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_NUMBERS = True
    
    # Sessions
    SESSION_TIMEOUT = 1440  # minutes
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = 30  # minutes

    # Enhanced Password Policy
    PASSWORD_REQUIRE_SPECIAL_CHAR = os.environ.get('PASSWORD_REQUIRE_SPECIAL_CHAR', 'true').lower() in ['true', 'on', '1']
    PASSWORD_HISTORY_COUNT = int(os.environ.get('PASSWORD_HISTORY_COUNT') or 5) # Number of old passwords to remember
    # PASSWORD_EXPIRY_DAYS = int(os.environ.get('PASSWORD_EXPIRY_DAYS') or 90) # Deferred for now

    # Webhooks
    WEBHOOK_SIGNATURE_HEADER_NAME = os.environ.get('WEBHOOK_SIGNATURE_HEADER_NAME') or 'X-PointFlex-Signature-256'
    WEBHOOK_TIMEOUT_SECONDS = int(os.environ.get('WEBHOOK_TIMEOUT_SECONDS') or 10)
    WEBHOOK_MAX_RETRIES = int(os.environ.get('WEBHOOK_MAX_RETRIES') or 3) # For future use with async tasks

    # 2FA
    TWO_FACTOR_ENCRYPTION_KEY = os.environ.get('TWO_FACTOR_ENCRYPTION_KEY') # Loaded in security_utils directly
    TWO_FACTOR_DEV_FALLBACK_KEY = os.environ.get('TWO_FACTOR_DEV_FALLBACK_KEY') or "1fkbhlkVxkA2sHQ1NblCLZApgu12YTtyjhHCcFtLeSY="
    TWO_FACTOR_REQUIRE_KEY = os.environ.get('TWO_FACTOR_REQUIRE_KEY', 'false').lower() in ['true', 'on', '1']

    # Rate Limiting (Flask-Limiter)
    RATELIMIT_ENABLED = os.environ.get('RATELIMIT_ENABLED', 'true').lower() in ['true', 'on', '1']
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL') or "memory://" # Default to memory, recommend Redis for production
    RATELIMIT_STRATEGY = os.environ.get('RATELIMIT_STRATEGY') or "fixed-window" # "moving-window" is more robust
    RATELIMIT_DEFAULT = os.environ.get('RATELIMIT_DEFAULT') or "200 per day;50 per hour;20 per minute"
    RATELIMIT_AUTH_LOGIN = os.environ.get('RATELIMIT_AUTH_LOGIN') or "20 per minute;50 per hour" # Stricter for login
    RATELIMIT_SENSITIVE_ACTIONS = os.environ.get('RATELIMIT_SENSITIVE_ACTIONS') or "10 per hour" # e.g., password reset, 2FA setup

class DevelopmentConfig(Config):
    """Configuration pour le développement"""
    DEBUG = True
    ENV = 'development'
    SQLALCHEMY_ECHO = False  # Mettre à True pour voir les requêtes SQL

class ProductionConfig(Config):
    """Configuration pour la production"""
    DEBUG = False
    ENV = 'production'
    SQLALCHEMY_ECHO = False

    # Sécurité renforcée en production
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    TWO_FACTOR_REQUIRE_KEY = True

class TestingConfig(Config):
    """Configuration pour les tests"""
    TESTING = True
    DEBUG = True
    ENV = 'testing'
    # Utiliser une base de données en mémoire pour les tests
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # Configuration pour les tests d'email
    MAIL_SERVER = 'localhost'
    MAIL_PORT = 1025
    MAIL_USERNAME = None
    MAIL_PASSWORD = None
    MAIL_DEFAULT_SENDER = 'test@pointflex.com'
    MAIL_USE_TLS = False
    MAIL_USE_SSL = False
    MAIL_SUPPRESS_SEND = True  # Ne pas envoyer d'emails réels pendant les tests
    WTF_CSRF_ENABLED = False
# Configuration par défaut
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
