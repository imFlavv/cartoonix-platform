"""Cartoonix backend regression tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE_URL = BASE_URL.rstrip("/")
ADMIN_EMAIL = "admin@cartoonix.ro"
ADMIN_PASSWORD = "Cartoonix2026!"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "admin"
    assert data["user"]["plus"] is True
    return data["token"]


@pytest.fixture(scope="session")
def new_user(s):
    email = f"TEST_{uuid.uuid4().hex[:8]}@cartoonix.test"
    r = s.post(f"{BASE_URL}/api/auth/register", json={"name": "Test User", "email": email, "password": "pass1234", "avatar": "av1"}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "token" in d and d["user"]["email"] == email
    return {"email": email, "token": d["token"], "id": d["user"]["id"]}


# ---------- Auth ----------
def test_register_duplicate(s, new_user):
    r = s.post(f"{BASE_URL}/api/auth/register", json={"name": "x", "email": new_user["email"], "password": "pass1234"})
    assert r.status_code == 400


def test_login_admin(admin_token):
    assert admin_token


def test_login_wrong_password(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me(s, new_user):
    r = s.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {new_user['token']}"})
    assert r.status_code == 200
    assert r.json()["email"] == new_user["email"]


def test_me_no_token(s):
    r = s.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401


def test_update_avatar(s, new_user):
    r = s.put(f"{BASE_URL}/api/auth/avatar", json={"avatar": "new-avatar-9"}, headers={"Authorization": f"Bearer {new_user['token']}"})
    assert r.status_code == 200
    assert r.json()["avatar"] == "new-avatar-9"


def test_subscribe(s, new_user):
    r = s.post(f"{BASE_URL}/api/auth/subscribe", headers={"Authorization": f"Bearer {new_user['token']}"})
    assert r.status_code == 200
    assert r.json()["plus"] is True


# ---------- Shows ----------
def test_shows_list(s):
    r = s.get(f"{BASE_URL}/api/shows")
    assert r.status_code == 200
    shows = r.json()
    assert len(shows) >= 8
    for sh in shows:
        assert "id" in sh
        assert "_id" not in sh


def test_show_detail_has_episodes(s):
    shows = s.get(f"{BASE_URL}/api/shows").json()
    sid = shows[0]["id"]
    r = s.get(f"{BASE_URL}/api/shows/{sid}")
    assert r.status_code == 200
    d = r.json()
    assert len(d["episodes"]) == 6
    assert d["episodes"][0]["video_url"].startswith("http")


def test_show_detail_404(s):
    r = s.get(f"{BASE_URL}/api/shows/507f1f77bcf86cd799439011")
    assert r.status_code == 404


# ---------- Admin ----------
def test_admin_create_show_requires_admin(s, new_user):
    payload = {"title": "TEST_show", "description": "d", "thumbnail": "t", "category": "c", "channel": "ch"}
    r = s.post(f"{BASE_URL}/api/admin/shows", json=payload, headers={"Authorization": f"Bearer {new_user['token']}"})
    assert r.status_code == 403


def test_admin_create_show_success(s, admin_token):
    payload = {
        "title": f"TEST_show_{uuid.uuid4().hex[:6]}",
        "description": "desc",
        "thumbnail": "https://x/y.png",
        "category": "TEST",
        "channel": "Jetix",
        "year": "2025",
        "genres": ["Test"],
        "vps_path": "/var/www/x",
        "episodes": [{"number": 1, "title": "Ep1", "video_url": "https://x/v.mp4", "duration": "22 min"}],
    }
    r = s.post(f"{BASE_URL}/api/admin/shows", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["title"] == payload["title"]
    assert "id" in d
    # verify GET
    g = s.get(f"{BASE_URL}/api/shows/{d['id']}")
    assert g.status_code == 200
    assert g.json()["title"] == payload["title"]
