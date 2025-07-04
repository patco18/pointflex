"""
Routes for fetching calendar events (pointages, missions, etc.)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from backend.middleware.auth import get_current_user, require_admin # Or more specific role checks
from backend.models.user import User
from backend.models.pointage import Pointage
from backend.models.mission import Mission
from backend.database import db
from datetime import datetime, date, timedelta
from sqlalchemy import or_, and_

calendar_bp = Blueprint('calendar_bp', __name__)

@calendar_bp.route('/events', methods=['GET'])
@jwt_required()
def get_calendar_events():
    current_user = get_current_user()
    if not current_user:
        return jsonify(message="Utilisateur non authentifié."), 401

    try:
        year_str = request.args.get('year')
        month_str = request.args.get('month') # 1-indexed month
        user_ids_str = request.args.get('user_ids') # Comma-separated string of user IDs, or 'self'

        if not year_str or not month_str:
            return jsonify(message="Les paramètres 'year' et 'month' sont requis."), 400

        year = int(year_str)
        month = int(month_str)

        # Calculate start and end of the month
        start_of_month = date(year, month, 1)
        if month == 12:
            end_of_month = date(year, month, 31)
        else:
            end_of_month = date(year, month + 1, 1) - timedelta(days=1)

        target_user_ids = []
        if user_ids_str == 'self' or not user_ids_str:
            target_user_ids = [current_user.id]
        elif current_user.role in ['admin_rh', 'superadmin', 'manager']: # Admins/managers can see more
            # For simplicity, allow admin/superadmin to query specific users.
            # Managers would ideally have a filter for their team.
            try:
                target_user_ids = [int(uid.strip()) for uid in user_ids_str.split(',') if uid.strip()]
                # Security check: ensure admin can only access users in their company
                if current_user.role == 'admin_rh':
                    allowed_users = User.query.filter(User.company_id == current_user.company_id, User.id.in_(target_user_ids)).all()
                    target_user_ids = [u.id for u in allowed_users]
                elif current_user.role == 'manager':
                    # TODO: Implement logic to get manager's team members
                    # For now, restrict to self if manager tries to query others without specific team logic
                    # Or, allow if target_user_ids are within their company and modify later
                    pass # Placeholder for manager logic
            except ValueError:
                return jsonify(message="user_ids doit être une liste d'IDs numériques séparés par des virgules."), 400
        else: # Regular employee can only see their own
             target_user_ids = [current_user.id]


        calendar_events = []

        # Fetch Pointages
        pointage_query = Pointage.query.filter(
            Pointage.user_id.in_(target_user_ids),
            Pointage.date_pointage >= start_of_month,
            Pointage.date_pointage <= end_of_month
        )
        pointages = pointage_query.all()

        for p in pointages:
            event_title = f"Pointage: {p.user.prenom} {p.user.nom}"
            if p.type == 'mission':
                event_title = f"Mission ({p.mission_order_number or 'N/A'}): {p.user.prenom} {p.user.nom}"

            event_start_dt = datetime.combine(p.date_pointage, p.heure_arrivee)
            event_end_dt = datetime.combine(p.date_pointage, p.heure_depart) if p.heure_depart else event_start_dt + timedelta(hours=1) # Default 1h if no checkout

            calendar_events.append({
                'id': f'pointage_{p.id}',
                'title': event_title,
                'start': event_start_dt.isoformat(),
                'end': event_end_dt.isoformat(),
                'type': 'pointage',
                'user_id': p.user_id,
                'user_name': f"{p.user.prenom} {p.user.nom}",
                'pointage_type': p.type,
                'status': p.statut,
                'color': '#3788D8' if p.type == 'office' else '#4CAF50', # Blue for office, Green for mission
            })

        # Fetch Missions
        # Missions that are active during any part of the month
        mission_query = Mission.query.join(Mission.users).filter(
            MissionUser.user_id.in_(target_user_ids),
            or_(
                and_(Mission.start_date <= end_of_month, Mission.end_date >= start_of_month), # Overlaps
                and_(Mission.start_date >= start_of_month, Mission.start_date <= end_of_month), # Starts in month
                and_(Mission.end_date >= start_of_month, Mission.end_date <= end_of_month) # Ends in month
            )
        )
        # If missions don't have users directly assigned, filter by company_id for admins
        if not target_user_ids and current_user.company_id: # e.g. admin looking at all company missions
             mission_query = Mission.query.filter(
                Mission.company_id == current_user.company_id,
                 or_(
                    and_(Mission.start_date <= end_of_month, Mission.end_date >= start_of_month),
                    and_(Mission.start_date >= start_of_month, Mission.start_date <= end_of_month),
                    and_(Mission.end_date >= start_of_month, Mission.end_date <= end_of_month)
                )
            )

        missions = mission_query.all()

        mission_users_map = {} # To avoid N+1 queries for user names if not eager loaded
        if target_user_ids:
            users = User.query.filter(User.id.in_(target_user_ids)).all()
            mission_users_map = {u.id: f"{u.prenom} {u.nom}" for u in users}


        for m in missions:
            # Determine user for this mission event on calendar (could be multiple users per mission)
            # For simplicity, if multiple users for a mission, we might show a generic mission event
            # or create one event per user assigned to the mission.
            # Here, we'll create one event per assigned user that is in target_user_ids

            assigned_target_users = [mu.user_id for mu in m.users if mu.user_id in target_user_ids]
            if not assigned_target_users and not (current_user.role in ['admin_rh', 'superadmin'] and m.company_id == current_user.company_id):
                # If specific users were requested and none of them are assigned to this mission, skip.
                # Or if it's not a company-wide view for an admin.
                continue

            mission_title_base = f"Mission: {m.title} ({m.order_number})"

            # If we have target users, create an event for each.
            # Otherwise, if it's a company-wide view, create one generic event for the mission.
            event_users_for_title = []
            if assigned_target_users:
                 event_users_for_title = [mission_users_map.get(uid, f"Utilisateur {uid}") for uid in assigned_target_users]

            final_event_title = mission_title_base
            if event_users_for_title:
                final_event_title += f" - {', '.join(event_users_for_title)}"

            # Missions might not have time, only date. Default to all-day.
            mission_start_dt = datetime.combine(m.start_date, datetime.min.time()) if m.start_date else None
            mission_end_dt = datetime.combine(m.end_date, datetime.max.time()) if m.end_date else None

            if not mission_start_dt: continue # Mission must have a start date

            calendar_events.append({
                'id': f'mission_{m.id}',
                'title': final_event_title,
                'start': mission_start_dt.isoformat(),
                'end': mission_end_dt.isoformat() if mission_end_dt else (mission_start_dt + timedelta(days=1)).isoformat(), # Full day if no end time
                'allDay': mission_end_dt is None or (mission_start_dt.time() == datetime.min.time() and mission_end_dt.time() == datetime.max.time()),
                'type': 'mission',
                'user_id': None, # Can be for multiple users, or pick first assigned if needed
                'user_name': ", ".join(event_users_for_title) if event_users_for_title else "Équipe assignée",
                'mission_status': m.status,
                'color': '#FF9800' # Orange for missions
            })

        # TODO: Fetch Leave Requests once that module is implemented

        return jsonify(calendar_events), 200

    except ValueError as ve:
        return jsonify(message=f"Paramètre invalide: {ve}"), 400
    except Exception as e:
        # Log the exception e
        return jsonify(message="Erreur interne du serveur lors de la récupération des événements du calendrier."), 500
