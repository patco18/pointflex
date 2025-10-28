from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sse import sse
import os
import sys

# Ensure the project root is on sys.path so imports using the
# "backend." prefix work even when running this file directly from
# the backend directory.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import configuration
from backend.config import Config, config as config_map

# Import database
from backend.database import db, init_db

# Import route blueprints
from backend.routes.auth_routes import auth_bp
from backend.routes.admin_routes import admin_bp
from backend.routes.health_routes import health_bp
from backend.routes.profile_routes import profile_bp
from backend.routes.attendance_routes import attendance_bp
from backend.routes.superadmin_routes import superadmin_bp
from backend.routes.superadmin_fix_routes import superadmin_fix_bp  # Added Fix Routes
from backend.routes.notification_routes import notification_bp
from backend.routes.mission_routes import mission_bp
from backend.routes.stripe_routes import stripe_bp  # Added Stripe blueprint
from backend.routes.push_routes import push_bp # Added Push blueprint
from backend.routes.calendar_routes import calendar_bp # Added Calendar blueprint
from backend.routes.subscription_plan_routes import subscription_plan_bp # Added Subscription Plan blueprint
from backend.routes.leave_routes import leave_bp # Added Leave blueprint
from backend.routes.webhook_routes import webhook_bp # Added Webhook blueprint
from backend.routes.mobile_money_routes import mobile_money_bp
from backend.routes.two_factor_routes import two_factor_bp # Added 2FA blueprint
from backend.routes.admin_settings_routes import admin_settings_bp # Added Admin Settings blueprint
from backend.routes.export_routes import export_bp # Added Export blueprint
from backend.routes.attendance_extras import attendance_extras_bp # Added Attendance Extras blueprint
from backend.routes.pause_routes import pause_bp # Added Pause blueprint
from backend.routes.stats_routes import stats_bp # Added Stats blueprint
from backend.routes.qr_attendance_routes import qr_code_bp # Added QR Attendance routes
from backend.routes.user_notification_routes import user_notifications_bp # Added User Notifications blueprint
from backend.routes.admin_attendance_routes import admin_attendance_bp # Added Admin Attendance blueprint

# Import middleware
from backend.middleware.auth import init_auth_middleware
from backend.middleware.audit import init_audit_middleware
from backend.middleware.error_handler import init_error_handlers

# For Rate Limiting
from backend.extensions import limiter

def create_app():
    app = Flask(__name__)

    # Load configuration based on environment variable hints.
    config_name = (
        os.environ.get('FLASK_CONFIG')
        or os.environ.get('POINTFLEX_ENV')
        or os.environ.get('FLASK_ENV')
        or 'default'
    )
    config_class = config_map.get(config_name, Config)
    app.config.from_object(config_class)
    # Ensure Flask's ENV reflects the selected configuration for downstream checks.
    if 'ENV' in dir(config_class):
        app.config['ENV'] = getattr(config_class, 'ENV')

    # Warn if critical environment variables are missing
    if not app.config.get('FCM_SERVER_KEY'):
        app.logger.warning('FCM_SERVER_KEY is not set. Push notifications will be disabled.')

    two_factor_key = app.config.get('TWO_FACTOR_ENCRYPTION_KEY')
    if not two_factor_key:

    if app.config.get('RATELIMIT_STORAGE_URL', '').startswith('memory'):
        app.logger.warning('RATELIMIT_STORAGE_URL uses local memory. Configure Redis for production use.')
    
    # Initialize CORS
    CORS(app, origins=["http://localhost:5173", "https://localhost:5173"])
    
    # Initialize JWT
    jwt = JWTManager(app)
    
    # Initialize database
    db.init_app(app)

    # Initialize Rate Limiter
    if app.config.get('RATELIMIT_ENABLED', True):
        limiter.init_app(app)
        # Make limiter available for decorators on blueprints/routes if needed elsewhere
        app.limiter = limiter
    else:
        # Create a dummy limiter if disabled, so app.limiter doesn't break if accessed
        class DummyLimiter:
            def limit(self, *args, **kwargs): return lambda func: func
            def exempt(self, *args, **kwargs): return lambda func: func
        app.limiter = DummyLimiter()


    # SSE configuration
    app.config['REDIS_URL'] = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    app.register_blueprint(sse, url_prefix='/stream')
    
    # Initialize middleware
    init_auth_middleware(app, jwt)
    init_audit_middleware(app)
    init_error_handlers(app)
    
    # Register blueprints
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(superadmin_bp, url_prefix='/api/superadmin')
    app.register_blueprint(superadmin_fix_bp, url_prefix='/api/superadmin-fix')  # Registered Fix Routes
    app.register_blueprint(notification_bp, url_prefix='/api/notifications')
    app.register_blueprint(mission_bp, url_prefix='/api/missions')
    app.register_blueprint(stripe_bp, url_prefix='/api/stripe')  # Registered Stripe blueprint
    app.register_blueprint(push_bp, url_prefix='/api/push') # Registered Push blueprint
    app.register_blueprint(attendance_extras_bp, url_prefix='/api/attendance') # Registered Attendance Extras blueprint
    app.register_blueprint(admin_settings_bp, url_prefix='/api/admin') # Registered Admin Settings blueprint
    app.register_blueprint(export_bp, url_prefix='/api') # Registered Export blueprint
    app.register_blueprint(calendar_bp, url_prefix='/api/calendar') # Registered Calendar blueprint
    app.register_blueprint(leave_bp, url_prefix='/api/leave') # Registered Leave blueprint
    app.register_blueprint(webhook_bp, url_prefix='/api/webhooks') # Registered Webhook blueprint
    app.register_blueprint(mobile_money_bp, url_prefix='/api/mobile-money')
    app.register_blueprint(two_factor_bp, url_prefix='/api/auth/2fa') # Registered 2FA blueprint under /auth path
    # Le pause_bp est préféré car il retourne déjà des résultats vides avec 200
    app.register_blueprint(pause_bp, url_prefix='/api/pause') # Registered Pause blueprint avec un nouveau préfixe
    app.register_blueprint(stats_bp, url_prefix='/api') # Registered Stats blueprint
    app.register_blueprint(subscription_plan_bp, url_prefix='/api/subscription') # Registered Subscription Plan blueprint
    app.register_blueprint(user_notifications_bp, url_prefix='/api/user/notifications') # Registered User Notifications blueprint
    app.register_blueprint(admin_attendance_bp, url_prefix='/api/admin') # Registered Admin Attendance blueprint
    app.register_blueprint(qr_code_bp, url_prefix='/api/attendance') # Registered QR Attendance routes

    # Ensure upload folder exists and expose uploads route
    upload_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', app.config['UPLOAD_FOLDER']))
    os.makedirs(upload_folder, exist_ok=True)
    # Store absolute path back in config for other modules
    app.config['UPLOAD_FOLDER'] = upload_folder

    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        """Serve files from the uploads directory."""
        return send_from_directory(upload_folder, filename)

    # Create database tables
    with app.app_context():
        init_db()
    
    # Register CLI commands
    from backend import cli_commands # Assuming cli_commands.py is in backend directory
    cli_commands.register_cli_commands(app)

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
