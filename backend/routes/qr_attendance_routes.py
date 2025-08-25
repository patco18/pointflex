from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import secrets
import json
import enum
from backend.models.pointage import Pointage

# Définir l'énumération pour les types de pointage
class PointageType(enum.Enum):
    IN = "IN"
    OUT = "OUT"
    BREAK_START = "BREAK_START"
    BREAK_END = "BREAK_END"
from backend.models.user import User
from backend.models.office import Office
from backend.database import db
from backend.models.company import Company
from backend.middleware.auth import require_admin
from sqlalchemy import func

# Définir le blueprint avec un nom unique
qr_code_bp = Blueprint('qr_code', __name__)

# Stockage temporaire des tokens QR (en production, utiliser Redis ou une base de données)
qr_tokens = {}  # { token: { company_id, office_id, expiry, created_by } }

@qr_code_bp.route('/generate-qr-token', methods=['POST'])
@jwt_required()
@require_admin
def generate_qr_token():
    """
    Génère un token QR pour un bureau spécifique.
    Requiert un rôle d'administrateur.
    
    Body:
    {
        "office_id": "uuid",  # ID du bureau pour lequel générer le token
        "expiry_minutes": 30  # Durée de validité en minutes (par défaut 30)
    }
    """
    data = request.json
    user_id = get_jwt_identity()
    
    if not data or 'office_id' not in data:
        return jsonify({"success": False, "message": "ID du bureau requis"}), 400
    
    office_id = data['office_id']
    expiry_minutes = data.get('expiry_minutes', 30)
    
    # Vérifier que le bureau existe et appartient à la même entreprise que l'utilisateur
    user = User.query.get(user_id)
    office = Office.query.get(office_id)
    
    if not office:
        return jsonify({"success": False, "message": "Bureau non trouvé"}), 404
    
    if office.company_id != user.company_id:
        return jsonify({"success": False, "message": "Accès non autorisé à ce bureau"}), 403
    
    # Générer un token unique
    token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(minutes=expiry_minutes)
    
    # Stocker le token avec les informations associées
    qr_tokens[token] = {
        "company_id": str(user.company_id),
        "office_id": office_id,
        "expiry": expiry,
        "created_by": user_id
    }
    
    # Nettoyer les tokens expirés (pour éviter une accumulation de tokens inutiles)
    clean_expired_tokens()
    
    return jsonify({
        "success": True,
        "token": token,
        "expiry": expiry.isoformat(),
        "office": {
            "id": str(office.id),
            "name": office.name,
            "address": office.address
        }
    })

@qr_code_bp.route('/qr-checkin', methods=['POST'])
@jwt_required()
def qr_checkin():
    """
    Permet à un utilisateur de pointer avec un QR code.
    
    Body:
    {
        "token": "token_qr",
        "location": {              # Optionnel
            "latitude": float,
            "longitude": float,
            "accuracy": float
        }
    }
    """
    data = request.json
    user_id = get_jwt_identity()
    
    if not data or 'token' not in data:
        return jsonify({"success": False, "message": "Token QR requis"}), 400
    
    token = data['token']
    location_data = data.get('location')
    
    # Vérifier que le token existe et n'est pas expiré
    if token not in qr_tokens:
        return jsonify({"success": False, "message": "Token QR invalide"}), 400
    
    token_data = qr_tokens[token]
    if datetime.utcnow() > token_data['expiry']:
        # Supprimer le token expiré
        del qr_tokens[token]
        return jsonify({"success": False, "message": "Token QR expiré"}), 400
    
    # Récupérer l'utilisateur et vérifier qu'il appartient à la bonne entreprise
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "Utilisateur non trouvé"}), 404
    
    if str(user.company_id) != token_data['company_id']:
        return jsonify({"success": False, "message": "Ce QR code n'appartient pas à votre entreprise"}), 403
    
    # Récupérer le bureau
    office = Office.query.get(token_data['office_id'])
    if not office:
        return jsonify({"success": False, "message": "Bureau non trouvé"}), 404

    if location_data:
        if location_data.get('accuracy') is None:
            return jsonify({"success": False, "message": "Précision GPS requise"}), 400
        max_accuracy = current_app.config.get('GEOLOCATION_MAX_ACCURACY', 100)
        company = office.company
        if company and company.geolocation_max_accuracy is not None:
            max_accuracy = company.geolocation_max_accuracy
        if office.geolocation_max_accuracy is not None:
            max_accuracy = office.geolocation_max_accuracy
        if location_data['accuracy'] > max_accuracy:
            return jsonify({
                "success": False,
                "message": (
                    f"Précision de localisation insuffisante ({int(location_data['accuracy'])}m). "
                    f"Maximum autorisé: {max_accuracy}m"
                ),
            }), 400
    
    # Déterminer le type de pointage (entrée ou sortie)
    pointage_type = determine_pointage_type(user_id)
    
    # Vérifier si une validation est nécessaire (hors horaires normaux, localisation suspecte, etc.)
    needs_validation = check_if_validation_needed(user_id, office.id, location_data)
    
    # Créer un nouveau pointage
    now = datetime.utcnow()
    
    # Création du pointage selon le type
    new_pointage = None
    if pointage_type == PointageType.IN:
        # Pointage d'entrée
        new_pointage = Pointage(
            user_id=user_id,
            date_pointage=now.date(),
            heure_arrivee=now.time(),
            type="office",
            office_id=office.id,
            is_qr_scan=True,
            statut="present",
            latitude=location_data.get('latitude') if location_data else None,
            longitude=location_data.get('longitude') if location_data else None
        )
    elif pointage_type == PointageType.OUT:
        # Chercher le pointage d'entrée existant pour mettre à jour l'heure de sortie
        existing_pointage = Pointage.query.filter(
            Pointage.user_id == user_id,
            Pointage.date_pointage == now.date(),
            Pointage.heure_arrivee.isnot(None),
            Pointage.heure_depart.is_(None)
        ).first()
        
        if existing_pointage:
            # Mettre à jour le pointage existant
            existing_pointage.heure_depart = now.time()
            new_pointage = existing_pointage
        else:
            # Créer un nouveau pointage de sortie si nécessaire
            new_pointage = Pointage(
                user_id=user_id,
                date_pointage=now.date(),
                heure_depart=now.time(),
                type="office",
                office_id=office.id,
                is_qr_scan=True,
                statut="present",
                latitude=location_data.get('latitude') if location_data else None,
                longitude=location_data.get('longitude') if location_data else None
            )
    
    # Si new_pointage est None, c'est qu'on a un type de pointage non géré
    if new_pointage is None:
        return jsonify({"success": False, "message": "Type de pointage non pris en charge"}), 400
    
    # Enregistrer le pointage en base de données
    if pointage_type == PointageType.OUT and existing_pointage:
        # On a déjà mis à jour l'objet existant, pas besoin de l'ajouter
        pass
    else:
        db.session.add(new_pointage)
    
    db.session.commit()
    
    # Pour la sécurité, supprimer le token après utilisation (usage unique)
    if token in qr_tokens:
        del qr_tokens[token]
    
    # Renvoyer les informations sur le pointage
    check_in_time = now.isoformat()
    type_name = pointage_type.name if hasattr(pointage_type, 'name') else str(pointage_type)
    
    return jsonify({
        "success": True,
        "message": f"Pointage {type_name} enregistré avec succès",
        "data": {
            "attendanceId": str(new_pointage.id),
            "userId": str(user.id),
            "userName": f"{user.first_name} {user.last_name}",
            "checkInTime": check_in_time,
            "checkInType": type_name,
            "office": {
                "id": str(office.id),
                "name": office.name,
                "address": office.address
            },
            "location": location_data,
            "needsValidation": needs_validation
        }
    })

def determine_pointage_type(user_id):
    """
    Détermine le type de pointage en fonction des pointages précédents de l'utilisateur.
    """
    # Récupérer le dernier pointage de l'utilisateur aujourd'hui
    today = datetime.utcnow().date()
    last_pointage = Pointage.query.filter(
        Pointage.user_id == user_id,
        Pointage.date_pointage == today
    ).order_by(Pointage.id.desc()).first()
    
    if not last_pointage:
        # Premier pointage de la journée
        return PointageType.IN
    
    # Si le pointage a une heure d'arrivée mais pas de départ, c'est un OUT (départ)
    if last_pointage.heure_arrivee and not last_pointage.heure_depart:
        return PointageType.OUT
        
    # Si le pointage a une heure de départ, le prochain est un IN (arrivée)
    if last_pointage.heure_depart:
        return PointageType.IN
        
    # Par défaut, on alterne
    return PointageType.IN

def check_if_validation_needed(user_id, office_id, location_data):
    """
    Vérifie si une validation est nécessaire pour ce pointage.
    Par exemple:
    - Pointage en dehors des heures de travail
    - Localisation suspecte (trop éloignée du bureau)
    - Utilisateur avec des restrictions de pointage
    """
    # Vérifier l'heure du pointage
    now = datetime.utcnow()
    hour = now.hour
    
    # Pointage en dehors des heures de bureau standard (exemple: avant 7h ou après 20h)
    if hour < 7 or hour >= 20:
        return True
    
    # Vérifier la localisation (si fournie)
    if location_data and 'latitude' in location_data and 'longitude' in location_data:
        # Récupérer les coordonnées du bureau
        office = Office.query.get(office_id)
        if office:
            # Vérifier si la distance est supérieure au rayon défini pour le bureau
            distance = calculate_distance(
                location_data['latitude'], location_data['longitude'],
                office.latitude, office.longitude
            )
            if distance > office.radius:  # Utiliser le rayon configuré pour ce bureau
                return True
    
    # Pas besoin de validation
    return False

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calcule la distance approximative entre deux points géographiques en mètres.
    Utilise la formule de Haversine pour une approximation rapide.
    """
    from math import radians, cos, sin, asin, sqrt
    
    # Convertir en radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Formule de Haversine
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371000  # Rayon de la Terre en mètres
    
    return c * r

def clean_expired_tokens():
    """
    Nettoie les tokens QR expirés du stockage.
    """
    now = datetime.utcnow()
    expired_tokens = [token for token, data in qr_tokens.items() if data['expiry'] < now]
    for token in expired_tokens:
        if token in qr_tokens:
            del qr_tokens[token]
