"""
Routes d'authentification
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from backend.models.user import User
from backend.models.audit_log import AuditLog
from middleware.auth import get_current_user
from middleware.audit import log_user_action
from database import db
from datetime import datetime
from extensions import limiter

auth_bp = Blueprint('auth', __name__)

@limiter.limit(lambda: current_app.config.get('RATELIMIT_AUTH_LOGIN'))
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
        db.session.commit() # Commit failed attempts updates or last_login before 2FA check

        # Check if 2FA is enabled
        if user.is_two_factor_enabled:
            # Do not issue full access token yet.
            # Frontend will need user_id to make the /2fa/verify-login call.
            # A temporary, short-lived token specifically for 2FA verification might be an option
            # but for simplicity, just returning a flag and user_id.
            log_user_action(
                action='2FA_REQUIRED_FOR_LOGIN',
                resource_type='User',
                resource_id=user.id,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            # db.session.commit() # For the audit log if not covered by earlier commit
            return jsonify({
                'message': "2FA required for this account.",
                'two_factor_required': True,
                'user_id': user.id # Frontend needs this to call the verify endpoint
            }), 202 # 202 Accepted: request is fine, but further action (2FA) is needed

        # 2FA not enabled, proceed with normal token generation
        access_token = create_access_token(identity=user)
        
        print(f"Connexion réussie pour {email}, token généré")

        # Logger la connexion réussie (already done by user.update_last_login() if AuditLog.log_login is called there)
        # AuditLog.log_login was already called after password check, which is fine.
        # No, it's called AFTER successful login. So, if 2FA is enabled, this point is not reached yet.
        # The log_login for success should happen AFTER 2FA verification if 2FA is enabled.
        # The AuditLog.log_login(success=True) has been moved to /2fa/verify-login for 2FA users.
        # For non-2FA users, it's logged here:
        if not user.is_two_factor_enabled: # Log successful non-2FA login
            AuditLog.log_login(
                user=user,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                success=True
            )
            db.session.commit() # Commit the audit log for non-2FA login

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