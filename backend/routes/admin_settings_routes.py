from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.middleware.auth import require_admin
from backend.database import db
from backend.models.user import User
from backend.models.company import Company
from backend.models.notification_setting import NotificationSetting
from backend.models.integration_setting import IntegrationSetting
import json
import secrets
import logging
from datetime import datetime

admin_settings_bp = Blueprint('admin_settings', __name__)

def get_admin_company():
    """Helper to get the admin's company"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return None, jsonify(message="Utilisateur non trouvé"), 404
    
    if not user.company_id:
        return None, jsonify(message="Utilisateur non associé à une entreprise"), 400
    
    company = Company.query.get(user.company_id)
    if not company:
        return None, jsonify(message="Entreprise non trouvée"), 404
    
    return company, None

def log_user_action(action, resource_type, resource_id, new_values=None, old_values=None, details=None):
    """Helper to log user actions"""
    from backend.models.audit_log import AuditLog
    
    try:
        user_id = get_jwt_identity()
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            details=json.dumps(details) if details else None
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        current_app.logger.error(f"Error logging user action: {str(e)}")
        db.session.rollback()

@admin_settings_bp.route('/company/notification-settings', methods=['GET'])
@jwt_required()
@require_admin
def get_notification_settings():
    """Récupère les paramètres de notification de l'entreprise"""
    company, error_response = get_admin_company()
    if error_response:
        return error_response
    
    # Rechercher les paramètres existants ou créer des paramètres par défaut
    settings = NotificationSetting.query.filter_by(company_id=company.id).first()
    
    if not settings:
        # Créer des paramètres par défaut
        settings = NotificationSetting(company_id=company.id)
        db.session.add(settings)
        db.session.commit()
    
    return jsonify({"settings": settings.to_dict()}), 200

@admin_settings_bp.route('/company/notification-settings', methods=['PUT'])
@jwt_required()
@require_admin
def update_notification_settings():
    """Met à jour les paramètres de notification de l'entreprise"""
    company, error_response = get_admin_company()
    if error_response:
        return error_response
    
    data = request.get_json()
    if not data:
        return jsonify(message="Données manquantes"), 400
    
    settings = NotificationSetting.query.filter_by(company_id=company.id).first()
    
    if not settings:
        settings = NotificationSetting(company_id=company.id)
        db.session.add(settings)
    
    # Mettre à jour les paramètres
    for key, value in data.items():
        if hasattr(settings, key):
            setattr(settings, key, value)
    
    old_values = settings.to_dict() if settings else {}
    
    try:
        db.session.commit()
        
        log_user_action(
            action='UPDATE_NOTIFICATION_SETTINGS',
            resource_type='Company',
            resource_id=company.id,
            new_values=data,
            old_values=old_values,
            details={'company_id': company.id}
        )
        
        return jsonify({
            "message": "Paramètres de notification mis à jour avec succès", 
            "settings": settings.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la mise à jour des paramètres de notification: {str(e)}")
        return jsonify(message="Erreur lors de la mise à jour des paramètres"), 500

@admin_settings_bp.route('/company/integration-settings', methods=['GET'])
@jwt_required()
@require_admin
def get_integration_settings():
    """Récupère les paramètres d'intégration de l'entreprise"""
    company, error_response = get_admin_company()
    if error_response:
        return error_response
    
    # Rechercher les paramètres existants ou créer des paramètres par défaut
    settings = IntegrationSetting.query.filter_by(company_id=company.id).first()
    
    if not settings:
        # Créer des paramètres par défaut
        settings = IntegrationSetting(company_id=company.id)
        db.session.add(settings)
        db.session.commit()
    
    return jsonify({"settings": settings.to_dict()}), 200

@admin_settings_bp.route('/company/integration-settings', methods=['PUT'])
@jwt_required()
@require_admin
def update_integration_settings():
    """Met à jour les paramètres d'intégration de l'entreprise"""
    company, error_response = get_admin_company()
    if error_response:
        return error_response
    
    data = request.get_json()
    if not data:
        return jsonify(message="Données manquantes"), 400
    
    settings = IntegrationSetting.query.filter_by(company_id=company.id).first()
    
    if not settings:
        settings = IntegrationSetting(company_id=company.id)
        db.session.add(settings)
    
    # Sauvegarder la liste des événements webhook comme JSON
    if 'webhook_events' in data:
        if isinstance(data['webhook_events'], list):
            settings.webhook_events = json.dumps(data['webhook_events'])
        else:
            settings.webhook_events = '[]'
    
    # Mettre à jour les autres paramètres
    for key, value in data.items():
        if hasattr(settings, key) and key != 'webhook_events':
            setattr(settings, key, value)
    
    old_values = settings.to_dict() if settings else {}
    
    try:
        db.session.commit()
        
        log_user_action(
            action='UPDATE_INTEGRATION_SETTINGS',
            resource_type='Company',
            resource_id=company.id,
            new_values=data,
            old_values=old_values,
            details={'company_id': company.id}
        )
        
        return jsonify({
            "message": "Paramètres d'intégration mis à jour avec succès", 
            "settings": settings.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la mise à jour des paramètres d'intégration: {str(e)}")
        return jsonify(message="Erreur lors de la mise à jour des paramètres"), 500

@admin_settings_bp.route('/company/generate-api-key', methods=['POST'])
@jwt_required()
@require_admin
def generate_api_key():
    """Génère une nouvelle clé API pour l'entreprise"""
    company, error_response = get_admin_company()
    if error_response:
        return error_response
    
    settings = IntegrationSetting.query.filter_by(company_id=company.id).first()
    
    if not settings:
        settings = IntegrationSetting(company_id=company.id)
        db.session.add(settings)
    
    # Générer une nouvelle clé API sécurisée
    new_api_key = secrets.token_hex(32)
    settings.api_key = new_api_key
    settings.api_key_created_at = datetime.utcnow()
    
    try:
        db.session.commit()
        
        log_user_action(
            action='GENERATE_API_KEY',
            resource_type='Company',
            resource_id=company.id,
            details={'company_id': company.id}
        )
        
        return jsonify({
            "message": "Nouvelle clé API générée avec succès",
            "api_key": new_api_key,
            "created_at": settings.api_key_created_at.isoformat() if settings.api_key_created_at else None
        }), 200
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la génération de la clé API: {str(e)}")
        return jsonify(message="Erreur lors de la génération de la clé API"), 500
