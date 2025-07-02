"""Routes de gestion des notifications utilisateur"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from middleware.auth import get_current_user

notification_bp = Blueprint('notification', __name__)


@notification_bp.route('', methods=['GET'])
@jwt_required()
def list_notifications():
    """Retourne les notifications de l'utilisateur connecté"""
    current_user = get_current_user()
    if not current_user:
        return jsonify(message="Utilisateur non trouvé"), 404

    notifications = [n.to_dict() for n in current_user.notifications]
    return jsonify({'notifications': notifications}), 200
