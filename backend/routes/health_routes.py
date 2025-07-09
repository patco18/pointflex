"""
Routes de santé et monitoring
"""

from flask import Blueprint, jsonify
from datetime import datetime
from backend.database import db
from backend.models.user import User
from backend.models.company import Company
from backend.models.pointage import Pointage
from sqlalchemy import text

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Endpoint de vérification de santé"""
    try:
        # Test de connexion à la base de données
        db.session.execute(text('SELECT 1'))
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '2.0.0',
            'database': 'connected'
        }), 200
        
    except Exception as e:
        print(f"Erreur health check: {e}")
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 500

@health_bp.route('/health/detailed', methods=['GET'])
def detailed_health_check():
    """Endpoint de vérification de santé détaillée"""
    try:
        # Tests détaillés
        db_status = 'healthy'
        try:
            db.session.execute(text('SELECT 1'))
        except Exception as e:
            print(f"Erreur DB: {e}")
            db_status = 'unhealthy'
        
        # Statistiques rapides
        stats = {
            'total_users': User.query.count(),
            'total_companies': Company.query.count(),
            'total_pointages': Pointage.query.count()
        }
        
        return jsonify({
            'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '2.0.0',
            'components': {
                'database': db_status,
                'api': 'healthy'
            },
            'stats': stats
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des logs: {e}")
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 500