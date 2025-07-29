"""
Routes pour gérer les préférences de notification par utilisateur
"""

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required
from backend.middleware.auth import get_current_user
from backend.models.user_notification_preferences import UserNotificationPreferences
from backend.database import db
from datetime import datetime

user_notifications_bp = Blueprint('user_notifications', __name__)

@user_notifications_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_notification_preferences():
    """
    Récupérer les préférences de notification de l'utilisateur actuel
    """
    current_user = get_current_user()
    if not current_user:
        return jsonify({'success': False, 'message': 'Utilisateur non trouvé'}), 404
        
    # Récupérer les préférences existantes ou créer des préférences par défaut
    preferences = UserNotificationPreferences.query.filter_by(user_id=current_user.id).first()
    
    if not preferences:
        # Créer des préférences par défaut pour l'utilisateur
        preferences = UserNotificationPreferences(
            user_id=current_user.id,
            email_notifications=True,
            push_notifications=True,
            in_app_notifications=True,
            attendance_notifications=True,
            leave_notifications=True,
            subscription_notifications=True,
            system_notifications=True
        )
        db.session.add(preferences)
        db.session.commit()
    
    return jsonify({
        'success': True,
        'preferences': preferences.to_dict()
    }), 200

@user_notifications_bp.route('/preferences', methods=['PUT'])
@jwt_required()
def update_notification_preferences():
    """
    Mettre à jour les préférences de notification de l'utilisateur actuel
    """
    current_user = get_current_user()
    if not current_user:
        return jsonify({'success': False, 'message': 'Utilisateur non trouvé'}), 404
    
    data = request.json
    if not data:
        return jsonify({'success': False, 'message': 'Données manquantes'}), 400
    
    # Récupérer les préférences existantes ou créer des préférences par défaut
    preferences = UserNotificationPreferences.query.filter_by(user_id=current_user.id).first()
    
    if not preferences:
        preferences = UserNotificationPreferences(user_id=current_user.id)
        db.session.add(preferences)
    
    # Mettre à jour les champs spécifiés
    allowed_fields = [
        'email_notifications', 'push_notifications', 'in_app_notifications',
        'attendance_notifications', 'leave_notifications', 
        'subscription_notifications', 'system_notifications'
    ]
    
    for field in allowed_fields:
        if field in data:
            setattr(preferences, field, bool(data[field]))
    
    # Mettre à jour la date de modification
    preferences.updated_at = datetime.utcnow()
    
    try:
        db.session.commit()
        
        # Enregistrer dans les logs d'audit
        current_app.logger.info(
            f"Préférences de notification mises à jour pour l'utilisateur {current_user.id} ({current_user.email})"
        )
        
        return jsonify({
            'success': True,
            'message': 'Préférences de notification mises à jour avec succès',
            'preferences': preferences.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la mise à jour des préférences de notification: {str(e)}")
        
        return jsonify({
            'success': False,
            'message': f"Erreur lors de la mise à jour des préférences de notification: {str(e)}"
        }), 500
