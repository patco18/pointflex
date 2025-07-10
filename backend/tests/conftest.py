import os
import sys
import base64
import types
import pytest

# Provide a minimal Fernet implementation so tests don't require the cryptography package
fernet_mod = types.ModuleType("cryptography.fernet")

class Fernet:
    def __init__(self, key: bytes):
        self.key = key

    @staticmethod
    def generate_key():
        return base64.urlsafe_b64encode(os.urandom(32))

    def encrypt(self, data: bytes) -> bytes:
        return base64.urlsafe_b64encode(data)

    def decrypt(self, token: bytes) -> bytes:
        return base64.urlsafe_b64decode(token)

class InvalidToken(Exception):
    pass

fernet_mod.Fernet = Fernet
fernet_mod.InvalidToken = InvalidToken
sys.modules.setdefault("cryptography", types.ModuleType("cryptography"))
sys.modules["cryptography.fernet"] = fernet_mod

# Ensure encryption key is available before the app imports security utilities
os.environ.setdefault('TWO_FACTOR_ENCRYPTION_KEY', Fernet.generate_key().decode())

from backend.app import create_app

@pytest.fixture
def client():
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    app = create_app()
    app.config.update(TESTING=True)
    return app.test_client()
