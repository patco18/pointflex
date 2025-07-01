import os
import pytest
from backend.app import create_app

@pytest.fixture
def client():
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    app = create_app()
    app.config.update(TESTING=True)
    return app.test_client()
