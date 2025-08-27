"""
Service pour les opérations d'administration avec gestion d'erreurs robuste
"""

from flask import current_app
from backend.database import db
from backend.models.office import Office
from sqlalchemy.exc import SQLAlchemyError
import traceback

def get_offices_safe(company_id=None):
    """
    Récupère les bureaux de l'entreprise de manière sécurisée
    """
    try:
        offices_list = []
        
        try:
            # Essayer d'abord l'approche ORM
            query = Office.query
            
            if company_id is not None:
                query = query.filter_by(company_id=company_id)
                
            offices = query.all()
            
            for office in offices:
                try:
                    offices_list.append(office.to_dict())
                except Exception as e:
                    current_app.logger.error(f"Erreur lors de la conversion du bureau {office.id}: {str(e)}")
                    # Version simplifiée en cas d'erreur
                    offices_list.append({
                        'id': office.id,
                        'name': office.name,
                        'address': office.address,
                        'city': office.city,
                        'country': office.country,
                        'latitude': office.latitude,
                        'longitude': office.longitude,
                        'radius': office.radius,
                        'is_active': office.is_active,
                        'company_id': office.company_id
                    })
                    
        except SQLAlchemyError:
            # En cas d'erreur ORM, utiliser SQL direct
            conn = db.engine.raw_connection()
            cursor = conn.cursor()
            
            base_query = """
                SELECT id, name, address, city, country, latitude, longitude, 
                       radius, timezone, capacity, amenities, manager_name, 
                       phone, is_active, is_main, company_id, created_at, updated_at
                FROM offices
            """
            
            if company_id is not None:
                cursor.execute(base_query + " WHERE company_id = ?", (company_id,))
            else:
                cursor.execute(base_query)
                
            for row in cursor.fetchall():
                office_dict = {
                    'id': row[0],
                    'name': row[1],
                    'address': row[2],
                    'city': row[3],
                    'country': row[4],
                    'latitude': row[5],
                    'longitude': row[6],
                    'radius': row[7],
                    'timezone': row[8],
                    'capacity': row[9],
                    'amenities': row[10],
                    'manager_name': row[11],
                    'phone': row[12],
                    'is_active': bool(row[13]),
                    'is_main': bool(row[14]),
                    'company_id': row[15],
                    'created_at': row[16],
                    'updated_at': row[17]
                }
                
                # Ajouter geolocation_max_accuracy si elle existe dans le schema
                try:
                    cursor.execute("SELECT geolocation_max_accuracy FROM offices WHERE id = ?", (row[0],))
                    geolocation_max_accuracy = cursor.fetchone()
                    if geolocation_max_accuracy:
                        office_dict['geolocation_max_accuracy'] = geolocation_max_accuracy[0]
                except:
                    office_dict['geolocation_max_accuracy'] = 100  # Valeur par défaut
                
                offices_list.append(office_dict)
                
            cursor.close()
        
        return {
            'error': False,
            'offices': offices_list,
            'status_code': 200
        }
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des bureaux: {str(e)}")
        traceback.print_exc()
        return {
            'error': True,
            'message': f"Erreur interne du serveur: {str(e)}",
            'offices': [],
            'status_code': 500
        }
