"""Auth utilities: JWT, password hashing."""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_change_me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "168"))

bearer_scheme = HTTPBearer(auto_error=False)

# In-process throttle for last_active updates to avoid hammering Mongo on
# every API call. Keyed by user_id -> last update epoch (seconds).
_LAST_ACTIVE_THROTTLE: dict[str, float] = {}
_LAST_ACTIVE_TTL_SECONDS = 60  # update at most once per minute per user


def _client_ip_from_request(request: Optional[Request]) -> str:
    if request is None:
        return ""
    fwd = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
    if fwd:
        return fwd.split(",")[0].strip()
    client = request.client
    return client.host if client else ""


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, role: str = "user") -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


async def get_db():
    # imported lazily to avoid circular
    from server import db
    return db


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db=Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("banned"):
        raise HTTPException(
            status_code=403,
            detail="Contul tău a fost suspendat. Contactează suportul.",
        )

    # Throttled activity tracking
    ip = _client_ip_from_request(request)
    now_ts = datetime.now(timezone.utc).timestamp()
    last_ts = _LAST_ACTIVE_THROTTLE.get(user_id, 0)
    if now_ts - last_ts > _LAST_ACTIVE_TTL_SECONDS:
        _LAST_ACTIVE_THROTTLE[user_id] = now_ts
        try:
            await db.users.update_one(
                {"id": user_id},
                {
                    "$set": {
                        "last_active": datetime.now(timezone.utc).isoformat(),
                        "last_ip": ip or user.get("last_ip", ""),
                    }
                },
            )
        except Exception:
            pass

    return user


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db=Depends(get_db),
):
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
    except Exception:
        return None
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user and user.get("banned"):
        return None
    return user


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def serialize_user(u: dict) -> dict:
    """Strip internal fields and return public-safe user."""
    if not u:
        return u
    out = {k: v for k, v in u.items() if k not in ("_id", "password_hash")}
    return out
