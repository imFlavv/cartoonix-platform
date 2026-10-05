"""Backend tests for Public Profile feature."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://favorite-cleanup.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def test_user_token():
    r = requests.post(f"{API}/auth/login", json={"email": "test@cartoonix.ro", "password": "test1234"})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@cartoonix.ro", "password": "admin1234"})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def test_user_id(test_user_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {test_user_token}"})
    assert r.status_code == 200
    return r.json()["id"]


@pytest.fixture(scope="module")
def admin_id(admin_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    return r.json()["id"]


def test_profile_requires_auth(test_user_id):
    r = requests.get(f"{API}/users/{test_user_id}/profile")
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"


def test_profile_valid_user(test_user_token, test_user_id):
    r = requests.get(f"{API}/users/{test_user_id}/profile",
                     headers={"Authorization": f"Bearer {test_user_token}"})
    assert r.status_code == 200
    data = r.json()
    for k in ["id", "name", "avatar", "plus", "donor", "role", "created_at", "total_time_seconds", "chat_msg_count"]:
        assert k in data, f"Missing field: {k}"
    assert data["id"] == test_user_id
    assert isinstance(data["plus"], bool)
    assert isinstance(data["donor"], bool)
    assert isinstance(data["total_time_seconds"], (int, float))
    assert isinstance(data["chat_msg_count"], int)


def test_profile_admin_role(test_user_token, admin_id):
    r = requests.get(f"{API}/users/{admin_id}/profile",
                     headers={"Authorization": f"Bearer {test_user_token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["role"] == "admin"
    assert data["plus"] is True


def test_profile_invalid_user(test_user_token):
    r = requests.get(f"{API}/users/nonexistent-id-12345/profile",
                     headers={"Authorization": f"Bearer {test_user_token}"})
    assert r.status_code == 404
