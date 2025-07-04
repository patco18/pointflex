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
