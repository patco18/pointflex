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
from .notification_routes import notification_bp
from .superadmin_fix_routes import superadmin_fix_bp
from .admin_attendance_routes import admin_attendance_bp
from .qr_attendance_routes import qr_code_bp

__all__ = [
    'auth_bp',
    'superadmin_bp',
    'admin_bp', 
    'attendance_bp',
    'profile_bp',
    'health_bp',
    'notification_bp',
    'superadmin_fix_bp',
    'admin_attendance_bp',
    'qr_code_bp'
]