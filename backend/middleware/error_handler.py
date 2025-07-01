"""
Gestionnaire d'erreurs centralisé
"""

from flask import jsonify, request
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from models.audit_log import AuditLog
from database import db
import traceback

def init_error_handlers(app):
    """Initialise les gestionnaires d'erreurs"""
    
    @app.errorhandler(400)
    def bad_request(error):
        """Gère les erreurs 400 Bad Request"""
        return jsonify({
            'error': 'Bad Request',
            'message': 'La requête est malformée',
            'status_code': 400
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Gère les erreurs 401 Unauthorized"""
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentification requise',
            'status_code': 401
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """Gère les erreurs 403 Forbidden"""
        return jsonify({
            'error': 'Forbidden',
            'message': 'Accès interdit',
            'status_code': 403
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        """Gère les erreurs 404 Not Found"""
        return jsonify({
            'error': 'Not Found',
            'message': 'Ressource non trouvée',
            'status_code': 404
        }), 404
    
    @app.errorhandler(422)
    def unprocessable_entity(error):
        """Gère les erreurs 422 Unprocessable Entity"""
        return jsonify({
            'error': 'Unprocessable Entity',
            'message': 'Les données fournies ne peuvent pas être traitées',
            'status_code': 422
        }), 422
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Gère les erreurs 500 Internal Server Error"""
        
        # Logger l'erreur pour debugging
        error_details = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'endpoint': request.endpoint,
            'method': request.method,
            'url': request.url,
            'traceback': traceback.format_exc()
        }
        
        print(f"Erreur 500: {error_details}")
        
        # Logger dans la base de données si possible
        try:
            AuditLog.log_action(
                user_email='system',
                action='SYSTEM_ERROR',
                resource_type='System',
                details=error_details,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            db.session.commit()
        except:
            # Si on ne peut pas logger, ne pas faire échouer davantage
            pass
        
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Une erreur interne s\'est produite',
            'status_code': 500
        }), 500
    
    @app.errorhandler(SQLAlchemyError)
    def database_error(error):
        """Gère les erreurs de base de données"""
        
        # Rollback de la transaction
        db.session.rollback()
        
        print(f"Erreur de base de données: {error}")
        
        return jsonify({
            'error': 'Database Error',
            'message': 'Erreur de base de données',
            'status_code': 500
        }), 500
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Gère toutes les autres exceptions HTTP"""
        return jsonify({
            'error': error.name,
            'message': error.description,
            'status_code': error.code
        }), error.code
    
    @app.errorhandler(Exception)
    def handle_general_exception(error):
        """Gère toutes les autres exceptions non prévues"""
        
        # Logger l'erreur
        error_details = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'traceback': traceback.format_exc()
        }
        
        print(f"Erreur non gérée: {error_details}")
        
        return jsonify({
            'error': 'Unexpected Error',
            'message': 'Une erreur inattendue s\'est produite',
            'status_code': 500
        }), 500

class ValidationError(Exception):
    """Exception personnalisée pour les erreurs de validation"""
    
    def __init__(self, message, field=None):
        self.message = message
        self.field = field
        super().__init__(self.message)

class BusinessLogicError(Exception):
    """Exception personnalisée pour les erreurs de logique métier"""
    
    def __init__(self, message, code=None):
        self.message = message
        self.code = code
        super().__init__(self.message)

def handle_validation_error(error):
    """Gère les erreurs de validation personnalisées"""
    return jsonify({
        'error': 'Validation Error',
        'message': error.message,
        'field': error.field,
        'status_code': 400
    }), 400

def handle_business_logic_error(error):
    """Gère les erreurs de logique métier personnalisées"""
    return jsonify({
        'error': 'Business Logic Error',
        'message': error.message,
        'code': error.code,
        'status_code': 422
    }), 422