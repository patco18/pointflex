"""
Routes d'authentification
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models.user import User
from models.audit_log import AuditLog
from middleware.auth import get_current_user
from database import db
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """Connexion utilisateur"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify(message="Email et mot de passe requis"), 400
        
        print(f"Tentative de connexion pour: {email}")
        
        # Rechercher l'utilisateur
        user = User.query.filter_by(email=email).first()
        
        if not user:
            print(f"Utilisateur non trouvé: {email}")
            return jsonify(message="Email ou mot de passe incorrect"), 401
        
        # Vérifier si le compte est verrouillé
        if user.is_locked():
            print(f"Compte verrouillé: {email}")
            return jsonify(message="Compte temporairement verrouillé"), 423
        
        # Vérifier le mot de passe
        if not user.check_password(password):
            print(f"Mot de passe incorrect pour: {email}")
            user.increment_failed_attempts()
            
            # Verrouiller le compte après 5 tentatives
            if user.failed_login_attempts >= 5:
                user.lock_account()
                print(f"Compte verrouillé après 5 tentatives: {email}")
            
            db.session.commit()
            
            # Logger la tentative échouée
            AuditLog.log_login(
                user=user,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                success=False
            )
            db.session.commit()
            
            return jsonify(message="Email ou mot de passe incorrect"), 401
        
        # Vérifier si l'utilisateur est actif
        if not user.is_active:
            print(f"Utilisateur inactif: {email}")
            return jsonify(message="Compte désactivé"), 403
        
        # Connexion réussie
        user.reset_failed_attempts()
        user.update_last_login()
        
        # Créer le token JWT
        access_token = create_access_token(identity=user)
        
        db.session.commit()
        
        print(f"Connexion réussie pour {email}, token généré")
        
        # Logger la connexion réussie
        AuditLog.log_login(
            user=user,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True
        )
        db.session.commit()
        
        return jsonify({
            'token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la connexion: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user_info():
    """Récupère les informations de l'utilisateur connecté"""
    try:
        current_user = get_current_user()
        
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 404
        
        return jsonify({
            'user': current_user.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération de l'utilisateur: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required()
def refresh_token():
    """Renouvelle le token d'accès"""
    try:
        current_user = get_current_user()
        
        if not current_user or not current_user.is_active:
            return jsonify(message="Utilisateur non valide"), 401
        
        # Créer un nouveau token
        new_token = create_access_token(identity=current_user)
        
        return jsonify({
            'token': new_token
        }), 200
        
    except Exception as e:
        print(f"Erreur lors du renouvellement du token: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Déconnexion utilisateur"""
    try:
        current_user = get_current_user()
        
        if current_user:
            # Logger la déconnexion
            AuditLog.log_action(
                user_email=current_user.email,
                user_id=current_user.id,
                action='LOGOUT',
                resource_type='User',
                resource_id=current_user.id,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            db.session.commit()
        
        return jsonify(message="Déconnexion réussie"), 200
        
    except Exception as e:
        print(f"Erreur lors de la déconnexion: {e}")
        return jsonify(message="Erreur interne du serveur"), 500