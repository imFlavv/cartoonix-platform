# OIDC provider (Cartoonix Land): Authorization Code + PKCE S256, against the running backend.
# Creates TEST_ users/clients directly in Mongo and removes only those at the end.
import base64, hashlib, os, re, secrets, subprocess, sys, threading, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import bcrypt, jwt, pytest, requests
from dotenv import load_dotenv, dotenv_values
from pymongo import MongoClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values(BACKEND_DIR.parent / "frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
API = f"{BASE_URL}/api"
OIDC = f"{API}/oidc"
ISSUER = os.environ["OIDC_ISSUER"]
REDIRECT = "https://game.test.invalid/auth/cartoonix/callback"
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
sys.path.insert(0, str(BACKEND_DIR))
from oidc_provider import hash_client_secret  # noqa: E402

TAG = uuid.uuid4().hex[:8]
CLIENT_ID = f"TEST_land_{TAG}"
OTHER_CLIENT_ID = f"TEST_other_{TAG}"
created_users = []


def pkce_pair():
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


def make_user(**extra):
    uid = str(uuid.uuid4())
    email = f"test_oidc_{uuid.uuid4().hex[:8]}@example.com"
    pw = "TestPass123!"
    db.users.insert_one({"id": uid, "email": email, "nickname": f"Jucător {uid[:4]}", "role": "user", "status": "active",
                         "password_hash": bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode(),
                         "created_at": datetime.now(timezone.utc).isoformat(), **extra})
    created_users.append(uid)
    return uid, email, pw


def login(email, pw, **extra):
    return requests.post(f"{API}/auth/login", json={"email": email, "password": pw, **extra})


def auth_params(challenge, **over):
    p = {"response_type": "code", "client_id": CLIENT_ID, "redirect_uri": REDIRECT, "scope": "openid profile",
         "state": secrets.token_urlsafe(16), "nonce": secrets.token_urlsafe(16),
         "code_challenge": challenge, "code_challenge_method": "S256"}
    p.update(over)
    return p


def approve(token, params):
    return requests.post(f"{OIDC}/authorize/approve", json=params, headers={"Authorization": f"Bearer {token}"})


def code_from(redirect_url):
    q = parse_qs(urlparse(redirect_url).query)
    return q["code"][0], q


def exchange(code, verifier, client=None, redirect_uri=REDIRECT):
    cid, sec = client or (CLIENT_ID, pytest.client_secret)
    return requests.post(f"{OIDC}/token", auth=(cid, sec),
                         data={"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri, "code_verifier": verifier})


@pytest.fixture(scope="module", autouse=True)
def setup():
    out = subprocess.run([sys.executable, "scripts/oidc_clients.py", "create", "--client-id", CLIENT_ID, "--name", "Cartoonix Land",
                          "--redirect-uri", REDIRECT], cwd=BACKEND_DIR, capture_output=True, text=True, check=True).stdout
    pytest.client_secret = re.search(r"client_secret=(\S+)", out).group(1)
    pytest.other_secret = secrets.token_urlsafe(32)
    db.oidc_clients.insert_one({"client_id": OTHER_CLIENT_ID, "name": "Other", "redirect_uris": [REDIRECT],
                                "client_secret_hash": hash_client_secret(pytest.other_secret), "disabled": False})
    uid, email, pw = make_user()
    r = login(email, pw)
    assert r.status_code == 200, r.text
    pytest.user = {"id": uid, "email": email, "pw": pw, "token": r.json()["token"]}
    yield
    db.settings.update_one({"key": "maintenance"}, {"$set": {"enabled": False}})
    db.oidc_codes.delete_many({"client_id": {"$in": [CLIENT_ID, OTHER_CLIENT_ID]}})
    db.oidc_access_tokens.delete_many({"client_id": {"$in": [CLIENT_ID, OTHER_CLIENT_ID]}})
    db.oidc_clients.delete_many({"client_id": {"$in": [CLIENT_ID, OTHER_CLIENT_ID]}})
    db.users.delete_many({"id": {"$in": created_users}})


def full_flow(token=None, scope="openid profile"):
    verifier, challenge = pkce_pair()
    params = auth_params(challenge, scope=scope)
    r = approve(token or pytest.user["token"], params)
    assert r.status_code == 200, r.text
    code, q = code_from(r.json()["redirect_url"])
    return verifier, params, code, q


# ---------- discovery / jwks ----------
def test_discovery():
    d = requests.get(f"{OIDC}/.well-known/openid-configuration").json()
    assert d["issuer"] == ISSUER
    assert d["authorization_endpoint"] == f"{ISSUER}/authorize" and d["token_endpoint"] == f"{ISSUER}/token"
    assert d["jwks_uri"] == f"{ISSUER}/jwks.json" and d["userinfo_endpoint"] == f"{ISSUER}/userinfo"
    assert d["response_types_supported"] == ["code"] and d["code_challenge_methods_supported"] == ["S256"]
    assert d["id_token_signing_alg_values_supported"] == ["RS256"]
    assert d["token_endpoint_auth_methods_supported"] == ["client_secret_basic"]


def test_jwks_has_only_public_rsa():
    keys = requests.get(f"{OIDC}/jwks.json").json()["keys"]
    assert keys and all(k["kty"] == "RSA" and k["alg"] == "RS256" and k["kid"] for k in keys)
    assert all("d" not in k and "p" not in k for k in keys)


# ---------- /authorize validation ----------
def test_authorize_unknown_client_does_not_redirect():
    _, ch = pkce_pair()
    r = requests.get(f"{OIDC}/authorize", params=auth_params(ch, client_id="nope"), allow_redirects=False)
    assert r.status_code == 400 and "location" not in r.headers


@pytest.mark.parametrize("bad", [REDIRECT + "/", REDIRECT + "?x=1", REDIRECT.upper(), "https://evil.example/cb", REDIRECT.replace("https", "http")])
def test_authorize_redirect_uri_exact_match(bad):
    _, ch = pkce_pair()
    r = requests.get(f"{OIDC}/authorize", params=auth_params(ch, redirect_uri=bad), allow_redirects=False)
    assert r.status_code == 400 and "location" not in r.headers


@pytest.mark.parametrize("over,err", [({"code_challenge_method": "plain"}, "invalid_request"), ({"nonce": ""}, "invalid_request"),
                                      ({"state": ""}, "invalid_request"), ({"scope": "profile"}, "invalid_scope"),
                                      ({"scope": "openid email"}, "invalid_scope"), ({"response_type": "token"}, "unsupported_response_type"),
                                      ({"code_challenge": "short"}, "invalid_request"), ({"prompt": "none"}, "interaction_required")])
def test_authorize_param_errors_redirect_back(over, err):
    _, ch = pkce_pair()
    p = auth_params(ch, **over)
    r = requests.get(f"{OIDC}/authorize", params=p, allow_redirects=False)
    assert r.status_code == 302
    loc = r.headers["location"]
    assert loc.startswith(REDIRECT + "?")
    q = parse_qs(urlparse(loc).query)
    assert q["error"] == [err] and q["iss"] == [ISSUER]
    if p["state"]:
        assert q["state"] == [p["state"]]


def test_authorize_valid_hands_off_to_spa():
    _, ch = pkce_pair()
    p = auth_params(ch)
    r = requests.get(f"{OIDC}/authorize", params=p, allow_redirects=False)
    assert r.status_code == 302
    loc = urlparse(r.headers["location"])
    assert f"{loc.scheme}://{loc.netloc}{loc.path}" == os.environ["OIDC_FRONTEND_AUTHORIZE_URL"]
    assert {k: v[0] for k, v in parse_qs(loc.query).items()} == p


def test_details_returns_client_name_only():
    _, ch = pkce_pair()
    r = requests.post(f"{OIDC}/authorize/details", json=auth_params(ch))
    assert r.status_code == 200
    assert r.json() == {"client_name": "Cartoonix Land", "scopes": ["openid", "profile"], "redirect_host": "game.test.invalid"}


def test_approve_requires_login():
    _, ch = pkce_pair()
    assert requests.post(f"{OIDC}/authorize/approve", json=auth_params(ch)).status_code == 401
    assert approve("garbage", auth_params(ch)).status_code == 401


def test_deny_returns_access_denied_with_state():
    _, ch = pkce_pair()
    p = auth_params(ch)
    r = requests.post(f"{OIDC}/authorize/deny", json=p)
    q = parse_qs(urlparse(r.json()["redirect_url"]).query)
    assert q["error"] == ["access_denied"] and q["state"] == [p["state"]] and "code" not in q


# ---------- code + token ----------
def test_full_flow_id_token_and_userinfo():
    verifier, params, code, q = full_flow()
    assert q["state"] == [params["state"]] and q["iss"] == [ISSUER]
    stored = db.oidc_codes.find_one({"client_id": CLIENT_ID, "used_at": None}, sort=[("created_at", -1)])
    assert stored and "code" not in stored  # only the hash is stored
    ttl = stored["expires_at"] - stored["created_at"]
    assert ttl <= timedelta(seconds=60)
    r = exchange(code, verifier)
    assert r.status_code == 200, r.text
    assert "no-store" in r.headers.get("cache-control", "")
    body = r.json()
    assert set(body) == {"access_token", "token_type", "expires_in", "id_token", "scope"}
    jwks_client = jwt.PyJWKClient(f"{OIDC}/jwks.json", headers={"User-Agent": "cartoonix-land-tests/1.0"})
    signing_key = jwks_client.get_signing_key_from_jwt(body["id_token"])
    claims = jwt.decode(body["id_token"], signing_key.key, algorithms=["RS256"], audience=CLIENT_ID, issuer=ISSUER)
    assert claims["sub"] == pytest.user["id"] and claims["nonce"] == params["nonce"]
    assert claims["name"].startswith("Jucător")
    assert set(claims) <= {"iss", "sub", "aud", "exp", "iat", "nonce", "name"}
    ui = requests.get(f"{OIDC}/userinfo", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert ui.status_code == 200 and ui.json() == {"sub": claims["sub"], "name": claims["name"]}


def test_sub_is_stable_across_logins():
    subs = []
    for _ in range(2):
        v, _, code, _ = full_flow()
        tok = exchange(code, v).json()["id_token"]
        subs.append(jwt.decode(tok, options={"verify_signature": False})["sub"])
    assert subs[0] == subs[1] == pytest.user["id"]


def test_openid_only_scope_omits_name():
    v, _, code, _ = full_flow(scope="openid")
    tok = exchange(code, v).json()["id_token"]
    assert "name" not in jwt.decode(tok, options={"verify_signature": False})


def test_code_is_single_use():
    v, _, code, _ = full_flow()
    assert exchange(code, v).status_code == 200
    r = exchange(code, v)
    assert r.status_code == 400 and r.json()["error"] == "invalid_grant"


def test_concurrent_exchange_only_one_succeeds():
    v, _, code, _ = full_flow()
    results = []
    threads = [threading.Thread(target=lambda: results.append(exchange(code, v).status_code)) for _ in range(5)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert sorted(results) == [200, 400, 400, 400, 400]


def test_wrong_verifier_burns_code():
    v, _, code, _ = full_flow()
    other, _ = pkce_pair()
    assert exchange(code, other).json()["error"] == "invalid_grant"
    assert exchange(code, v).json()["error"] == "invalid_grant"


def test_redirect_uri_must_match_at_token():
    v, _, code, _ = full_flow()
    assert exchange(code, v, redirect_uri=REDIRECT + "/").json()["error"] == "invalid_grant"


def test_code_bound_to_client():
    v, _, code, _ = full_flow()
    r = exchange(code, v, client=(OTHER_CLIENT_ID, pytest.other_secret))
    assert r.status_code == 400 and r.json()["error"] == "invalid_grant"


def test_expired_code_rejected():
    v, _, code, _ = full_flow()
    db.oidc_codes.update_one({"code_hash": hashlib.sha256(code.encode()).hexdigest()},
                             {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)}})
    assert exchange(code, v).json()["error"] == "invalid_grant"


def test_client_auth_required():
    v, _, code, _ = full_flow()
    assert exchange(code, v, client=(CLIENT_ID, "wrong")).status_code == 401
    r = requests.post(f"{OIDC}/token", data={"grant_type": "authorization_code", "code": code, "redirect_uri": REDIRECT,
                                             "code_verifier": v, "client_id": CLIENT_ID, "client_secret": pytest.client_secret})
    assert r.status_code == 401 and r.json()["error"] == "invalid_client"
    assert exchange(code, v).status_code == 200  # failed client auth did not consume the code


def test_unsupported_grant_type():
    r = requests.post(f"{OIDC}/token", auth=(CLIENT_ID, pytest.client_secret), data={"grant_type": "password"})
    assert r.status_code == 400 and r.json()["error"] == "unsupported_grant_type"


def test_userinfo_rejects_bad_token():
    assert requests.get(f"{OIDC}/userinfo").status_code == 401
    assert requests.get(f"{OIDC}/userinfo", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_disabled_client_rejected():
    db.oidc_clients.update_one({"client_id": OTHER_CLIENT_ID}, {"$set": {"disabled": True}})
    _, ch = pkce_pair()
    r = requests.get(f"{OIDC}/authorize", params=auth_params(ch, client_id=OTHER_CLIENT_ID), allow_redirects=False)
    assert r.status_code == 400
    db.oidc_clients.update_one({"client_id": OTHER_CLIENT_ID}, {"$set": {"disabled": False}})


# ---------- account state ----------
def test_banned_user_cannot_approve_or_exchange():
    uid, email, pw = make_user()
    token = login(email, pw).json()["token"]
    v, _, code, _ = full_flow(token)
    db.users.update_one({"id": uid}, {"$set": {"banned": True}})
    assert exchange(code, v).json()["error"] == "invalid_grant"
    _, ch = pkce_pair()
    assert approve(token, auth_params(ch)).status_code in (401, 403)


def test_pending_user_cannot_approve():
    uid, email, pw = make_user()
    token = login(email, pw).json()["token"]
    db.users.update_one({"id": uid}, {"$set": {"status": "pending"}})
    _, ch = pkce_pair()
    assert approve(token, auth_params(ch)).status_code == 403


# ---------- existing login unaffected + site closed ----------
def test_existing_login_and_me_still_work():
    r = login(pytest.user["email"], pytest.user["pw"])
    assert r.status_code == 200 and "token" in r.json()
    assert requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {r.json()['token']}"}).status_code == 200


def test_site_closed_oidc_login_only_for_consent():
    db.settings.update_one({"key": "maintenance"}, {"$set": {"key": "maintenance", "enabled": True}}, upsert=True)
    try:
        assert login(pytest.user["email"], pytest.user["pw"]).status_code == 503
        r = login(pytest.user["email"], pytest.user["pw"], purpose="oidc")
        assert r.status_code == 200 and set(r.json()) == {"oidc_token", "name"}
        oidc_token = r.json()["oidc_token"]
        assert requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {oidc_token}"}).status_code == 401
        v, _, code, _ = full_flow(oidc_token)
        assert exchange(code, v).status_code == 200
    finally:
        db.settings.update_one({"key": "maintenance"}, {"$set": {"enabled": False}})
