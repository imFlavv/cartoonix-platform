"""Announcements (broadcast notifications) backend tests — Cartoonix."""
import os
import pytest
import requests
from dotenv import dotenv_values

fe = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or fe.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
if not BASE_URL:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")

ADMIN = {"email": "admin@cartoonix.ro", "password": "admin1234"}
USER = {"email": "test@cartoonix.ro", "password": "test1234"}

EXPECTED = {
    "Update de toamnă Cartoonix 🍂": "update",
    "Secțiunea Live TV – în BETA!": "update",
    "Îmbunătățiri de securitate": "sistem",
}


def _login(s, creds):
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text[:300]}"
    d = r.json()
    assert "token" in d and d["token"]
    return d


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_auth(s):
    d = _login(s, ADMIN)
    assert d["user"]["role"] == "admin"
    return {"Authorization": f"Bearer {d['token']}"}


@pytest.fixture(scope="session")
def user_auth(s):
    d = _login(s, USER)
    assert d["user"]["role"] != "admin"
    return {"Authorization": f"Bearer {d['token']}"}


@pytest.fixture(scope="session")
def created_ids(s, admin_auth):
    ids = []
    yield ids
    for i in ids:
        s.delete(f"{BASE_URL}/api/admin/announcements/{i}", headers=admin_auth, timeout=20)


# ---------- GET /api/notifications ----------
def test_notifications_requires_auth(s):
    r = s.get(f"{BASE_URL}/api/notifications", timeout=20)
    assert r.status_code in (401, 403), r.text[:200]


def test_notifications_returns_three_broadcasts(s, user_auth):
    r = s.get(f"{BASE_URL}/api/notifications", headers=user_auth, timeout=20)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert "items" in data and "unread" in data
    bc = [n for n in data["items"] if not n.get("user_id")]
    titles = [n["title"] for n in bc]
    assert len(bc) == 3, f"expected 3 broadcasts, got {len(bc)}: {titles}"
    for t, cat in EXPECTED.items():
        match = next((n for n in bc if n["title"] == t), None)
        assert match is not None, f"missing announcement {t!r}; got {titles}"
        assert match.get("category") == cat, f"{t}: category {match.get('category')} != {cat}"
        assert isinstance(match["id"], str) and len(match["id"]) == 24
        assert match.get("body")
        assert "_id" in match is False or "_id" not in match
    # newest first
    assert bc[0]["title"] == "Update de toamnă Cartoonix 🍂", f"newest is {bc[0]['title']}"
    assert bc == sorted(bc, key=lambda n: n["created_at"], reverse=True)


def test_no_mongo_object_id_leaked(s, user_auth):
    r = s.get(f"{BASE_URL}/api/notifications", headers=user_auth, timeout=20)
    assert all("_id" not in n for n in r.json()["items"])


def test_autumn_announcement_body_and_cta(s, user_auth):
    bc = [n for n in s.get(f"{BASE_URL}/api/notifications", headers=user_auth, timeout=20).json()["items"] if not n.get("user_id")]
    a = next(n for n in bc if n["title"].startswith("Update de toamnă"))
    assert "plus" not in (a.get("cta_link") or "").lower(), f"cta_link={a.get('cta_link')!r} would wrongly show PLUS benefits grid"
    assert "toamn" in a["body"].lower()


# ---------- admin announcements ----------
def test_admin_list_announcements(s, admin_auth):
    r = s.get(f"{BASE_URL}/api/admin/announcements", headers=admin_auth, timeout=20)
    assert r.status_code == 200, r.text[:300]
    items = r.json()["items"]
    assert len(items) == 3
    assert set(EXPECTED) == {i["title"] for i in items}


def test_non_admin_forbidden_list(s, user_auth):
    r = s.get(f"{BASE_URL}/api/admin/announcements", headers=user_auth, timeout=20)
    assert r.status_code == 403, f"expected 403, got {r.status_code}"


def test_non_admin_forbidden_create(s, user_auth):
    r = s.post(f"{BASE_URL}/api/admin/announcements", headers=user_auth,
               json={"title": "TEST_hack", "body": "x", "category": "sistem"}, timeout=20)
    assert r.status_code == 403, f"expected 403, got {r.status_code}"


def test_non_admin_forbidden_delete(s, user_auth, admin_auth):
    c = s.post(f"{BASE_URL}/api/admin/announcements", headers=admin_auth,
               json={"title": "TEST_del_guard", "body": "b", "category": "update"}, timeout=20)
    assert c.status_code == 200, f"create failed {c.status_code}: {c.text[:300]}"
    aid = c.json()["id"]
    r = s.delete(f"{BASE_URL}/api/admin/announcements/{aid}", headers=user_auth, timeout=20)
    assert r.status_code == 403, f"expected 403, got {r.status_code}"
    # cleanup
    assert s.delete(f"{BASE_URL}/api/admin/announcements/{aid}", headers=admin_auth, timeout=20).status_code == 200


def test_create_appears_in_list_and_notifications_then_delete(s, admin_auth, user_auth, created_ids):
    payload = {"title": "TEST_Anunt QA", "body": "Corp anunț QA\nAl doilea paragraf",
               "category": "concurs", "cta_label": "Vezi", "cta_link": "/lobby/rewards"}
    r = s.post(f"{BASE_URL}/api/admin/announcements", headers=admin_auth, json=payload, timeout=20)
    assert r.status_code == 200, r.text[:300]
    d = r.json()
    aid = d["id"]
    created_ids.append(aid)
    assert d["title"] == payload["title"]
    assert d["category"] == "concurs"
    assert d["cta_label"] == "Vezi" and d["cta_link"] == "/lobby/rewards"
    assert "created_at" in d

    # GET admin list verification
    items = s.get(f"{BASE_URL}/api/admin/announcements", headers=admin_auth, timeout=20).json()["items"]
    got = next((i for i in items if i["id"] == aid), None)
    assert got is not None, "created announcement not persisted in admin list"
    assert got["body"] == payload["body"]

    # visible to normal user via /notifications
    ubc = s.get(f"{BASE_URL}/api/notifications", headers=user_auth, timeout=20).json()["items"]
    assert any(i["id"] == aid for i in ubc), "broadcast not visible to normal user"

    # DELETE
    dr = s.delete(f"{BASE_URL}/api/admin/announcements/{aid}", headers=admin_auth, timeout=20)
    assert dr.status_code == 200, dr.text[:200]
    created_ids.remove(aid)
    items2 = s.get(f"{BASE_URL}/api/admin/announcements", headers=admin_auth, timeout=20).json()["items"]
    assert all(i["id"] != aid for i in items2), "announcement still present after delete"


def test_create_invalid_category_falls_back(s, admin_auth, created_ids):
    r = s.post(f"{BASE_URL}/api/admin/announcements", headers=admin_auth,
               json={"title": "TEST_cat", "body": "b", "category": "bogus"}, timeout=20)
    assert r.status_code == 200, r.text[:200]
    aid = r.json()["id"]
    created_ids.append(aid)
    assert r.json()["category"] == "noutate"
    s.delete(f"{BASE_URL}/api/admin/announcements/{aid}", headers=admin_auth, timeout=20)
    created_ids.remove(aid)


def test_create_empty_title_rejected(s, admin_auth):
    r = s.post(f"{BASE_URL}/api/admin/announcements", headers=admin_auth,
               json={"title": "", "body": "b"}, timeout=20)
    assert r.status_code == 422, f"expected 422, got {r.status_code}"


def test_delete_invalid_and_missing_id(s, admin_auth):
    r = s.delete(f"{BASE_URL}/api/admin/announcements/not-an-oid", headers=admin_auth, timeout=20)
    assert r.status_code == 400, r.status_code
    r2 = s.delete(f"{BASE_URL}/api/admin/announcements/507f1f77bcf86cd799439011", headers=admin_auth, timeout=20)
    assert r2.status_code == 404, r2.status_code


def test_final_state_exactly_three(s, admin_auth):
    items = s.get(f"{BASE_URL}/api/admin/announcements", headers=admin_auth, timeout=20).json()["items"]
    assert len(items) == 3, [i["title"] for i in items]
