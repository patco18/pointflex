"""
Routes de pointage
"""

from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from middleware.auth import get_current_user
from middleware.audit import log_user_action
from utils.notification_utils import send_notification
from backend.models.pointage import Pointage
from backend.models.pause import Pause
from backend.models.user import User
from backend.models.mission import Mission
from backend.models.office import Office
from backend.database import db
from datetime import datetime, date, timedelta
import math

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/checkin/office', methods=['POST'])
@jwt_required()
def office_checkin():
    """Pointage bureau avec géolocalisation"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        data = request.get_json()
        coordinates = data.get('coordinates', {})
        
        if not coordinates.get('latitude') or not coordinates.get('longitude'):
            return jsonify(message="Coordonnées GPS requises"), 400
        
        # Vérifier si l'utilisateur a déjà pointé aujourd'hui
        today = date.today()
        existing_pointage = Pointage.query.filter_by(
            user_id=current_user.id,
            date_pointage=today
        ).first()
        
        if existing_pointage:
            send_notification(current_user.id, "Pointage déjà enregistré pour aujourd'hui")
            return jsonify(message="Vous avez déjà pointé aujourd'hui"), 409
        
        # Récupérer les bureaux de l'entreprise
        if current_user.company_id:
            offices = Office.query.filter_by(
                company_id=current_user.company_id,
                is_active=True
            ).all()

            nearest_office = None
            min_distance = float('inf')

            for office in offices:
                distance = calculate_distance(
                    coordinates['latitude'], coordinates['longitude'],
                    office.latitude, office.longitude
                )

                if distance < min_distance:
                    min_distance = distance
                    nearest_office = office

            if offices:
                # Lorsqu'il existe des bureaux configurés, se baser uniquement sur ceux-ci
                if nearest_office and min_distance <= nearest_office.radius:
                    # Créer le pointage avec référence au bureau
                    pointage = Pointage(
                        user_id=current_user.id,
                        type='office',
                        latitude=coordinates['latitude'],
                        longitude=coordinates['longitude'],
                        office_id=nearest_office.id,
                        distance=min_distance
                    )
                else:
                    return jsonify(
                        message=f"Vous êtes trop loin du bureau ({int(min_distance)}m). Rayon autorisé: {nearest_office.radius if nearest_office else 'N/A'}m"
                    ), 403
            else:
                # Aucun bureau n'est configuré, utiliser les paramètres globaux de l'entreprise
                company = current_user.company
                if company and company.office_latitude and company.office_longitude:
                    distance = calculate_distance(
                        coordinates['latitude'], coordinates['longitude'],
                        company.office_latitude, company.office_longitude
                    )

                    if distance > company.office_radius:
                        return jsonify(
                            message=f"Vous êtes trop loin du bureau ({int(distance)}m). Rayon autorisé: {company.office_radius}m"
                        ), 403

                # Créer le pointage sans référence à un bureau spécifique
                pointage = Pointage(
                    user_id=current_user.id,
                    type='office',
                    latitude=coordinates['latitude'],
                    longitude=coordinates['longitude']
                )
        else:
            # Créer le pointage sans vérification de distance (cas rare)
            pointage = Pointage(
                user_id=current_user.id,
                type='office',
                latitude=coordinates['latitude'],
                longitude=coordinates['longitude']
            )
        
        db.session.add(pointage)
        db.session.flush()
        
        # Logger l'action
        log_user_action(
            action='OFFICE_CHECKIN',
            resource_type='Pointage',
            resource_id=pointage.id,
            details={
                'coordinates': coordinates,
                'status': pointage.statut,
                'office_id': getattr(pointage, 'office_id', None),
                'distance': getattr(pointage, 'distance', None)
            }
        )
        
        db.session.commit()

        # Dispatch webhook for pointage creation
        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='pointage.created',
                payload_data=pointage.to_dict(),
                company_id=current_user.company_id
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch pointage.created webhook for pointage {pointage.id}: {webhook_error}")

        send_notification(current_user.id, "Pointage bureau enregistré")
        if pointage.statut == 'retard':
            send_notification(current_user.id, "Vous êtes en retard")

        return jsonify({
            'message': 'Pointage bureau enregistré avec succès',
            'pointage': pointage.to_dict()
        }), 201
        
    except Exception as e:
        print(f"Erreur lors du pointage bureau: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@attendance_bp.route('/checkin/mission', methods=['POST'])
@jwt_required()
def mission_checkin():
    """Pointage mission avec numéro d'ordre"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        data = request.get_json()
        mission_order_number = data.get('mission_order_number')
        coordinates = data.get('coordinates', {})

        if not mission_order_number:
            return jsonify(message="Numéro d'ordre de mission requis"), 400

        mission = Mission.query.filter_by(order_number=mission_order_number).first()
        if not mission:
            return jsonify(message="Numéro d'ordre de mission invalide"), 404
        if current_user.role != 'superadmin' and mission.company_id != current_user.company_id:
            return jsonify(message="Mission non autorisée pour votre entreprise"), 403

        # verify assignment
        assigned = any(mu.user_id == current_user.id for mu in mission.users)
        if not assigned:
            return jsonify(message="Vous n'êtes pas affecté à cette mission"), 403

        if not coordinates.get('latitude') or not coordinates.get('longitude'):
            return jsonify(message="Coordonnées GPS requises"), 400
        
        # Vérifier si l'utilisateur a déjà pointé aujourd'hui
        today = date.today()
        existing_pointage = Pointage.query.filter_by(
            user_id=current_user.id,
            date_pointage=today
        ).first()
        
        if existing_pointage:
            send_notification(current_user.id, "Pointage déjà enregistré pour aujourd'hui")
            return jsonify(message="Vous avez déjà pointé aujourd'hui"), 409
        
        # Créer le pointage mission
        pointage = Pointage(
            user_id=current_user.id,
            type='mission',
            mission_order_number=mission_order_number,
            latitude=coordinates['latitude'],
            longitude=coordinates['longitude']
        )
        
        db.session.add(pointage)
        db.session.flush()
        
        # Logger l'action
        log_user_action(
            action='MISSION_CHECKIN',
            resource_type='Pointage',
            resource_id=pointage.id,
            details={
                'mission_order_number': mission_order_number,
                'status': pointage.statut,
                'coordinates': coordinates
            }
        )
        
        db.session.commit()

        # Dispatch webhook for pointage creation (mission type)
        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='pointage.created', # Same event type, payload indicates 'mission'
                payload_data=pointage.to_dict(),
                company_id=current_user.company_id
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch pointage.created (mission) webhook for pointage {pointage.id}: {webhook_error}")

        send_notification(current_user.id, "Pointage mission enregistré")
        if pointage.statut == 'retard':
            send_notification(current_user.id, "Vous êtes en retard")

        return jsonify({
            'message': 'Pointage mission enregistré avec succès',
            'pointage': pointage.to_dict()
        }), 201
        
    except Exception as e:
        print(f"Erreur lors du pointage mission: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@attendance_bp.route('/checkout', methods=['POST'])
@jwt_required()
def checkout():
    """Enregistre l'heure de départ de l'utilisateur"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        today = date.today()
        pointage = Pointage.query.filter_by(
            user_id=current_user.id,
            date_pointage=today
        ).first()

        if not pointage:
            send_notification(current_user.id, "Aucun pointage d'arrivée trouvé pour aujourd'hui")
            return jsonify(message="Pas de pointage d'arrivée pour aujourd'hui"), 404

        if pointage.heure_depart:
            return jsonify(message="Heure de départ déjà enregistrée"), 409

        pointage.heure_depart = datetime.utcnow().time()

        log_user_action(
            action='CHECKOUT',
            resource_type='Pointage',
            resource_id=pointage.id,
            details={'checkout_time': pointage.heure_depart.strftime('%H:%M')}
        )

        db.session.commit()

        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='pointage.updated', # Or 'pointage.checkout'
                payload_data=pointage.to_dict(),
                company_id=current_user.company_id
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch pointage.updated (checkout) webhook for pointage {pointage.id}: {webhook_error}")

        send_notification(current_user.id, "Heure de départ enregistrée")

        return jsonify({
            'message': 'Heure de départ enregistrée',
            'pointage': pointage.to_dict()
        }), 200

    except Exception as e:
        print(f"Erreur lors du checkout: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@attendance_bp.route('/pause/start', methods=['POST'])
@jwt_required()
def start_pause():
    """Enregistre le début d'une pause"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        today = date.today()
        # Vérifier si une pause est déjà en cours
        existing = Pause.query.filter_by(user_id=current_user.id, date_pause=today, end_time=None).first()
        if existing:
            return jsonify(message="Une pause est déjà en cours"), 409

        pause = Pause(user_id=current_user.id)
        db.session.add(pause)
        db.session.commit()

        return jsonify({'message': 'Pause démarrée', 'pause': pause.to_dict()}), 201

    except Exception as e:
        print(f"Erreur start pause: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@attendance_bp.route('/pause/end', methods=['POST'])
@jwt_required()
def end_pause():
    """Enregistre la fin d'une pause"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        today = date.today()
        pause = Pause.query.filter_by(user_id=current_user.id, date_pause=today, end_time=None).first()
        if not pause:
            return jsonify(message="Aucune pause en cours"), 404

        pause.end_time = datetime.utcnow().time()
        db.session.commit()

        return jsonify({'message': 'Pause terminée', 'pause': pause.to_dict()}), 200

    except Exception as e:
        print(f"Erreur end pause: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@attendance_bp.route('', methods=['GET'])
@jwt_required()
def get_attendance():
    """Récupère l'historique des pointages"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        # Paramètres de requête
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Construire la requête
        query = Pointage.query.filter_by(user_id=current_user.id)
        
        # Filtres de date
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(Pointage.date_pointage >= start_date_obj)
            except ValueError:
                return jsonify(message="Format de date invalide pour start_date (YYYY-MM-DD)"), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(Pointage.date_pointage <= end_date_obj)
            except ValueError:
                return jsonify(message="Format de date invalide pour end_date (YYYY-MM-DD)"), 400
        
        # Ordonner par date décroissante
        query = query.order_by(Pointage.date_pointage.desc(), Pointage.heure_arrivee.desc())
        
        # Pagination
        pointages = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'records': [pointage.to_dict() for pointage in pointages.items],
            'pagination': {
                'page': page,
                'pages': pointages.pages,
                'per_page': per_page,
                'total': pointages.total
            }
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des pointages: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@attendance_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_attendance_stats():
    """Récupère les statistiques de pointage de l'utilisateur"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        # Période par défaut : mois en cours
        today = date.today()
        start_of_month = today.replace(day=1)
        
        # Récupérer les pointages du mois
        pointages = Pointage.query.filter(
            Pointage.user_id == current_user.id,
            Pointage.date_pointage >= start_of_month,
            Pointage.date_pointage <= today
        ).all()
        
        # Calculer les statistiques
        total_days = len(pointages)
        present_days = len([p for p in pointages if p.statut == 'present'])
        late_days = len([p for p in pointages if p.statut == 'retard'])
        absence_days = 0  # Pour l'instant, on ne gère pas les absences
        
        # Calculer les heures moyennes (simulation)
        total_hours = sum([p.calculate_worked_hours() or 8 for p in pointages])
        average_hours = total_hours / total_days if total_days > 0 else 0
        
        return jsonify({
            'stats': {
                'total_days': total_days,
                'present_days': present_days,
                'late_days': late_days,
                'absence_days': absence_days,
                'average_hours': round(average_hours, 2),
                'period': {
                    'start': start_of_month.isoformat(),
                    'end': today.isoformat()
                }
            }
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des statistiques: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@attendance_bp.route('/calendar', methods=['GET'])
@jwt_required()
def download_calendar():
    """Génère un fichier iCalendar avec les pointages de l'utilisateur"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = Pointage.query.filter_by(user_id=current_user.id)

        if start_date:
            start_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage >= start_obj)
        if end_date:
            end_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage <= end_obj)

        records = query.order_by(Pointage.date_pointage).all()

        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//PointFlex//Attendance Calendar//FR",
            "CALSCALE:GREGORIAN",
        ]

        for p in records:
            start_dt = datetime.combine(p.date_pointage, p.heure_arrivee)
            end_dt = datetime.combine(p.date_pointage, p.heure_depart or p.heure_arrivee)
            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{p.id}@pointflex",
                f"DTSTAMP:{p.created_at.strftime('%Y%m%dT%H%M%SZ')}",
                f"DTSTART:{start_dt.strftime('%Y%m%dT%H%M%S')}",
                f"DTEND:{end_dt.strftime('%Y%m%dT%H%M%S')}",
                f"SUMMARY:{'Mission' if p.type == 'mission' else 'Présence bureau'}",
                f"DESCRIPTION:Statut {p.statut}",
                "END:VEVENT",
            ])

        lines.append("END:VCALENDAR")
        ics_data = "\r\n".join(lines) + "\r\n"
        response = Response(ics_data, mimetype='text/calendar')
        response.headers['Content-Disposition'] = 'attachment; filename=attendance.ics'
        return response

    except Exception as e:
        print(f"Erreur generation calendrier: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calcule la distance entre deux points GPS en mètres"""
    # Rayon de la Terre en mètres
    R = 6371000
    
    # Convertir en radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Différences
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # Formule de Haversine
    a = (math.sin(dlat/2) * math.sin(dlat/2) + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * 
         math.sin(dlon/2) * math.sin(dlon/2))
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    # Distance en mètres
    distance = R * c
    
    return distance
