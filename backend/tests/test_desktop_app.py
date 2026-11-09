# Desktop app settings (version/size/url editable from admin) + optional broadcast notification.
# Restores defaults at end and deletes notifications created by this module (by id, via mongo).
import os, uuid, pytest, requests
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@cartoonix.ro", "password": "TestAdmin123!"}
DEFAULT = {"version": "0.4.0", "size": "99 MB",
           "url": "https://customer-assets-cm19k8pv.emergentagent.net/job_favorite-cleanup/artifacts/78734134ebe34129_Cartoonix-Desktop-Configurare-0.4.0.exe"}
created_notif_ids = []


@pytest.fixture(scope="module")
def admin_h():
    r = requests.post(f"{API}/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    yield {"Authorization": f"Bearer {r.json()['token']}"}
    requests.post(f"{API}/admin/settings/desktop-app", headers={"Authorization": f"Bearer {r.json()['token']}"},
                  json={**DEFAULT, "notify": False})
    db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    for nid in created_notif_ids:
        db.notifications.delete_one({"_id": ObjectId(nid)})


@pytest.fixture(scope="module")
def user_h(admin_h):
    email = f"test_desk_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/admin/users", headers=admin_h,
                      json={"email": email, "password": "TestPass123!", "name": f"TEST_Desk_{uuid.uuid4().hex[:4]}"})
    assert r.status_code == 200, r.text
    uid = r.json()["user"]["id"]
    lr = requests.post(f"{API}/auth/login", json={"email": email, "password": "TestPass123!"})
    if lr.status_code == 200:
        tok = lr.json()["token"]
    else:
        # vision page / login gating may block non-admin login: mint a JWT for the TEST_ user
        import jwt
        from datetime import datetime, timezone, timedelta
        tok = jwt.encode({"sub": uid, "email": email, "type": "access",
                          "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                         os.environ["JWT_SECRET"], algorithm="HS256")
    yield {"Authorization": f"Bearer {tok}"}
    requests.delete(f"{API}/admin/users/{uid}", headers=admin_h)


def _desk_notifs(h):
    r = requests.get(f"{API}/notifications", headers=h)
    assert r.status_code == 200
    return [n for n in r.json()["items"] if n.get("title", "").startswith("Cartoonix Desktop")]


def test_get_public():
    r = requests.get(f"{API}/settings/desktop-app")
    assert r.status_code == 200
    d = r.json()
    for k in ("version", "size", "url", "updated_at"):
        assert k in d
    assert d["url"].startswith("http")


def test_post_unauthenticated():
    r = requests.post(f"{API}/admin/settings/desktop-app", json={**DEFAULT, "notify": False})
    assert r.status_code in (401, 403)


def test_post_non_admin(user_h):
    r = requests.post(f"{API}/admin/settings/desktop-app", headers=user_h, json={**DEFAULT, "notify": False})
    assert r.status_code == 403


@pytest.mark.parametrize("payload", [
    {"version": "  ", "size": "1 MB", "url": "https://x.com/a.exe"},
    {"version": "1.0", "size": "1 MB", "url": "ftp://x.com/a.exe"},
    {"version": "1.0", "size": "1 MB", "url": "x.com/a.exe"},
])
def test_post_validation(admin_h, payload):
    r = requests.post(f"{API}/admin/settings/desktop-app", headers=admin_h, json={**payload, "notify": False})
    assert r.status_code == 400


def test_save_no_notify(admin_h, user_h):
    before = len(_desk_notifs(user_h))
    p = {"version": "9.9.1-TEST", "size": "123 MB", "url": "https://example.com/TEST.exe", "notify": False}
    r = requests.post(f"{API}/admin/settings/desktop-app", headers=admin_h, json=p)
    assert r.status_code == 200, r.text
    assert r.json()["notified"] is False
    g = requests.get(f"{API}/settings/desktop-app").json()
    assert g["version"] == "9.9.1-TEST" and g["size"] == "123 MB" and g["url"] == p["url"]
    assert g["updated_at"]
    assert len(_desk_notifs(user_h)) == before


def test_save_with_notify(admin_h, user_h):
    before = _desk_notifs(user_h)
    p = {"version": "9.9.2-TEST", "size": "124 MB", "url": "https://example.com/TEST2.exe", "notify": True}
    r = requests.post(f"{API}/admin/settings/desktop-app", headers=admin_h, json=p)
    assert r.status_code == 200
    assert r.json()["notified"] is True
    after = _desk_notifs(user_h)
    new = [n for n in after if n["id"] not in {b["id"] for b in before}]
    created_notif_ids.extend(n["id"] for n in new)
    assert len(new) == 1
    n = new[0]
    assert "9.9.2-TEST" in n["title"]
    assert n["category"] == "update" and n["cta_link"] == "/profile?tab=desktop" and n["user_id"] is None
    assert n["read"] is False


def test_empty_size_persists_empty(admin_h):
    # size is optional; clearing it should not resurrect the default "99 MB"
    p = {"version": "9.9.3-TEST", "size": "", "url": "https://example.com/TEST3.exe", "notify": False}
    r = requests.post(f"{API}/admin/settings/desktop-app", headers=admin_h, json=p)
    assert r.status_code == 200
    g = requests.get(f"{API}/settings/desktop-app").json()
    assert g["size"] == "", f"size fell back to default: {g['size']}"
