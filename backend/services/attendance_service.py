"""
Service pour les opérations d'attendance avec gestion d'erreurs robuste
"""

from flask import current_app
from backend.models.pointage import Pointage
from backend.models.user import User
from backend.database import db
from datetime import datetime, date, timedelta
from sqlalchemy.exc import SQLAlchemyError
import traceback

def get_attendance_safe(user_id, start_date=None, end_date=None, page=1, per_page=20):
    """
    Récupère l'historique des pointages de manière sécurisée,
    en utilisant des requêtes SQL directes si nécessaire
    """
    try:
        # Valider les dates
        start_date_obj = None
        end_date_obj = None
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return {
                    'error': True,
                    'message': "Format de date invalide pour start_date (YYYY-MM-DD)",
                    'status_code': 400
                }

        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return {
                    'error': True,
                    'message': "Format de date invalide pour end_date (YYYY-MM-DD)",
                    'status_code': 400
                }

        if start_date_obj and end_date_obj and start_date_obj > end_date_obj:
            return {
                'error': True,
                'message': "Plage de dates invalide : start_date est postérieure à end_date",
                'status_code': 400
            }
        
        # Tentative d'utilisation du modèle ORM normal
        try:
            # Construire la requête
            query = Pointage.query.filter_by(user_id=user_id)
            
            # Filtres de date
            if start_date_obj:
                query = query.filter(Pointage.date_pointage >= start_date_obj)
            if end_date_obj:
                query = query.filter(Pointage.date_pointage <= end_date_obj)
            
            # Ordonner par date décroissante
            query = query.order_by(Pointage.date_pointage.desc(), Pointage.heure_arrivee.desc())
            
            # Pagination
            pointages = query.paginate(page=page, per_page=per_page, error_out=False)
            
            # Conversion des pointages en dict avec gestion des erreurs
            records = []
            for pointage in pointages.items:
                try:
                    record = pointage.to_dict()
                    records.append(record)
                except Exception as e:
                    current_app.logger.error(f"Erreur lors de la conversion du pointage {pointage.id}: {str(e)}")
                    # Version simplifiée en cas d'erreur
                    records.append({
                        'id': pointage.id,
                        'user_id': pointage.user_id,
                        'date_pointage': pointage.date_pointage.isoformat() if pointage.date_pointage else None,
                        'heure_arrivee': pointage.heure_arrivee.isoformat() if pointage.heure_arrivee else None,
                        'heure_depart': pointage.heure_depart.isoformat() if pointage.heure_depart else None,
                        'statut': pointage.statut,
                        'type': pointage.type,
                        'error': 'Erreur de conversion'
                    })
            
            return {
                'error': False,
                'records': records,
                'pagination': {
                    'page': page,
                    'pages': pointages.pages,
                    'per_page': per_page,
                    'total': pointages.total
                },
                'status_code': 200
            }
            
        except SQLAlchemyError:
            # En cas d'erreur ORM, utiliser une requête SQL directe
            conn = db.engine.raw_connection()
            cursor = conn.cursor()

            # Vérifier les colonnes disponibles dans la table
            cursor.execute("PRAGMA table_info(pointages)")
            available_columns = {row[1] for row in cursor.fetchall()}

            base_columns = [
                'id', 'user_id', 'type', 'date_pointage', 'heure_arrivee', 'heure_depart',
                'statut', 'latitude', 'longitude', 'office_id', 'distance',
                'is_equalized', 'is_qr_scan', 'is_offline', 'sync_status',
                'offline_timestamp', 'device_id', 'delay_reason',
                'delay_category', 'is_justified', 'created_at', 'updated_at'
            ]

            select_columns = [col for col in base_columns if col in available_columns]

            base_query = f"""
                SELECT {', '.join(select_columns)}
                FROM pointages
                WHERE user_id = ?
            """

            params = [user_id]

            if start_date_obj:
                base_query += " AND date_pointage >= ?"
                params.append(start_date_obj.isoformat())

            if end_date_obj:
                base_query += " AND date_pointage <= ?"
                params.append(end_date_obj.isoformat())

            # Ajout de l'ordre et de la pagination
            base_query += " ORDER BY date_pointage DESC, heure_arrivee DESC LIMIT ? OFFSET ?"
            offset = (page - 1) * per_page
            params.extend([per_page, offset])

            # Exécuter la requête
            cursor.execute(base_query, params)
            pointages_data = cursor.fetchall()
            
            # Compter le nombre total pour la pagination
            count_query = """
                SELECT COUNT(*) FROM pointages
                WHERE user_id = ?
            """
            count_params = [user_id]
            
            if start_date_obj:
                count_query += " AND date_pointage >= ?"
                count_params.append(start_date_obj.isoformat())
                
            if end_date_obj:
                count_query += " AND date_pointage <= ?"
                count_params.append(end_date_obj.isoformat())
                
            cursor.execute(count_query, count_params)
            total = cursor.fetchone()[0]
            
            # Convertir les résultats en format lisible
            records = []
            for pointage in pointages_data:
                try:
                    record = {col: pointage[idx] for idx, col in enumerate(select_columns)}

                    # Ajouter les colonnes manquantes avec valeur None pour compatibilité
                    for col in base_columns:
                        record.setdefault(col, None)

                    # Conversion des champs booléens
                    for bool_col in ['is_equalized', 'is_qr_scan', 'is_offline', 'is_justified']:
                        if bool_col in record and record[bool_col] is not None:
                            record[bool_col] = bool(record[bool_col])

                    records.append(record)
                except Exception as e:
                    current_app.logger.error(f"Erreur lors de la conversion du pointage: {str(e)}")
                    records.append({
                        'id': pointage[0] if len(pointage) > 0 else None,
                        'user_id': pointage[1] if len(pointage) > 1 else None,
                        'date_pointage': pointage[3] if len(pointage) > 3 else None,
                        'heure_arrivee': pointage[4] if len(pointage) > 4 else None,
                        'heure_depart': pointage[5] if len(pointage) > 5 else None,
                        'statut': pointage[6] if len(pointage) > 6 else 'inconnu',
                        'type': pointage[2] if len(pointage) > 2 else 'inconnu',
                        'error': 'Erreur de conversion'
                    })
                    
            cursor.close()
            
            # Calculer le nombre de pages
            pages = (total + per_page - 1) // per_page  # Arrondi supérieur
            
            return {
                'error': False,
                'records': records,
                'pagination': {
                    'page': page,
                    'pages': pages,
                    'per_page': per_page,
                    'total': total
                },
                'status_code': 200
            }
                
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des pointages: {str(e)}")
        traceback.print_exc()
        return {
            'error': True,
            'message': f"Erreur interne du serveur: {str(e)}",
            'status_code': 500,
            'records': [],
            'pagination': {
                'page': page,
                'pages': 0,
                'per_page': per_page,
                'total': 0
            }
        }

def get_attendance_stats_safe(user_id):
    """
    Récupère les statistiques de pointage de manière sécurisée
    """
    try:
        # Période par défaut : mois en cours
        today = date.today()
        start_of_month = today.replace(day=1)
        
        try:
            # Essayer d'abord l'approche ORM
            pointages = Pointage.query.filter(
                Pointage.user_id == user_id,
                Pointage.date_pointage >= start_of_month,
                Pointage.date_pointage <= today
            ).all()
            
            # Calculer les statistiques
            total_days = len(pointages)
            present_days = len([p for p in pointages if p.statut == 'present'])
            late_days = len([p for p in pointages if p.statut == 'retard'])
            absence_days = 0  # Pour l'instant, on ne gère pas les absences
            
            # Calculer les heures moyennes avec gestion d'erreurs
            total_hours = 0
            for p in pointages:
                try:
                    hours = p.calculate_worked_hours() or 8
                    total_hours += hours
                except Exception as e:
                    current_app.logger.error(f"Erreur lors du calcul des heures pour le pointage {p.id}: {str(e)}")
                    total_hours += 8  # Valeur par défaut en cas d'erreur
                    
            average_hours = total_hours / total_days if total_days > 0 else 0
            
        except SQLAlchemyError:
            # En cas d'erreur ORM, utiliser une requête SQL directe
            conn = db.engine.raw_connection()
            cursor = conn.cursor()
            
            # Compter le nombre total de pointages dans la période
            cursor.execute("""
                SELECT COUNT(*) FROM pointages 
                WHERE user_id = ? AND date_pointage >= ? AND date_pointage <= ?
            """, (user_id, start_of_month.isoformat(), today.isoformat()))
            total_days = cursor.fetchone()[0]
            
            # Compter les jours de présence
            cursor.execute("""
                SELECT COUNT(*) FROM pointages 
                WHERE user_id = ? AND date_pointage >= ? AND date_pointage <= ? AND statut = 'present'
            """, (user_id, start_of_month.isoformat(), today.isoformat()))
            present_days = cursor.fetchone()[0]
            
            # Compter les jours de retard
            cursor.execute("""
                SELECT COUNT(*) FROM pointages 
                WHERE user_id = ? AND date_pointage >= ? AND date_pointage <= ? AND statut = 'retard'
            """, (user_id, start_of_month.isoformat(), today.isoformat()))
            late_days = cursor.fetchone()[0]
            
            # Pour le calcul des heures moyennes, on utilise une valeur par défaut
            average_hours = 8.0
            absence_days = 0
            
            cursor.close()
        
        return {
            'error': False,
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
            },
            'status_code': 200
        }
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des statistiques: {str(e)}")
        traceback.print_exc()
        return {
            'error': True,
            'message': f"Erreur interne du serveur: {str(e)}",
            'stats': {
                'total_days': 0,
                'present_days': 0,
                'late_days': 0,
                'absence_days': 0,
                'average_hours': 0,
                'period': {
                    'start': date.today().replace(day=1).isoformat(),
                    'end': date.today().isoformat()
                }
            },
            'status_code': 500
        }
