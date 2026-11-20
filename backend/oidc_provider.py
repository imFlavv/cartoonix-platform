"""OpenID Connect provider for external first-party clients (Cartoonix Land).

Authorization Code + PKCE (S256) only. Signing: RS256 via PyJWT + cryptography.
The user authenticates only on the Cartoonix.ro SPA; the SPA calls /authorize/approve
with the existing app Bearer token, and the client backend exchanges the code at /token.
"""
import base64
import hashlib
import hmac
import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable, Optional
from urllib.parse import unquote_plus, urlencode, urlparse

import bcrypt
import jwt
from cryptography.hazmat.primitives import serialization
from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

logger = logging.getLogger(__name__)

CODE_TTL = timedelta(seconds=60)
ACCESS_TOKEN_TTL = timedelta(minutes=5)
ID_TOKEN_TTL = timedelta(minutes=5)
SUPPORTED_SCOPES = {"openid", "profile"}
VERIFIER_RE = re.compile(r"^[A-Za-z0-9\-._~]{43,128}$")
CHALLENGE_RE = re.compile(r"^[A-Za-z0-9\-_]{43}$")
MAX_PARAM_LEN = 512
NO_STORE = {"Cache-Control": "no-store", "Pragma": "no-cache"}


class OIDCConfig:
    """Loaded from env. If incomplete, the provider stays disabled (503) without affecting the site."""

    def __init__(self):
        self.issuer = (os.environ.get("OIDC_ISSUER") or "").rstrip("/")
        self.frontend_authorize_url = os.environ.get("OIDC_FRONTEND_AUTHORIZE_URL") or ""
        self.kid = os.environ.get("OIDC_SIGNING_KEY_ID") or ""
        self.private_key = None
        self.public_keys = []  # [(kid, public_key)]
        self.error = ""
        key_path = os.environ.get("OIDC_SIGNING_KEY_PATH") or ""
        if not (self.issuer and self.frontend_authorize_url and self.kid and key_path):
            self.error = "OIDC_ISSUER / OIDC_FRONTEND_AUTHORIZE_URL / OIDC_SIGNING_KEY_ID / OIDC_SIGNING_KEY_PATH not set"
            return
        try:
            with open(key_path, "rb") as fh:
                self.private_key = serialization.load_pem_private_key(fh.read(), password=None)
            self.public_keys.append((self.kid, self.private_key.public_key()))
            # Optional previously-used public keys kept in JWKS during rotation: "kid=/path.pem,kid2=/path2.pem"
            for item in filter(None, (os.environ.get("OIDC_PREVIOUS_PUBLIC_KEYS") or "").split(",")):
                old_kid, _, path = item.strip().partition("=")
                with open(path, "rb") as fh:
                    self.public_keys.append((old_kid, serialization.load_pem_public_key(fh.read())))
        except Exception as e:  # noqa: BLE001
            self.private_key = None
            self.error = f"cannot load OIDC signing key: {type(e).__name__}"

    @property
    def enabled(self) -> bool:
        return self.private_key is not None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def s256_challenge(verifier: str) -> str:
    return _b64url(hashlib.sha256(verifier.encode("ascii")).digest())


def _as_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_valid_redirect_uri(uri: str) -> bool:
    """Registration-time rule: absolute https (http only for localhost), no fragment, no wildcard."""
    try:
        p = urlparse(uri)
    except ValueError:
        return False
    if "*" in uri or p.fragment or not p.netloc or p.username or p.password:
        return False
    if p.scheme == "https":
        return True
    return p.scheme == "http" and p.hostname in ("localhost", "127.0.0.1")


def hash_client_secret(secret: str) -> str:
    return bcrypt.hashpw(secret.encode(), bcrypt.gensalt()).decode()


def generate_client_secret() -> str:
    return secrets.token_urlsafe(48)


def _oauth_error(error: str, description: str = "", status: int = 400, headers: Optional[dict] = None):
    body = {"error": error}
    if description:
        body["error_description"] = description
    return JSONResponse(body, status_code=status, headers={**NO_STORE, **(headers or {})})


def _parse_basic(header: Optional[str]):
    if not header or not header.lower().startswith("basic "):
        return None
    try:
        raw = base64.b64decode(header[6:].strip(), validate=True).decode()
    except Exception:  # noqa: BLE001
        return None
    if ":" not in raw:
        return None
    cid, secret = raw.split(":", 1)
    return unquote_plus(cid), unquote_plus(secret)


def create_oidc_router(
    db,
    find_user_by_id: Callable[[str], Awaitable[Optional[dict]]],
    uid_of: Callable[[dict], str],
    user_name: Callable[[dict], str],
    resolve_app_user: Callable[[Optional[str]], Awaitable[dict]],
) -> APIRouter:
    cfg = OIDCConfig()
    if not cfg.enabled:
        logger.warning("OIDC provider disabled: %s", cfg.error)
    router = APIRouter(prefix="/api/oidc")

    def require_enabled():
        if not cfg.enabled:
            raise HTTPException(status_code=503, detail="OIDC provider not configured")

    def user_is_active(user: Optional[dict]) -> bool:
        return bool(user) and not user.get("banned") and user.get("status", "active") not in ("pending", "rejected")

    async def get_client(client_id: str) -> Optional[dict]:
        if not client_id or len(client_id) > MAX_PARAM_LEN:
            return None
        return await db.oidc_clients.find_one({"client_id": client_id, "disabled": {"$ne": True}})

    async def validate_client_and_redirect(params: dict) -> Optional[dict]:
        """Returns the client only if client_id is known AND redirect_uri matches a registered one exactly."""
        client = await get_client(params.get("client_id") or "")
        redirect_uri = params.get("redirect_uri") or ""
        if not client or not any(hmac.compare_digest(redirect_uri, r) for r in client.get("redirect_uris", [])):
            return None
        return client

    def validate_request_params(params: dict) -> Optional[tuple]:
        """Returns (error, description) for errors safe to report back to the validated redirect_uri."""
        for k, v in params.items():
            if isinstance(v, str) and len(v) > MAX_PARAM_LEN:
                return "invalid_request", f"{k} too long"
        if params.get("response_type") != "code":
            return "unsupported_response_type", "only response_type=code is supported"
        scopes = (params.get("scope") or "").split()
        if "openid" not in scopes:
            return "invalid_scope", "scope must include openid"
        if any(s not in SUPPORTED_SCOPES for s in scopes):
            return "invalid_scope", "supported scopes: openid profile"
        if not params.get("state"):
            return "invalid_request", "state is required"
        if not params.get("nonce"):
            return "invalid_request", "nonce is required"
        if params.get("code_challenge_method") != "S256":
            return "invalid_request", "code_challenge_method must be S256"
        if not CHALLENGE_RE.match(params.get("code_challenge") or ""):
            return "invalid_request", "code_challenge must be a base64url SHA-256 value"
        if "none" in (params.get("prompt") or "").split():
            return "interaction_required", "user consent is always required"
        return None

    def error_redirect(redirect_uri: str, error: str, description: str, state: str) -> str:
        q = {"error": error, "error_description": description, "iss": cfg.issuer}
        if state:
            q["state"] = state
        sep = "&" if urlparse(redirect_uri).query else "?"
        return f"{redirect_uri}{sep}{urlencode(q)}"

    async def checked_request(params: dict):
        """Full validation for SPA calls. Raises 400 without a redirect if client/redirect_uri are bad."""
        require_enabled()
        client = await validate_client_and_redirect(params)
        if not client:
            raise HTTPException(status_code=400, detail={"error": "invalid_client_or_redirect_uri"})
        err = validate_request_params(params)
        if err:
            raise HTTPException(status_code=400, detail={
                "error": err[0],
                "redirect_url": error_redirect(params["redirect_uri"], err[0], err[1], params.get("state") or ""),
            })
        return client

    def pick(body: dict) -> dict:
        keys = ("response_type", "client_id", "redirect_uri", "scope", "state", "nonce",
                "code_challenge", "code_challenge_method", "prompt")
        return {k: str(body[k]) for k in keys if body.get(k) is not None}

    @router.get("/.well-known/openid-configuration")
    async def discovery():
        require_enabled()
        iss = cfg.issuer
        return JSONResponse({
            "issuer": iss,
            "authorization_endpoint": f"{iss}/authorize",
            "token_endpoint": f"{iss}/token",
            "userinfo_endpoint": f"{iss}/userinfo",
            "jwks_uri": f"{iss}/jwks.json",
            "response_types_supported": ["code"],
            "response_modes_supported": ["query"],
            "grant_types_supported": ["authorization_code"],
            "subject_types_supported": ["public"],
            "id_token_signing_alg_values_supported": ["RS256"],
            "scopes_supported": sorted(SUPPORTED_SCOPES),
            "claims_supported": ["iss", "sub", "aud", "exp", "iat", "nonce", "name"],
            "code_challenge_methods_supported": ["S256"],
            "token_endpoint_auth_methods_supported": ["client_secret_basic"],
            "authorization_response_iss_parameter_supported": True,
            "request_parameter_supported": False,
            "claims_parameter_supported": False,
        }, headers={"Cache-Control": "public, max-age=3600"})

    @router.get("/jwks.json")
    async def jwks():
        require_enabled()
        keys = []
        for kid, pub in cfg.public_keys:
            n = pub.public_numbers()
            keys.append({
                "kty": "RSA", "use": "sig", "alg": "RS256", "kid": kid,
                "n": _b64url(n.n.to_bytes((n.n.bit_length() + 7) // 8, "big")),
                "e": _b64url(n.e.to_bytes((n.e.bit_length() + 7) // 8, "big")),
            })
        return JSONResponse({"keys": keys}, headers={"Cache-Control": "public, max-age=900"})

    @router.get("/authorize")
    async def authorize(request: Request):
        """Browser entry point. Validates, then hands off to the SPA consent page."""
        require_enabled()
        params = dict(request.query_params)
        client = await validate_client_and_redirect(params)
        if not client:
            return HTMLResponse(
                "<h1>Cerere invalidă</h1><p>Aplicația sau adresa de întoarcere nu este înregistrată.</p>",
                status_code=400,
            )
        err = validate_request_params(params)
        if err:
            return RedirectResponse(error_redirect(params["redirect_uri"], err[0], err[1], params.get("state") or ""), 302)
        return RedirectResponse(f"{cfg.frontend_authorize_url}?{urlencode(pick(params))}", 302)

    @router.post("/authorize/details")
    async def authorize_details(request: Request):
        params = pick(await request.json())
        client = await checked_request(params)
        return {
            "client_name": client.get("name") or client["client_id"],
            "scopes": params["scope"].split(),
            "redirect_host": urlparse(params["redirect_uri"]).hostname,
        }

    @router.post("/authorize/approve")
    async def authorize_approve(request: Request, authorization: Optional[str] = Header(None)):
        params = pick(await request.json())
        client = await checked_request(params)
        user = await resolve_app_user(authorization)
        if not user_is_active(user):
            raise HTTPException(status_code=403, detail="Contul nu este activ")
        code = secrets.token_urlsafe(48)
        now = _now()
        await db.oidc_codes.insert_one({
            "code_hash": _sha256(code),
            "client_id": client["client_id"],
            "redirect_uri": params["redirect_uri"],
            "user_id": uid_of(user),
            "scope": params["scope"],
            "nonce": params["nonce"],
            "code_challenge": params["code_challenge"],
            "created_at": now,
            "used_at": None,
            "expires_at": now + CODE_TTL,
        })
        logger.info("OIDC code issued client=%s user=%s", client["client_id"], uid_of(user))
        sep = "&" if urlparse(params["redirect_uri"]).query else "?"
        query = urlencode({"code": code, "state": params["state"], "iss": cfg.issuer})
        return JSONResponse({"redirect_url": f"{params['redirect_uri']}{sep}{query}"}, headers=NO_STORE)

    @router.post("/authorize/deny")
    async def authorize_deny(request: Request):
        params = pick(await request.json())
        await checked_request(params)
        return {"redirect_url": error_redirect(params["redirect_uri"], "access_denied", "user denied access", params["state"])}

    @router.post("/token")
    async def token(request: Request, authorization: Optional[str] = Header(None)):
        if not cfg.enabled:
            return _oauth_error("temporarily_unavailable", status=503)
        creds = _parse_basic(authorization)
        if not creds:
            return _oauth_error("invalid_client", "client_secret_basic required", 401, {"WWW-Authenticate": 'Basic realm="oidc"'})
        client_id, client_secret = creds
        client = await get_client(client_id)
        hashed = (client or {}).get("client_secret_hash") or ""
        if not client or not hashed or not bcrypt.checkpw(client_secret.encode(), hashed.encode()):
            return _oauth_error("invalid_client", "client authentication failed", 401, {"WWW-Authenticate": 'Basic realm="oidc"'})
        form = await request.form()
        if form.get("grant_type") != "authorization_code":
            return _oauth_error("unsupported_grant_type")
        code = str(form.get("code") or "")
        redirect_uri = str(form.get("redirect_uri") or "")
        verifier = str(form.get("code_verifier") or "")
        if not code or not redirect_uri or not VERIFIER_RE.match(verifier):
            return _oauth_error("invalid_request", "code, redirect_uri and a valid code_verifier are required")
        # Atomic consume: a code can be exchanged at most once, even under concurrent requests.
        rec = await db.oidc_codes.find_one_and_update(
            {"code_hash": _sha256(code), "used_at": None},
            {"$set": {"used_at": _now()}},
        )
        if rec is None and await db.oidc_codes.find_one({"code_hash": _sha256(code)}, {"_id": 1}):
            logger.warning("OIDC code replay attempt client=%s", client["client_id"])
        if (
            not rec
            or _as_utc(rec["expires_at"]) <= _now()
            or not hmac.compare_digest(rec["client_id"], client["client_id"])
            or not hmac.compare_digest(rec["redirect_uri"], redirect_uri)
            or not hmac.compare_digest(s256_challenge(verifier), rec["code_challenge"])
        ):
            return _oauth_error("invalid_grant", "authorization code is invalid, expired or already used")
        user = await find_user_by_id(rec["user_id"])
        if not user_is_active(user):
            return _oauth_error("invalid_grant", "account is not active")
        now = _now()
        sub = uid_of(user)
        claims = {
            "iss": cfg.issuer, "sub": sub, "aud": client["client_id"],
            "iat": int(now.timestamp()), "exp": int((now + ID_TOKEN_TTL).timestamp()),
            "nonce": rec["nonce"],
        }
        name = user_name(user) if "profile" in rec["scope"].split() else ""
        if name:
            claims["name"] = name
        id_token = jwt.encode(claims, cfg.private_key, algorithm="RS256", headers={"kid": cfg.kid, "typ": "JWT"})
        access_token = secrets.token_urlsafe(48)
        await db.oidc_access_tokens.insert_one({
            "token_hash": _sha256(access_token), "client_id": client["client_id"], "user_id": sub,
            "scope": rec["scope"], "created_at": now, "expires_at": now + ACCESS_TOKEN_TTL,
        })
        logger.info("OIDC token issued client=%s user=%s", client["client_id"], sub)
        return JSONResponse({
            "access_token": access_token, "token_type": "Bearer",
            "expires_in": int(ACCESS_TOKEN_TTL.total_seconds()),
            "id_token": id_token, "scope": rec["scope"],
        }, headers=NO_STORE)

    async def _userinfo(authorization: Optional[str]):
        require_enabled()
        unauthorized = JSONResponse({"error": "invalid_token"}, status_code=401,
                                    headers={"WWW-Authenticate": 'Bearer error="invalid_token"', **NO_STORE})
        if not authorization or not authorization.lower().startswith("bearer "):
            return unauthorized
        rec = await db.oidc_access_tokens.find_one({"token_hash": _sha256(authorization[7:].strip())})
        if not rec or _as_utc(rec["expires_at"]) <= _now():
            return unauthorized
        user = await find_user_by_id(rec["user_id"])
        if not user_is_active(user):
            return unauthorized
        body = {"sub": uid_of(user)}
        name = user_name(user) if "profile" in rec["scope"].split() else ""
        if name:
            body["name"] = name
        return JSONResponse(body, headers=NO_STORE)

    @router.get("/userinfo")
    async def userinfo_get(authorization: Optional[str] = Header(None)):
        return await _userinfo(authorization)

    @router.post("/userinfo")
    async def userinfo_post(authorization: Optional[str] = Header(None)):
        return await _userinfo(authorization)

    return router


async def ensure_oidc_indexes(db):
    await db.oidc_clients.create_index("client_id", unique=True)
    await db.oidc_codes.create_index("code_hash", unique=True)
    await db.oidc_codes.create_index("expires_at", expireAfterSeconds=0)
    await db.oidc_access_tokens.create_index("token_hash", unique=True)
    await db.oidc_access_tokens.create_index("expires_at", expireAfterSeconds=0)
