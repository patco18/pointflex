"""
Routes pour la gestion des pauses
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from backend.middleware.auth import get_current_user
from backend.models.pause import Pause
from backend.models.pointage import Pointage
from backend.database import db
from datetime import datetime, date
from flask import current_app

# Créer un blueprint pour les routes de pauses
pause_bp = Blueprint('pauses', __name__)

@pause_bp.route('/pauses', methods=['GET'])
@jwt_required()
def get_pauses():
    """
    Récupère toutes les pauses du jour pour l'utilisateur actuel
    """
    try:
        current_user = get_current_user()
        today = date.today()
        
        # Trouver le pointage du jour
        today_attendance = Pointage.query.filter_by(
            user_id=current_user.id,
            date_pointage=today
        ).first()
        
        if not today_attendance:
            return jsonify({'pauses': [], 'message': 'Aucun pointage trouvé pour aujourd\'hui'}), 200
        
        # Récupérer les pauses associées au pointage du jour
        pauses = Pause.query.filter_by(
            pointage_id=today_attendance.id
        ).all()
        
        return jsonify({
            'pauses': [p.to_dict() for p in pauses],
            'message': 'Pauses récupérées avec succès'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des pauses: {e}", exc_info=True)
        return jsonify({'message': 'Une erreur est survenue lors de la récupération des pauses'}), 500

@pause_bp.route('/pauses', methods=['POST'])
@jwt_required()
def start_pause():
    """
    Commence une nouvelle pause
    """
    try:
        current_user = get_current_user()
        today = date.today()
        data = request.get_json()
        
        if not data or not data.get('type'):
            return jsonify({'message': 'Type de pause requis'}), 400
        
        # Trouver le pointage du jour
        today_attendance = Pointage.query.filter_by(
            user_id=current_user.id,
            date_pointage=today
        ).first()
        
        if not today_attendance:
            return jsonify({'message': 'Aucun pointage trouvé pour aujourd\'hui, impossible de créer une pause'}), 400
            
        # Vérifier s'il y a une pause active
        active_pause = Pause.query.filter_by(
            pointage_id=today_attendance.id, 
            end_time=None
        ).first()
        
        if active_pause:
            return jsonify({'message': 'Une pause est déjà active'}), 400
            
        # Créer une nouvelle pause
        new_pause = Pause(
            pointage_id=today_attendance.id,
            type=data.get('type'),
            start_time=datetime.now(),
            end_time=None,
            duration_minutes=None
        )
        
        db.session.add(new_pause)
        db.session.commit()
        
        return jsonify({
            'pause': new_pause.to_dict(),
            'message': 'Pause démarrée avec succès'
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors du démarrage d'une pause: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({'message': 'Une erreur est survenue lors du démarrage de la pause'}), 500

@pause_bp.route('/pauses/<int:pause_id>/end', methods=['PUT'])
@jwt_required()
def end_pause(pause_id):
    """
    Termine une pause existante
    """
    try:
        current_user = get_current_user()
        pause = Pause.query.get(pause_id)
        
        if not pause:
            return jsonify({'message': 'Pause non trouvée'}), 404
            
        # Vérifier que la pause appartient à un pointage de l'utilisateur
        pointage = Pointage.query.get(pause.pointage_id)
        if pointage.user_id != current_user.id:
            return jsonify({'message': 'Accès non autorisé à cette pause'}), 403
            
        if pause.end_time:
            return jsonify({'message': 'Cette pause est déjà terminée'}), 400
            
        # Terminer la pause
        now = datetime.now()
        pause.end_time = now
        
        # Calculer la durée en minutes
        duration = (now - pause.start_time).total_seconds() / 60
        pause.duration_minutes = round(duration)
        
        db.session.commit()
        
        return jsonify({
            'pause': pause.to_dict(),
            'message': 'Pause terminée avec succès'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la terminaison d'une pause: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({'message': 'Une erreur est survenue lors de la terminaison de la pause'}), 500
