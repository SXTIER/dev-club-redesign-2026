import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.database import Store
from backend.app.main import create_app
from backend.app.security import set_admin


@pytest.fixture
def settings(tmp_path):
    return Settings(data_dir=tmp_path, allowed_origins=("http://testserver", "http://localhost:3000"), _env_file=None)


@pytest.fixture
def app(settings):
    store = Store(settings)
    store.initialize()
    set_admin(store, "admin@example.com", "password123!")
    return create_app(settings)


@pytest.fixture
def client(app):
    with TestClient(app) as client:
        yield client


@pytest.fixture
def admin(client):
    response = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123!", "confirmPassword": "password123!"})
    assert response.status_code == 200
    return client
