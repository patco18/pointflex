"""
Routes additionnelles pour le système de pointage amélioré
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from backend.middleware.auth import get_current_user
from backend.models.pointage import Pointage
from backend.models.pause import Pause
from backend.models.mission import Mission
from backend.models.user import User
from backend.database import db
from datetime import datetime, date, timedelta
import json

attendance_extras_bp = Blueprint('attendance_extras', __name__)

@attendance_extras_bp.route('/today', methods=['GET'])
@jwt_required()
def today_attendance():
    """Récupère le pointage du jour pour l'utilisateur authentifié"""
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
            return jsonify(data=None), 200
        
        # Calculer le retard en minutes si applicable
        delay_minutes = None
        if pointage.statut == 'retard' and current_user.company:
            work_start = current_user.company.work_start_time
            if work_start:
                arrival_minutes = pointage.heure_arrivee.hour * 60 + pointage.heure_arrivee.minute
                work_start_minutes = work_start.hour * 60 + work_start.minute
                delay_minutes = arrival_minutes - work_start_minutes
        
        # Calculer le temps de travail
        worked_hours = None
        if pointage.heure_depart:
            worked_hours = pointage.calculate_worked_hours()
        
        # Formater le résultat
        result = {
            'id': pointage.id,
            'type': pointage.type,
            'date_pointage': pointage.date_pointage.isoformat(),
            'heure_arrivee': pointage.heure_arrivee.isoformat() if pointage.heure_arrivee else None,
            'heure_depart': pointage.heure_depart.isoformat() if pointage.heure_depart else None,
            'statut': pointage.statut,
            'delay_minutes': delay_minutes,
            'worked_hours': worked_hours,
            'office_id': pointage.office_id,
            'mission_order_number': pointage.mission_order_number
        }
        
        return jsonify(data=result), 200
    
    except Exception as e:
        print(f"Erreur today_attendance: {e}")
        return jsonify(message="Une erreur est survenue"), 500

@attendance_extras_bp.route('/stats/weekly', methods=['GET'])
@jwt_required()
def weekly_stats():
    """Récupère les statistiques de pointage hebdomadaires"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())  # Lundi de la semaine actuelle
        end_of_week = start_of_week + timedelta(days=6)  # Dimanche de la semaine actuelle
        
        # Récupérer tous les pointages de la semaine
        pointages = Pointage.query.filter(
            Pointage.user_id == current_user.id,
            Pointage.date_pointage >= start_of_week,
            Pointage.date_pointage <= end_of_week
        ).order_by(Pointage.date_pointage).all()
        
        # Initialiser les données pour chaque jour de la semaine
        days_data = []
        for i in range(7):
            day_date = start_of_week + timedelta(days=i)
            
            # Ne pas inclure les jours futurs
            if day_date > today:
                continue
                
            day_data = {
                'date': day_date.isoformat(),
                'status': 'absent',  # Par défaut
                'worked_hours': None,
                'arrival_time': None,
                'departure_time': None
            }
            
            # Chercher un pointage pour ce jour
            day_pointage = next((p for p in pointages if p.date_pointage == day_date), None)
            
            if day_pointage:
                day_data['status'] = day_pointage.statut
                
                if day_pointage.heure_arrivee:
                    day_data['arrival_time'] = day_pointage.heure_arrivee.strftime('%H:%M')
                    
                if day_pointage.heure_depart:
                    day_data['departure_time'] = day_pointage.heure_depart.strftime('%H:%M')
                    day_data['worked_hours'] = day_pointage.calculate_worked_hours()
            
            days_data.append(day_data)
        
        # Calculer les statistiques récapitulatives
        present_days = sum(1 for day in days_data if day['status'] in ['present', 'retard'])
        late_days = sum(1 for day in days_data if day['status'] == 'retard')
        absent_days = sum(1 for day in days_data if day['status'] == 'absent')
        total_days = len(days_data)
        
        # Calculer la moyenne des heures travaillées
        valid_hours = [day['worked_hours'] for day in days_data if day['worked_hours'] is not None]
        average_hours = sum(valid_hours) / len(valid_hours) if valid_hours else 0
        
        # Simuler une tendance par rapport à la semaine précédente
        # Dans une implémentation réelle, on comparerait avec les données de la semaine précédente
        trend_percentage = 5 if average_hours > 7.5 else -3 if average_hours < 7 else 0
        trend = 'up' if trend_percentage > 0 else 'down' if trend_percentage < 0 else 'stable'
        
        result = {
            'days': days_data,
            'summary': {
                'present_days': present_days,
                'late_days': late_days,
                'absent_days': absent_days,
                'total_days': total_days,
                'average_hours': average_hours,
                'trend': trend,
                'trend_percentage': abs(trend_percentage)
            }
        }
        
        return jsonify(data=result), 200
    
    except Exception as e:
        print(f"Erreur weekly_stats: {e}")
        return jsonify(message="Une erreur est survenue"), 500

@attendance_extras_bp.route('/pauses', methods=['GET'])
@jwt_required()
def get_pauses():
    """Récupère les pauses de l'utilisateur pour la journée en cours"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
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
        ).order_by(Pause.start_time).all()
        
        result = []
        for pause in pauses:
            pause_data = {
                'id': pause.id,
                'type': pause.type,
                'start_time': pause.start_time.isoformat(),
                'end_time': pause.end_time.isoformat() if pause.end_time else None,
                'duration_minutes': pause.duration_minutes
            }
            result.append(pause_data)
        
        return jsonify(pauses=result), 200
    
    except Exception as e:
        print(f"Erreur get_pauses: {e}")
        return jsonify(message="Une erreur est survenue"), 500

@attendance_extras_bp.route('/pause/start', methods=['POST'])
@jwt_required()
def start_pause():
    """Démarre une pause pour l'utilisateur"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        data = request.get_json()
        pause_type = data.get('type', 'default')  # Type de pause : lunch, work, personal
        
        # Vérifier qu'il n'y a pas déjà une pause active
        today = date.today()
        
        # Trouver le pointage du jour
        today_attendance = Pointage.query.filter_by(
            user_id=current_user.id,
            date_pointage=today
        ).first()
        
        if not today_attendance:
            return jsonify(message="Pas de pointage trouvé pour aujourd'hui"), 404
            
        # Vérifier qu'il n'y a pas déjà une pause active
        active_pause = Pause.query.filter(
            Pause.pointage_id == today_attendance.id,
            Pause.end_time == None
        ).first()
        
        if active_pause:
            return jsonify(message="Vous avez déjà une pause en cours"), 409
        
        # Vérifier qu'un pointage a été fait aujourd'hui
        pointage = Pointage.query.filter_by(
            user_id=current_user.id,
            date_pointage=today
        ).first()
        
        if not pointage:
            return jsonify(message="Vous devez d'abord pointer avant de prendre une pause"), 400
        
        if pointage.heure_depart:
            return jsonify(message="Vous avez déjà terminé votre journée"), 400
        
        # Créer la pause
        now = datetime.now()
        new_pause = Pause(
            user_id=current_user.id,
            date=today,
            start_time=now,
            type=pause_type
        )
        
        db.session.add(new_pause)
        db.session.commit()
        
        return jsonify(
            message="Pause démarrée avec succès",
            pause_id=new_pause.id,
            start_time=new_pause.start_time.isoformat()
        ), 201
    
    except Exception as e:
        db.session.rollback()
        print(f"Erreur start_pause: {e}")
        return jsonify(message="Une erreur est survenue"), 500

@attendance_extras_bp.route('/pause/end', methods=['POST'])
@jwt_required()
def end_pause():
    """Termine une pause en cours"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        data = request.get_json()
        pause_id = data.get('pause_id')
        
        # Si l'ID de pause est fourni, rechercher cette pause spécifique
        if pause_id:
            pause = Pause.query.filter_by(
                id=pause_id
            ).first()
            
            if not pause:
                return jsonify(message="Pause non trouvée"), 404
        else:
            # Sinon, rechercher la pause active
            today = date.today()
            
            # Trouver le pointage du jour
            today_attendance = Pointage.query.filter_by(
                user_id=current_user.id,
                date_pointage=today
            ).first()
            
            if not today_attendance:
                return jsonify(message="Pas de pointage trouvé pour aujourd'hui"), 404
            
            pause = Pause.query.filter(
                Pause.pointage_id == today_attendance.id,
                Pause.end_time == None
            ).first()
            
            if not pause:
                return jsonify(message="Aucune pause en cours"), 404
        
        # Terminer la pause
        now = datetime.now()
        pause.end_time = now
        
        # Calculer la durée en minutes
        duration = (now - pause.start_time).total_seconds() / 60
        pause.duration_minutes = round(duration)
        
        db.session.commit()
        
        return jsonify(
            message="Pause terminée avec succès",
            duration_minutes=pause.duration_minutes
        ), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Erreur end_pause: {e}")
        return jsonify(message="Une erreur est survenue"), 500

@attendance_extras_bp.route('/checkin/qr', methods=['POST'])
@jwt_required()
def qr_checkin():
    """Pointage par scan de QR code"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        data = request.get_json()
        qr_data = data.get('qr_data')
        
        if not qr_data:
            return jsonify(message="Données QR manquantes"), 400
        
        # Vérifier si l'utilisateur a déjà pointé aujourd'hui
        today = date.today()
        existing_pointage = Pointage.query.filter_by(
            user_id=current_user.id,
            date_pointage=today
        ).first()
        
        if existing_pointage:
            return jsonify(message="Vous avez déjà pointé aujourd'hui"), 409
        
        # Dans une implémentation réelle, nous vérifierions la validité du QR code
        # et extrairions les informations du bureau, etc.
        # Pour cette démo, nous simulons un pointage réussi
        
        # Simuler la recherche d'un bureau à partir du QR code
        office_id = 1  # Simulé
        
        # Créer le pointage
        pointage = Pointage(
            user_id=current_user.id,
            type='office',
            office_id=office_id,
            is_qr_scan=True  # Champ à ajouter au modèle Pointage
        )
        
        db.session.add(pointage)
        db.session.commit()
        
        return jsonify(
            message="Pointage par QR code réussi",
            pointage={
                'id': pointage.id,
                'date': pointage.date_pointage.isoformat(),
                'heure': pointage.heure_arrivee.strftime('%H:%M'),
                'statut': pointage.statut
            }
        ), 201
    
    except Exception as e:
        db.session.rollback()
        print(f"Erreur qr_checkin: {e}")
        return jsonify(message="Une erreur est survenue"), 500

@attendance_extras_bp.route('/checkin/offline', methods=['POST'])
@jwt_required()
def offline_checkin():
    """Synchronise un pointage fait en mode hors ligne"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        data = request.get_json()
        timestamp = data.get('timestamp')
        
        if not timestamp:
            return jsonify(message="Horodatage manquant"), 400
        
        # Convertir l'horodatage en objets date et time
        try:
            dt = datetime.fromisoformat(timestamp)
            pointage_date = dt.date()
            pointage_time = dt.time()
        except ValueError:
            return jsonify(message="Format d'horodatage invalide"), 400
        
        # Vérifier si un pointage existe déjà pour cette date
        existing_pointage = Pointage.query.filter_by(
            user_id=current_user.id,
            date_pointage=pointage_date
        ).first()
        
        if existing_pointage:
            return jsonify(message="Un pointage existe déjà pour cette date"), 409
        
        # Créer le pointage avec l'horodatage fourni
        pointage = Pointage(
            user_id=current_user.id,
            type='office',
            date_pointage=pointage_date,
            heure_arrivee=pointage_time,
            sync_status='synced',
            is_offline=True  # Champ à ajouter au modèle Pointage
        )
        
        # Calculer le statut basé sur l'heure fournie
        pointage.calculate_status()
        
        db.session.add(pointage)
        db.session.commit()
        
        return jsonify(
            message="Pointage hors ligne synchronisé avec succès",
            pointage={
                'id': pointage.id,
                'date': pointage.date_pointage.isoformat(),
                'heure': pointage.heure_arrivee.strftime('%H:%M'),
                'statut': pointage.statut
            }
        ), 201
    
    except Exception as e:
        db.session.rollback()
        print(f"Erreur offline_checkin: {e}")
        return jsonify(message="Une erreur est survenue"), 500

@attendance_extras_bp.route('/justify/<int:pointage_id>', methods=['POST'])
@jwt_required()
def justify_delay(pointage_id):
    """Justifie un retard pour un pointage spécifique"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        pointage = Pointage.query.filter_by(
            id=pointage_id
        ).first()
        
        if not pointage:
            return jsonify(message="Pointage non trouvé"), 404
        
        # Vérifier que le pointage appartient à l'utilisateur ou que l'utilisateur est admin
        is_admin = current_user.is_admin
        
        if pointage.user_id != current_user.id and not is_admin:
            return jsonify(message="Vous n'êtes pas autorisé à justifier ce pointage"), 403
        
        # Vérifier que le pointage est en retard
        if pointage.statut != 'retard':
            return jsonify(message="Ce pointage n'est pas en retard et ne nécessite pas de justification"), 400
        
        data = request.get_json()
        reason = data.get('reason')
        category = data.get('category')
        
        if not reason or not category:
            return jsonify(message="Raison et catégorie requises"), 400
        
        # Mettre à jour le pointage avec la justification
        pointage.delay_reason = reason
        pointage.delay_category = category
        pointage.is_justified = True  # Champ à ajouter au modèle Pointage
        
        db.session.commit()
        
        return jsonify(message="Retard justifié avec succès"), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Erreur justify_delay: {e}")
        return jsonify(message="Une erreur est survenue"), 500
