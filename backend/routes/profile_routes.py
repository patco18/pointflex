"""
Routes de profil utilisateur
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from middleware.auth import get_current_user
from middleware.audit import log_user_action
from database import db

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('', methods=['GET'])
@jwt_required()
def get_profile():
    """Récupère le profil de l'utilisateur connecté"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        return jsonify({
            'profile': current_user.to_dict(include_sensitive=True)
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération du profil: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@profile_bp.route('', methods=['PUT'])
@jwt_required()
def update_profile():
    """Met à jour le profil de l'utilisateur"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        data = request.get_json()
        
        # Sauvegarder les anciennes valeurs pour l'audit
        old_values = current_user.to_dict()
        
        # Champs modifiables par l'utilisateur
        updatable_fields = ['nom', 'prenom', 'phone', 'address']
        
        for field in updatable_fields:
            if field in data:
                setattr(current_user, field, data[field])
        
        # Logger l'action
        log_user_action(
            action='UPDATE_PROFILE',
            resource_type='User',
            resource_id=current_user.id,
            old_values=old_values,
            new_values=current_user.to_dict()
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profil mis à jour avec succès',
            'profile': current_user.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour du profil: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@profile_bp.route('/password', methods=['PUT'])
@jwt_required()
def change_password():
    """Change le mot de passe de l'utilisateur"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify(message="Mot de passe actuel et nouveau mot de passe requis"), 400
        
        # Vérifier le mot de passe actuel
        if not current_user.check_password(current_password):
            return jsonify(message="Mot de passe actuel incorrect"), 401
        
        # Valider le nouveau mot de passe
        if len(new_password) < 6:
            return jsonify(message="Le nouveau mot de passe doit contenir au moins 6 caractères"), 400
        
        # Changer le mot de passe
        current_user.set_password(new_password)
        
        # Logger l'action
        log_user_action(
            action='CHANGE_PASSWORD',
            resource_type='User',
            resource_id=current_user.id,
            details={'password_changed': True}
        )
        
        db.session.commit()
        
        return jsonify(message="Mot de passe modifié avec succès"), 200
        
    except Exception as e:
        print(f"Erreur lors du changement de mot de passe: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@profile_bp.route('/export', methods=['GET'])
@jwt_required()
def export_profile_data():
    """Exporte les données de l'utilisateur et ses pointages."""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        from models.pointage import Pointage

        pointages = Pointage.query.filter_by(user_id=current_user.id).order_by(
            Pointage.date_pointage
        ).all()

        export_data = {
            'user': current_user.to_dict(include_sensitive=True),
            'pointages': [p.to_dict() for p in pointages]
        }

        return jsonify(export_data), 200

    except Exception as e:
        print(f"Erreur lors de l'export du profil: {e}")
        return jsonify(message="Erreur interne du serveur"), 500