# Vision page ("Viitorul Cartoonix") toggle + login gating tests.
# Leaves vision page DISABLED at the end (as requested).
import os, uuid, pytest, requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@cartoonix.ro", "password": "TestAdmin123!"}


def _token(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    return r


@pytest.fixture(scope="module")
def admin_h():
    r = _token(**ADMIN)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def regular_user(admin_h):
    # temporarily disable vision so the user can be created & logged in
    email = f"test_vision_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/admin/users", headers=admin_h,
                      json={"email": email, "password": "TestPass123!", "name": f"TEST_Vision_{uuid.uuid4().hex[:4]}"})
    assert r.status_code == 200, r.text
    u = {"id": r.json()["user"]["id"], "email": email, "password": "TestPass123!"}
    yield u
    requests.delete(f"{API}/admin/users/{u['id']}", headers=admin_h)
    # final state: disabled
    requests.post(f"{API}/admin/vision-page", headers=admin_h, json={"enabled": False})


# --- public setting endpoint
def test_get_vision_setting_public():
    r = requests.get(f"{API}/settings/vision-page")
    assert r.status_code == 200
    assert isinstance(r.json()["enabled"], bool)


# --- admin-only toggle
def test_toggle_requires_auth():
    assert requests.post(f"{API}/admin/vision-page", json={"enabled": True}).status_code in (401, 403)


def test_toggle_forbidden_for_regular_user(admin_h, regular_user):
    requests.post(f"{API}/admin/vision-page", headers=admin_h, json={"enabled": False})
    r = _token(regular_user["email"], regular_user["password"])
    assert r.status_code == 200, r.text
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    assert requests.post(f"{API}/admin/vision-page", headers=h, json={"enabled": True}).status_code == 403
    assert requests.get(f"{API}/settings/vision-page").json()["enabled"] is False


def test_toggle_validation(admin_h):
    assert requests.post(f"{API}/admin/vision-page", headers=admin_h, json={}).status_code == 422


# --- enabled: non-admin 503, admin OK
def test_enabled_blocks_non_admin_login(admin_h, regular_user):
    r = requests.post(f"{API}/admin/vision-page", headers=admin_h, json={"enabled": True})
    assert r.status_code == 200 and r.json() == {"enabled": True}
    assert requests.get(f"{API}/settings/vision-page").json() == {"enabled": True}
    r = _token(regular_user["email"], regular_user["password"])
    assert r.status_code == 503
    assert "dezactivat" in r.json()["detail"]


def test_enabled_wrong_password_still_401(regular_user):
    r = _token(regular_user["email"], "wrong")
    assert r.status_code == 401


def test_enabled_admin_login_works():
    r = _token(**ADMIN)
    assert r.status_code == 200 and r.json()["user"]["role"] == "admin"


# --- disabled: normal login, maintenance still works
def test_disabled_allows_login(admin_h, regular_user):
    r = requests.post(f"{API}/admin/vision-page", headers=admin_h, json={"enabled": False})
    assert r.json() == {"enabled": False}
    assert _token(regular_user["email"], regular_user["password"]).status_code == 200


def test_maintenance_still_works(admin_h, regular_user):
    orig = requests.get(f"{API}/settings/maintenance").json()["enabled"]
    try:
        assert requests.post(f"{API}/admin/maintenance", headers=admin_h, json={"enabled": True}).status_code == 200
        r = _token(regular_user["email"], regular_user["password"])
        assert r.status_code == 503 and "mentenanță" in r.json()["detail"]
        assert _token(**ADMIN).status_code == 200
    finally:
        requests.post(f"{API}/admin/maintenance", headers=admin_h, json={"enabled": orig})
    assert requests.get(f"{API}/settings/maintenance").json()["enabled"] == orig
