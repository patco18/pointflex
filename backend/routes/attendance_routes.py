"""
Routes de pointage
"""

from flask import Blueprint, request, jsonify, Response, current_app
from flask_jwt_extended import jwt_required
from backend.middleware.auth import get_current_user
from backend.middleware.audit import log_user_action
from backend.utils.notification_utils import send_notification
from backend.utils.attendance_logger import log_attendance_event, log_attendance_error
from backend.models.pointage import Pointage
from backend.models.pause import Pause
from backend.models.user import User
from backend.models.mission import Mission
from backend.models.office import Office
from backend.database import db
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from backend.models.system_settings import SystemSettings
import math
from sqlalchemy.exc import SQLAlchemyError
from backend.services.geolocation_accuracy_service import GeolocationAccuracyService

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
        
        # Utiliser le service robuste pour le pointage
        from backend.services.attendance_service import office_checkin_safe
        result = office_checkin_safe(current_user.id, coordinates)
        
        # Gérer le résultat
        if result.get('error', False):
            return jsonify(message=result.get('message', "Une erreur s'est produite")), result.get('status_code', 500)
            
        # Envoyer les notifications client si le pointage est réussi
        pointage = result.get('pointage')
        if pointage:
            send_notification(current_user.id, "Pointage bureau enregistré")
            if pointage.get('statut') == 'retard':
                send_notification(current_user.id, "Vous êtes en retard")
        
        # Renvoyer le résultat
        return jsonify({
            'message': result.get('message', 'Pointage bureau enregistré avec succès'),
            'pointage': pointage
        }), result.get('status_code', 201)

    except Exception as e:
        error_details = str(e)
        current_app.logger.error(f"Erreur lors du pointage bureau: {error_details}")
        
        # Fournir des messages d'erreur plus détaillés selon le type d'exception
        if "coordinates" in error_details.lower():
            return jsonify(message="Erreur de coordonnées GPS"), 400
        elif "office" in error_details.lower():
            return jsonify(message="Bureau non trouvé ou inactif"), 404
        elif "database" in error_details.lower() or "sql" in error_details.lower():
            return jsonify(message="Erreur de base de données lors du pointage"), 500
        else:
            return jsonify(message="Erreur interne du serveur"), 500
# La route de test a été supprimée car elle n'est plus nécessaire
# Le endpoint /api/attendance/checkin/office utilise désormais le service robuste

@attendance_bp.route('/checkin/mission', methods=['POST'])
@jwt_required()
def mission_checkin():
    """Pointage mission avec numéro d'ordre"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        data = request.get_json()
        mission_id = data.get('mission_id')
        mission_order_number = data.get('mission_order_number')
        coordinates = data.get('coordinates', {})

        if not mission_id and not mission_order_number:
            return jsonify(message="mission_id ou mission_order_number requis"), 400

        mission = None
        if mission_id:
            mission = Mission.query.get(mission_id)
        if not mission and mission_order_number:
            mission = Mission.query.filter_by(order_number=mission_order_number).first()

        if not mission:
            return jsonify(message="Mission introuvable"), 404
        if current_user.role != 'superadmin' and mission.company_id != current_user.company_id:
            return jsonify(message="Mission non autorisée pour votre entreprise"), 403

        from backend.models.mission_user import MissionUser
        mu = MissionUser.query.filter_by(mission_id=mission.id, user_id=current_user.id, status='accepted').first()
        if not mu:
            return jsonify(message="Mission non acceptée"), 403

        if (
            coordinates.get('latitude') is None
            or coordinates.get('longitude') is None
            or coordinates.get('accuracy') is None
        ):
            return jsonify(message="Coordonnées GPS requises"), 400

        max_accuracy = current_app.config.get('GEOLOCATION_MAX_ACCURACY', 100)
        company = mission.company
        if company and getattr(company, 'geolocation_max_accuracy', None) is not None:
            max_accuracy = company.geolocation_max_accuracy
        mission_accuracy = getattr(mission, 'geolocation_max_accuracy', None)
        if mission_accuracy is not None:
            max_accuracy = mission_accuracy


            log_attendance_error(
                'mission_checkin_accuracy_rejected',
                current_user.id,
                {
                    'mission_id': mission.id,
                    'reported_accuracy': coordinates['accuracy'],
                    'allowed_accuracy': max_accuracy,
                },
            )
            return jsonify(
                message=(
                    f"Précision de localisation insuffisante ({int(coordinates['accuracy'])}m). "
                    f"Maximum autorisé: {max_accuracy}m"
                )
            ), 400

        # Utiliser la date actuelle
        today_date = datetime.now().date()

        existing_pointage = Pointage.query.filter_by(
            user_id=current_user.id,
            date_pointage=today_date,
            type='mission',
            mission_id=mission.id
        ).first()

        if existing_pointage:
            send_notification(current_user.id, "Pointage déjà enregistré pour cette mission aujourd'hui")
            return jsonify(message="Vous avez déjà pointé pour cette mission aujourd'hui"), 409

        # Calcul de distance par rapport au lieu de mission si disponible
        mission_distance = None
        if mission.latitude is not None and mission.longitude is not None:
            mission_distance = calculate_distance(
                coordinates['latitude'], coordinates['longitude'],
                mission.latitude, mission.longitude
            )
            
        if (
            mission.radius is not None
            and mission.latitude is not None
            and mission.longitude is not None
            and mission_distance > mission.radius
        ):
            log_attendance_error(
                'mission_checkin_out_of_bounds',
                current_user.id,
                {
                    'mission_id': mission.id,
                    'distance': mission_distance,
                    'allowed_radius': mission.radius,
                },
            )
            return jsonify(
                message=(
                    f"Vous êtes trop loin du lieu de mission ({int(mission_distance)}m). "
                    f"Rayon autorisé: {mission.radius}m"
                )
            ), 403

        pointage = Pointage(
            user_id=current_user.id,
            type='mission',
            mission_id=mission.id,
            mission_order_number=mission.order_number,
            latitude=coordinates['latitude'],
            longitude=coordinates['longitude'],
            distance=mission_distance  # Stocker la distance calculée
        )

        db.session.add(pointage)
        db.session.flush()

        adjuster.record_success(coordinates['accuracy'], max_accuracy)

        # Logger l'action
        log_user_action(
            action='MISSION_CHECKIN',
            resource_type='Pointage',
            resource_id=pointage.id,
            details={
                'mission_id': mission.id,
                'mission_order_number': mission.order_number,
                'status': pointage.statut,
                'coordinates': coordinates,
                'distance': mission_distance  # Utiliser la distance calculée précédemment
            }
        )

        db.session.commit()

        log_attendance_event(
            event_type='mission_checkin',
            user_id=current_user.id,
            details={
                'pointage_id': pointage.id,
                'mission_id': mission.id,
                'accuracy': coordinates['accuracy'],
                'max_accuracy': max_accuracy,
                'distance': mission_distance,
            },
        )

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

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception("Database error during mission checkin")
        return jsonify(message="Erreur de base de données lors du pointage"), 500
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Erreur lors du pointage mission")
        return jsonify(message="Erreur interne du serveur"), 500
@attendance_bp.route('/checkout', methods=['POST'])
@jwt_required()
def checkout():
    """Enregistre l'heure de départ de l'utilisateur"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        data = request.get_json() or {}
        pointage_id = data.get('pointage_id')
        mission_id = data.get('mission_id')

        tz_name = SystemSettings.get_setting('general', 'default_timezone', 'UTC')
        now_local = datetime.now(ZoneInfo(tz_name))
        now_utc = now_local.astimezone(ZoneInfo('UTC'))
        today = now_utc.date()

        if pointage_id:
            pointage = Pointage.query.filter_by(id=pointage_id, user_id=current_user.id).first()
        elif mission_id:
            pointage = Pointage.query.filter_by(
                user_id=current_user.id,
                date_pointage=today,
                type='mission',
                mission_id=mission_id
            ).first()
        else:
            pointage = Pointage.query.filter_by(
                user_id=current_user.id,
                date_pointage=today,
                type='office'
            ).first()

        if pointage and pointage.office and pointage.office.timezone:
            tz_name = pointage.office.timezone
            now_local = datetime.now(ZoneInfo(tz_name))
            now_utc = now_local.astimezone(ZoneInfo('UTC'))
            today = now_utc.date()

        if not pointage:
            send_notification(current_user.id, "Aucun pointage d'arrivée trouvé pour aujourd'hui")
            return jsonify(message="Pas de pointage d'arrivée pour aujourd'hui"), 404

        if pointage.heure_depart:
            return jsonify(message="Heure de départ déjà enregistrée"), 409

        pointage.heure_depart = now_utc.time()

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

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception("Database error during checkout")
        return jsonify(message="Erreur de base de données lors de l'enregistrement de la sortie"), 500
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Erreur lors du checkout")
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

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception("Database error starting pause")
        return jsonify(message="Erreur de base de données lors du démarrage de la pause"), 500
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Erreur start pause")
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

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception("Database error ending pause")
        return jsonify(message="Erreur de base de données lors de la fin de la pause"), 500
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Erreur end pause")
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
        
        # Utiliser le service sécurisé pour récupérer les pointages
        from backend.services.attendance_service import get_attendance_safe
        result = get_attendance_safe(
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date,
            page=page,
            per_page=per_page
        )
        
        # Gérer les erreurs retournées par le service
        if result.get('error'):
            return jsonify(message=result.get('message')), result.get('status_code', 500)
            
        # Retourner les données en cas de succès
        return jsonify({
            'records': result.get('records', []),
            'pagination': result.get('pagination', {
                'page': page,
                'pages': 0,
                'per_page': per_page,
                'total': 0
            })
        }), result.get('status_code', 200)
        
    except Exception as e:
        current_app.logger.error(
            f"Erreur lors de la récupération des pointages: {str(e)}", exc_info=e
        )
        return jsonify(message="Erreur interne du serveur"), 500

@attendance_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_attendance_stats():
    """Récupère les statistiques de pointage de l'utilisateur"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        # Utiliser le service sécurisé pour récupérer les statistiques
        from backend.services.attendance_service import get_attendance_stats_safe
        result = get_attendance_stats_safe(user_id=current_user.id)
        
        # Gérer les erreurs retournées par le service
        if result.get('error'):
            return jsonify(message=result.get('message')), result.get('status_code', 500)
        
        # Retourner les données en cas de succès
        return jsonify({'stats': result.get('stats', {})}), result.get('status_code', 200)
        
    except Exception as e:
        current_app.logger.error(
            f"Erreur lors de la récupération des statistiques: {str(e)}", exc_info=e
        )
        return jsonify(message="Erreur interne du serveur"), 500

@attendance_bp.route('/last7days', methods=['GET'])
@jwt_required()
def get_last_7days_stats():
    """Récupère les statistiques des 7 derniers jours"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        # Utiliser le service sécurisé pour récupérer les statistiques des 7 derniers jours
        from backend.services.attendance_service import get_last_7days_stats_safe
        result = get_last_7days_stats_safe(user_id=current_user.id)
        
        # Gérer les erreurs retournées par le service
        if result.get('error'):
            return jsonify(message=result.get('message')), result.get('status_code', 500)
        
        # Retourner les données en cas de succès
        return jsonify({'stats': result.get('stats', [])}), result.get('status_code', 200)
        
    except Exception as e:
        current_app.logger.error(
            f"Erreur lors de la récupération des statistiques des 7 derniers jours: {str(e)}", exc_info=e
        )
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

        start_obj = None
        end_obj = None
        if start_date:
            try:
                start_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(Pointage.date_pointage >= start_obj)
            except ValueError:
                return jsonify(message="Format de date invalide pour start_date (YYYY-MM-DD)"), 400
        if end_date:
            try:
                end_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(Pointage.date_pointage <= end_obj)
            except ValueError:
                return jsonify(message="Format de date invalide pour end_date (YYYY-MM-DD)"), 400
        if start_obj and end_obj and start_obj > end_obj:
            return jsonify(message="Plage de dates invalide : start_date est postérieure à end_date"), 400

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

    except SQLAlchemyError as e:
        current_app.logger.exception("Database error generating calendar")
        return jsonify(message="Erreur de base de données lors de la génération du calendrier"), 500
    except Exception:
        current_app.logger.exception("Erreur generation calendrier")
        return jsonify(message="Erreur interne du serveur"), 500

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calcule la distance entre deux points GPS en mètres"""
    try:
        # Validation des entrées
        if not all(isinstance(coord, (int, float)) for coord in [lat1, lon1, lat2, lon2]):
            current_app.logger.error(f"Invalid coordinate types: {type(lat1)}, {type(lon1)}, {type(lat2)}, {type(lon2)}")
            return float('inf')  # Distance infinie en cas d'erreur
        
        # Validation des valeurs
        if not (-90 <= lat1 <= 90 and -90 <= lat2 <= 90 and -180 <= lon1 <= 180 and -180 <= lon2 <= 180):
            current_app.logger.error(f"Coordinates out of range: {lat1}, {lon1}, {lat2}, {lon2}")
            return float('inf')  # Distance infinie en cas d'erreur
        
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
    except Exception as e:
        current_app.logger.error(f"Error calculating distance: {e}")
        return float('inf')  # Distance infinie en cas d'erreur

# Nouvelle route pour obtenir le pointage du jour de l'utilisateur connecté
@attendance_bp.route('/today', methods=['GET'])
@jwt_required()
def get_today_attendance():
    """Récupère le pointage du jour pour l'utilisateur connecté"""
    current_user = None
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        today = date.today()
        
        # Récupérer le pointage du jour
        pointage = Pointage.query.filter_by(
            user_id=current_user.id,
            date_pointage=today
        ).first()
        
        if not pointage:
            # Renvoyer un objet vide avec un statut 200 au lieu d'un 404
            empty_data = {
                'id': None,
                'user_id': current_user.id,
                'date_pointage': today.isoformat(),
                'heure_arrivee': None,
                'heure_depart': None,
                'type': None,
                'statut': 'absent',
                'latitude': None,
                'longitude': None,
                'mission_order_number': None,
                'office_id': None,
                'message': 'Pas de pointage enregistré pour aujourd\'hui'
            }
            return jsonify(empty_data), 200
        
        # Convertir en dictionnaire pour la réponse JSON
        pointage_data = {
            'id': pointage.id,
            'user_id': pointage.user_id,
            'date_pointage': pointage.date_pointage.isoformat(),
            'heure_arrivee': pointage.heure_arrivee.strftime('%H:%M:%S') if pointage.heure_arrivee else None,
            'heure_depart': pointage.heure_depart.strftime('%H:%M:%S') if pointage.heure_depart else None,
            'type': pointage.type,
            'statut': pointage.statut,
            'latitude': pointage.latitude,
            'longitude': pointage.longitude,
            'mission_order_number': pointage.mission_order_number,
            'office_id': pointage.office_id
        }
        
        return jsonify(pointage_data), 200

    except SQLAlchemyError as e:
        current_app.logger.error(f"Erreur de base de données lors de la récupération du pointage du jour: {e}")
        log_attendance_error('get_today_attendance', getattr(current_user, 'id', None), str(e))
        db.session.rollback()
        return jsonify(message="Erreur de base de données lors de la récupération du pointage du jour"), 500
    except Exception as e:
        current_app.logger.error(f"Erreur interne lors de la récupération du pointage du jour: {e}")
        log_attendance_error('get_today_attendance', getattr(current_user, 'id', None), str(e))
        return jsonify(message="Erreur interne du serveur lors de la récupération du pointage du jour"), 500
