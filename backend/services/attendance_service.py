"""
Service pour les opérations d'attendance avec gestion d'erreurs robuste
"""

from flask import current_app
from backend.models.pointage import Pointage
from backend.models.user import User
from backend.models.office import Office
from backend.models.company import Company
from backend.models.system_settings import SystemSettings
from backend.database import db
from backend.utils.notification_utils import send_notification
from backend.middleware.audit import log_user_action
from backend.utils.attendance_logger import log_attendance_event, log_attendance_error
from backend.services.geolocation_accuracy_service import GeolocationAccuracyService
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.exc import SQLAlchemyError
import math
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

def get_last_7days_stats_safe(user_id):
    """
    Récupère les statistiques des 7 derniers jours de manière sécurisée
    """
    try:
        from backend.models.user import User
        
        # Récupérer l'utilisateur et sa société
        user = User.query.get(user_id)
        if not user or not user.company_id:
            return {
                'error': True,
                'message': "Utilisateur non trouvé ou non associé à une entreprise",
                'status_code': 404,
                'stats': []
            }
        
        company_id = user.company_id
        
        # Récupérer les 7 derniers jours
        today = date.today()
        last_7_days = [today - timedelta(days=i) for i in range(6, -1, -1)]  # Du plus ancien au plus récent
        
        daily_stats = []
        
        try:
            # Essayer d'abord avec l'ORM
            for day in last_7_days:
                # Obtenir les pointages de ce jour pour tous les utilisateurs de l'entreprise
                daily_pointages = Pointage.query.join(User).filter(
                    User.company_id == company_id,
                    Pointage.date_pointage == day
                ).all()
                
                # Calculer les présents, retards et absents
                presents = len([p for p in daily_pointages if p.statut == 'present'])
                retards = len([p for p in daily_pointages if p.statut == 'retard'])
                
                # Pour les absents, compter les utilisateurs actifs sans pointage
                total_active_users = User.query.filter_by(company_id=company_id, is_active=True).count()
                absents = total_active_users - (presents + retards)
                absents = max(0, absents)  # Éviter les nombres négatifs
                
                daily_stats.append({
                    'date': day.strftime('%d/%m'),
                    'present': presents,
                    'late': retards,
                    'absent': absents,
                    'total': total_active_users
                })
                
        except SQLAlchemyError:
            # En cas d'erreur ORM, utiliser SQL direct
            conn = db.engine.raw_connection()
            cursor = conn.cursor()
            
            # Pour chaque jour, faire une requête SQL directe
            for day in last_7_days:
                day_str = day.isoformat()
                
                # Compter les présents
                cursor.execute("""
                    SELECT COUNT(*) FROM pointages 
                    JOIN users ON users.id = pointages.user_id
                    WHERE users.company_id = ? AND pointages.date_pointage = ? AND pointages.statut = 'present'
                """, (company_id, day_str))
                presents = cursor.fetchone()[0] or 0
                
                # Compter les retards
                cursor.execute("""
                    SELECT COUNT(*) FROM pointages 
                    JOIN users ON users.id = pointages.user_id
                    WHERE users.company_id = ? AND pointages.date_pointage = ? AND pointages.statut = 'retard'
                """, (company_id, day_str))
                retards = cursor.fetchone()[0] or 0
                
                # Compter les utilisateurs actifs
                cursor.execute("""
                    SELECT COUNT(*) FROM users
                    WHERE company_id = ? AND is_active = 1
                """, (company_id,))
                total_active_users = cursor.fetchone()[0] or 0
                
                absents = total_active_users - (presents + retards)
                absents = max(0, absents)  # Éviter les nombres négatifs
                
                daily_stats.append({
                    'date': day.strftime('%d/%m'),
                    'present': presents,
                    'late': retards,
                    'absent': absents,
                    'total': total_active_users
                })
                
            cursor.close()
        
        return {
            'error': False,
            'stats': daily_stats,
            'status_code': 200
        }
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des statistiques des 7 derniers jours: {str(e)}")
        traceback.print_exc()
        
        # Fournir des données par défaut en cas d'erreur
        today = date.today()
        last_7_days = [today - timedelta(days=i) for i in range(6, -1, -1)]
        
        default_stats = []
        for day in last_7_days:
            default_stats.append({
                'date': day.strftime('%d/%m'),
                'present': 0,
                'late': 0,
                'absent': 0,
                'total': 0
            })
        
        return {
            'error': True,
            'message': f"Erreur interne du serveur: {str(e)}",
            'stats': default_stats,
            'status_code': 500
        }

def office_checkin_safe(user_id, coordinates):
    """
    Effectue un pointage bureau de manière sécurisée avec gestion des erreurs robuste
    """
    try:
        
        # Validation des coordonnées
        if not coordinates.get('latitude') or not coordinates.get('longitude'):
            return {
                'error': True,
                'message': "Coordonnées GPS requises",
                'status_code': 400
            }
        if coordinates.get('accuracy') is None:
            return {
                'error': True,
                'message': "Précision GPS requise",
                'status_code': 400
            }
        
        # Récupérer l'utilisateur
        user = User.query.get(user_id)
        if not user:
            return {
                'error': True,
                'message': "Utilisateur non trouvé",
                'status_code': 401
            }
            
        # Utiliser toujours UTC pour la simplicité
        tz_name = 'UTC'
        
        # Paramètres par défaut
        max_accuracy = current_app.config.get('GEOLOCATION_MAX_ACCURACY', 100)
        threshold_entity = None
        company = getattr(user, 'company', None)
        if company and getattr(company, 'geolocation_max_accuracy', None) is not None:
            max_accuracy = company.geolocation_max_accuracy
            threshold_entity = company
        min_distance = float('inf')
        nearest_office = None
        
        try:
            # Vérification des bureaux si l'utilisateur appartient à une entreprise
            if user.company_id:
                offices = Office.query.filter_by(
                    company_id=user.company_id,
                    is_active=True
                ).all()
                
                for office in offices:
                    try:
                        distance = calculate_distance(
                            coordinates['latitude'], coordinates['longitude'],
                            office.latitude, office.longitude
                        )
                        if distance < min_distance:
                            min_distance = distance
                            nearest_office = office
                    except Exception as e:
                        current_app.logger.error(f"Erreur lors du calcul de distance pour le bureau {office.id}: {str(e)}")
                
                # Utiliser la précision maximale du bureau si définie
                if nearest_office:
                    try:
                        if hasattr(nearest_office, 'geolocation_max_accuracy') and nearest_office.geolocation_max_accuracy is not None:
                            max_accuracy = nearest_office.geolocation_max_accuracy
                            threshold_entity = nearest_office
                    except:
                        pass  # Utiliser la valeur par défaut si la colonne n'existe pas
            
        except SQLAlchemyError:
            # En cas d'erreur ORM, utiliser une approche SQL directe
            conn = db.engine.raw_connection()
            cursor = conn.cursor()
            
            # Vérifier si la colonne geolocation_max_accuracy existe
            cursor.execute("PRAGMA table_info(offices)")
            columns = [column[1] for column in cursor.fetchall()]
            has_geo_accuracy = 'geolocation_max_accuracy' in columns
            
            if user.company_id:
                # Requête de base pour les bureaux actifs
                base_query = """
                    SELECT id, name, latitude, longitude, radius, timezone 
                    FROM offices 
                    WHERE company_id = ? AND is_active = 1
                """
                
                # Ajouter geolocation_max_accuracy s'il existe
                if has_geo_accuracy:
                    base_query = base_query.replace("timezone", "timezone, geolocation_max_accuracy")
                
                cursor.execute(base_query, (user.company_id,))
                offices_data = cursor.fetchall()
                
                for office_data in offices_data:
                    try:
                        office_lat = office_data[2]
                        office_lon = office_data[3]
                        if office_lat is not None and office_lon is not None:
                            distance = calculate_distance(
                                coordinates['latitude'], coordinates['longitude'],
                                office_lat, office_lon
                            )
                            if distance < min_distance:
                                min_distance = distance
                                nearest_office = {
                                    'id': office_data[0],
                                    'name': office_data[1],
                                    'latitude': office_lat,
                                    'longitude': office_lon,
                                    'radius': office_data[4],
                                    'timezone': office_data[5]
                                }
                                # Ajouter geolocation_max_accuracy s'il existe
                                if has_geo_accuracy and len(office_data) > 6:
                                    nearest_office['geolocation_max_accuracy'] = office_data[6]
                    except Exception as e:
                        current_app.logger.error(f"Erreur lors du calcul de distance pour le bureau {office_data[0]}: {str(e)}")
                
                # Utiliser la précision maximale du bureau si définie
                if nearest_office and 'geolocation_max_accuracy' in nearest_office and nearest_office['geolocation_max_accuracy'] is not None:
                    max_accuracy = nearest_office['geolocation_max_accuracy']
            
            cursor.close()

        adjuster = None
        if isinstance(threshold_entity, Office):
            adjuster = GeolocationAccuracyService.for_office(threshold_entity, user_id)
        elif isinstance(threshold_entity, Company):
            adjuster = GeolocationAccuracyService.for_company(threshold_entity, user_id)

        applied_threshold = max_accuracy

        # Vérifier la précision GPS
        if coordinates['accuracy'] > max_accuracy:
            log_attendance_error(
                'office_checkin_accuracy_rejected',
                user_id,
                {
                    'applied_threshold': applied_threshold,
                    'reported_accuracy': coordinates['accuracy'],
                    'coordinates': {
                        'latitude': coordinates.get('latitude'),
                        'longitude': coordinates.get('longitude'),
                        'altitude': coordinates.get('altitude'),
                        'heading': coordinates.get('heading'),
                        'speed': coordinates.get('speed'),
                    },
                    'office_id': getattr(nearest_office, 'id', None)
                    if isinstance(nearest_office, Office)
                    else (nearest_office.get('id') if isinstance(nearest_office, dict) else None),
                },
            )
            if adjuster:
                adjuster.record_failure(coordinates['accuracy'], applied_threshold)
                db.session.commit()
            return {
                'error': True,
                'message': f"Précision de localisation insuffisante ({int(coordinates['accuracy'])}m). Maximum autorisé: {applied_threshold}m",
                'status_code': 400
            }
        
        # Traiter le pointage en fonction de la proximité avec le bureau
        if user.company_id:
            # Cas où il y a des bureaux et on est proche d'un bureau
            if nearest_office and isinstance(nearest_office, dict):  # Cas SQL direct
                if min_distance <= nearest_office.get('radius', float('inf')):
                    tz_name = nearest_office.get('timezone') or tz_name
                    pointage = create_pointage(
                        user_id=user_id,
                        type_pointage='office',
                        latitude=coordinates['latitude'],
                        longitude=coordinates['longitude'],
                        office_id=nearest_office['id'],
                        distance=min_distance,
                        accuracy=coordinates.get('accuracy'),
                        altitude=coordinates.get('altitude'),
                        heading=coordinates.get('heading'),
                        speed=coordinates.get('speed'),
                    )
                else:
                    return {
                        'error': True,
                        'message': f"Vous êtes trop loin du bureau ({int(min_distance)}m). Rayon autorisé: {nearest_office.get('radius', 'N/A')}m",
                        'status_code': 403
                    }
            elif nearest_office:  # Cas ORM
                if min_distance <= nearest_office.radius:
                    tz_name = nearest_office.timezone or tz_name
                    pointage = create_pointage(
                        user_id=user_id,
                        type_pointage='office',
                        latitude=coordinates['latitude'],
                        longitude=coordinates['longitude'],
                        office_id=nearest_office.id,
                        distance=min_distance,
                        accuracy=coordinates.get('accuracy'),
                        altitude=coordinates.get('altitude'),
                        heading=coordinates.get('heading'),
                        speed=coordinates.get('speed'),
                    )
                else:
                    return {
                        'error': True,
                        'message': f"Vous êtes trop loin du bureau ({int(min_distance)}m). Rayon autorisé: {nearest_office.radius if nearest_office else 'N/A'}m",
                        'status_code': 403
                    }
            else:
                # Cas où il n'y a pas de bureaux définis mais il y a des coordonnées d'entreprise
                try:
                    company = user.company
                    if company and hasattr(company, 'office_latitude') and hasattr(company, 'office_longitude'):
                        if company.office_latitude and company.office_longitude:
                            distance = calculate_distance(
                                coordinates['latitude'], coordinates['longitude'],
                                company.office_latitude, company.office_longitude
                            )
                            if distance > company.office_radius:
                                return {
                                    'error': True,
                                    'message': f"Vous êtes trop loin du bureau ({int(distance)}m). Rayon autorisé: {company.office_radius}m",
                                    'status_code': 403
                                }
                except Exception as e:
                    current_app.logger.error(f"Erreur lors de la vérification de la distance par rapport au siège: {str(e)}")
                
                # Créer le pointage simple
                pointage = create_pointage(
                    user_id=user_id,
                    type_pointage='office',
                    latitude=coordinates['latitude'],
                    longitude=coordinates['longitude'],
                    accuracy=coordinates.get('accuracy'),
                    altitude=coordinates.get('altitude'),
                    heading=coordinates.get('heading'),
                    speed=coordinates.get('speed'),
                )
        else:
            # Cas d'un utilisateur sans entreprise
            pointage = create_pointage(
                user_id=user_id,
                type_pointage='office',
                latitude=coordinates['latitude'],
                longitude=coordinates['longitude'],
                accuracy=coordinates.get('accuracy'),
                altitude=coordinates.get('altitude'),
                heading=coordinates.get('heading'),
                speed=coordinates.get('speed'),
            )
        
        # Retourner le pointage créé
        if pointage.get('error'):
            return pointage

        if adjuster:
            adjuster.record_success(coordinates['accuracy'], applied_threshold)
            db.session.commit()

        return {
            'error': False,
            'message': 'Pointage bureau enregistré avec succès',
            'pointage': pointage.get('pointage'),
            'status_code': 201
        }
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors du pointage bureau: {str(e)}")
        traceback.print_exc()
        return {
            'error': True,
            'message': f"Erreur interne du serveur: {str(e)}",
            'status_code': 500
        }

def create_pointage(
    user_id,
    type_pointage,
    latitude,
    longitude,
    office_id=None,
    distance=None,
    accuracy=None,
    altitude=None,
    heading=None,
    speed=None,
):
    """
    Crée un nouveau pointage avec gestion des erreurs
    """
    try:
        
        # Utiliser toujours UTC pour la simplicité
        tz_name = 'UTC'
        
        # Pour la simplicité, on garde toujours UTC
        if office_id:
            try:
                office = Office.query.get(office_id)
            except:
                pass  # Garder le fuseau par défaut en cas d'erreur        # Utiliser directement UTC
        now_utc = datetime.now()
        today = now_utc.date()
        
        # Vérifier s'il existe déjà un pointage pour aujourd'hui
        try:
            existing_pointage = Pointage.query.filter_by(
                user_id=user_id,
                date_pointage=today
            ).first()
            
            if existing_pointage:
                try:
                    send_notification(user_id, "Pointage déjà enregistré pour aujourd'hui")
                except:
                    pass
                return {
                    'error': True,
                    'message': "Vous avez déjà pointé aujourd'hui",
                    'status_code': 409
                }
        except SQLAlchemyError:
            # Approche SQL directe en cas d'erreur
            conn = db.engine.raw_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id FROM pointages WHERE user_id = ? AND date_pointage = ?",
                (user_id, today.isoformat())
            )
            if cursor.fetchone():
                try:
                    send_notification(user_id, "Pointage déjà enregistré pour aujourd'hui")
                except:
                    pass
                cursor.close()
                return {
                    'error': True,
                    'message': "Vous avez déjà pointé aujourd'hui",
                    'status_code': 409
                }
            cursor.close()
        
        # Créer le pointage
        try:
            pointage = Pointage(
                user_id=user_id,
                type=type_pointage,
                latitude=latitude,
                longitude=longitude,
                accuracy=accuracy,
                altitude=altitude,
                heading=heading,
                speed=speed,
                date_pointage=today,
                heure_arrivee=now_utc.time()
            )
            
            if office_id:
                pointage.office_id = office_id
                
            if distance is not None:
                pointage.distance = distance
                
            db.session.add(pointage)
            db.session.flush()
            
            # Logger l'action
            try:
                log_user_action(
                    action='OFFICE_CHECKIN',
                    resource_type='Pointage',
                    resource_id=pointage.id,
                    details={
                        'coordinates': {
                            'latitude': latitude,
                            'longitude': longitude,
                            'accuracy': accuracy,
                            'altitude': altitude,
                            'heading': heading,
                            'speed': speed,
                        },
                        'status': pointage.statut,
                        'office_id': getattr(pointage, 'office_id', None),
                        'distance': getattr(pointage, 'distance', None)
                    }
                )
            except:
                pass
                
            db.session.commit()
            
            # Journaliser l'événement de pointage
            try:
                log_attendance_event(
                    event_type='office_checkin',
                    user_id=user_id,
                    details={
                        'pointage_id': pointage.id,
                        'office_id': getattr(pointage, 'office_id', None),
                        'status': pointage.statut,
                        'time': pointage.heure_arrivee.strftime('%H:%M:%S'),
                        'accuracy': accuracy,
                        'altitude': altitude,
                        'heading': heading,
                        'speed': speed,
                    }
                )
            except:
                pass
            
            # Webhooks
            try:
                from backend.utils.webhook_utils import dispatch_webhook_event
                dispatch_webhook_event(
                    event_type='pointage.created',
                    payload_data=pointage.to_dict(),
                    company_id=User.query.get(user_id).company_id
                )
            except Exception as webhook_error:
                current_app.logger.error(f"Failed to dispatch pointage.created webhook for pointage {pointage.id}: {webhook_error}")
                try:
                    log_attendance_error('webhook_failure', user_id, str(webhook_error))
                except:
                    pass
            
            # Notifications
            try:
                send_notification(user_id, "Pointage bureau enregistré")
                if pointage.statut == 'retard':
                    send_notification(user_id, "Vous êtes en retard")
            except:
                pass
            
            return {
                'error': False,
                'pointage': pointage.to_dict()
            }
            
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error creating pointage: {str(e)}")
            return {
                'error': True,
                'message': "Erreur de base de données lors du pointage",
                'status_code': 500
            }
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la création du pointage: {str(e)}")
        return {
            'error': True,
            'message': f"Erreur interne du serveur: {str(e)}",
            'status_code': 500
        }

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calcule la distance en mètres entre deux points géographiques
    """
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
