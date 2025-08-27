"""
Service pour les opérations liées aux missions avec gestion d'erreurs robuste
"""

from flask import current_app
from backend.database import db
from backend.models.mission import Mission
from backend.models.mission_user import MissionUser
from datetime import date
from sqlalchemy.exc import SQLAlchemyError
import traceback

def get_active_missions_safe(user_id):
    """
    Récupère les missions actives pour un utilisateur de manière sécurisée
    """
    try:
        missions_data = []
        today = date.today()
        
        try:
            # Essayer d'abord l'approche ORM
            user_missions = db.session.query(Mission).join(
                MissionUser, Mission.id == MissionUser.mission_id
            ).filter(
                MissionUser.user_id == user_id,
                Mission.status == 'active',
                # Mission.end_date est facultatif ou supérieur à aujourd'hui
                ((Mission.end_date == None) | (Mission.end_date >= today))
            ).all()
            
            # Convertir en dictionnaire pour la réponse JSON
            for mission in user_missions:
                try:
                    missions_data.append(mission.to_dict())
                except Exception as e:
                    current_app.logger.error(f"Erreur lors de la conversion de la mission {mission.id}: {str(e)}")
                    # Version simplifiée en cas d'erreur
                    missions_data.append({
                        'id': mission.id,
                        'title': mission.title,
                        'description': mission.description,
                        'status': mission.status,
                        'start_date': mission.start_date.isoformat() if mission.start_date else None,
                        'end_date': mission.end_date.isoformat() if mission.end_date else None,
                        'company_id': mission.company_id,
                        'order_number': mission.order_number
                    })
                    
        except SQLAlchemyError:
            # En cas d'erreur ORM, utiliser SQL direct avec vérification des colonnes
            conn = db.engine.raw_connection()
            cursor = conn.cursor()
            
            # Vérifier quelles colonnes existent dans la table missions
            cursor.execute("PRAGMA table_info(missions)")
            columns_info = cursor.fetchall()
            column_names = [column[1] for column in columns_info]
            
            # Construire la requête en fonction des colonnes disponibles
            # On inclut toujours les colonnes essentielles
            select_columns = ["m.id", "m.title", "m.description", "m.status", 
                             "m.start_date", "m.end_date", "m.company_id", "m.order_number"]
            
            # Ajouter les colonnes optionnelles uniquement si elles existent
            if "location" in column_names:
                select_columns.append("m.location")
            if "latitude" in column_names:
                select_columns.append("m.latitude")
            if "longitude" in column_names:
                select_columns.append("m.longitude")
            
            # Ajouter toujours created_at et updated_at
            select_columns.extend(["m.created_at", "m.updated_at"])
            
            # Construire la requête SQL
            query = f"""
                SELECT {', '.join(select_columns)}
                FROM missions m
                JOIN mission_users mu ON m.id = mu.mission_id
                WHERE mu.user_id = ? AND m.status = 'active' 
                AND (m.end_date IS NULL OR m.end_date >= ?)
            """
            
            cursor.execute(query, (user_id, today.isoformat()))
            
            rows = cursor.fetchall()
            column_indexes = {}
            
            # Créer un mappage des noms de colonnes vers leurs positions dans le résultat
            for i, column in enumerate(select_columns):
                clean_name = column.split('.')[-1]  # Enlève le préfixe "m."
                column_indexes[clean_name] = i
            
            for row in rows:
                mission_dict = {
                    'id': row[column_indexes['id']],
                    'title': row[column_indexes['title']],
                    'description': row[column_indexes['description']],
                    'status': row[column_indexes['status']],
                    'start_date': row[column_indexes['start_date']],
                    'end_date': row[column_indexes['end_date']],
                    'company_id': row[column_indexes['company_id']],
                    'order_number': row[column_indexes['order_number']],
                    'created_at': row[column_indexes['created_at']],
                    'updated_at': row[column_indexes['updated_at']]
                }
                
                # Ajouter les colonnes optionnelles uniquement si elles existent
                if 'location' in column_indexes:
                    mission_dict['location'] = row[column_indexes['location']]
                if 'latitude' in column_indexes:
                    mission_dict['latitude'] = row[column_indexes['latitude']]
                if 'longitude' in column_indexes:
                    mission_dict['longitude'] = row[column_indexes['longitude']]
                
                missions_data.append(mission_dict)
                
            cursor.close()
        
        return {
            'error': False,
            'missions': missions_data,
            'status_code': 200
        }
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des missions actives: {str(e)}")
        traceback.print_exc()
        return {
            'error': True,
            'message': f"Erreur interne du serveur: {str(e)}",
            'missions': [],
            'status_code': 500
        }
