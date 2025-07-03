"""Routes for mission management"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from middleware.auth import get_current_user, require_admin
from models.mission import Mission
from models.mission_user import MissionUser
from models.user import User
from database import db

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
        for uid in user_ids:
            user = User.query.get(uid)
            if user and (current_user.role == 'superadmin' or user.company_id == current_user.company_id):
                db.session.add(MissionUser(mission_id=mission.id, user_id=uid))

        db.session.commit()
        return jsonify({'mission': mission.to_dict(), 'message': 'Mission créée'}), 201
    except Exception as e:
        print(f"Erreur lors de la création de la mission: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@mission_bp.route('/<int:mission_id>', methods=['PUT'])
@require_admin
def update_mission(mission_id):
    try:
        mission = Mission.query.get_or_404(mission_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and mission.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403
        data = request.get_json() or {}
        for field in ['title', 'description', 'start_date', 'end_date', 'status']:
            if field in data:
                setattr(mission, field, data[field])

        if 'user_ids' in data:
            MissionUser.query.filter_by(mission_id=mission.id).delete()
            for uid in data.get('user_ids', []):
                user = User.query.get(uid)
                if user and (current_user.role == 'superadmin' or user.company_id == current_user.company_id):
                    db.session.add(MissionUser(mission_id=mission.id, user_id=uid))

        db.session.commit()
        return jsonify({'mission': mission.to_dict(), 'message': 'Mission mise à jour'}), 200
    except Exception as e:
        print(f"Erreur lors de la mise à jour de la mission: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500
