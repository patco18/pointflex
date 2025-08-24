"""Routes for mission management"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from backend.middleware.auth import get_current_user, require_admin
from backend.models.mission import Mission
from backend.models.mission_user import MissionUser
from backend.models.user import User
from backend.database import db
from backend.middleware.audit import log_user_action # Added for audit logging
from flask import current_app # For logging
from backend.utils.notification_utils import send_notification

mission_bp = Blueprint('missions', __name__)

@mission_bp.route('', methods=['GET'])
@jwt_required()
def list_missions():
    """List missions for the current user's company"""
    try:
        current_user = get_current_user()
        query = Mission.query
        if current_user.role != 'superadmin':
            query = query.filter_by(company_id=current_user.company_id)
        missions = query.order_by(Mission.created_at.desc()).all()
        return jsonify({'missions': [m.to_dict() for m in missions]}), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des missions: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@mission_bp.route('', methods=['POST'])
@require_admin
def create_mission():
    """Create a mission"""
    try:
        current_user = get_current_user()
        data = request.get_json() or {}
        order_number = data.get('order_number')
        title = data.get('title')
        if not order_number or not title:
            return jsonify(message="order_number et title requis"), 400
        if Mission.query.filter_by(order_number=order_number).first():
            return jsonify(message="Numéro d'ordre déjà utilisé"), 409
        mission = Mission(
            company_id=current_user.company_id if current_user.role != 'superadmin' else data.get('company_id'),
            order_number=order_number,
            title=title,
            description=data.get('description'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            status=data.get('status', 'planned'),
        )
        db.session.add(mission)
        db.session.flush()

        # assign users if provided
        user_ids = data.get('user_ids', [])
        notify_ids = []
        for uid in user_ids:
            user = User.query.get(uid)
            if user and (current_user.role == 'superadmin' or user.company_id == current_user.company_id):
                db.session.add(MissionUser(mission_id=mission.id, user_id=uid, status='pending'))
                notify_ids.append(uid)

        db.session.commit()

        log_user_action(
            action='CREATE_MISSION',
            resource_type='Mission',
            resource_id=mission.id,
            new_values=mission.to_dict()
        )
        # db.session.commit() # Commit for audit log if log_user_action doesn't commit itself.
                           # AuditLog.log_action (called by log_user_action) adds to session but doesn't commit.
                           # The main commit above should cover this.
        for uid in notify_ids:
            send_notification(uid, f"Vous avez été assigné à la mission {mission.title}")

        return jsonify({'mission': mission.to_dict(), 'message': 'Mission créée'}), 201
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la création de la mission: {e}", exc_info=True)
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@mission_bp.route('/<int:mission_id>', methods=['DELETE'])
@require_admin
def delete_mission(mission_id):
    """Deletes a mission"""
    try:
        mission = Mission.query.get_or_404(mission_id)
        current_user = get_current_user()

        if current_user.role != 'superadmin' and mission.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé pour supprimer cette mission."), 403

        old_values = mission.to_dict()  # Capture data before deletion
        notify_ids = [mu.user_id for mu in mission.users]

        # MissionUser entries are cascaded deleted due to model relationship.
        db.session.delete(mission)
        db.session.commit()

        log_user_action(
            action='DELETE_MISSION',
            resource_type='Mission',
            resource_id=mission_id,  # mission.id is no longer valid after delete, use mission_id from path
            old_values=old_values,
            details={'notified_user_ids': notify_ids}
        )
        # db.session.commit() # If log_user_action doesn't commit itself.

        for uid in notify_ids:
            send_notification(uid, f"La mission {old_values['title']} a été supprimée")

        return jsonify({'message': 'Mission supprimée avec succès'}), 200
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la suppression de la mission {mission_id}: {e}", exc_info=True)
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur lors de la suppression de la mission."), 500

@mission_bp.route('/<int:mission_id>', methods=['PUT'])
@require_admin
def update_mission(mission_id):
    try:
        mission = Mission.query.get_or_404(mission_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and mission.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        old_values = mission.to_dict() # Capture state before changes
        data = request.get_json() or {}

        for field in ['title', 'description', 'start_date', 'end_date', 'status']:
            if field in data:
                setattr(mission, field, data[field])

        added_users, removed_users = [], []
        if 'user_ids' in data:
            existing_ids = {mu.user_id for mu in mission.users}
            new_ids = set(data.get('user_ids', []))
            to_add = new_ids - existing_ids
            to_remove = existing_ids - new_ids
            for uid in to_remove:
                MissionUser.query.filter_by(mission_id=mission.id, user_id=uid).delete()
                removed_users.append(uid)
            for uid in to_add:
                user = User.query.get(uid)
                if user and (current_user.role == 'superadmin' or user.company_id == current_user.company_id):
                    db.session.add(MissionUser(mission_id=mission.id, user_id=uid, status='pending'))
                    added_users.append(uid)

        db.session.commit()

        log_user_action(
            action='UPDATE_MISSION',
            resource_type='Mission',
            resource_id=mission.id,
            old_values=old_values,
            new_values=mission.to_dict(),
            details={
                'added_user_ids': added_users,
                'removed_user_ids': removed_users,
            }
        )
        # db.session.commit() # Main commit above covers this.
        for uid in added_users:
            send_notification(uid, f"Vous avez été assigné à la mission {mission.title}")
        for uid in removed_users:
            send_notification(uid, f"Vous avez été retiré de la mission {mission.title}")

        return jsonify({'mission': mission.to_dict(), 'message': 'Mission mise à jour'}), 200
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la mise à jour de la mission {mission_id}: {e}", exc_info=True)
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@mission_bp.route('/<int:mission_id>/respond', methods=['POST'])
@jwt_required()
def respond_mission(mission_id):
    """Allow an assigned user to accept or decline a mission."""
    try:
        current_user = get_current_user()
        data = request.get_json() or {}
        status = data.get('status')
        if status not in ['accepted', 'declined']:
            return jsonify(message="Statut invalide"), 400

        mu = MissionUser.query.filter_by(mission_id=mission_id, user_id=current_user.id).first()
        if not mu:
            return jsonify(message="Accès non autorisé"), 403

        from datetime import datetime
        mu.status = status
        mu.responded_at = datetime.utcnow()
        db.session.add(mu)
        db.session.commit()

        mission = Mission.query.get(mission_id)
        admins = User.query.filter(
            User.company_id == mission.company_id,
            User.role.in_(['admin', 'admin_rh', 'superadmin'])
        ).all()
        message = f"{current_user.prenom} {current_user.nom} a {'accepté' if status == 'accepted' else 'refusé'} la mission {mission.title}"
        for admin in admins:
            send_notification(admin.id, message)

        return jsonify({'status': mu.status}), 200
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la réponse à la mission {mission_id}: {e}", exc_info=True)
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500
@mission_bp.route('/active-legacy', methods=['GET'])
@jwt_required()
def get_active_missions_legacy():
    """List active missions for the current user (legacy version)"""
    try:
        current_user = get_current_user()
        
        # Récupérer toutes les missions actives de l'utilisateur
        active_missions = db.session.query(Mission).join(
            MissionUser, Mission.id == MissionUser.mission_id
        ).filter(
            MissionUser.user_id == current_user.id,
            Mission.status == 'active'
        ).all()
        
        return jsonify({'missions': [m.to_dict() for m in active_missions]}), 200
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des missions actives: {e}", exc_info=True)
        return jsonify(message="Erreur interne du serveur"), 500

@mission_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active_missions():
    """Récupère les missions actives pour l'utilisateur connecté"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        # Récupérer toutes les missions actives attribuées à l'utilisateur
        # où la date de fin est supérieure ou égale à aujourd'hui
        from datetime import date
        today = date.today()
        
        # Requête pour trouver les missions où l'utilisateur est assigné et qui sont actives
        user_missions = db.session.query(Mission).join(
            MissionUser, Mission.id == MissionUser.mission_id
        ).filter(
            MissionUser.user_id == current_user.id,
            Mission.status == 'active',
            # Mission.end_date est facultatif ou supérieur à aujourd'hui
            ((Mission.end_date == None) | (Mission.end_date >= today))
        ).all()
        
        # Convertir en dictionnaire pour la réponse JSON
        missions_data = [mission.to_dict() for mission in user_missions]
        
        return jsonify(missions_data), 200
    
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des missions actives: {e}")
        return jsonify(message="Erreur de base de données"), 500
