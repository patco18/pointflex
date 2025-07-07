from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sse import sse
import os

# Import configuration
from config import Config

# Import database
from database import db, init_db

# Import route blueprints
from routes.auth_routes import auth_bp
from routes.admin_routes import admin_bp
from routes.health_routes import health_bp
from routes.profile_routes import profile_bp
from routes.attendance_routes import attendance_bp
from routes.superadmin_routes import superadmin_bp
from routes.notification_routes import notification_bp
from routes.mission_routes import mission_bp
from routes.stripe_routes import stripe_bp  # Added Stripe blueprint
from routes.push_routes import push_bp # Added Push blueprint
from routes.calendar_routes import calendar_bp # Added Calendar blueprint
from routes.leave_routes import leave_bp # Added Leave blueprint
from routes.webhook_routes import webhook_bp # Added Webhook blueprint
from routes.two_factor_routes import two_factor_bp # Added 2FA blueprint

# Import middleware
from middleware.auth import init_auth_middleware
from middleware.audit import init_audit_middleware
from middleware.error_handler import init_error_handlers

# For Rate Limiting
from extensions import limiter

def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(Config)
    
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
    app.register_blueprint(notification_bp, url_prefix='/api/notifications')
    app.register_blueprint(mission_bp, url_prefix='/api/missions')
    app.register_blueprint(stripe_bp, url_prefix='/api/stripe')  # Registered Stripe blueprint
    app.register_blueprint(push_bp, url_prefix='/api/push') # Registered Push blueprint
    app.register_blueprint(calendar_bp, url_prefix='/api/calendar') # Registered Calendar blueprint
    app.register_blueprint(leave_bp, url_prefix='/api/leave') # Registered Leave blueprint
    app.register_blueprint(webhook_bp, url_prefix='/api/webhooks') # Registered Webhook blueprint
    app.register_blueprint(two_factor_bp, url_prefix='/api/auth/2fa') # Registered 2FA blueprint under /auth path
    
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