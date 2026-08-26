"""Rewards shop + vouchers + admin claims tests (Cartoonix)."""
import os
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or
            open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()).rstrip("/")
ADMIN_EMAIL = "admin@cartoonix.ro"
ADMIN_PASSWORD = "admin1234"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


def _h(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    d = r.json()
    assert d["user"]["role"] == "admin"
    return d["token"]


def _make_user(s, label):
    """Registration is OTP-gated, so seed the user straight into Mongo, then login via API."""
    import bcrypt
    from datetime import datetime, timezone
    from pymongo import MongoClient
    from dotenv import dotenv_values

    env = dotenv_values("/app/backend/.env")
    cli = MongoClient(env["MONGO_URL"])
    db = cli[env["DB_NAME"]]
    email = f"test_rw_{label}_{uuid.uuid4().hex[:8]}@qa-cartoonix.ro"
    uid = str(uuid.uuid4())
    db.users.insert_one({
        "id": uid, "email": email,
        "password_hash": bcrypt.hashpw(b"pass1234", bcrypt.gensalt()).decode(),
        "nickname": f"TEST_{label}", "avatar_url": "", "role": "user", "subscription": "free",
        "email_verified": True, "banned": False, "points": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "pass1234"}, timeout=20)
    assert r.status_code == 200, r.text
    cli.close()
    return {"email": email, "token": r.json()["token"], "id": uid}


@pytest.fixture(scope="session")
def user_a(s):
    return _make_user(s, "a")


@pytest.fixture(scope="session")
def user_b(s):
    return _make_user(s, "b")


def create_voucher(s, admin_token, **kw):
    payload = {"type": "points", "points": 100, "scope": "universal", "max_uses": None, "note": "TEST"}
    payload.update(kw)
    r = s.post(f"{BASE_URL}/api/admin/vouchers", json=payload, headers=_h(admin_token), timeout=20)
    return r


# ---------- GET /api/rewards ----------
def test_rewards_requires_auth(s):
    r = s.get(f"{BASE_URL}/api/rewards")
    assert r.status_code == 401


def test_rewards_payload(s, user_a):
    r = s.get(f"{BASE_URL}/api/rewards", headers=_h(user_a["token"]))
    assert r.status_code == 200, r.text
    d = r.json()
    assert set(["points", "plus", "products", "claims", "claimed_count"]).issubset(d.keys())
    ids = {p["id"]: p for p in d["products"]}
    assert ids["plus_invite"]["cost"] == 500
    assert ids["cinema_ticket"]["cost"] == 400
    assert ids["emag_voucher"]["cost"] == 250
    assert d["plus"] is False
    assert d["claimed_count"] == len(d["claims"])


# ---------- Admin voucher creation validation ----------
def test_admin_voucher_requires_admin(s, user_a):
    r = create_voucher(s, user_a["token"])
    assert r.status_code == 403


def test_create_points_voucher_format(s, admin_token):
    r = create_voucher(s, admin_token, points=100, max_uses=5)
    assert r.status_code == 200, r.text
    v = r.json()["voucher"]
    assert "_id" not in v
    parts = v["code"].split("-")
    assert len(parts) == 3 and all(len(p) == 3 for p in parts), v["code"]
    assert v["type"] == "points" and v["points"] == 100 and v["max_uses"] == 5
    assert v["used_count"] == 0 and v["active"] is True
    # verify it appears in listing
    lst = s.get(f"{BASE_URL}/api/admin/vouchers", headers=_h(admin_token)).json()
    assert any(x["code"] == v["code"] for x in lst)


def test_create_points_voucher_zero_points_rejected(s, admin_token):
    r = create_voucher(s, admin_token, points=0)
    assert r.status_code == 400


def test_create_voucher_bad_type(s, admin_token):
    r = create_voucher(s, admin_token, type="gold")
    assert r.status_code == 400


def test_create_specific_voucher_requires_email(s, admin_token):
    r = create_voucher(s, admin_token, scope="specific", target_email=None)
    assert r.status_code == 400
    r2 = create_voucher(s, admin_token, scope="specific", target_email="nobody_here@nope.test")
    assert r2.status_code == 400


def test_create_specific_voucher_success(s, admin_token, user_a):
    r = create_voucher(s, admin_token, scope="specific", target_email=user_a["email"])
    assert r.status_code == 200, r.text
    v = r.json()["voucher"]
    assert v["scope"] == "specific"
    assert v["target_email"] == user_a["email"].lower()
    assert v["max_uses"] is None


# ---------- redeem-code ----------
def test_redeem_invalid_code(s, user_a):
    r = s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": "AAA-BBB-CCC"}, headers=_h(user_a["token"]))
    assert r.status_code == 400
    assert "invalid" in r.json()["detail"].lower()


def test_redeem_empty_code(s, user_a):
    r = s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": "  "}, headers=_h(user_a["token"]))
    assert r.status_code == 400


def test_redeem_points_voucher_and_reuse_guard(s, admin_token, user_a, user_b):
    code = create_voucher(s, admin_token, points=300, max_uses=2).json()["voucher"]["code"]
    before = s.get(f"{BASE_URL}/api/rewards", headers=_h(user_a["token"])).json()["points"]
    r = s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": code.lower()}, headers=_h(user_a["token"]))
    assert r.status_code == 200, r.text
    assert r.json()["granted"] == {"type": "points", "points": 300}
    after = s.get(f"{BASE_URL}/api/rewards", headers=_h(user_a["token"])).json()["points"]
    assert after == before + 300
    # same user again -> blocked
    r2 = s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": code}, headers=_h(user_a["token"]))
    assert r2.status_code == 400
    assert r2.json()["detail"] == "Ai folosit deja acest cod"
    # second distinct user OK (max_uses=2)
    r3 = s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": code}, headers=_h(user_b["token"]))
    assert r3.status_code == 200, r3.text
    # used_count reflected in admin list
    lst = s.get(f"{BASE_URL}/api/admin/vouchers", headers=_h(admin_token)).json()
    v = next(x for x in lst if x["code"] == code)
    assert v["used_count"] == 2


def test_universal_max_uses_limit(s, admin_token, user_a, user_b):
    code = create_voucher(s, admin_token, points=10, max_uses=1).json()["voucher"]["code"]
    assert s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": code}, headers=_h(user_a["token"])).status_code == 200
    r = s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": code}, headers=_h(user_b["token"]))
    assert r.status_code == 400
    assert "limita" in r.json()["detail"].lower()


def test_specific_voucher_only_target(s, admin_token, user_a, user_b):
    code = create_voucher(s, admin_token, type="plus", scope="specific", target_email=user_a["email"]).json()["voucher"]["code"]
    r = s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": code}, headers=_h(user_b["token"]))
    assert r.status_code == 400, r.text
    assert "destinat" in r.json()["detail"]


def test_plus_voucher_grants_plus(s, admin_token, user_b):
    code = create_voucher(s, admin_token, type="plus", scope="universal", max_uses=1).json()["voucher"]["code"]
    r = s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": code}, headers=_h(user_b["token"]))
    assert r.status_code == 200, r.text
    assert r.json()["granted"]["type"] == "plus"
    assert r.json()["plus"] is True
    me = s.get(f"{BASE_URL}/api/rewards", headers=_h(user_b["token"])).json()
    assert me["plus"] is True


def test_inactive_voucher_rejected(s, admin_token, user_a):
    code = create_voucher(s, admin_token, points=50).json()["voucher"]["code"]
    t = s.post(f"{BASE_URL}/api/admin/vouchers/{code}/toggle", headers=_h(admin_token))
    assert t.status_code == 200 and t.json()["active"] is False
    r = s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": code}, headers=_h(user_a["token"]))
    assert r.status_code == 400
    # toggle back on -> redeemable
    t2 = s.post(f"{BASE_URL}/api/admin/vouchers/{code}/toggle", headers=_h(admin_token))
    assert t2.json()["active"] is True
    assert s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": code}, headers=_h(user_a["token"])).status_code == 200


def test_toggle_unknown_code_404(s, admin_token):
    r = s.post(f"{BASE_URL}/api/admin/vouchers/ZZZ-ZZZ-ZZZ/toggle", headers=_h(admin_token))
    assert r.status_code == 404


# ---------- product redemption ----------
def test_redeem_product_insufficient_points(s, user_b):
    r = s.post(f"{BASE_URL}/api/rewards/redeem", json={"product_id": "cinema_ticket"}, headers=_h(user_b["token"]))
    assert r.status_code == 400
    assert "puncte" in r.json()["detail"].lower()


def test_redeem_unknown_product(s, user_a):
    r = s.post(f"{BASE_URL}/api/rewards/redeem", json={"product_id": "ferrari"}, headers=_h(user_a["token"]))
    assert r.status_code == 404


def test_redeem_manual_product_and_admin_fulfill(s, admin_token, user_a):
    # top up with a voucher
    code = create_voucher(s, admin_token, points=300, max_uses=1).json()["voucher"]["code"]
    s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": code}, headers=_h(user_a["token"]))
    before = s.get(f"{BASE_URL}/api/rewards", headers=_h(user_a["token"])).json()["points"]
    assert before >= 250
    r = s.post(f"{BASE_URL}/api/rewards/redeem", json={"product_id": "emag_voucher"}, headers=_h(user_a["token"]))
    assert r.status_code == 200, r.text
    d = r.json()
    claim = d["claim"]
    assert "_id" not in claim
    assert claim["status"] == "processing" and claim["cost"] == 250 and claim["voucher_code"] is None
    assert d["points"] == before - 250
    # persisted in user rewards
    rw = s.get(f"{BASE_URL}/api/rewards", headers=_h(user_a["token"])).json()
    assert rw["points"] == before - 250
    assert any(c["id"] == claim["id"] and c["status"] == "processing" for c in rw["claims"])
    # admin claim list + fulfill
    claims = s.get(f"{BASE_URL}/api/admin/reward-claims", headers=_h(admin_token)).json()
    assert any(c["id"] == claim["id"] for c in claims)
    up = s.post(f"{BASE_URL}/api/admin/reward-claims/{claim['id']}/status", json={"status": "fulfilled"}, headers=_h(admin_token))
    assert up.status_code == 200 and up.json()["status"] == "fulfilled"
    claims2 = s.get(f"{BASE_URL}/api/admin/reward-claims", headers=_h(admin_token)).json()
    c2 = next(c for c in claims2 if c["id"] == claim["id"])
    assert c2["status"] == "fulfilled" and c2.get("fulfilled_at")


def test_redeem_plus_invite_generates_voucher(s, admin_token, user_a):
    code = create_voucher(s, admin_token, points=600, max_uses=1).json()["voucher"]["code"]
    s.post(f"{BASE_URL}/api/rewards/redeem-code", json={"code": code}, headers=_h(user_a["token"]))
    before = s.get(f"{BASE_URL}/api/rewards", headers=_h(user_a["token"])).json()["points"]
    assert before >= 500
    r = s.post(f"{BASE_URL}/api/rewards/redeem", json={"product_id": "plus_invite"}, headers=_h(user_a["token"]))
    assert r.status_code == 200, r.text
    claim = r.json()["claim"]
    assert claim["status"] == "fulfilled"
    gift = claim["voucher_code"]
    assert gift and len(gift.split("-")) == 3
    assert r.json()["points"] == before - 500
    # the generated voucher exists, is plus type, max_uses 1
    lst = s.get(f"{BASE_URL}/api/admin/vouchers", headers=_h(admin_token)).json()
    v = next(x for x in lst if x["code"] == gift)
    assert v["type"] == "plus" and v["max_uses"] == 1 and v["source"] == "reward"


def test_claim_status_invalid_and_404(s, admin_token):
    r = s.post(f"{BASE_URL}/api/admin/reward-claims/000000000000000000000000/status", json={"status": "fulfilled"}, headers=_h(admin_token))
    assert r.status_code == 404
    claims = s.get(f"{BASE_URL}/api/admin/reward-claims", headers=_h(admin_token)).json()
    if claims:
        r2 = s.post(f"{BASE_URL}/api/admin/reward-claims/{claims[0]['id']}/status", json={"status": "bogus"}, headers=_h(admin_token))
        assert r2.status_code == 400


def test_admin_endpoints_require_admin(s, user_a):
    t = _h(user_a["token"])
    assert s.get(f"{BASE_URL}/api/admin/vouchers", headers=t).status_code == 403
    assert s.get(f"{BASE_URL}/api/admin/reward-claims", headers=t).status_code == 403
