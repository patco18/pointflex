"""
Routes for fetching calendar events (pointages, missions, etc.)
"""
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from backend.middleware.auth import get_current_user, require_admin
from backend.models.user import User
from backend.models.pointage import Pointage
from backend.models.mission import Mission
from backend.models.mission_user import MissionUser
from backend.models.leave_request import LeaveRequest # Added LeaveRequest model
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

        # Determine target_user_ids based on role and input
        if user_ids_str == 'self' or (not user_ids_str and current_user.role not in ['admin_rh', 'superadmin', 'manager']):
            target_user_ids = [current_user.id]
        elif current_user.role == 'superadmin':
            if user_ids_str: # Superadmin can query specific users
                try:
                    target_user_ids = [int(uid.strip()) for uid in user_ids_str.split(',') if uid.strip()]
                except ValueError:
                    return jsonify(message="user_ids doit être une liste d'IDs numériques séparés par des virgules."), 400
            else: # Superadmin getting all users (potentially very large, might need company filter)
                  # For now, let's assume if superadmin doesn't specify user_ids, they might want company-specific if company_id is passed.
                  # This endpoint might need a company_id parameter for superadmin use.
                  # For simplicity here, if user_ids_str is empty for SA, fetch nothing or require explicit user_ids/company_id.
                  pass # Or fetch all if that's intended: target_user_ids = [u.id for u in User.query.all()]

        elif current_user.role == 'admin_rh':
            if not current_user.company_id: return jsonify(calendar_events=[]), 200
            company_users = User.query.filter_by(company_id=current_user.company_id).with_entities(User.id).all()
            company_user_ids = {uid[0] for uid in company_users}
            if user_ids_str: # Admin queries specific users within their company
                try:
                    requested_ids = {int(uid.strip()) for uid in user_ids_str.split(',') if uid.strip()}
                    target_user_ids = list(requested_ids.intersection(company_user_ids))
                except ValueError:
                    return jsonify(message="user_ids doit être une liste d'IDs numériques séparés par des virgules."), 400
            else: # Admin gets all users in their company
                target_user_ids = list(company_user_ids)

        elif current_user.role == 'manager':
            if not current_user.company_id: return jsonify(calendar_events=[]), 200
            managed_ids = [report.id for report in current_user.direct_reports]
            managed_ids.append(current_user.id) # Manager can also see their own events

            if user_ids_str: # Manager queries specific users they manage
                try:
                    requested_ids = {int(uid.strip()) for uid in user_ids_str.split(',') if uid.strip()}
                    target_user_ids = list(requested_ids.intersection(set(managed_ids)))
                except ValueError:
                    return jsonify(message="user_ids doit être une liste d'IDs numériques séparés par des virgules."), 400
            else: # Manager gets all their direct reports + self
                target_user_ids = managed_ids
        else: # Default: employee sees self
            target_user_ids = [current_user.id]

        if not target_user_ids and user_ids_str and user_ids_str != 'self': # If specific users requested but none are valid/allowed
             return jsonify(calendar_events=[]), 200


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

        # Fetch Approved Leave Requests
        leave_request_query = LeaveRequest.query.filter(
            LeaveRequest.user_id.in_(target_user_ids),
            LeaveRequest.status == 'approved', # Only show approved leave
            or_( # Similar date logic as missions to catch overlaps
                and_(LeaveRequest.start_date <= end_of_month, LeaveRequest.end_date >= start_of_month),
                and_(LeaveRequest.start_date >= start_of_month, LeaveRequest.start_date <= end_of_month),
                and_(LeaveRequest.end_date >= start_of_month, LeaveRequest.end_date <= end_of_month)
            )
        )
        approved_leaves = leave_request_query.all()

        for lr in approved_leaves:
            user_name_for_leave = mission_users_map.get(lr.user_id, f"Utilisateur {lr.user_id}") # Reuse map or fetch if needed

            leave_title = f"Congé: {lr.leave_type.name} - {user_name_for_leave}"
            if lr.requested_days == 0.5:
                if lr.start_day_period == 'half_day_morning':
                    leave_title += " (Matin)"
                elif lr.start_day_period == 'half_day_afternoon':
                    leave_title += " (Après-midi)"

            # For multi-day leaves that are partial on start/end, title might need more detail
            # or rely on allDay=false and specific start/end times if applicable.
            # For now, simple title augmentation for 0.5 day leaves.

            leave_start_dt = datetime.combine(lr.start_date, datetime.min.time()) # Assume full day for calendar start
            leave_end_dt = datetime.combine(lr.end_date, datetime.max.time())     # Assume full day for calendar end

            # Adjust start/end times for half-days if we want to show them as partial events on calendar
            # This requires a decision: are half-leaves "all-day" events for 0.5 days, or timed events?
            # For simplicity, let's treat them as all-day events for the specified date(s) but the title indicates period.
            # If they were timed, start/end times would be like 09:00-12:00 or 13:00-17:00.

            calendar_events.append({
                'id': f'leave_{lr.id}',
                'title': leave_title,
                'start': leave_start_dt.isoformat(),
                'end': (datetime.combine(lr.end_date, datetime.min.time()) + timedelta(days=1)).isoformat(), # FullCalendar end is exclusive for all-day
                'allDay': True, # Treat leaves as all-day events for now
                'type': 'leave',
                'user_id': lr.user_id,
                'user_name': user_name_for_leave,
                'leave_type_name': lr.leave_type.name,
                'requested_days': lr.requested_days,
                'start_day_period': lr.start_day_period,
                'end_day_period': lr.end_day_period,
                'status': lr.status, # Should be 'approved'
                'color': '#EF5350' # Example: Red for leave
            })

        return jsonify(calendar_events), 200

    except ValueError as ve:
        return jsonify(message=f"Paramètre invalide: {ve}"), 400
    except Exception as e:
        # Log the exception e
        return jsonify(message="Erreur interne du serveur lors de la récupération des événements du calendrier."), 500


@calendar_bp.route('/events/ical', methods=['GET'])
@jwt_required()
def download_calendar_events_ical():
    """Génère un fichier iCalendar avec les événements du calendrier d'équipe"""
    current_user = get_current_user()
    if not current_user:
        return jsonify(message="Utilisateur non authentifié."), 401

    try:
        year_str = request.args.get('year')
        month_str = request.args.get('month')
        user_ids_str = request.args.get('user_ids')

        if not year_str or not month_str:
            return jsonify(message="Les paramètres 'year' et 'month' sont requis."), 400

        # Reuse the JSON endpoint logic to collect events
        response = get_calendar_events()
        if isinstance(response, tuple):
            events, status = response
            if status != 200:
                return events, status
        else:
            events = response.get_json()

        calendar_events = events if isinstance(events, list) else events.get('calendar_events', events)

        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//PointFlex//Team Calendar//FR",
            "CALSCALE:GREGORIAN",
        ]

        for ev in calendar_events:
            try:
                start_dt = datetime.fromisoformat(ev['start'])
                end_dt = datetime.fromisoformat(ev['end'])
            except Exception:
                continue

            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{ev['id']}@pointflex",
                f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
                f"DTSTART:{start_dt.strftime('%Y%m%dT%H%M%S')}",
                f"DTEND:{end_dt.strftime('%Y%m%dT%H%M%S')}",
                f"SUMMARY:{ev['title']}",
                f"DESCRIPTION:{ev.get('status', '')}",
                "END:VEVENT",
            ])

        lines.append("END:VCALENDAR")
        ics_data = "\r\n".join(lines) + "\r\n"
        response = Response(ics_data, mimetype='text/calendar')
        response.headers['Content-Disposition'] = 'attachment; filename=team_events.ics'
        return response

    except ValueError as ve:
        return jsonify(message=f"Paramètre invalide: {ve}"), 400
    except Exception as e:
        return jsonify(message="Erreur interne du serveur lors de l'export iCal du calendrier."), 500
