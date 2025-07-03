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

# Import middleware
from middleware.auth import init_auth_middleware
from middleware.audit import init_audit_middleware
from middleware.error_handler import init_error_handlers

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
    
    # Create database tables
    with app.app_context():
        init_db()
    
    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)