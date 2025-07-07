"""
Middleware d'authentification et autorisation
"""

from flask import request, jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from functools import wraps
from backend.models.user import User
from backend.models.audit_log import AuditLog
from database import db

def init_auth_middleware(app, jwt):
    """Initialise le middleware d'authentification"""
    
    @jwt.user_identity_loader
    def user_identity_lookup(user):
        """Définit l'identité utilisateur pour JWT"""
        if isinstance(user, User):
            return str(user.id)
        return str(user)
    
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        """Charge l'utilisateur à partir du token JWT"""
        identity = jwt_data["sub"]
        try:
            user_id = int(identity)
            return User.query.filter_by(id=user_id, is_active=True).first()
        except (ValueError, TypeError):
            return None
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """Gère les tokens expirés"""
        return jsonify(message="Token expiré"), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Gère les tokens invalides"""
        print(f"Token invalide détecté: {error}")
        return jsonify(message="Token invalide"), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        """Gère l'absence de token"""
        return jsonify(message="Token d'authentification requis"), 401

def require_auth(f):
    """Décorateur pour exiger une authentification"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user = get_jwt_identity()
            if not user:
                return jsonify(message="Utilisateur non trouvé"), 401
            return f(*args, **kwargs)
        except Exception as e:
            print(f"Erreur d'authentification: {e}")
            return jsonify(message="Authentification échouée"), 401
    return decorated_function

def require_role(required_roles):
    """Décorateur pour exiger un rôle spécifique"""
    if isinstance(required_roles, str):
        required_roles = [required_roles]
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
                current_user = get_jwt_identity()
                
                if not current_user:
                    return jsonify(message="Utilisateur non trouvé"), 401
                
                user = User.query.get(int(current_user))
                if not user or not user.is_active:
                    return jsonify(message="Utilisateur inactif"), 401
                
                if user.role not in required_roles:
                    # Log de tentative d'accès non autorisé
                    AuditLog.log_action(
                        user_email=user.email,
                        user_id=user.id,
                        action='UNAUTHORIZED_ACCESS',
                        resource_type='Endpoint',
                        details={
                            'endpoint': request.endpoint,
                            'required_roles': required_roles,
                            'user_role': user.role
                        },
                        ip_address=request.remote_addr,
                        user_agent=request.headers.get('User-Agent')
                    )
                    db.session.commit()
                    
                    return jsonify(message="Accès non autorisé"), 403
                
                # Stocker l'utilisateur dans le contexte de la requête
                g.current_user = user
                return f(*args, **kwargs)
                
            except Exception as e:
                print(f"Erreur de vérification des rôles: {e}")
                return jsonify(message="Erreur d'autorisation"), 500
        
        return decorated_function
    return decorator

def require_superadmin(f):
    """Décorateur pour exiger le rôle SuperAdmin"""
    return require_role('superadmin')(f)

def require_admin(f):
    """Décorateur pour exiger un rôle admin (superadmin ou admin_rh)"""
    return require_role(['superadmin', 'admin_rh'])(f)

def require_manager_or_above(f):
    """Décorateur pour exiger un rôle manager ou supérieur"""
    return require_role(['superadmin', 'admin_rh', 'chef_service', 'chef_projet', 'manager'])(f)

def get_current_user():
    """Récupère l'utilisateur actuel depuis le contexte"""
    if hasattr(g, 'current_user'):
        return g.current_user
    
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        if user_id:
            user = User.query.get(int(user_id))
            g.current_user = user
            return user
    except:
        pass
    
    return None

def get_request_info():
    """Récupère les informations de la requête pour l'audit"""
    return {
        'ip_address': request.remote_addr,
        'user_agent': request.headers.get('User-Agent'),
        'method': request.method,
        'endpoint': request.endpoint,
        'url': request.url
    }