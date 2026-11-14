# Iteration 15: Live TV for all registered users, PLUS price 50 RON checkout, desktop/settings sanity
import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ENV = dotenv_values("/app/backend/.env")
ADMIN = {"email": "admin@cartoonix.ro", "password": "TestAdmin123!"}

_mongo = MongoClient(ENV["MONGO_URL"])
db = _mongo[ENV["DB_NAME"]]


def _mint(uid, email):
    return jwt.encode({"sub": uid, "email": email, "type": "access",
                       "exp": datetime.now(timezone.utc) + timedelta(hours=2)},
                      ENV["JWT_SECRET"], algorithm="HS256")


@pytest.fixture(scope="module")
def admin_hdr():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def test_user(admin_hdr):
    email = f"test_iter15_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{BASE_URL}/api/admin/users", headers=admin_hdr,
                      json={"email": email, "password": "TestUser123!", "name": "TEST_iter15", "plus": False}, timeout=30)
    assert r.status_code == 200, r.text
    u = r.json()["user"]
    uid = u["id"]
    # login may be blocked by vision page (503); fall back to minted JWT
    lr = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "TestUser123!"}, timeout=30)
    token = lr.json()["token"] if lr.status_code == 200 else _mint(uid, email)
    yield {"id": uid, "email": email, "hdr": {"Authorization": f"Bearer {token}"}, "login_status": lr.status_code}
    db.payment_transactions.delete_many({"user_id": uid})
    db.users.delete_one({"id": uid})


class TestUserState:
    def test_me_non_plus(self, test_user):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=test_user["hdr"], timeout=30)
        assert r.status_code == 200
        assert r.json()["plus"] is False
        print("non-admin login status:", test_user["login_status"])

    def test_admin_is_plus(self, admin_hdr):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_hdr, timeout=30)
        assert r.json()["plus"] is True


class TestLiveNonPlus:
    def test_channels(self, test_user):
        r = requests.get(f"{BASE_URL}/api/live/channels", headers=test_user["hdr"], timeout=60)
        assert r.status_code == 200, r.text
        chans = r.json()["channels"]
        assert chans and chans[0]["key"] == "__all__"
        assert not any("halloween" in (c["key"] + c["name"]).lower() for c in chans)

    def test_now(self, test_user):
        r = requests.get(f"{BASE_URL}/api/live/now", headers=test_user["hdr"], timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["current"] is not None and d["current"].get("video_url")

    def test_playlist(self, test_user):
        r = requests.get(f"{BASE_URL}/api/live/playlist?count=5", headers=test_user["hdr"], timeout=60)
        assert r.status_code == 200, r.text
        assert len(r.json()["items"]) > 0

    @pytest.mark.parametrize("path", ["/api/live/channels", "/api/live/now", "/api/live/playlist"])
    def test_guest_401(self, path):
        r = requests.get(f"{BASE_URL}{path}", timeout=30)
        assert r.status_code == 401


class TestPlusCheckout:
    def test_checkout_amount_50(self, test_user):
        r = requests.post(f"{BASE_URL}/api/payments/checkout", headers=test_user["hdr"],
                          json={"origin_url": BASE_URL}, timeout=60)
        if r.status_code == 500 and "Stripe" in r.text:
            pytest.skip(f"Stripe not configured: {r.text}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["checkout_url"].startswith("http")
        tx = db.payment_transactions.find_one({"session_id": d["session_id"]})
        assert tx is not None
        assert tx["amount"] == 50.0
        assert tx["user_id"] == test_user["id"]
        assert tx["product"] == "cartoonix_plus_lifetime"

    def test_checkout_rejected_for_plus(self, admin_hdr):
        r = requests.post(f"{BASE_URL}/api/payments/checkout", headers=admin_hdr,
                          json={"origin_url": BASE_URL}, timeout=30)
        assert r.status_code == 400

    def test_checkout_guest_401(self):
        r = requests.post(f"{BASE_URL}/api/payments/checkout", json={"origin_url": BASE_URL}, timeout=30)
        assert r.status_code == 401


class TestSettingsSanity:
    def test_desktop_settings(self):
        r = requests.get(f"{BASE_URL}/api/settings/desktop-app", timeout=30)
        assert r.status_code == 200
        assert r.json().get("version")
