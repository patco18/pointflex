"""
Routes pour les statistiques d'assiduité
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from backend.middleware.auth import get_current_user
from backend.models.pointage import Pointage
from backend.database import db
from datetime import datetime, date, timedelta
from sqlalchemy import func
from flask import current_app

# Blueprint pour les statistiques d'assiduité
stats_bp = Blueprint('attendance_stats', __name__)

@stats_bp.route('/attendance/stats/weekly', methods=['GET'])
@jwt_required()
def get_weekly_stats():
    """
    Renvoie les statistiques d'assiduité hebdomadaires pour l'utilisateur
    """
    try:
        current_user = get_current_user()
        today = date.today()
        # Calculer le début de la semaine (lundi)
        start_of_week = today - timedelta(days=today.weekday())
        # Calculer la fin de la semaine (dimanche)
        end_of_week = start_of_week + timedelta(days=6)
        
        # Récupérer les pointages de la semaine
        pointages = Pointage.query.filter(
            Pointage.user_id == current_user.id,
            Pointage.date_pointage >= start_of_week,
            Pointage.date_pointage <= end_of_week
        ).all()
        
        # Initialiser les jours avec des données par défaut
        days = []
        for i in range(7):
            day_date = start_of_week + timedelta(days=i)
            days.append({
                'date': day_date.isoformat(),
                'status': 'absent',
                'worked_hours': None,
                'arrival_time': None,
                'departure_time': None
            })
        
        # Remplir les données réelles
        present_days = 0
        late_days = 0
        absent_days = 0
        total_worked_hours = 0
        
        for pointage in pointages:
            day_index = (pointage.date_pointage - start_of_week).days
            
            if day_index < 0 or day_index >= 7:
                continue
                
            days[day_index]['status'] = pointage.statut
            
            if pointage.statut in ['present', 'retard']:
                days[day_index]['arrival_time'] = pointage.heure_arrivee
                days[day_index]['departure_time'] = pointage.heure_depart
                
                worked_hours = pointage.worked_hours or 0
                days[day_index]['worked_hours'] = worked_hours
                total_worked_hours += worked_hours
                
                if pointage.statut == 'present':
                    present_days += 1
                elif pointage.statut == 'retard':
                    late_days += 1
            else:
                absent_days += 1
        
        # Calculer la moyenne d'heures travaillées (éviter division par zéro)
        days_worked = present_days + late_days
        average_hours = total_worked_hours / days_worked if days_worked > 0 else 0
        
        # Pour cet exemple, nous simulons une tendance
        trend = 'up'
        trend_percentage = 5
        
        summary = {
            'present_days': present_days,
            'late_days': late_days,
            'absent_days': absent_days,
            'total_days': 5,  # Jours ouvrés
            'average_hours': average_hours,
            'trend': trend,
            'trend_percentage': trend_percentage
        }
        
        return jsonify({
            'days': days,
            'summary': summary
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des statistiques: {e}", exc_info=True)
        return jsonify({'message': 'Une erreur est survenue'}), 500
