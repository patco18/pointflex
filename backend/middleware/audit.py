"""
Middleware d'audit automatique
"""

from flask import request, g
from backend.models.audit_log import AuditLog
from backend.database import db
from datetime import datetime

def init_audit_middleware(app):
    """Initialise le middleware d'audit"""
    
    @app.before_request
    def before_request():
        """Enregistre le début de la requête"""
        g.request_start_time = datetime.utcnow()
    
    @app.after_request
    def after_request(response):
        """Enregistre la fin de la requête et les métriques"""
        
        # Calculer le temps de réponse
        if hasattr(g, 'request_start_time'):
            response_time = (datetime.utcnow() - g.request_start_time).total_seconds()
            response.headers['X-Response-Time'] = f"{response_time:.3f}s"
        
        # Ajouter des headers de sécurité
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        return response

def log_user_action(action, resource_type, resource_id=None, details=None, 
                   old_values=None, new_values=None):
    """Fonction utilitaire pour logger une action utilisateur"""
    
    from backend.middleware.auth import get_current_user, get_request_info
    
    try:
        current_user = get_current_user()
        if not current_user:
            return
        
        request_info = get_request_info()
        
        AuditLog.log_action(
            user_email=current_user.email,
            user_id=current_user.id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            old_values=old_values,
            new_values=new_values,
            ip_address=request_info['ip_address'],
            user_agent=request_info['user_agent']
        )

        # La validation est déléguée à la transaction appelante
        # pour éviter de perturber la session en cours.
        
    except Exception as e:
        print(f"Erreur lors de l'audit: {e}")
        # En cas d'erreur d'audit, on n'annule pas la transaction principale
        # pour ne pas perdre les modifications métiers.

def audit_model_changes(model_class):
    """Décorateur pour auditer automatiquement les changements de modèle"""
    
    def decorator(f):
        def wrapper(*args, **kwargs):
            # Capturer l'état avant modification
            old_values = None
            if hasattr(args[0], 'to_dict'):
                old_values = args[0].to_dict()
            
            # Exécuter la fonction
            result = f(*args, **kwargs)
            
            # Capturer l'état après modification
            new_values = None
            if hasattr(args[0], 'to_dict'):
                new_values = args[0].to_dict()
            
            # Logger le changement
            log_user_action(
                action='UPDATE',
                resource_type=model_class.__name__,
                resource_id=getattr(args[0], 'id', None),
                old_values=old_values,
                new_values=new_values
            )
            
            return result
        
        return wrapper
    return decorator