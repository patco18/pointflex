"""
Routes for Two-Factor Authentication (2FA) management
"""
import pyotp
import qrcode # Will be used if generating QR on backend, or frontend can do it from URI
import io # For sending QR code image if generated on backend
import json
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, create_access_token # For completing login
from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.database import db
from backend.utils.security_utils import encrypt_data, decrypt_data
from backend.utils.notification_utils import send_notification # Optional: notify user on 2FA changes
from backend.middleware.audit import log_user_action

two_factor_bp = Blueprint('two_factor_bp', __name__)

# USER ACTION: Import your initialized 'limiter' instance here.
# Example: from ..extensions import limiter # User needs to ensure 'limiter' is their Flask-Limiter instance

# Helper to generate backup codes
def generate_backup_codes(count=10, length=8):
    import secrets
    import string
    return [''.join(secrets.choice(string.digits) for _ in range(length)) for _ in range(count)]

# USER ACTION: Decorate routes below with appropriate limits from your 'limiter' instance
# Example:
# @limiter.limit(lambda: current_app.config.get('RATELIMIT_SENSITIVE_ACTIONS'))
# @two_factor_bp.route('/setup', methods=['POST'])
# ...

# Helper to hash backup codes (using werkzeug for consistency with password hashing if desired, or simple SHA256)
def hash_backup_code(code):
    from werkzeug.security import generate_password_hash
    return generate_password_hash(code) # Store hashed codes

def check_backup_code(hashed_code_list_json, provided_code):
    from werkzeug.security import check_password_hash
    if not hashed_code_list_json:
        return False
    try:
        hashed_codes = json.loads(hashed_code_list_json)
        for hc in hashed_codes:
            if check_password_hash(hc, provided_code):
                return True # Code is valid
        return False
    except json.JSONDecodeError:
        return False

def remove_used_backup_code(user: User, used_code: str):
    if not user.two_factor_backup_codes:
        return False
    try:
        hashed_codes = json.loads(user.two_factor_backup_codes)
        new_hashed_codes = [hc for hc in hashed_codes if not check_password_hash(hc, used_code)]
        if len(new_hashed_codes) < len(hashed_codes):
            user.two_factor_backup_codes = json.dumps(new_hashed_codes)
            return True
        return False # Code not found or not removed
    except json.JSONDecodeError:
        return False


@two_factor_bp.route('/setup', methods=['POST'])
@jwt_required()
def setup_2fa():
    current_user = get_current_user()
    if current_user.is_two_factor_enabled:
        return jsonify(message="2FA is already enabled for your account."), 400

    if not current_app.config.get('TWO_FACTOR_ENCRYPTION_KEY'):
         current_app.logger.error("2FA_SETUP_ERROR: TWO_FACTOR_ENCRYPTION_KEY is not configured on the server.")
         return jsonify(message="2FA setup is currently unavailable. Please contact support."), 500

    # Generate a new secret. Store this temporarily (e.g., in session or a short-lived cache)
    # until user verifies and enables. For simplicity here, we'll re-generate if they try again.
    # A better approach might be to store it temporarily with an expiry.
    # For now, we pass the unencrypted secret to the user to verify, then they send it back for encryption.
    # This is less secure if the verify step is intercepted.
    # A more secure way: store encrypted temp secret, user verifies, then we enable.

    temp_secret = pyotp.random_base32()

    # Create provisioning URI for QR code
    # The issuer_name should be your application's name.
    totp = pyotp.TOTP(temp_secret)
    provisioning_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name=current_app.config.get('PLATFORM_NAME', 'PointFlex SaaS')
    )

    # Log this attempt to setup 2FA
    log_user_action(action='2FA_SETUP_INITIATED', resource_type='User', resource_id=current_user.id)
    # db.session.commit() # Not committing the secret yet

    return jsonify({
        'message': "Scan the QR code with your authenticator app and verify.",
        'otp_secret': temp_secret, # Display this to the user ONCE for manual entry.
        'provisioning_uri': provisioning_uri
        # Optionally, generate QR code image on backend:
        # qr_img = qrcode.make(provisioning_uri)
        # buf = io.BytesIO()
        # qr_img.save(buf, format='PNG')
        # buf.seek(0)
        # return send_file(buf, mimetype='image/png')
    }), 200


@two_factor_bp.route('/verify-and-enable', methods=['POST'])
@jwt_required()
def verify_and_enable_2fa():
    current_user = get_current_user()
    data = request.get_json()
    otp_code = data.get('otp_code')
    # The unencrypted secret provided during setup must be sent back by the client
    # This is a security consideration: the secret travels over the network twice.
    # Alternative: store an encrypted temporary secret in user session or DB.
    otp_secret_from_client = data.get('otp_secret')

    if not otp_code or not otp_secret_from_client:
        return jsonify(message="OTP code and secret are required."), 400

    if current_user.is_two_factor_enabled:
        return jsonify(message="2FA is already enabled."), 400

    if not current_app.config.get('TWO_FACTOR_ENCRYPTION_KEY'):
         current_app.logger.error("2FA_ENABLE_ERROR: TWO_FACTOR_ENCRYPTION_KEY is not configured.")
         return jsonify(message="2FA setup is currently unavailable. Please contact support."), 500

    totp = pyotp.TOTP(otp_secret_from_client)
    if not totp.verify(otp_code, valid_window=1): # Allow some time drift (1 window = 30s)
        return jsonify(message="Invalid OTP code. Please try again."), 400

    # OTP is valid, encrypt and save the secret, enable 2FA
    encrypted_secret = encrypt_data(otp_secret_from_client)
    if not encrypted_secret:
        current_app.logger.error(f"Failed to encrypt 2FA secret for user {current_user.id}")
        return jsonify(message="Failed to secure 2FA setup. Please try again later."), 500

    current_user.two_factor_secret = encrypted_secret
    current_user.is_two_factor_enabled = True

    # Generate and store backup codes
    backup_codes_raw = generate_backup_codes()
    current_user.two_factor_backup_codes = json.dumps([hash_backup_code(code) for code in backup_codes_raw])

    try:
        db.session.commit()
        log_user_action(action='2FA_ENABLED', resource_type='User', resource_id=current_user.id)
        # db.session.commit()

        # Return raw backup codes ONCE. User must save them.
        return jsonify({
            'message': "2FA enabled successfully! Store these backup codes securely.",
            'backup_codes': backup_codes_raw
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error enabling 2FA for user {current_user.id}: {e}", exc_info=True)
        return jsonify(message="Failed to enable 2FA due to a server error."), 500


@two_factor_bp.route('/verify-login', methods=['POST'])
# No @jwt_required here as this is part of the login flow *before* full JWT is granted
def verify_login_2fa():
    data = request.get_json()
    user_id = data.get('user_id') # Sent by frontend after initial password success
    otp_code = data.get('otp_code')

    if not user_id or not otp_code:
        return jsonify(message="User ID and OTP code are required."), 400

    user = User.query.get(user_id)
    if not user or not user.is_two_factor_enabled or not user.two_factor_secret:
        # This case should ideally not be reached if frontend flow is correct
        return jsonify(message="2FA not enabled or user not found."), 400

    if not current_app.config.get('TWO_FACTOR_ENCRYPTION_KEY'):
         current_app.logger.error("2FA_VERIFY_LOGIN_ERROR: TWO_FACTOR_ENCRYPTION_KEY is not configured.")
         return jsonify(message="2FA verification is currently unavailable."), 500

    decrypted_secret = decrypt_data(user.two_factor_secret)
    if not decrypted_secret:
        current_app.logger.error(f"Failed to decrypt 2FA secret for user {user.id} during login.")
        return jsonify(message="2FA verification failed (server error)."), 500

    totp = pyotp.TOTP(decrypted_secret)
    if totp.verify(otp_code, valid_window=1):
        # OTP is valid, complete login
        access_token = create_access_token(identity=user) # Re-create token after 2FA
        user.update_last_login() # Update last login after successful 2FA
        log_user_action(action='2FA_LOGIN_VERIFIED', resource_type='User', resource_id=user.id,
                        ip_address=request.remote_addr, user_agent=request.headers.get('User-Agent'))
        db.session.commit()
        return jsonify(token=access_token, user=user.to_dict()), 200
    else:
        # Check backup codes
        if check_backup_code(user.two_factor_backup_codes, otp_code):
            if remove_used_backup_code(user, otp_code): # Mark backup code as used
                access_token = create_access_token(identity=user)
                user.update_last_login()
                log_user_action(action='2FA_LOGIN_BACKUP_CODE_USED', resource_type='User', resource_id=user.id,
                                ip_address=request.remote_addr, user_agent=request.headers.get('User-Agent'))
                db.session.commit()
                # Notify user that a backup code was used
                send_notification(user.id, "A 2FA backup code was used to log into your account.", title="Security Alert")
                return jsonify(token=access_token, user=user.to_dict()), 200
            else: # Should not happen if check_backup_code was true
                log_user_action(action='2FA_LOGIN_FAILED_BACKUP_ERROR', resource_type='User', resource_id=user.id,
                                ip_address=request.remote_addr, user_agent=request.headers.get('User-Agent'))
                db.session.commit()
                return jsonify(message="Invalid backup code or error processing it."), 400

        log_user_action(action='2FA_LOGIN_FAILED', resource_type='User', resource_id=user.id,
                        ip_address=request.remote_addr, user_agent=request.headers.get('User-Agent'))
        db.session.commit()
        return jsonify(message="Invalid OTP code or backup code."), 401


@two_factor_bp.route('/disable', methods=['POST'])
@jwt_required()
def disable_2fa():
    current_user = get_current_user()
    data = request.get_json()
    # For security, might require password or current OTP to disable
    password = data.get('password')
    otp_code = data.get('otp_code') # Optional, but good practice

    if not current_user.is_two_factor_enabled:
        return jsonify(message="2FA is not currently enabled."), 400

    # Verification to disable: either password or a current OTP code
    can_disable = False
    if password and current_user.check_password(password):
        can_disable = True
    elif otp_code and current_user.two_factor_secret:
        decrypted_secret = decrypt_data(current_user.two_factor_secret)
        if decrypted_secret and pyotp.TOTP(decrypted_secret).verify(otp_code, valid_window=1):
            can_disable = True
        elif check_backup_code(current_user.two_factor_backup_codes, otp_code):
            if remove_used_backup_code(current_user, otp_code):
                 can_disable = True
                 send_notification(current_user.id, "A 2FA backup code was used to disable 2FA on your account.", title="Security Alert")


    if not can_disable:
        return jsonify(message="Invalid credentials provided for disabling 2FA."), 401

    current_user.is_two_factor_enabled = False
    current_user.two_factor_secret = None
    current_user.two_factor_backup_codes = None
    try:
        db.session.commit()
        log_user_action(action='2FA_DISABLED', resource_type='User', resource_id=current_user.id)
        # db.session.commit()
        return jsonify(message="2FA disabled successfully."), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error disabling 2FA for user {current_user.id}: {e}", exc_info=True)
        return jsonify(message="Failed to disable 2FA due to a server error."), 500

@two_factor_bp.route('/backup-codes', methods=['POST']) # Regenerate
@jwt_required()
def regenerate_backup_codes():
    current_user = get_current_user()
    if not current_user.is_two_factor_enabled:
        return jsonify(message="2FA must be enabled to regenerate backup codes."), 400

    # Optionally require password or current OTP to regenerate backup codes for added security
    # data = request.get_json()
    # password = data.get('password')
    # if not password or not current_user.check_password(password):
    #     return jsonify(message="Password verification failed."), 401

    backup_codes_raw = generate_backup_codes()
    current_user.two_factor_backup_codes = json.dumps([hash_backup_code(code) for code in backup_codes_raw])
    try:
        db.session.commit()
        log_user_action(action='2FA_BACKUP_CODES_REGENERATED', resource_type='User', resource_id=current_user.id)
        # db.session.commit()
        return jsonify({
            'message': "New backup codes generated. Please save them securely.",
            'backup_codes': backup_codes_raw
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error regenerating backup codes for user {current_user.id}: {e}", exc_info=True)
        return jsonify(message="Failed to regenerate backup codes."), 500
