"""
Security related utility functions, e.g., for encryption/decryption.
"""
import os
from cryptography.fernet import Fernet, InvalidToken
from flask import current_app

# Load the encryption key for 2FA secrets
# This key MUST be kept secret and be consistent across application restarts.
# It should be a 32-byte URL-safe base64-encoded string.
# Generate one using: Fernet.generate_key().decode()
TWO_FACTOR_ENCRYPTION_KEY_ENV = os.environ.get('TWO_FACTOR_ENCRYPTION_KEY')

if not TWO_FACTOR_ENCRYPTION_KEY_ENV:
    print("WARNING: TWO_FACTOR_ENCRYPTION_KEY is not set. 2FA secret encryption will fail.")
    # In a real app, you might want to raise an error or have a default dev key,
    # but for security, it's better to require it to be explicitly set.
    _cipher_suite = None
else:
    try:
        _cipher_suite = Fernet(TWO_FACTOR_ENCRYPTION_KEY_ENV.encode())
    except Exception as e:
        print(f"ERROR: Invalid TWO_FACTOR_ENCRYPTION_KEY. It must be a URL-safe base64-encoded 32-byte key. Error: {e}")
        _cipher_suite = None


def encrypt_data(data: str) -> str | None:
    """Encrypts a string using Fernet symmetric encryption."""
    if not _cipher_suite:
        current_app.logger.error("2FA Encryption key not available or invalid. Cannot encrypt data.")
        return None
    if not data:
        return None
    try:
        encrypted_text = _cipher_suite.encrypt(data.encode('utf-8'))
        return encrypted_text.decode('utf-8')
    except Exception as e:
        current_app.logger.error(f"Error during data encryption: {e}")
        return None

def decrypt_data(encrypted_data: str) -> str | None:
    """Decrypts a string using Fernet symmetric encryption."""
    if not _cipher_suite:
        current_app.logger.error("2FA Encryption key not available or invalid. Cannot decrypt data.")
        return None
    if not encrypted_data:
        return None
    try:
        decrypted_text = _cipher_suite.decrypt(encrypted_data.encode('utf-8'))
        return decrypted_text.decode('utf-8')
    except InvalidToken:
        current_app.logger.error("Invalid token or key for decryption (InvalidToken).")
        return None
    except Exception as e:
        current_app.logger.error(f"Error during data decryption: {e}")
        return None

if __name__ == '__main__':
    # Example usage and key generation
    # To generate a new key:
    # from cryptography.fernet import Fernet
    # key = Fernet.generate_key()
    # print(f"Generated Fernet Key: {key.decode()}") # Store this in your .env as TWO_FACTOR_ENCRYPTION_KEY

    # --- Test Encryption/Decryption (requires TWO_FACTOR_ENCRYPTION_KEY to be set in env for testing) ---
    if TWO_FACTOR_ENCRYPTION_KEY_ENV:
        print(f"Testing with key: {TWO_FACTOR_ENCRYPTION_KEY_ENV[:5]}...")
        original_text = "mysecret_totp_key_string_12345"
        print(f"Original: {original_text}")

        encrypted = encrypt_data(original_text)
        if encrypted:
            print(f"Encrypted: {encrypted}")
            decrypted = decrypt_data(encrypted)
            print(f"Decrypted: {decrypted}")
            assert decrypted == original_text, "Decryption failed!"
            print("Encryption/Decryption test successful.")
        else:
            print("Encryption failed, cannot run decryption test.")
    else:
        print("TWO_FACTOR_ENCRYPTION_KEY not set in environment. Skipping encryption/decryption test.")
        print("Generate a key using: Fernet.generate_key().decode()")

import re

def validate_password_strength(password: str) -> list[str]:
    """
    Validates password strength based on application configuration.
    Returns a list of error messages if validation fails, otherwise an empty list.
    """
    errors = []
    if not password: # Should be caught by required fields typically, but good to have
        errors.append("Le mot de passe ne peut pas être vide.")
        return errors

    min_length = current_app.config.get('PASSWORD_MIN_LENGTH', 8)
    req_uppercase = current_app.config.get('PASSWORD_REQUIRE_UPPERCASE', True)
    req_numbers = current_app.config.get('PASSWORD_REQUIRE_NUMBERS', True)
    req_special = current_app.config.get('PASSWORD_REQUIRE_SPECIAL_CHAR', True)

    if len(password) < min_length:
        errors.append(f"Le mot de passe doit contenir au moins {min_length} caractères.")

    if req_uppercase and not re.search(r"[A-Z]", password):
        errors.append("Le mot de passe doit contenir au moins une lettre majuscule.")

    if req_numbers and not re.search(r"[0-9]", password):
        errors.append("Le mot de passe doit contenir au moins un chiffre.")

    if req_special and not re.search(r"[!@#$%^&*()\[\]{};':\"\\|,.<>\/?~`_+-=]", password):
        errors.append("Le mot de passe doit contenir au moins un caractère spécial.")

    # Password history check will be added later, typically integrated into User.set_password

    return errors

# Updated function to include history check
def validate_password_policy(password: str, user_object=None) -> list[str]:
    """
    Validates password based on strength and history policies.
    Returns a list of error messages if validation fails, otherwise an empty list.
    `user_object` is required for history check.
    """
    strength_errors = validate_password_strength(password)
    if strength_errors:
        return strength_errors # Return early if basic strength fails

    history_errors = []
    if user_object and current_app.config.get('PASSWORD_HISTORY_COUNT', 0) > 0:
        from backend.models.password_history import PasswordHistory # Corrected import
        from werkzeug.security import check_password_hash

        recent_hashes = PasswordHistory.query.filter_by(user_id=user_object.id)\
                                        .order_by(PasswordHistory.created_at.desc())\
                                        .limit(current_app.config.get('PASSWORD_HISTORY_COUNT'))\
                                        .all()
        for entry in recent_hashes:
            if check_password_hash(entry.password_hash, password):
                history_errors.append("Le nouveau mot de passe ne peut pas être identique à l'un de vos mots de passe récents.")
                break

    return history_errors # Returns empty if no history errors
