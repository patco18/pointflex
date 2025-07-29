"""Routes de gestion des notifications utilisateur"""

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required
from backend.middleware.auth import get_current_user
from backend.models.notification import Notification
from backend.database import db
from sqlalchemy import desc
from datetime import datetime

notification_bp = Blueprint('notification', __name__)


@notification_bp.route('', methods=['GET'])
@jwt_required()
def list_notifications():
    """Retourne les notifications de l'utilisateur connecté"""
    current_user = get_current_user()
    if not current_user:
        return jsonify(message="Utilisateur non trouvé"), 404
        
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 10, type=int), 50)
    
    # Récupérer uniquement les notifications de l'utilisateur courant
    query = Notification.query.filter_by(user_id=current_user.id)
    
    # Filtrer par type si spécifié
    notification_type = request.args.get('type')
    if notification_type:
        query = query.filter_by(type=notification_type)
        
    # Filtrer par statut de lecture si spécifié
    read_status = request.args.get('read')
    if read_status is not None:
        is_read = read_status.lower() == 'true'
        query = query.filter_by(is_read=is_read)
        
    # Trier par date de création, les plus récentes en premier
    query = query.order_by(desc(Notification.created_at))
    
    # Pagination
    paginated_notifications = query.paginate(page=page, per_page=per_page, error_out=False)
    
    notifications = [notification.to_dict() for notification in paginated_notifications.items]
    
    return jsonify({
        'success': True,
        'notifications': notifications,
        'pagination': {
            'total': paginated_notifications.total,
            'pages': paginated_notifications.pages,
            'page': page,
            'per_page': per_page,
            'has_next': paginated_notifications.has_next,
            'has_prev': paginated_notifications.has_prev
        }
    }), 200
    
@notification_bp.route('/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    """Marquer une notification comme lue"""
    current_user = get_current_user()
    if not current_user:
        return jsonify(message="Utilisateur non trouvé"), 404
        
    try:
        notification = Notification.query.get(notification_id)
        
        if not notification:
            return jsonify({
                'success': False,
                'message': 'Notification non trouvée'
            }), 404
            
        # Vérifier que la notification appartient à l'utilisateur
        if notification.user_id != current_user.id:
            return jsonify({
                'success': False,
                'message': 'Accès non autorisé à cette notification'
            }), 403
            
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'notification': notification.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
        
@notification_bp.route('/mark-all-read', methods=['POST'])
@jwt_required()
def mark_all_notifications_read():
    """Marquer toutes les notifications de l'utilisateur comme lues"""
    current_user = get_current_user()
    if not current_user:
        return jsonify(message="Utilisateur non trouvé"), 404
    
    try:
        # Mise à jour groupée pour toutes les notifications non lues de l'utilisateur
        now = datetime.utcnow()
        result = Notification.query.filter_by(
            user_id=current_user.id,
            is_read=False
        ).update({
            'is_read': True,
            'read_at': now
        }, synchronize_session=False)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'count': result,
            'message': f'{result} notifications marquées comme lues'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
        
@notification_bp.route('/count', methods=['GET'])
@jwt_required()
def get_notification_count():
    """Obtenir le nombre de notifications non lues pour l'utilisateur courant"""
    current_user = get_current_user()
    if not current_user:
        return jsonify(message="Utilisateur non trouvé"), 404
    
    try:
        count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
        
        return jsonify({
            'success': True,
            'unread_count': count
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@notification_bp.route('/history', methods=['GET'])
@jwt_required()
def get_notifications_history():
    """Récupère l'historique complet des notifications pour l'utilisateur courant avec pagination et filtrage"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 404
        
        # Paramètres de pagination
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('perPage', 10, type=int), 100)
        
        # Paramètres de filtrage
        search = request.args.get('search')
        read_filter = request.args.get('read')
        
        # Base de la requête
        query = Notification.query.filter_by(user_id=current_user.id)
        
        # Appliquer les filtres
        if read_filter is not None:
            is_read_bool = read_filter.lower() == 'true'
            query = query.filter(Notification.is_read == is_read_bool)
            
        if search:
            # Recherche dans le titre et le message
            query = query.filter(
                db.or_(
                    Notification.title.ilike(f'%{search}%'),
                    Notification.message.ilike(f'%{search}%')
                )
            )
        
        # Tri par date (plus récentes d'abord)
        query = query.order_by(Notification.created_at.desc())
        
        # Exécuter la requête paginée
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Préparer les données de réponse
        notifications = [notification.to_dict() for notification in paginated.items]
        
        return jsonify({
            'success': True,
            'notifications': notifications,
            'pagination': {
                'total': paginated.total,
                'pages': paginated.pages,
                'page': page,
                'per_page': per_page,
                'has_next': paginated.has_next,
                'has_prev': paginated.has_prev
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération de l'historique des notifications: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Une erreur est survenue: {str(e)}"
        }), 500
