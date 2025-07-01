"""
Routes modulaires pour PointFlex SaaS
"""

# Import des blueprints pour faciliter l'utilisation
from .auth_routes import auth_bp
from .superadmin_routes import superadmin_bp
from .admin_routes import admin_bp
from .attendance_routes import attendance_bp
from .profile_routes import profile_bp
from .health_routes import health_bp

__all__ = [
    'auth_bp',
    'superadmin_bp',
    'admin_bp', 
    'attendance_bp',
    'profile_bp',
    'health_bp'
]