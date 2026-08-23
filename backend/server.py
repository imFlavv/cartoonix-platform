from dotenv import load_dotenv
from pathlib import Path
import os
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi.responses import StreamingResponse, Response
import logging
import bcrypt
import jwt
import hmac
import hashlib
import secrets
import uuid
import httpx
import stripe
import mimetypes
import re
import shutil
import subprocess
import asyncio
from urllib.parse import unquote
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
)

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'cartoonix')]

# JWT_SECRET must exist. If missing in the deploy .env, fall back to a generated one so the
# backend still boots (instead of crashing on import -> Cloudflare 520). Set it in .env for
# stable sessions across restarts.
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    JWT_SECRET = secrets.token_urlsafe(48)
    logging.getLogger(__name__).warning("JWT_SECRET missing from environment — using a temporary one (sessions reset on restart). Set JWT_SECRET in .env!")
JWT_ALGORITHM = "HS256"

# ---------- Stripe (BYOK - own key) config ----------
# Accept both STRIPE_API_KEY and STRIPE_SECRET_KEY env names for flexibility.
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY", "")
PLUS_PRICE_RON = float(os.environ.get("PLUS_PRICE_RON", "50"))
PLUS_CURRENCY = os.environ.get("PLUS_CURRENCY", "ron").lower()
# Mesaj afișat pe pagina de plată Stripe (deasupra butonului de plată). Editabil din .env.
PLUS_CHECKOUT_MESSAGE = os.environ.get(
    "PLUS_CHECKOUT_MESSAGE",
    "Plată unică — primești acces Cartoonix PLUS pe viață imediat după plată. 👑 Ai un cod? Adaugă-l mai sus.",
)

# ---------- Default avatar (used by admin global reset) ----------
DEFAULT_AVATAR = os.environ.get("DEFAULT_AVATAR", "/avatars/default-user.jpg")

# ---------- Jellyfin (Cartoonix TV) config ----------
def _jellyfin_conf():
    """Citește configul Jellyfin din environment la runtime (acceptă mai multe denumiri)."""
    url = (os.environ.get("JELLYFIN_URL") or os.environ.get("JELLYFIN_SERVER_URL") or "").strip().rstrip("/")
    key = (os.environ.get("JELLYFIN_API_KEY") or os.environ.get("JELLYFIN_SECRET_KEY")
           or os.environ.get("JELLYFIN_KEY") or os.environ.get("JELLYFIN_TOKEN") or "").strip()
    return url, key

# ---------- Media (VPS video library) config ----------
VIDEO_DIR = os.environ.get("VIDEO_DIR", "/media/videos")
VIDEO_EXTENSIONS = {".mp4", ".mkv", ".webm", ".mov", ".m4v", ".avi", ".wmv", ".flv", ".mpeg", ".mpg", ".ts"}
MEDIA_CHUNK_SIZE = 1024 * 1024  # 1 MB chunks for Range streaming

# ---------- Brevo (email OTP) config ----------
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "Cartoonix")
OTP_TTL_MINUTES = int(os.environ.get("OTP_TTL_MINUTES", "10"))
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------- helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# Legacy DBs (migrated from an older platform) may store the password hash under a
# different key than "password_hash". Check common aliases so existing users can log in.
LEGACY_HASH_FIELDS = ("password_hash", "password", "passwordHash", "hash", "pass", "senha", "parola")


def get_stored_hash(user: dict) -> str:
    for field in LEGACY_HASH_FIELDS:
        val = user.get(field)
        if val:
            return str(val)
    return ""


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        h = hashed.strip()
        # Normalize PHP bcrypt variants ($2y$ / $2x$) for python-bcrypt compatibility.
        if h.startswith("$2y$") or h.startswith("$2x$"):
            h = "$2b$" + h[4:]
        return bcrypt.checkpw(plain.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ---------- user schema compatibility helpers ----------
# Baza de producție folosește: id (UUID), nickname, avatar_url, subscription ("plus"/"free"),
# email_verified, last_active, presence_seconds. Aceste helpere fac codul compatibil cu ambele.
def uid_of(user: dict) -> str:
    return user.get("id") or str(user.get("_id", ""))


def user_name(user: dict) -> str:
    return user.get("nickname") or user.get("name") or ""


def user_avatar(user: dict) -> str:
    return user.get("avatar_url") or user.get("avatar") or ""


def user_is_plus(user: dict) -> bool:
    sub = user.get("subscription")
    if sub is not None:
        return str(sub).lower() == "plus"
    return bool(user.get("plus", False))


MUTE_DURATIONS = {"5m": 5, "1h": 60, "24h": 60 * 24, "perm": None}


def mute_remaining(user: dict):
    """Return (is_muted, until_iso_or_None). Permanent uses year 9999 sentinel.
    Robust față de valori legacy (date naive fără fus orar, timestamp, format PHP) — nu aruncă niciodată."""
    mu = user.get("muted_until")
    if not mu:
        return False, None
    try:
        until = datetime.fromisoformat(mu) if isinstance(mu, str) else mu
        if not isinstance(until, datetime):
            return False, None
        if until.tzinfo is None:
            until = until.replace(tzinfo=timezone.utc)
        if until <= datetime.now(timezone.utc):
            return False, None
    except Exception:
        return False, None
    return True, mu


def user_is_muted(user: dict) -> bool:
    is_muted, _ = mute_remaining(user)
    return is_muted


async def find_user_by_id(uid: str):
    if not uid:
        return None
    u = await db.users.find_one({"id": uid})
    if u:
        return u
    try:
        return await db.users.find_one({"_id": ObjectId(uid)})
    except Exception:
        return None


def serialize_user(doc: dict) -> dict:
    return {
        "id": uid_of(doc),
        "email": doc["email"],
        "name": user_name(doc),
        "avatar": user_avatar(doc),
        "role": doc.get("role", "user"),
        "plus": user_is_plus(doc),
        "points": int(doc.get("points", 0)),
        "email_verified": doc.get("email_verified", True),
        "banned": doc.get("banned", False),
        "muted_until": doc.get("muted_until"),
        "last_ip": doc.get("last_ip", ""),
        "total_time_seconds": doc.get("presence_seconds", doc.get("total_time_seconds", 0)),
        "last_seen": doc.get("last_active") or doc.get("last_seen"),
        "created_at": doc.get("created_at"),
        "chat_style": doc.get("chat_style") or default_chat_style(),
        "nickname_updated_at": doc.get("nickname_updated_at"),
    }


# ---------- chat style (PLUS only cosmetic) ----------
ALLOWED_FONTS = {"default", "serif", "mono", "cursive", "display", "handwritten"}
ALLOWED_GLOWS = {"none", "gold", "cyan", "pink", "green", "red", "purple", "white"}
ALLOWED_GRADIENTS = {"none", "gold", "sunset", "ocean", "candy", "neon", "aurora", "fire"}
ALLOWED_BUBBLES = {"none", "capybara", "ice", "planet"}


def default_chat_style() -> dict:
    return {
        "font": "default",
        "glow": "none",
        "bold": False,
        "italic": False,
        "sparkle": False,
        "gradient": "none",
        "bubble": "none",
    }


def sanitize_chat_style(style: Optional[dict]) -> dict:
    base = default_chat_style()
    if not isinstance(style, dict):
        return base
    font = style.get("font")
    glow = style.get("glow")
    grad = style.get("gradient")
    bubble = style.get("bubble")
    return {
        "font": font if font in ALLOWED_FONTS else "default",
        "glow": glow if glow in ALLOWED_GLOWS else "none",
        "gradient": grad if grad in ALLOWED_GRADIENTS else "none",
        "bubble": bubble if bubble in ALLOWED_BUBBLES else "none",
        "bold": bool(style.get("bold", False)),
        "italic": bool(style.get("italic", False)),
        "sparkle": bool(style.get("sparkle", False)),
    }


# Premium avatars (Cartoonix PLUS only)
PREMIUM_AVATARS = {
    "https://api.dicebear.com/9.x/lorelei/svg?seed=Aurora&backgroundColor=b6e3f4",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Royale&backgroundColor=ffd5dc",
    "https://api.dicebear.com/9.x/micah/svg?seed=Diamond&backgroundColor=c0aede",
    "https://api.dicebear.com/9.x/personas/svg?seed=Legend&backgroundColor=ffdfbf",
    "https://api.dicebear.com/9.x/lorelei/svg?seed=Phoenix&backgroundColor=d1d4f9",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Empire&backgroundColor=b6e3f4",
    "https://api.dicebear.com/9.x/micah/svg?seed=Vortex&backgroundColor=ffd5dc",
    "https://api.dicebear.com/9.x/personas/svg?seed=Titan&backgroundColor=c0aede",
    "https://api.dicebear.com/9.x/lorelei/svg?seed=Galaxy&backgroundColor=ffdfbf",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Cosmic&backgroundColor=d1d4f9",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Sable&backgroundColor=c0aede",
    "https://api.dicebear.com/9.x/lorelei/svg?seed=Ivory&backgroundColor=ffd5dc",
    "https://api.dicebear.com/9.x/personas/svg?seed=Onyx&backgroundColor=b6e3f4",
    "https://api.dicebear.com/9.x/micah/svg?seed=Pearl&backgroundColor=d1d4f9",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Noir&backgroundColor=ffdfbf",
    "https://api.dicebear.com/9.x/lorelei/svg?seed=Velvet&backgroundColor=c0aede",
    "https://api.dicebear.com/9.x/personas/svg?seed=Azure&backgroundColor=ffd5dc",
    "https://api.dicebear.com/9.x/micah/svg?seed=Sterling&backgroundColor=b6e3f4",
}


def get_client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else ""


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="Nu ești autentificat")
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await find_user_by_id(payload["sub"])
        if not user:
            raise HTTPException(status_code=401, detail="Utilizator inexistent")
        if user.get("banned"):
            raise HTTPException(status_code=403, detail="Cont suspendat")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesiune expirată")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalid")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acces interzis")
    return user


# ---------- models ----------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    avatar: Optional[str] = ""


class RegisterStartInput(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    avatar: Optional[str] = ""


class RegisterVerifyInput(BaseModel):
    email: EmailStr
    code: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class AvatarInput(BaseModel):
    avatar: str


class ProfileInput(BaseModel):
    name: str


class Episode(BaseModel):
    number: int
    title: str
    video_url: str
    duration: Optional[str] = ""
    season: Optional[str] = None


class ShowInput(BaseModel):
    title: str
    description: str
    thumbnail: str
    banner: Optional[str] = ""
    category: str
    channel: str
    year: Optional[str] = ""
    genres: List[str] = []
    vps_path: Optional[str] = ""
    episodes: List[Episode] = []


def serialize_show(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


# ---------- OTP / Brevo email helpers ----------
def _otp_hash(code: str) -> str:
    return hmac.new(JWT_SECRET.encode(), code.encode(), hashlib.sha256).hexdigest()


def _make_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


async def send_otp_email(to_email: str, name: str, code: str):
    if not BREVO_API_KEY or not BREVO_SENDER_EMAIL:
        raise RuntimeError("Brevo nu este configurat")
    display_name = (name or "").strip() or "acolo"
    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;padding:32px;color:#ffffff;">
      <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
        <h1 style="color:#ffcc00;margin:0 0 8px;font-size:24px;">Cartoonix</h1>
        <p style="color:#cccccc;margin:0 0 24px;">Salut, {display_name}! Codul tău de verificare este:</p>
        <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#ffffff;background:#0a0a0a;border:1px solid rgba(255,204,0,0.4);border-radius:12px;padding:18px;text-align:center;">
          {code}
        </div>
        <p style="color:#888888;margin:24px 0 0;font-size:13px;">Codul expiră în {OTP_TTL_MINUTES} minute. Dacă nu ai cerut acest cod, ignoră acest email.</p>
      </div>
    </div>
    """
    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": "Codul tău de verificare Cartoonix",
        "htmlContent": html,
    }
    headers = {
        "api-key": BREVO_API_KEY,
        "accept": "application/json",
        "content-type": "application/json",
    }
    async with httpx.AsyncClient(timeout=20) as http_client:
        r = await http_client.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
        r.raise_for_status()


# ---------- auth routes ----------
@api_router.post("/auth/register/start")
async def register_start(data: RegisterStartInput, request: Request):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Acest email este deja folosit")
    ip = get_client_ip(request)
    if await db.banned_ips.find_one({"ip": ip}):
        raise HTTPException(status_code=403, detail="Acces interzis")
    now = datetime.now(timezone.utc)
    existing = await db.otp_verifications.find_one({"email": email})
    if existing and existing.get("last_sent_at"):
        try:
            last = datetime.fromisoformat(existing["last_sent_at"])
            elapsed = (now - last).total_seconds()
            if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
                wait = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
                raise HTTPException(status_code=429, detail=f"Așteaptă {wait}s înainte de a cere un cod nou")
        except HTTPException:
            raise
        except Exception:
            pass
    code = _make_otp()
    expires_dt = now + timedelta(minutes=OTP_TTL_MINUTES)
    await db.otp_verifications.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "name": data.name,
            "avatar": data.avatar or "",
            "password_hash": hash_password(data.password),
            "otp_hash": _otp_hash(code),
            "expiresAt": expires_dt,          # BSON date -> used by TTL index
            "expires_iso": expires_dt.isoformat(),
            "last_sent_at": now.isoformat(),
            "attempts": 0,
            "created_at": now.isoformat(),
        }},
        upsert=True,
    )
    try:
        await send_otp_email(email, data.name, code)
    except httpx.HTTPStatusError as e:
        logger.error(f"Brevo error {e.response.status_code}: {e.response.text}")
        raise HTTPException(status_code=400, detail="Nu am putut trimite emailul de verificare. Verifică adresa și încearcă din nou.")
    except Exception as e:
        logger.error(f"Brevo send failed: {e}")
        raise HTTPException(status_code=400, detail="Nu am putut trimite emailul de verificare. Încearcă din nou.")
    return {"ok": True, "message": "Ți-am trimis un cod de verificare pe email", "email": email}


@api_router.post("/auth/register/verify")
async def register_verify(data: RegisterVerifyInput, request: Request):
    email = data.email.lower()
    record = await db.otp_verifications.find_one({"email": email})
    if not record:
        raise HTTPException(status_code=400, detail="Nu există o cerere de înregistrare pentru acest email. Reia procesul.")
    now = datetime.now(timezone.utc)
    try:
        expired = datetime.fromisoformat(record["expires_iso"]) <= now
    except Exception:
        expired = True
    if expired:
        await db.otp_verifications.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Codul a expirat. Cere unul nou.")
    if record.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        await db.otp_verifications.delete_one({"email": email})
        raise HTTPException(status_code=429, detail="Prea multe încercări greșite. Reia procesul de înregistrare.")
    if not hmac.compare_digest(record.get("otp_hash", ""), _otp_hash(data.code.strip())):
        await db.otp_verifications.update_one({"email": email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Cod incorect")
    try:
        if await db.users.find_one({"email": email}):
            await db.otp_verifications.delete_one({"email": email})
            raise HTTPException(status_code=400, detail="Acest email este deja folosit")
        ip = get_client_ip(request)
        now_iso = datetime.now(timezone.utc).isoformat()
        new_id = str(uuid.uuid4())
        doc = {
            "id": new_id,
            "email": email,
            "password_hash": record["password_hash"],
            "nickname": record.get("name", ""),
            "avatar_url": record.get("avatar", ""),
            "role": "user",
            "subscription": "free",
            "email_verified": True,
            "banned": False,
            "last_ip": ip,
            "accepted_terms_at": now_iso,
            "created_at": now_iso,
            "last_active": now_iso,
        }
        res = await db.users.insert_one(doc)
        doc["_id"] = res.inserted_id
        await db.otp_verifications.delete_one({"email": email})
        token = create_access_token(new_id, email)
        return {"token": token, "user": serialize_user(doc)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"register_verify failed for {email}: {e}")
        raise HTTPException(status_code=400, detail="Nu am putut finaliza înregistrarea. Încearcă din nou în câteva momente.")


class AdminCreateUserInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    plus: bool = False


@api_router.post("/admin/users")
async def admin_create_user(data: AdminCreateUserInput, admin: dict = Depends(require_admin)):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Acest email este deja folosit")
    now_iso = datetime.now(timezone.utc).isoformat()
    new_id = str(uuid.uuid4())
    doc = {
        "id": new_id,
        "email": email,
        "password_hash": hash_password(data.password),
        "nickname": data.name,
        "avatar_url": "",
        "role": "user",
        "subscription": "plus" if data.plus else "free",
        "email_verified": True,
        "banned": False,
        "accepted_terms_at": now_iso,
        "created_at": now_iso,
        "last_active": now_iso,
        "created_by_admin": uid_of(admin),
    }
    if data.plus:
        doc["plus_since"] = now_iso
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return {"ok": True, "user": serialize_user(doc)}


@api_router.post("/auth/login")
async def login(data: LoginInput, request: Request):
    email = data.email.lower()
    ip = get_client_ip(request)
    if await db.banned_ips.find_one({"ip": ip}):
        raise HTTPException(status_code=403, detail="Acces interzis de pe această adresă IP")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, get_stored_hash(user)):
        raise HTTPException(status_code=401, detail="Email sau parolă incorectă")
    if user.get("banned"):
        raise HTTPException(status_code=403, detail="Cont suspendat")
    settings = await db.settings.find_one({"key": "maintenance"})
    if settings and settings.get("enabled") and user.get("role") != "admin":
        raise HTTPException(status_code=503, detail="Platforma este momentan în mentenanță. Revenim curând!")
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_ip": ip, "last_login": now_iso, "last_active": now_iso}})
    user["last_ip"] = ip
    token = create_access_token(uid_of(user), email)
    return {"token": token, "user": serialize_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


@api_router.put("/auth/avatar")
async def update_avatar(data: AvatarInput, user: dict = Depends(get_current_user)):
    if data.avatar in PREMIUM_AVATARS and not user_is_plus(user):
        raise HTTPException(status_code=403, detail="Acest avatar este disponibil doar pentru membrii Cartoonix PLUS")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"avatar_url": data.avatar}})
    user["avatar_url"] = data.avatar
    return serialize_user(user)


@api_router.put("/auth/profile")
async def update_profile(data: ProfileInput, user: dict = Depends(get_current_user)):
    new_name = (data.name or "").strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Numele nu poate fi gol")
    current_name = user_name(user)
    # If unchanged, no-op (no cooldown enforced)
    if new_name != current_name:
        # Cooldown: allow rename only once every 30 days (admins bypass)
        last = user.get("nickname_updated_at")
        if last and user.get("role") != "admin":
            try:
                last_dt = datetime.fromisoformat(last)
            except Exception:
                last_dt = None
            if last_dt:
                next_dt = last_dt + timedelta(days=30)
                if datetime.now(timezone.utc) < next_dt:
                    remaining_days = max(1, (next_dt - datetime.now(timezone.utc)).days)
                    raise HTTPException(
                        status_code=400,
                        detail=f"Numele poate fi schimbat o dată la 30 de zile. Reîncearcă în {remaining_days} zile.",
                    )
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"nickname": new_name, "nickname_updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        user["nickname"] = new_name
        user["nickname_updated_at"] = datetime.now(timezone.utc).isoformat()
    return serialize_user(user)


class ChangePasswordInput(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=6, max_length=200)


@api_router.put("/auth/password")
async def change_password(data: ChangePasswordInput, user: dict = Depends(get_current_user)):
    if not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Parola actuală este incorectă")
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="Noua parolă trebuie să fie diferită de cea actuală")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(data.new_password)}},
    )
    return {"ok": True}


class ChatStyleInput(BaseModel):
    font: Optional[str] = None
    glow: Optional[str] = None
    gradient: Optional[str] = None
    bubble: Optional[str] = None
    bold: Optional[bool] = False
    italic: Optional[bool] = False
    sparkle: Optional[bool] = False


@api_router.put("/auth/chat-style")
async def update_chat_style(data: ChatStyleInput, user: dict = Depends(get_current_user)):
    if not user_is_plus(user):
        raise HTTPException(status_code=403, detail="Stilul de chat personalizat este disponibil doar pentru membrii Cartoonix PLUS")
    style = sanitize_chat_style(data.model_dump())
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"chat_style": style}})
    user["chat_style"] = style
    return serialize_user(user)


@api_router.post("/auth/subscribe")
async def subscribe(user: dict = Depends(get_current_user)):
    # Admin-only manual grant kept as fallback (nu se folosește în flow-ul de plată real)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Folosește pagina de plată pentru a activa PLUS")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"subscription": "plus"}})
    user["subscription"] = "plus"
    return serialize_user(user)


# ---------- Stripe payments (Cartoonix PLUS - plată unică lifetime) ----------
class CheckoutRequest(BaseModel):
    origin_url: str


def _get_stripe_checkout(request: Request) -> StripeCheckout:
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


def _stripe_configure():
    """Setează cheia și endpoint-ul Stripe. Cheia de test Emergent rutează prin proxy;
    cheia reală (sk_live/sk_test real) merge direct la api.stripe.com."""
    stripe.api_key = STRIPE_API_KEY
    if "sk_test_emergent" in STRIPE_API_KEY:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    else:
        stripe.api_base = "https://api.stripe.com"


async def _fulfill_session(session_id: str):
    """Idempotent: marchează tranzacția plătită și acordă beneficiul (PLUS sau puncte)
    exact o singură dată (garda pe modified_count previne dubla creditare)."""
    record = await db.payment_transactions.find_one({"session_id": session_id})
    if not record or record.get("payment_status") == "paid":
        return
    res = await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid",
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.modified_count == 0:
        return  # altă cale (webhook/poll) a onorat deja tranzacția
    user_id = record.get("user_id")
    if not user_id:
        return
    try:
        target = await find_user_by_id(user_id)
        if not target:
            return
        product = record.get("product")
        if product == "cartoonix_donation":
            pts = int(record.get("points", 0))
            if pts > 0:
                await db.users.update_one({"_id": target["_id"]}, {"$inc": {"points": pts}})
                await db.points_ledger.insert_one({
                    "user_id": user_id,
                    "type": "donation",
                    "points": pts,
                    "amount": record.get("amount"),
                    "currency": record.get("currency"),
                    "session_id": session_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
        else:
            await db.users.update_one({"_id": target["_id"]}, {"$set": {"subscription": "plus"}})
    except Exception as e:
        logger.error(f"fulfill session failed: {e}")


# backwards-compatible alias
async def _grant_plus_for_session(session_id: str):
    await _fulfill_session(session_id)


@api_router.post("/payments/checkout")
async def create_checkout(body: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    if user_is_plus(user):
        raise HTTPException(status_code=400, detail="Ai deja Cartoonix PLUS activ")
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe nu este configurat")
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment/cancel"
    # Webhook URL kept in metadata so the emergentintegrations webhook parser still works.
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe.api_key = STRIPE_API_KEY
    # Cheia de test Emergent rutează prin proxy-ul Emergent; cheia reală (pe live) merge direct.
    if "sk_test_emergent" in STRIPE_API_KEY:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    else:
        stripe.api_base = "https://api.stripe.com"
    # Sumă definită SERVER-SIDE (niciodată din frontend). allow_promotion_codes activează
    # câmpul "Add promotion code" (codurile se creează în Stripe Dashboard).
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": PLUS_CURRENCY,
                    "product_data": {
                        "name": "Cartoonix PLUS — acces pe viață",
                        "description": "Deblochezi toate beneficiile PLUS pentru totdeauna. Plată unică.",
                    },
                    "unit_amount": int(round(PLUS_PRICE_RON * 100)),
                },
                "quantity": 1,
            }],
            allow_promotion_codes=True,
            custom_text={"submit": {"message": PLUS_CHECKOUT_MESSAGE}},
            customer_email=user.get("email") or None,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": uid_of(user), "product": "cartoonix_plus_lifetime", "webhook_url": webhook_url},
        )
    except Exception as e:
        logger.error(f"stripe checkout create failed: {e}")
        raise HTTPException(status_code=500, detail="Nu s-a putut iniția plata. Încearcă din nou.")
    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "user_id": uid_of(user),
        "email": user.get("email"),
        "product": "cartoonix_plus_lifetime",
        "amount": PLUS_PRICE_RON,
        "currency": PLUS_CURRENCY,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.id}


@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    record = await db.payment_transactions.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(status_code=404, detail="Tranzacție inexistentă")
    if record.get("payment_status") != "paid":
        try:
            _stripe_configure()
            session = stripe.checkout.Session.retrieve(session_id)
            s_status = getattr(session, "status", None)
            p_status = getattr(session, "payment_status", None)
            logger.info(f"[pay-poll] {session_id} status={s_status} payment_status={p_status}")
            # "complete" acoperă și comenzile gratuite (voucher 100% -> no_payment_required).
            if s_status == "complete" or p_status in ("paid", "no_payment_required"):
                await _grant_plus_for_session(session_id)
                record = await db.payment_transactions.find_one({"session_id": session_id})
        except Exception as e:
            logger.error(f"[pay-poll] status error for {session_id}: {e}")
    return {
        "session_id": record["session_id"],
        "status": record["status"],
        "payment_status": record["payment_status"],
        "product": record.get("product"),
        "points": int(record.get("points", 0)),
        "amount": record.get("amount"),
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body_bytes = await request.body()
    try:
        event = json.loads(body_bytes.decode("utf-8"))
    except Exception as e:
        logger.error(f"[webhook] invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Webhook invalid")
    etype = event.get("type")
    obj = (event.get("data") or {}).get("object") or {}
    if etype in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        sid = obj.get("id")
        p_status = obj.get("payment_status")
        s_status = obj.get("status")
        logger.info(f"[webhook] {etype} sid={sid} status={s_status} payment_status={p_status}")
        # "complete" / "no_payment_required" acoperă și comenzile cu voucher 100% (0 RON).
        if sid and (s_status == "complete" or p_status in ("paid", "no_payment_required")):
            await _grant_plus_for_session(sid)
    return {"status": "ok"}


# ---------- Donations (Stripe one-time, credits in-app points: 1 RON = 1 point) ----------
DONATION_MIN_RON = float(os.environ.get("DONATION_MIN_RON", "10"))
DONATION_MAX_RON = float(os.environ.get("DONATION_MAX_RON", "5000"))


class DonationRequest(BaseModel):
    amount: float
    origin_url: str


@api_router.post("/payments/donate")
async def create_donation(body: DonationRequest, request: Request, user: dict = Depends(get_current_user)):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe nu este configurat")
    try:
        amount = round(float(body.amount), 2)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Sumă invalidă")
    if amount < DONATION_MIN_RON or amount > DONATION_MAX_RON:
        raise HTTPException(status_code=400, detail=f"Suma trebuie să fie între {int(DONATION_MIN_RON)} și {int(DONATION_MAX_RON)} RON")
    points = int(amount)  # 1 RON = 1 punct
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/doneaza"
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe.api_key = STRIPE_API_KEY
    if "sk_test_emergent" in STRIPE_API_KEY:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    else:
        stripe.api_base = "https://api.stripe.com"
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": PLUS_CURRENCY,
                    "product_data": {
                        "name": "Donație Cartoonix",
                        "description": f"Mulțumim pentru susținere! Primești {points} puncte în platformă.",
                    },
                    "unit_amount": int(round(amount * 100)),
                },
                "quantity": 1,
            }],
            customer_email=user.get("email") or None,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": uid_of(user), "product": "cartoonix_donation", "points": str(points), "webhook_url": webhook_url},
        )
    except Exception as e:
        logger.error(f"stripe donation create failed: {e}")
        raise HTTPException(status_code=500, detail="Nu s-a putut iniția donația. Încearcă din nou.")
    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "user_id": uid_of(user),
        "email": user.get("email"),
        "product": "cartoonix_donation",
        "amount": amount,
        "currency": PLUS_CURRENCY,
        "points": points,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.id, "points": points}


@api_router.get("/points/me")
async def points_me(user: dict = Depends(get_current_user)):
    fresh = await find_user_by_id(uid_of(user)) or user
    history = await db.points_ledger.find({"user_id": uid_of(user)}).sort("created_at", -1).to_list(100)
    for h in history:
        h.pop("_id", None)
    return {"points": int(fresh.get("points", 0)), "history": history}



# ---------- shows routes ----------
@api_router.get("/shows")
async def get_shows(category: Optional[str] = None, q: Optional[str] = None, full: bool = False):
    query = {}
    if category:
        query["category"] = category
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    if full:
        docs = await db.shows.find(query).to_list(500)
    else:
        # light payload for lists/cards: drop heavy embedded episodes, keep a count
        docs = await db.shows.aggregate([
            {"$match": query},
            {"$addFields": {"episode_count": {"$size": {"$ifNull": ["$episodes", []]}}}},
            {"$project": {"episodes": 0}},
        ]).to_list(500)
    shows = [serialize_show(s) for s in docs]
    shows.sort(key=lambda s: (s.get("order", 9999), s.get("created_at", "")))
    return shows


@api_router.get("/shows/{show_id}")
async def get_show(show_id: str):
    show = await db.shows.find_one({"_id": ObjectId(show_id)})
    if not show:
        raise HTTPException(status_code=404, detail="Desen inexistent")
    return serialize_show(show)


@api_router.post("/admin/shows")
async def create_show(data: ShowInput, admin: dict = Depends(require_admin)):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.shows.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_show(doc)


# ---------- Live TV: random continuous playback of the whole library ----------
# Flattened lightweight episode index is cached in-memory with a TTL so the heavy
# aggregation runs at most once per interval and never slows down /shows or /watch.
import time as _time
import random as _random

_LIVE_CACHE = {"at": 0.0, "items": []}
_LIVE_TTL_SECONDS = 300  # rebuild index at most once every 5 minutes


async def _build_live_index():
    pipeline = [
        {"$unwind": "$episodes"},
        {"$match": {"episodes.video_url": {"$nin": [None, ""]}}},
        {"$project": {
            "_id": 0,
            "show_id": {"$toString": "$_id"},
            "show_title": "$title",
            "channel": "$channel",
            "thumbnail": "$thumbnail",
            "episode_number": "$episodes.number",
            "episode_title": "$episodes.title",
            "video_url": "$episodes.video_url",
            "duration": "$episodes.duration",
        }},
    ]
    return await db.shows.aggregate(pipeline, allowDiskUse=True).to_list(200000)


@api_router.get("/live/playlist")
async def live_playlist(count: int = 60, user: dict = Depends(get_current_user)):
    if not user_is_plus(user):
        raise HTTPException(status_code=403, detail="Cartoonix TV este disponibil momentan doar pentru membrii PLUS (BETA)")
    now = _time.time()
    if now - _LIVE_CACHE["at"] > _LIVE_TTL_SECONDS or not _LIVE_CACHE["items"]:
        _LIVE_CACHE["items"] = await _build_live_index()
        _LIVE_CACHE["at"] = now
    items = _LIVE_CACHE["items"]
    if not items:
        return {"items": [], "total": 0}
    count = max(1, min(int(count), 200))
    sample = _random.sample(items, min(count, len(items)))
    return {"items": sample, "total": len(items)}


# ---------- Live TV: SYNCHRONIZED broadcast (same stream for everyone) ----------
# A deterministic schedule (fixed shuffled order + per-item duration) is derived from
# a persisted {epoch, seed}. Any client computes the same "now playing" + offset from
# the server clock, so every viewer sees the exact same episode at the same second.
import bisect as _bisect

_LIVE_SCHED = {"epoch": None, "seed": None, "n": -1, "items": [], "cum": [], "total": 1, "dver": -1}
_LIVE_SCHED_MAX_AGE = 24 * 3600  # rotate the shuffle once a day
_LIVE_DUR = {}            # measured real durations: "show_id:ep" -> seconds
_LIVE_DUR_LOADED = False  # loaded the durations from DB into memory yet?
_LIVE_DUR_VER = 0         # bumped whenever a new real duration is recorded


def _dur_to_seconds(s) -> int:
    if not s:
        return 1320
    txt = str(s).strip().lower()
    if ":" in txt:
        parts = txt.split(":")
        try:
            nums = [int(p) for p in parts]
            if len(nums) == 3:
                return nums[0] * 3600 + nums[1] * 60 + nums[2]
            if len(nums) == 2:
                return nums[0] * 60 + nums[1]
        except ValueError:
            pass
    m = re.search(r"(\d+)", txt)
    if not m:
        return 1320
    val = int(m.group(1))
    if "h" in txt:
        return val * 3600
    return val * 60  # "22 min" / bare number -> minutes


async def _ensure_live_schedule():
    global _LIVE_DUR_LOADED
    now = _time.time()
    doc = await db.settings.find_one({"key": "live_schedule"})
    if not doc or (now - doc.get("epoch", 0)) > _LIVE_SCHED_MAX_AGE:
        doc = {"key": "live_schedule", "epoch": now, "seed": secrets.randbelow(1_000_000_000)}
        await db.settings.update_one({"key": "live_schedule"}, {"$set": doc}, upsert=True)
    epoch = doc["epoch"]
    seed = doc["seed"]
    # keep the flat index fresh
    if now - _LIVE_CACHE["at"] > _LIVE_TTL_SECONDS or not _LIVE_CACHE["items"]:
        _LIVE_CACHE["items"] = await _build_live_index()
        _LIVE_CACHE["at"] = now
    idx_items = _LIVE_CACHE["items"]
    # load measured real durations from DB once
    if not _LIVE_DUR_LOADED:
        async for d in db.live_durations.find({}):
            _LIVE_DUR[d["_id"]] = d.get("seconds")
        _LIVE_DUR_LOADED = True
    # (re)build the in-memory schedule deterministically from the persisted seed.
    # Slot length = measured real duration when known, else the label, else default.
    if (_LIVE_SCHED["seed"] != seed or _LIVE_SCHED["epoch"] != epoch
            or _LIVE_SCHED["n"] != len(idx_items) or _LIVE_SCHED["dver"] != _LIVE_DUR_VER
            or not _LIVE_SCHED["items"]):
        order = list(idx_items)
        _random.Random(seed).shuffle(order)
        items, cum, t = [], [], 0
        for it in order:
            key = f"{it.get('show_id')}:{it.get('episode_number')}"
            real = _LIVE_DUR.get(key)
            d = real if real else _dur_to_seconds(it.get("duration"))
            d = max(5, min(int(round(d)), 7200))
            item = dict(it)
            item["duration_seconds"] = d
            items.append(item)
            cum.append(t)
            t += d
        _LIVE_SCHED.update({"seed": seed, "epoch": epoch, "n": len(idx_items),
                            "dver": _LIVE_DUR_VER, "items": items, "cum": cum, "total": max(1, t)})
    return epoch


def _slim_sched_item(x: dict) -> dict:
    return {k: x.get(k) for k in ("show_id", "show_title", "channel", "thumbnail",
                                  "episode_number", "episode_title", "duration_seconds")}


@api_router.get("/live/now")
async def live_now(user: dict = Depends(get_current_user)):
    if not user_is_plus(user):
        raise HTTPException(status_code=403, detail="Cartoonix TV este disponibil momentan doar pentru membrii PLUS (BETA)")
    epoch = await _ensure_live_schedule()
    items, cum, total = _LIVE_SCHED["items"], _LIVE_SCHED["cum"], _LIVE_SCHED["total"]
    if not items:
        return {"current": None, "next": [], "prev": None, "index": 0, "offset": 0}
    now = _time.time()
    pos = (now - epoch) % total
    i = _bisect.bisect_right(cum, pos) - 1
    if i < 0:
        i = 0
    offset = pos - cum[i]
    n = len(items)
    current = _slim_sched_item(items[i])
    current["video_url"] = items[i]["video_url"]
    return {
        "server_time": now,
        "index": i,
        "offset": round(offset, 2),
        "current": current,
        "prev": _slim_sched_item(items[(i - 1) % n]),
        "next": [_slim_sched_item(items[(i + k) % n]) for k in range(1, 5)],
        "total_items": n,
    }


class LiveDurationReport(BaseModel):
    show_id: str
    episode_number: int
    duration: float  # measured real length in seconds


@api_router.post("/live/report_duration")
async def live_report_duration(body: LiveDurationReport, user: dict = Depends(get_current_user)):
    if not user_is_plus(user):
        raise HTTPException(status_code=403, detail="Doar PLUS")
    global _LIVE_DUR_VER
    secs = int(round(body.duration))
    if secs < 5 or secs > 7200:
        return {"ok": False, "reason": "out_of_range"}
    key = f"{body.show_id}:{body.episode_number}"
    prev = _LIVE_DUR.get(key)
    # only record/rebuild when it meaningfully changes (avoids needless rebuilds)
    if prev is None or abs(prev - secs) > 2:
        _LIVE_DUR[key] = secs
        _LIVE_DUR_VER += 1
        await db.live_durations.update_one(
            {"_id": key},
            {"$set": {"seconds": secs, "at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    return {"ok": True}





# ---------- media library: stream video from VPS with Range (seek) support ----------
def _safe_media_path(file_path: str) -> str:
    """Resolve a request path safely under VIDEO_DIR (anti path-traversal)."""
    rel = unquote(file_path).lstrip("/")
    base = os.path.realpath(VIDEO_DIR)
    full = os.path.realpath(os.path.join(base, rel))
    if not (full == base or full.startswith(base + os.sep)):
        raise HTTPException(status_code=403, detail="Acces interzis")
    return full


@api_router.get("/media/videos/{file_path:path}")
async def serve_video(file_path: str, request: Request):
    full = _safe_media_path(file_path)
    if not os.path.isfile(full):
        raise HTTPException(status_code=404, detail="Fișier inexistent")
    file_size = os.path.getsize(full)
    ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
    range_header = request.headers.get("range") or request.headers.get("Range")

    if range_header:
        m = re.match(r"bytes=(\d+)-(\d*)", range_header.strip())
        if not m:
            return Response(status_code=416, headers={"Content-Range": f"bytes */{file_size}"})
        start = int(m.group(1))
        end = int(m.group(2)) if m.group(2) else file_size - 1
        end = min(end, file_size - 1)
        if start > end or start >= file_size:
            return Response(status_code=416, headers={"Content-Range": f"bytes */{file_size}"})
        length = end - start + 1

        def iter_range():
            with open(full, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = f.read(min(MEDIA_CHUNK_SIZE, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
            "Content-Type": ctype,
            "Cache-Control": "public, max-age=3600",
        }
        return StreamingResponse(iter_range(), status_code=206, headers=headers)

    def iter_full():
        with open(full, "rb") as f:
            while True:
                chunk = f.read(MEDIA_CHUNK_SIZE)
                if not chunk:
                    break
                yield chunk

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": ctype,
        "Cache-Control": "public, max-age=3600",
    }
    return StreamingResponse(iter_full(), headers=headers)


# ---------- admin: import episodes from a real VPS folder ----------
def _prettify_title(fname: str) -> str:
    name = os.path.splitext(fname)[0]
    # drop a trailing bracketed token, e.g. "... [WmJx123]"
    name = re.sub(r"\s*\[[^\]]*\]\s*$", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name or fname


def _prettify_folder_name(name: str) -> str:
    n = name.replace("_", " ").replace("-", " ")
    n = re.sub(r"\s+", " ", n).strip()
    return n or name


def _natural_key(s: str):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]


# ffprobe (duration detection) — best-effort, degrades gracefully if not installed
FFPROBE_BIN = shutil.which("ffprobe")


def _format_duration(seconds: float) -> str:
    if not seconds or seconds <= 0:
        return ""
    s = int(round(seconds))
    h, m, sec = s // 3600, (s % 3600) // 60, s % 60
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}"


def _probe_duration_sync(path: str) -> str:
    if not FFPROBE_BIN:
        return ""
    try:
        out = subprocess.run(
            [FFPROBE_BIN, "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, text=True, timeout=25,
        )
        val = (out.stdout or "").strip()
        return _format_duration(float(val)) if val else ""
    except Exception:
        return ""


async def _probe_durations(paths: List[str]) -> dict:
    """Probe many files concurrently (bounded) via a thread pool."""
    if not FFPROBE_BIN or not paths:
        return {p: "" for p in paths}
    loop = asyncio.get_event_loop()
    sem = asyncio.Semaphore(6)

    async def one(p):
        async with sem:
            return p, await loop.run_in_executor(None, _probe_duration_sync, p)

    results = await asyncio.gather(*[one(p) for p in paths])
    return dict(results)


def _resolve_under_video_dir(raw: str):
    """Return (base, full_dir) resolving raw as absolute-under-base or relative; raises on escape."""
    base = os.path.realpath(VIDEO_DIR)
    raw = (raw or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Introdu path-ul folderului de pe VPS")
    full_dir = os.path.realpath(raw) if os.path.isabs(raw) else os.path.realpath(os.path.join(base, raw))
    if not (full_dir == base or full_dir.startswith(base + os.sep)):
        raise HTTPException(status_code=400, detail=f"Folderul trebuie să fie sub {VIDEO_DIR}")
    return base, full_dir


def _list_video_files(directory: str) -> List[str]:
    return sorted(
        [e for e in os.listdir(directory)
         if os.path.isfile(os.path.join(directory, e))
         and os.path.splitext(e)[1].lower() in VIDEO_EXTENSIONS],
        key=_natural_key,
    )


def _list_subdirs(directory: str) -> List[str]:
    return sorted(
        [e for e in os.listdir(directory) if os.path.isdir(os.path.join(directory, e))],
        key=_natural_key,
    )


def _scan_show_folder(full_dir: str, base: str) -> List[dict]:
    """Scan a show folder. Direct .mp4 files -> no season. Subfolders -> each is a season
    (scanned one level deep). Episodes get a globally-unique `number` (routing id) plus a
    `season` label. Includes a temporary `_path` (absolute) for duration probing."""
    groups = []  # (season_label_or_None, [(fname, fpath)])
    direct = _list_video_files(full_dir)
    if direct:
        groups.append((None, [(f, os.path.join(full_dir, f)) for f in direct]))
    for sub in _list_subdirs(full_dir):
        sub_dir = os.path.join(full_dir, sub)
        sub_files = _list_video_files(sub_dir)
        if sub_files:
            groups.append((_prettify_folder_name(sub), [(f, os.path.join(sub_dir, f)) for f in sub_files]))

    episodes = []
    n = 0
    for season, files in groups:
        for fname, fpath in files:
            n += 1
            rel = os.path.relpath(fpath, base).replace(os.sep, "/")
            episodes.append({
                "number": n,
                "title": _prettify_title(fname),
                "video_url": f"/media/videos/{rel}",
                "duration": "",
                "season": season,
                "_path": fpath,
            })
    return episodes


async def _finalize_episodes(episodes: List[dict], probe: bool = True) -> List[dict]:
    """Fill durations (best-effort) and strip internal `_path` field."""
    if probe:
        durations = await _probe_durations([e["_path"] for e in episodes if e.get("_path")])
        for e in episodes:
            e["duration"] = durations.get(e.get("_path"), "") or ""
    for e in episodes:
        e.pop("_path", None)
    return episodes


class ImportFolderInput(BaseModel):
    folder: str


@api_router.post("/admin/import-folder")
async def admin_import_folder(data: ImportFolderInput, admin: dict = Depends(require_admin)):
    """Scan a real folder under VIDEO_DIR (with season subfolders + durations) and return
    detected episodes (non-destructive). Admin previews, then saves via create/update endpoints."""
    base, full_dir = _resolve_under_video_dir(data.folder)
    if not os.path.isdir(full_dir):
        raise HTTPException(status_code=404, detail=f"Folder inexistent pe server: {full_dir}")

    episodes = _scan_show_folder(full_dir, base)
    episodes = await _finalize_episodes(episodes, probe=True)
    seasons = [s for s in dict.fromkeys([e["season"] for e in episodes if e["season"]])]
    return {"count": len(episodes), "episodes": episodes, "folder": full_dir, "seasons": seasons}


class ImportAllInput(BaseModel):
    folder: str  # parent directory; each subfolder becomes a show
    channel: Optional[str] = None
    category: Optional[str] = "Nesortate"
    probe_durations: bool = True


@api_router.post("/admin/import-all")
async def admin_import_all(data: ImportAllInput, admin: dict = Depends(require_admin)):
    """Scan a PARENT folder: every subfolder becomes a show (desen) with its episodes
    (season subfolders + durations). Skips subfolders that already exist as a show (by title)."""
    base, parent_dir = _resolve_under_video_dir(data.folder)
    if not os.path.isdir(parent_dir):
        raise HTTPException(status_code=404, detail=f"Folder inexistent pe server: {parent_dir}")

    subdirs = _list_subdirs(parent_dir)
    if not subdirs:
        raise HTTPException(status_code=400, detail="Folderul nu conține subfoldere (fiecare subfolder = un desen)")

    created, skipped = [], []
    total_files = 0
    for sub in subdirs:
        sub_dir = os.path.join(parent_dir, sub)
        episodes = _scan_show_folder(sub_dir, base)
        if not episodes:
            skipped.append({"folder": sub, "reason": "fără fișiere video"})
            continue
        title = _prettify_folder_name(sub)
        existing = await db.shows.find_one({"title": title})
        if existing:
            skipped.append({"folder": sub, "reason": "există deja", "title": title})
            continue
        episodes = await _finalize_episodes(episodes, probe=data.probe_durations)
        total_files += len(episodes)
        rel_parent = os.path.relpath(sub_dir, base).replace(os.sep, "/")
        doc = {
            "title": title,
            "description": "",
            "thumbnail": "",
            "banner": "",
            "category": data.category or "Nesortate",
            "channel": data.channel or "Cartoon Network",
            "year": "",
            "genres": [],
            "vps_path": f"/media/videos/{rel_parent}",
            "episodes": episodes,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.shows.insert_one(doc)
        created.append({"title": title, "episodes": len(episodes),
                        "seasons": [s for s in dict.fromkeys([e["season"] for e in episodes if e["season"]])]})

    return {
        "created_count": len(created),
        "skipped_count": len(skipped),
        "total_episodes": total_files,
        "created": created,
        "skipped": skipped,
    }




# ---------- favorites ----------
class ItemRef(BaseModel):
    show_id: str
    episode_number: int
    show_title: Optional[str] = ""
    episode_title: Optional[str] = ""
    thumbnail: Optional[str] = ""
    channel: Optional[str] = ""


def _item_key(show_id: str, ep: int) -> str:
    return f"{show_id}:{ep}"


@api_router.get("/favorites")
async def get_favorites(user: dict = Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": uid_of(user)}).sort("added_at", -1).to_list(500)
    for f in favs:
        f["id"] = str(f.pop("_id"))
    return favs


@api_router.post("/favorites/toggle")
async def toggle_favorite(data: ItemRef, user: dict = Depends(get_current_user)):
    key = _item_key(data.show_id, data.episode_number)
    existing = await db.favorites.find_one({"user_id": uid_of(user), "key": key})
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        return {"favorited": False}
    doc = data.model_dump()
    doc.update({
        "user_id": uid_of(user),
        "key": key,
        "added_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.favorites.insert_one(doc)
    return {"favorited": True}


# ---------- playlists ----------
class PlaylistCreate(BaseModel):
    name: str


@api_router.get("/playlists")
async def get_playlists(user: dict = Depends(get_current_user)):
    pls = await db.playlists.find({"user_id": uid_of(user)}).sort("created_at", -1).to_list(200)
    for p in pls:
        p["id"] = str(p.pop("_id"))
    return pls


@api_router.post("/playlists")
async def create_playlist(data: PlaylistCreate, user: dict = Depends(get_current_user)):
    if not user_is_plus(user):
        count = await db.playlists.count_documents({"user_id": uid_of(user)})
        if count >= 1:
            raise HTTPException(
                status_code=403,
                detail="Planul gratuit permite un singur playlist. Treci la Cartoonix PLUS pentru playlisturi nelimitate.",
            )
    doc = {
        "user_id": uid_of(user),
        "name": data.name,
        "items": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.playlists.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.delete("/playlists/{pid}")
async def delete_playlist(pid: str, user: dict = Depends(get_current_user)):
    await db.playlists.delete_one({"_id": ObjectId(pid), "user_id": uid_of(user)})
    return {"ok": True}


@api_router.post("/playlists/{pid}/toggle")
async def toggle_playlist_item(pid: str, data: ItemRef, user: dict = Depends(get_current_user)):
    pl = await db.playlists.find_one({"_id": ObjectId(pid), "user_id": uid_of(user)})
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist inexistent")
    key = _item_key(data.show_id, data.episode_number)
    items = pl.get("items", [])
    exists = any(i.get("key") == key for i in items)
    if exists:
        items = [i for i in items if i.get("key") != key]
        added = False
    else:
        item = data.model_dump()
        item["key"] = key
        items.append(item)
        added = True
    await db.playlists.update_one({"_id": pl["_id"]}, {"$set": {"items": items}})
    return {"added": added, "count": len(items)}


# ---------- downloads (PLUS only) ----------
@api_router.get("/download/{show_id}/{episode_number}")
async def get_download(show_id: str, episode_number: int, user: dict = Depends(get_current_user)):
    if not user_is_plus(user):
        raise HTTPException(status_code=403, detail="Descărcarea este disponibilă doar pentru membrii Cartoonix PLUS")
    show = await db.shows.find_one({"_id": ObjectId(show_id)})
    if not show:
        raise HTTPException(status_code=404, detail="Desen inexistent")
    if show.get("download_disabled"):
        raise HTTPException(status_code=403, detail="Descărcarea este dezactivată pentru acest desen")
    ep = next((e for e in show.get("episodes", []) if e["number"] == episode_number), None)
    if not ep:
        raise HTTPException(status_code=404, detail="Episod inexistent")
    return {"url": ep["video_url"], "filename": f"{show['title']} - Ep{episode_number}.mp4"}


# ---------- notifications ----------
@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    # broadcast notifications (no user_id / null) + notifications targeted to this user
    query = {"$or": [{"user_id": None}, {"user_id": uid_of(user)}]}
    notifs = await db.notifications.find(query).sort("created_at", -1).to_list(100)
    read_at = user.get("notifications_read_at", "")
    items = []
    for n in notifs:
        n["id"] = str(n.pop("_id"))
        n["read"] = bool(read_at and n.get("created_at", "") <= read_at)
        items.append(n)
    unread = sum(1 for n in items if not n["read"])
    return {"items": items, "unread": unread}


@api_router.post("/notifications/read-all")
async def read_all_notifications(user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"notifications_read_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


# ---------- chat ----------
class ChatInput(BaseModel):
    text: str = Field(min_length=1, max_length=120)
    room: str = "global"
    quote: Optional[dict] = None


ALLOWED_REACTIONS = {"👍", "❤️", "😂"}


def reaction_summary(reactions: dict, uid: str) -> dict:
    reactions = reactions or {}
    counts = {}
    for _u, emo in reactions.items():
        counts[emo] = counts.get(emo, 0) + 1
    return {"reaction_counts": counts, "my_reaction": reactions.get(uid)}


def serialize_msg(m: dict, uid: Optional[str] = None) -> dict:
    m = dict(m)
    m["id"] = str(m.pop("_id"))
    if m.get("deleted"):
        m["text"] = ""
    summ = reaction_summary(m.pop("reactions", None), uid)
    m["reaction_counts"] = summ["reaction_counts"]
    m["my_reaction"] = summ["my_reaction"]
    return m


async def maybe_send_bot_messages():
    """Lazy CartoonixTV bot: posts the next message when the interval has elapsed.
    Triggered on chat fetch; uses an atomic claim to avoid duplicate sends."""
    cfg = await db.settings.find_one({"key": "chat_bot"})
    if not cfg or not cfg.get("enabled"):
        return
    msgs = [m for m in (cfg.get("messages") or []) if str(m).strip()]
    if not msgs:
        return
    interval = max(1, int(cfg.get("interval_minutes", 30) or 30))
    now = datetime.now(timezone.utc)
    last = cfg.get("last_sent_at")
    if last:
        try:
            if (now - datetime.fromisoformat(last)).total_seconds() < interval * 60:
                return
        except Exception:
            pass
    # atomic claim: only proceed if last_sent_at is still what we read
    claim = await db.settings.find_one_and_update(
        {"key": "chat_bot", "last_sent_at": last},
        {"$set": {"last_sent_at": now.isoformat()}},
    )
    if not claim:
        return
    idx = int(cfg.get("next_index", 0)) % len(msgs)
    text = str(msgs[idx]).strip()
    target = cfg.get("room", "global")
    rooms = ["global", "plus"] if target == "both" else [target if target in ("global", "plus") else "global"]
    for r in rooms:
        await db.chat_messages.insert_one({
            "is_bot": True,
            "room": r,
            "text": text,
            "command": None,
            "name": "CartoonixTV",
            "deleted": False,
            "created_at": now.isoformat(),
        })
    await db.settings.update_one({"key": "chat_bot"}, {"$set": {"next_index": (idx + 1) % len(msgs)}})


CHAT_ONLINE_WINDOW = 45  # seconds a user is considered "on chat" after last chat heartbeat


def _chat_online_threshold() -> str:
    return (datetime.now(timezone.utc) - timedelta(seconds=CHAT_ONLINE_WINDOW)).isoformat()


async def _sender_meta(user_ids: List[str]) -> dict:
    """Return {user_id: {"count": int, "online": bool}} for given sender ids (best-effort)."""
    ids = [u for u in {u for u in user_ids if u}]
    if not ids:
        return {}
    counts = {}
    try:
        pipeline = [
            {"$match": {"user_id": {"$in": ids}, "is_bot": {"$ne": True}}},
            {"$group": {"_id": "$user_id", "c": {"$sum": 1}}},
        ]
        async for row in db.chat_messages.aggregate(pipeline):
            counts[row["_id"]] = row["c"]
    except Exception:
        pass
    online = set()
    thr = _chat_online_threshold()
    or_clauses = [{"id": {"$in": ids}}]
    oid_list = []
    for i in ids:
        try:
            oid_list.append(ObjectId(i))
        except Exception:
            pass
    if oid_list:
        or_clauses.append({"_id": {"$in": oid_list}})
    try:
        users = await db.users.find({"$or": or_clauses}, {"id": 1, "chat_last_seen": 1}).to_list(1000)
        for u in users:
            key = u.get("id") or str(u.get("_id", ""))
            if u.get("chat_last_seen") and str(u["chat_last_seen"]) >= thr:
                online.add(key)
    except Exception:
        pass
    return {i: {"count": counts.get(i, 0), "online": i in online} for i in ids}


async def _enrich_messages(msgs: List[dict]) -> List[dict]:
    meta = await _sender_meta([m.get("user_id") for m in msgs if not m.get("is_bot")])
    for m in msgs:
        info = meta.get(m.get("user_id"))
        m["sender_msg_count"] = info["count"] if info else 0
        m["sender_online"] = info["online"] if info else False
    return msgs


@api_router.get("/chat")
async def get_chat(room: str = "global", after: Optional[str] = None, before: Optional[str] = None,
                   limit: int = 50, user: dict = Depends(get_current_user)):
    if room not in ("global", "plus"):
        room = "global"
    if room == "plus" and not user_is_plus(user):
        raise HTTPException(status_code=403, detail="Camera PLUS este doar pentru membrii Cartoonix PLUS")
    try:
        await maybe_send_bot_messages()
    except Exception as e:
        logger.warning(f"bot send failed: {e}")
    query = {"room": room}
    _uid = uid_of(user)
    if after:
        # incremental poll: everything newer than `after`
        query["created_at"] = {"$gt": after}
        msgs = await db.chat_messages.find(query).sort("created_at", 1).limit(200).to_list(200)
        return {"messages": await _enrich_messages([serialize_msg(m, _uid) for m in msgs]), "has_more": False}
    # historical page (initial = last `limit`, or older via `before`)
    lim = max(1, min(int(limit or 50), 100))
    if before:
        query["created_at"] = {"$lt": before}
    msgs = await db.chat_messages.find(query).sort("created_at", -1).limit(lim + 1).to_list(lim + 1)
    has_more = len(msgs) > lim
    msgs = msgs[:lim]
    msgs.reverse()
    return {"messages": await _enrich_messages([serialize_msg(m, _uid) for m in msgs]), "has_more": has_more}


class ReactInput(BaseModel):
    emoji: str


def _chat_msg_query(msg_id: str) -> dict:
    clauses = [{"id": msg_id}]
    try:
        clauses.append({"_id": ObjectId(msg_id)})
    except Exception:
        pass
    return {"$or": clauses}


@api_router.post("/chat/{msg_id}/react")
async def react_chat(msg_id: str, data: ReactInput, user: dict = Depends(get_current_user)):
    if data.emoji not in ALLOWED_REACTIONS:
        raise HTTPException(status_code=400, detail="Reacție invalidă")
    doc = await db.chat_messages.find_one(_chat_msg_query(msg_id))
    if not doc or doc.get("deleted"):
        raise HTTPException(status_code=404, detail="Mesaj inexistent")
    uid = uid_of(user)
    reactions = dict(doc.get("reactions") or {})
    if reactions.get(uid) == data.emoji:
        reactions.pop(uid, None)  # toggle off
    else:
        reactions[uid] = data.emoji  # single reaction per user
    await db.chat_messages.update_one({"_id": doc["_id"]}, {"$set": {"reactions": reactions}})
    return reaction_summary(reactions, uid)


class ReactionSyncInput(BaseModel):
    ids: List[str]


@api_router.post("/chat/reactions")
async def sync_reactions(data: ReactionSyncInput, user: dict = Depends(get_current_user)):
    uid = uid_of(user)
    ids = data.ids[:300]
    clauses = [{"id": i} for i in ids]
    for i in ids:
        try:
            clauses.append({"_id": ObjectId(i)})
        except Exception:
            pass
    if not clauses:
        return {}
    docs = await db.chat_messages.find({"$or": clauses}).to_list(500)
    result = {}
    for d in docs:
        did = d.get("id") or str(d["_id"])
        result[did] = reaction_summary(d.get("reactions"), uid)
    return result


_chat_stats_cache = {"data": None, "ts": 0.0}
_chat_board_cache = {"data": None, "ts": 0.0}
CHAT_STATS_TTL = 30.0   # seconds
CHAT_BOARD_TTL = 45.0   # seconds


def _now_ts() -> float:
    return datetime.now(timezone.utc).timestamp()


async def _global_chat_stats() -> dict:
    """Heavy, user-agnostic chat stats, cached across all users to protect the DB."""
    if _chat_stats_cache["data"] is not None and (_now_ts() - _chat_stats_cache["ts"]) < CHAT_STATS_TTL:
        return _chat_stats_cache["data"]
    now = datetime.now(timezone.utc)
    chat_thr = _chat_online_threshold()
    plat_thr = (now - timedelta(seconds=60)).isoformat()
    day_ago = (now - timedelta(hours=24)).isoformat()
    online_chat = await db.users.count_documents({"chat_last_seen": {"$gte": chat_thr}})
    online_platform = await db.users.count_documents({"$or": [
        {"last_active": {"$gte": plat_thr}}, {"last_seen": {"$gte": plat_thr}},
    ]})
    messages_today = await db.chat_messages.count_documents({"created_at": {"$gte": day_ago}, "is_bot": {"$ne": True}})
    general_total = await db.chat_messages.count_documents({"room": "global", "is_bot": {"$ne": True}})
    plus_total = await db.chat_messages.count_documents({"room": "plus", "is_bot": {"$ne": True}})
    top_talker = None
    async for row in db.chat_messages.aggregate([
        {"$match": {"is_bot": {"$ne": True}, "user_id": {"$ne": None}}},
        {"$group": {"_id": "$user_id", "c": {"$sum": 1}}},
        {"$sort": {"c": -1}}, {"$limit": 1},
    ]):
        u = await find_user_by_id(row["_id"])
        top_talker = {
            "name": (user_name(u) if u else "") or "Anonim",
            "avatar": user_avatar(u) if u else "",
            "plus": user_is_plus(u) if u else False,
            "count": row["c"],
        }
    data = {
        "online_chat": online_chat,
        "online_platform": online_platform,
        "messages_today": messages_today,
        "general_total": general_total,
        "plus_total": plus_total,
        "top_talker": top_talker,
    }
    _chat_stats_cache["data"] = data
    _chat_stats_cache["ts"] = _now_ts()
    return data


@api_router.post("/chat/heartbeat")
async def chat_heartbeat(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"chat_last_seen": now, "last_active": now}})
    return {"ok": True}


@api_router.get("/chat/stats")
async def chat_stats(user: dict = Depends(get_current_user)):
    g = await _global_chat_stats()
    my_count = await db.chat_messages.count_documents({"user_id": uid_of(user), "is_bot": {"$ne": True}})
    return {**g, "my_count": my_count}


@api_router.get("/chat/leaderboard")
async def chat_leaderboard(user: dict = Depends(get_current_user)):
    if _chat_board_cache["data"] is not None and (_now_ts() - _chat_board_cache["ts"]) < CHAT_BOARD_TTL:
        return _chat_board_cache["data"]
    thr = _chat_online_threshold()
    rows = []
    async for row in db.chat_messages.aggregate([
        {"$match": {"is_bot": {"$ne": True}, "user_id": {"$ne": None}}},
        {"$group": {"_id": "$user_id", "c": {"$sum": 1}}},
        {"$sort": {"c": -1}}, {"$limit": 10},
    ]):
        rows.append(row)
    result = []
    for i, row in enumerate(rows):
        u = await find_user_by_id(row["_id"])
        online = bool(u and u.get("chat_last_seen") and str(u["chat_last_seen"]) >= thr)
        result.append({
            "rank": i + 1,
            "id": row["_id"],
            "name": (user_name(u) if u else "") or "Anonim",
            "avatar": user_avatar(u) if u else "",
            "plus": user_is_plus(u) if u else False,
            "role": (u.get("role") if u else "user") or "user",
            "count": row["c"],
            "online": online,
        })
    payload = {"top": result}
    _chat_board_cache["data"] = payload
    _chat_board_cache["ts"] = _now_ts()
    return payload


class PinInput(BaseModel):
    msg_id: str


@api_router.post("/admin/chat/pin")
async def admin_pin_message(data: PinInput, admin: dict = Depends(require_admin)):
    doc = await db.chat_messages.find_one(_chat_msg_query(data.msg_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Mesaj inexistent")
    await db.chat_messages.update_one(
        {"_id": doc["_id"]},
        {"$set": {"pinned": True, "pinned_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


@api_router.post("/admin/chat/unpin")
async def admin_unpin_message(data: PinInput, admin: dict = Depends(require_admin)):
    doc = await db.chat_messages.find_one(_chat_msg_query(data.msg_id))
    if doc:
        await db.chat_messages.update_one({"_id": doc["_id"]}, {"$set": {"pinned": False}})
    return {"ok": True}


@api_router.get("/chat/pinned")
async def get_pinned(room: str = "global", user: dict = Depends(get_current_user)):
    if room not in ("global", "plus"):
        room = "global"
    if room == "plus" and not user_is_plus(user):
        return {"pinned": []}
    docs = await db.chat_messages.find(
        {"room": room, "pinned": True, "deleted": {"$ne": True}}
    ).sort("pinned_at", -1).limit(5).to_list(5)
    return {"pinned": [serialize_msg(m, uid_of(user)) for m in docs]}


ADMIN_CHAT_COMMANDS = {"important", "announce", "warn", "success", "info"}
CHAT_COOLDOWN_SECONDS = 10


@api_router.post("/chat")
async def post_chat(data: ChatInput, user: dict = Depends(get_current_user)):
  try:
    room = data.room if data.room in ("global", "plus") else "global"
    if room == "plus" and not user_is_plus(user):
        raise HTTPException(status_code=403, detail="Camera PLUS este doar pentru membrii Cartoonix PLUS")

    # muted users (non-admin) cannot post
    if user.get("role") != "admin" and user_is_muted(user):
        _, until = mute_remaining(user)
        detail = "Ai fost redus la tăcere de un moderator și nu poți trimite mesaje."
        raise HTTPException(status_code=403, detail=detail)

    # rate limit: 10s cooldown between messages (non-admin)
    if user.get("role") != "admin":
        last = await db.chat_messages.find_one({"user_id": uid_of(user)}, sort=[("created_at", -1)])
        if last and last.get("created_at"):
            try:
                last_dt = datetime.fromisoformat(str(last["created_at"]))
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)
                elapsed = (datetime.now(timezone.utc) - last_dt).total_seconds()
                if elapsed < CHAT_COOLDOWN_SECONDS:
                    wait = max(1, int(CHAT_COOLDOWN_SECONDS - elapsed) + 1)
                    raise HTTPException(status_code=429, detail=f"Așteaptă {wait}s înainte de a trimite alt mesaj.")
            except HTTPException:
                raise
            except Exception:
                pass

    raw = data.text.strip()
    command = None
    text = raw

    # Admin-only chat commands: /important <text>, /announce <text>, /warn <text>, etc.
    if raw.startswith("/") and user.get("role") == "admin":
        parts = raw.split(None, 1)
        cmd = parts[0][1:].lower().strip()
        body = parts[1].strip() if len(parts) > 1 else ""
        if cmd in ADMIN_CHAT_COMMANDS and body:
            command = cmd
            text = body

    # optional quote/reply (only name + text kept)
    quote = None
    if isinstance(data.quote, dict):
        qn = str(data.quote.get("name") or "").strip()[:60]
        qt = str(data.quote.get("text") or "").strip()[:200]
        if qn and qt:
            quote = {"name": qn, "text": qt}

    doc = {
        "user_id": uid_of(user),
        "name": user_name(user) or "Anonim",
        "avatar": user_avatar(user),
        "plus": user_is_plus(user),
        "role": user.get("role", "user"),
        "room": room,
        "text": text,
        "command": command,
        "quote": quote,
        "is_bot": False,
        "deleted": False,
        "chat_style": sanitize_chat_style(user.get("chat_style")) if user_is_plus(user) else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    oid = ObjectId()
    doc["_id"] = oid
    doc["id"] = str(oid)  # set BEFORE insert to satisfy any legacy unique `id` index
    await db.chat_messages.insert_one(doc)
    doc.pop("_id", None)
    meta = await _sender_meta([doc["user_id"]])
    info = meta.get(doc["user_id"])
    doc["sender_msg_count"] = info["count"] if info else 1
    doc["sender_online"] = True  # you just posted
    doc["reaction_counts"] = {}
    doc["my_reaction"] = None
    return doc
  except HTTPException:
    raise
  except Exception as e:
    import traceback
    logger.error(f"[POST /chat] 500 for user={user.get('email')} id={user.get('id')}: {e}\n{traceback.format_exc()}")
    raise HTTPException(status_code=500, detail="Nu s-a putut trimite mesajul. Încearcă din nou.")


# ---------- suggestions ----------
class SuggestionInput(BaseModel):
    text: str = Field(min_length=3, max_length=1000)


async def _last_suggestion(user_id: str):
    return await db.suggestions.find_one({"user_id": user_id}, sort=[("created_at", -1)])


@api_router.get("/suggestions/can")
async def can_suggest(user: dict = Depends(get_current_user)):
    last = await _last_suggestion(uid_of(user))
    if not last:
        return {"can": True, "next_at": None}
    last_dt = datetime.fromisoformat(last["created_at"])
    next_dt = last_dt + timedelta(hours=24)
    now = datetime.now(timezone.utc)
    return {"can": now >= next_dt, "next_at": next_dt.isoformat()}


@api_router.post("/suggestions")
async def create_suggestion(data: SuggestionInput, user: dict = Depends(get_current_user)):
    last = await _last_suggestion(uid_of(user))
    if last:
        last_dt = datetime.fromisoformat(last["created_at"])
        if datetime.now(timezone.utc) < last_dt + timedelta(hours=24):
            raise HTTPException(status_code=429, detail="Poți trimite o singură sugestie la 24 de ore. Revino mai târziu!")
    doc = {
        "user_id": uid_of(user),
        "name": user_name(user),
        "email": user.get("email", ""),
        "text": data.text.strip(),
        "status": "nou",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.suggestions.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/admin/suggestions")
async def list_suggestions(admin: dict = Depends(require_admin)):
    sugs = await db.suggestions.find({}).sort("created_at", -1).to_list(500)
    for s in sugs:
        s["id"] = str(s.pop("_id"))
    return sugs


# ---------- admin: users management ----------
class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    plus: Optional[bool] = None
    banned: Optional[bool] = None
    role: Optional[str] = None


class PasswordReset(BaseModel):
    password: str = Field(min_length=6)


class BanIpInput(BaseModel):
    ip: str
    reason: Optional[str] = ""


@api_router.get("/admin/users")
async def admin_list_users(q: Optional[str] = None, page: int = 1, per_page: int = 20, admin: dict = Depends(require_admin)):
    query = {}
    if q:
        query = {"$or": [
            {"email": {"$regex": q, "$options": "i"}},
            {"nickname": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}},
        ]}
    per_page = max(1, min(per_page, 100))
    page = max(1, page)
    total = await db.users.count_documents(query)
    skip = (page - 1) * per_page
    users = await db.users.find(query).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    total_all = await db.users.count_documents({})
    plus = await db.users.count_documents({"$or": [{"subscription": "plus"}, {"plus": True}]})
    free = total_all - plus
    return {
        "users": [serialize_user(u) for u in users],
        "total": total,
        "page": page,
        "pages": max(1, (total + per_page - 1) // per_page),
        "per_page": per_page,
        "stats": {"total": total_all, "plus": plus, "free": free},
    }


@api_router.put("/admin/users/{uid}")
async def admin_update_user(uid: str, data: AdminUserUpdate, admin: dict = Depends(require_admin)):
    raw = {k: v for k, v in data.model_dump().items() if v is not None}
    target = await find_user_by_id(uid)
    if not target:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    updates = {}
    if "email" in raw:
        new_email = raw["email"].lower()
        clash = await db.users.find_one({"email": new_email, "_id": {"$ne": target["_id"]}})
        if clash:
            raise HTTPException(status_code=400, detail="Email deja folosit de alt cont")
        updates["email"] = new_email
    if "name" in raw:
        updates["nickname"] = raw["name"]
    if "plus" in raw:
        updates["subscription"] = "plus" if raw["plus"] else "free"
    if "banned" in raw:
        updates["banned"] = raw["banned"]
    if "role" in raw:
        updates["role"] = raw["role"]
    if updates:
        await db.users.update_one({"_id": target["_id"]}, {"$set": updates})
    user = await db.users.find_one({"_id": target["_id"]})
    return serialize_user(user)


@api_router.put("/admin/users/{uid}/password")
async def admin_reset_password(uid: str, data: PasswordReset, admin: dict = Depends(require_admin)):
    target = await find_user_by_id(uid)
    if not target:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    await db.users.update_one({"_id": target["_id"]}, {"$set": {"password_hash": hash_password(data.password)}})
    return {"ok": True}


@api_router.delete("/admin/users/{uid}")
async def admin_delete_user(uid: str, admin: dict = Depends(require_admin)):
    if uid_of(admin) == uid:
        raise HTTPException(status_code=400, detail="Nu te poți șterge pe tine")
    target = await find_user_by_id(uid)
    if not target:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    await db.users.delete_one({"_id": target["_id"]})
    return {"ok": True}


@api_router.get("/admin/banned-ips")
async def admin_banned_ips(admin: dict = Depends(require_admin)):
    ips = await db.banned_ips.find({}).sort("created_at", -1).to_list(500)
    for i in ips:
        i["id"] = str(i.pop("_id"))
    return ips


@api_router.post("/admin/ban-ip")
async def admin_ban_ip(data: BanIpInput, admin: dict = Depends(require_admin)):
    if not data.ip.strip():
        raise HTTPException(status_code=400, detail="IP invalid")
    existing = await db.banned_ips.find_one({"ip": data.ip.strip()})
    if not existing:
        await db.banned_ips.insert_one({
            "ip": data.ip.strip(),
            "reason": data.reason,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return {"ok": True}


@api_router.delete("/admin/ban-ip/{ip}")
async def admin_unban_ip(ip: str, admin: dict = Depends(require_admin)):
    await db.banned_ips.delete_one({"ip": ip})
    return {"ok": True}


# ---------- admin: show edit / reorder ----------
class ShowUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    banner: Optional[str] = None
    category: Optional[str] = None
    channel: Optional[str] = None
    year: Optional[str] = None
    genres: Optional[List[str]] = None
    order: Optional[int] = None
    episodes: Optional[List[Episode]] = None
    download_disabled: Optional[bool] = None


@api_router.put("/admin/shows/{sid}")
async def admin_update_show(sid: str, data: ShowUpdate, admin: dict = Depends(require_admin)):
    updates = {}
    for k, v in data.model_dump().items():
        if v is None:
            continue
        if k == "episodes":
            updates[k] = [e for e in v]
        else:
            updates[k] = v
    if updates:
        await db.shows.update_one({"_id": ObjectId(sid)}, {"$set": updates})
    show = await db.shows.find_one({"_id": ObjectId(sid)})
    if not show:
        raise HTTPException(status_code=404, detail="Desen inexistent")
    return serialize_show(show)


@api_router.delete("/admin/shows/{sid}")
async def admin_delete_show(sid: str, admin: dict = Depends(require_admin)):
    await db.shows.delete_one({"_id": ObjectId(sid)})
    return {"ok": True}


class ReorderInput(BaseModel):
    ordered_ids: List[str]


@api_router.post("/admin/shows/reorder")
async def admin_reorder_shows(data: ReorderInput, admin: dict = Depends(require_admin)):
    for idx, sid in enumerate(data.ordered_ids):
        await db.shows.update_one({"_id": ObjectId(sid)}, {"$set": {"order": idx}})
    return {"ok": True}


# ---------- watch progress ----------
class ProgressInput(BaseModel):
    show_id: str
    episode_number: int
    position: float = 0
    duration: float = 0
    completed: bool = False


@api_router.post("/progress")
async def save_progress(data: ProgressInput, user: dict = Depends(get_current_user)):
    key = f"{data.show_id}:{data.episode_number}"
    doc = {
        "user_id": uid_of(user),
        "key": key,
        "show_id": data.show_id,
        "episode_number": data.episode_number,
        "position": data.position,
        "duration": data.duration,
        "completed": data.completed,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.watch_progress.update_one(
        {"user_id": uid_of(user), "key": key},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True}


@api_router.get("/progress/{show_id}")
async def get_show_progress(show_id: str, user: dict = Depends(get_current_user)):
    rows = await db.watch_progress.find({"user_id": uid_of(user), "show_id": show_id}).to_list(500)
    result = {}
    for r in rows:
        result[str(r["episode_number"])] = {
            "position": r.get("position", 0),
            "duration": r.get("duration", 0),
            "completed": r.get("completed", False),
        }
    return result


# ---------- support tickets (Solicitările mele) ----------
TICKET_STATUSES = ("open", "in_progress", "resolved")
MAX_ATTACHMENT_CHARS = 4_800_000  # ~3.5MB image once base64-encoded


class TicketCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=140)
    message: str = Field(min_length=5, max_length=4000)
    attachment: Optional[str] = None  # data URL "data:image/...;base64,..."


class TicketReply(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class TicketStatusUpdate(BaseModel):
    status: str


def _validate_attachment(attachment: Optional[str]) -> Optional[str]:
    if not attachment:
        return None
    if not attachment.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Atașamentul trebuie să fie o imagine")
    if len(attachment) > MAX_ATTACHMENT_CHARS:
        raise HTTPException(status_code=400, detail="Imaginea este prea mare (max ~3MB)")
    return attachment


def serialize_ticket(doc: dict) -> dict:
    return {
        "id": doc.get("id"),
        "user_id": doc.get("user_id"),
        "user_name": doc.get("user_name", ""),
        "user_email": doc.get("user_email", ""),
        "subject": doc.get("subject", ""),
        "message": doc.get("message", ""),
        "attachment": doc.get("attachment"),
        "status": doc.get("status", "open"),
        "replies": doc.get("replies", []),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


@api_router.post("/tickets")
async def create_ticket(data: TicketCreate, user: dict = Depends(get_current_user)):
    open_existing = await db.support_tickets.find_one({
        "user_id": uid_of(user),
        "status": {"$ne": "resolved"},
    })
    if open_existing:
        raise HTTPException(status_code=400, detail="Ai deja o solicitare deschisă. Poți deschide una nouă după ce cea curentă este rezolvată.")
    attachment = _validate_attachment(data.attachment)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid_of(user),
        "user_name": user_name(user),
        "user_email": user.get("email", ""),
        "subject": data.subject.strip(),
        "message": data.message.strip(),
        "attachment": attachment,
        "status": "open",
        "replies": [],
        "created_at": now,
        "updated_at": now,
    }
    await db.support_tickets.insert_one(doc)
    return serialize_ticket(doc)


@api_router.get("/tickets/my")
async def my_tickets(user: dict = Depends(get_current_user)):
    rows = await db.support_tickets.find({"user_id": uid_of(user)}).sort("created_at", -1).to_list(100)
    return [serialize_ticket(t) for t in rows]


@api_router.post("/tickets/{tid}/reply")
async def user_reply_ticket(tid: str, data: TicketReply, user: dict = Depends(get_current_user)):
    ticket = await db.support_tickets.find_one({"id": tid, "user_id": uid_of(user)})
    if not ticket:
        raise HTTPException(status_code=404, detail="Solicitare inexistentă")
    if ticket.get("status") == "resolved":
        raise HTTPException(status_code=400, detail="Solicitarea este rezolvată. Deschide una nouă.")
    now = datetime.now(timezone.utc).isoformat()
    reply = {"from": "user", "author": user_name(user), "text": data.text.strip(), "created_at": now}
    await db.support_tickets.update_one({"id": tid}, {"$push": {"replies": reply}, "$set": {"updated_at": now}})
    ticket = await db.support_tickets.find_one({"id": tid})
    return serialize_ticket(ticket)


@api_router.get("/admin/tickets")
async def admin_list_tickets(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    query = {}
    if status and status in TICKET_STATUSES:
        query["status"] = status
    rows = await db.support_tickets.find(query).sort("updated_at", -1).to_list(500)
    return [serialize_ticket(t) for t in rows]


@api_router.post("/admin/tickets/{tid}/reply")
async def admin_reply_ticket(tid: str, data: TicketReply, admin: dict = Depends(require_admin)):
    ticket = await db.support_tickets.find_one({"id": tid})
    if not ticket:
        raise HTTPException(status_code=404, detail="Solicitare inexistentă")
    now = datetime.now(timezone.utc).isoformat()
    reply = {"from": "admin", "author": "Echipa Cartoonix", "text": data.text.strip(), "created_at": now}
    new_status = "in_progress" if ticket.get("status") == "open" else ticket.get("status")
    await db.support_tickets.update_one({"id": tid}, {"$push": {"replies": reply}, "$set": {"updated_at": now, "status": new_status}})
    # notify the ticket owner (appears in the bell)
    await db.notifications.insert_one({
        "user_id": ticket.get("user_id"),
        "title": "Răspuns la solicitarea ta",
        "body": f"Echipa Cartoonix a răspuns la „{ticket.get('subject', 'solicitarea ta')}”.",
        "cta_label": "Vezi solicitarea",
        "cta_link": "/support",
        "created_at": now,
    })
    ticket = await db.support_tickets.find_one({"id": tid})
    return serialize_ticket(ticket)


@api_router.put("/admin/tickets/{tid}/status")
async def admin_update_ticket_status(tid: str, data: TicketStatusUpdate, admin: dict = Depends(require_admin)):
    if data.status not in TICKET_STATUSES:
        raise HTTPException(status_code=400, detail="Status invalid")
    ticket = await db.support_tickets.find_one({"id": tid})
    if not ticket:
        raise HTTPException(status_code=404, detail="Solicitare inexistentă")
    now = datetime.now(timezone.utc).isoformat()
    await db.support_tickets.update_one({"id": tid}, {"$set": {"status": data.status, "updated_at": now}})
    ticket = await db.support_tickets.find_one({"id": tid})
    return serialize_ticket(ticket)


# ---------- presence & time tracking ----------
@api_router.post("/presence")
async def heartbeat(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    add = 0
    last = user.get("last_active") or user.get("last_seen")
    if last:
        try:
            delta = (now - datetime.fromisoformat(last)).total_seconds()
            if 0 < delta <= 90:
                add = int(delta)
        except Exception:
            add = 0
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_active": now.isoformat()}, "$inc": {"presence_seconds": add}},
    )
    return {"ok": True}


@api_router.get("/presence/online")
async def online_count():
    threshold = (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()
    count = await db.users.count_documents({"$or": [
        {"last_active": {"$gte": threshold}},
        {"last_seen": {"$gte": threshold}},
    ]})
    return {"online": count}


# ---------- leaderboard (Clasament) ----------
def _hours_label(seconds) -> str:
    s = int(seconds or 0)
    h, m = s // 3600, (s % 3600) // 60
    if h and m:
        return f"{h}h {m}m"
    if h:
        return f"{h}h"
    return f"{m}m"


def _leaderboard_entry(u: dict, rank: int, threshold: str) -> dict:
    secs = u.get("presence_seconds", u.get("total_time_seconds", 0)) or 0
    la = u.get("last_active") or u.get("last_seen")
    return {
        "rank": rank,
        "id": uid_of(u),
        "name": user_name(u),
        "avatar": user_avatar(u),
        "plus": user_is_plus(u),
        "seconds": int(secs),
        "hours_label": _hours_label(secs),
        "online": bool(la and str(la) >= threshold),
    }


@api_router.get("/leaderboard")
async def leaderboard(q: Optional[str] = None, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    threshold = (now - timedelta(seconds=60)).isoformat()

    top_docs = await db.users.find({}).sort("presence_seconds", -1).to_list(10)
    top = [_leaderboard_entry(u, i + 1, threshold) for i, u in enumerate(top_docs)]

    my_secs = user.get("presence_seconds", user.get("total_time_seconds", 0)) or 0
    my_rank = await db.users.count_documents({"presence_seconds": {"$gt": my_secs}}) + 1
    me = _leaderboard_entry(user, my_rank, threshold)

    resp = {"top": top, "me": me}

    if q and q.strip():
        docs = await db.users.find(
            {"nickname": {"$regex": re.escape(q.strip()), "$options": "i"}}
        ).sort("presence_seconds", -1).to_list(20)
        results = []
        for u in docs:
            s = u.get("presence_seconds", u.get("total_time_seconds", 0)) or 0
            r = await db.users.count_documents({"presence_seconds": {"$gt": s}}) + 1
            results.append(_leaderboard_entry(u, r, threshold))
        resp["results"] = results

    return resp


# ---------- WatchParty ----------
def _wp_max_others(user: dict) -> int:
    return 4 if user_is_plus(user) else 1


async def _wp_resolve_items(refs: List[dict]) -> List[dict]:
    items = []
    for r in refs or []:
        sid = str(r.get("show_id") or "")
        try:
            num = int(r.get("episode_number"))
        except Exception:
            continue
        try:
            show = await db.shows.find_one({"_id": ObjectId(sid)})
        except Exception:
            show = None
        if not show:
            continue
        ep = next((e for e in show.get("episodes", []) if int(e.get("number", -1)) == num), None)
        if not ep:
            continue
        items.append({
            "show_id": sid,
            "show_title": show.get("title", ""),
            "thumbnail": show.get("thumbnail", ""),
            "episode_number": num,
            "episode_title": ep.get("title", ""),
            "video_url": ep.get("video_url", ""),
        })
    return items


def _wp_serialize(room: dict, viewer_id: str) -> dict:
    others_accepted = [p for p in room.get("participants", []) if p["id"] != room["owner_id"]]
    pending = [i for i in room.get("invited", []) if i.get("status") == "pending"]
    return {
        "id": room["id"],
        "owner_id": room["owner_id"],
        "owner_name": room.get("owner_name", ""),
        "owner_avatar": room.get("owner_avatar", ""),
        "status": room.get("status", "active"),
        "is_owner": viewer_id == room["owner_id"],
        "max_others": room.get("max_others", 1),
        "participants": room.get("participants", []),
        "invited": room.get("invited", []),
        "playlist": room.get("playlist", []),
        "current_index": room.get("current_index", 0),
        "is_playing": room.get("is_playing", False),
        "position": room.get("position", 0),
        "updated_at": room.get("updated_at"),
        "server_time": datetime.now(timezone.utc).isoformat(),
        "slots_used": len(others_accepted) + len(pending),
    }


async def _wp_get_room(room_id: str) -> dict:
    room = await db.watchparties.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Watch party inexistent")
    return room


def _wp_is_participant(room: dict, uid: str) -> bool:
    return any(p["id"] == uid for p in room.get("participants", []))


class WPRef(BaseModel):
    show_id: str
    episode_number: int


class WPCreate(BaseModel):
    playlist: Optional[List[WPRef]] = None


class WPInvite(BaseModel):
    username: str


class WPRespond(BaseModel):
    accept: bool


class WPPlaylist(BaseModel):
    action: str  # add | remove | reorder
    show_id: Optional[str] = None
    episode_number: Optional[int] = None
    index: Optional[int] = None
    order: Optional[List[int]] = None


class WPControl(BaseModel):
    action: str  # play | pause | seek | next | prev | select
    position: Optional[float] = None
    index: Optional[int] = None


@api_router.post("/watchparty/create")
async def wp_create(data: WPCreate, user: dict = Depends(get_current_user)):
    uid = uid_of(user)
    # End any previous active room owned by this user
    await db.watchparties.update_many({"owner_id": uid, "status": "active"}, {"$set": {"status": "ended"}})
    items = await _wp_resolve_items([r.model_dump() for r in (data.playlist or [])])
    now = datetime.now(timezone.utc).isoformat()
    room = {
        "id": str(uuid.uuid4()),
        "owner_id": uid,
        "owner_name": user_name(user),
        "owner_avatar": user_avatar(user),
        "status": "active",
        "max_others": _wp_max_others(user),
        "participants": [{"id": uid, "name": user_name(user), "avatar": user_avatar(user), "joined_at": now}],
        "invited": [],
        "playlist": items,
        "current_index": 0,
        "is_playing": False,
        "position": 0,
        "updated_at": now,
        "created_at": now,
    }
    await db.watchparties.insert_one(room)
    return _wp_serialize(room, uid)


@api_router.get("/watchparty/current")
async def wp_current(user: dict = Depends(get_current_user)):
    uid = uid_of(user)
    room = await db.watchparties.find_one({"status": "active", "participants.id": uid})
    return _wp_serialize(room, uid) if room else None


@api_router.get("/watchparty/invitations")
async def wp_invitations(user: dict = Depends(get_current_user)):
    uid = uid_of(user)
    rooms = await db.watchparties.find({"status": "active", "invited": {"$elemMatch": {"id": uid, "status": "pending"}}}).to_list(20)
    return [
        {"id": r["id"], "owner_name": r.get("owner_name", ""), "owner_avatar": r.get("owner_avatar", ""),
         "playlist_count": len(r.get("playlist", []))}
        for r in rooms
    ]


@api_router.get("/watchparty/{room_id}")
async def wp_get(room_id: str, user: dict = Depends(get_current_user)):
    uid = uid_of(user)
    room = await _wp_get_room(room_id)
    invited = any(i["id"] == uid and i.get("status") == "pending" for i in room.get("invited", []))
    if not (_wp_is_participant(room, uid) or invited):
        raise HTTPException(status_code=403, detail="Nu ai acces la acest watch party")
    return _wp_serialize(room, uid)


@api_router.post("/watchparty/{room_id}/invite")
async def wp_invite(room_id: str, data: WPInvite, user: dict = Depends(get_current_user)):
    uid = uid_of(user)
    room = await _wp_get_room(room_id)
    if room["owner_id"] != uid:
        raise HTTPException(status_code=403, detail="Doar owner-ul poate invita")
    if room.get("status") != "active":
        raise HTTPException(status_code=400, detail="Watch party încheiat")
    others = [p for p in room["participants"] if p["id"] != uid]
    pending = [i for i in room["invited"] if i.get("status") == "pending"]
    if len(others) + len(pending) >= room["max_others"]:
        raise HTTPException(status_code=400, detail=f"Limită atinsă ({room['max_others']} invitați). Treci la PLUS pentru mai mulți.")
    uname = data.username.strip()
    target = await db.users.find_one({"nickname": {"$regex": f"^{re.escape(uname)}$", "$options": "i"}})
    if not target:
        raise HTTPException(status_code=404, detail=f"Utilizatorul „{uname}” nu există")
    tid = uid_of(target)
    if tid == uid:
        raise HTTPException(status_code=400, detail="Nu te poți invita pe tine")
    if _wp_is_participant(room, tid) or any(i["id"] == tid and i.get("status") == "pending" for i in room["invited"]):
        raise HTTPException(status_code=400, detail="Utilizatorul e deja invitat sau în cameră")
    now = datetime.now(timezone.utc).isoformat()
    invite = {"id": tid, "name": user_name(target), "avatar": user_avatar(target), "status": "pending", "invited_at": now}
    await db.watchparties.update_one({"id": room_id}, {"$push": {"invited": invite}})
    await db.notifications.insert_one({
        "user_id": tid,
        "type": "watchparty_invite",
        "room_id": room_id,
        "title": "Invitație Watch Party",
        "body": f"{user_name(user)} te-a invitat la un watch party.",
        "created_at": now,
    })
    room = await _wp_get_room(room_id)
    return _wp_serialize(room, uid)


@api_router.post("/watchparty/{room_id}/respond")
async def wp_respond(room_id: str, data: WPRespond, user: dict = Depends(get_current_user)):
    uid = uid_of(user)
    room = await _wp_get_room(room_id)
    now = datetime.now(timezone.utc).isoformat()

    # Always clear the invite notification for this user+room (so it can't be re-clicked)
    async def _clear_notif():
        await db.notifications.delete_many({"user_id": uid, "type": "watchparty_invite", "room_id": room_id})

    # Idempotency guard: if the user is already a participant, they've already accepted.
    if _wp_is_participant(room, uid):
        await _clear_notif()
        raise HTTPException(status_code=400, detail="Ai acceptat deja invitația.")

    # Must have a pending invite; otherwise it's no longer available.
    has_pending = any(i["id"] == uid and i.get("status") == "pending" for i in room.get("invited", []))
    if not has_pending or room.get("status") != "active":
        await _clear_notif()
        raise HTTPException(status_code=400, detail="Invitația nu mai este disponibilă sau watch party-ul s-a încheiat.")

    if not data.accept:
        await db.watchparties.update_one(
            {"id": room_id},
            {"$set": {"invited.$[e].status": "declined"}},
            array_filters=[{"e.id": uid, "e.status": "pending"}],
        )
        await _clear_notif()
        return {"ok": True, "accepted": False}

    # Capacity pre-check (best-effort)
    others = [p for p in room["participants"] if p["id"] != room["owner_id"]]
    if len(others) >= room["max_others"]:
        await _clear_notif()
        raise HTTPException(status_code=400, detail="Camera este plină")

    # Atomic accept: only matches if still active, has a pending invite, and user is NOT already a participant.
    res = await db.watchparties.update_one(
        {
            "id": room_id,
            "status": "active",
            "invited": {"$elemMatch": {"id": uid, "status": "pending"}},
            "participants.id": {"$ne": uid},
        },
        {
            "$set": {"invited.$[e].status": "accepted"},
            "$push": {"participants": {"id": uid, "name": user_name(user), "avatar": user_avatar(user), "joined_at": now}},
        },
        array_filters=[{"e.id": uid, "e.status": "pending"}],
    )
    await _clear_notif()
    if res.modified_count == 0:
        # Someone/something already handled it (concurrent accept, room ended, etc.)
        raise HTTPException(status_code=400, detail="Ai acceptat deja invitația sau watch party-ul nu mai e disponibil.")
    room = await _wp_get_room(room_id)
    return _wp_serialize(room, uid)


@api_router.post("/watchparty/{room_id}/playlist")
async def wp_playlist(room_id: str, data: WPPlaylist, user: dict = Depends(get_current_user)):
    uid = uid_of(user)
    room = await _wp_get_room(room_id)
    if room["owner_id"] != uid:
        raise HTTPException(status_code=403, detail="Doar owner-ul poate modifica lista")
    playlist = room.get("playlist", [])
    if data.action == "add":
        items = await _wp_resolve_items([{"show_id": data.show_id, "episode_number": data.episode_number}])
        if not items:
            raise HTTPException(status_code=404, detail="Episod inexistent")
        playlist = playlist + items
    elif data.action == "remove":
        if data.index is None or not (0 <= data.index < len(playlist)):
            raise HTTPException(status_code=400, detail="Index invalid")
        playlist = [p for i, p in enumerate(playlist) if i != data.index]
    elif data.action == "reorder":
        if not data.order or sorted(data.order) != list(range(len(playlist))):
            raise HTTPException(status_code=400, detail="Ordine invalidă")
        playlist = [playlist[i] for i in data.order]
    else:
        raise HTTPException(status_code=400, detail="Acțiune necunoscută")
    ci = min(room.get("current_index", 0), max(0, len(playlist) - 1))
    await db.watchparties.update_one({"id": room_id}, {"$set": {"playlist": playlist, "current_index": ci}})
    room = await _wp_get_room(room_id)
    return _wp_serialize(room, uid)


@api_router.post("/watchparty/{room_id}/control")
async def wp_control(room_id: str, data: WPControl, user: dict = Depends(get_current_user)):
    uid = uid_of(user)
    room = await _wp_get_room(room_id)
    if room["owner_id"] != uid:
        raise HTTPException(status_code=403, detail="Doar owner-ul controlează redarea")
    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now}
    plen = len(room.get("playlist", []))
    ci = room.get("current_index", 0)
    if data.action == "play":
        updates["is_playing"] = True
        if data.position is not None:
            updates["position"] = max(0, data.position)
    elif data.action == "pause":
        updates["is_playing"] = False
        if data.position is not None:
            updates["position"] = max(0, data.position)
    elif data.action == "seek":
        updates["position"] = max(0, data.position or 0)
    elif data.action == "next":
        updates["current_index"] = min(ci + 1, max(0, plen - 1))
        updates["position"] = 0
        updates["is_playing"] = True
    elif data.action == "prev":
        updates["current_index"] = max(ci - 1, 0)
        updates["position"] = 0
        updates["is_playing"] = True
    elif data.action == "select":
        if data.index is None or not (0 <= data.index < plen):
            raise HTTPException(status_code=400, detail="Index invalid")
        updates["current_index"] = data.index
        updates["position"] = 0
        updates["is_playing"] = True
    else:
        raise HTTPException(status_code=400, detail="Acțiune necunoscută")
    await db.watchparties.update_one({"id": room_id}, {"$set": updates})
    room = await _wp_get_room(room_id)
    return _wp_serialize(room, uid)


@api_router.post("/watchparty/{room_id}/leave")
async def wp_leave(room_id: str, user: dict = Depends(get_current_user)):
    uid = uid_of(user)
    room = await _wp_get_room(room_id)
    if room["owner_id"] == uid:
        await db.watchparties.update_one({"id": room_id}, {"$set": {"status": "ended"}})
        return {"ok": True, "ended": True}
    await db.watchparties.update_one({"id": room_id}, {"$pull": {"participants": {"id": uid}}})
    return {"ok": True, "ended": False}


@api_router.post("/watchparty/{room_id}/end")
async def wp_end(room_id: str, user: dict = Depends(get_current_user)):
    uid = uid_of(user)
    room = await _wp_get_room(room_id)
    if room["owner_id"] != uid:
        raise HTTPException(status_code=403, detail="Doar owner-ul poate încheia")
    await db.watchparties.update_one({"id": room_id}, {"$set": {"status": "ended"}})
    return {"ok": True, "ended": True}





# ---------- promo popup (editable from admin) ----------
class PromoPopupInput(BaseModel):
    enabled: bool = False
    title: Optional[str] = ""
    message: Optional[str] = ""
    price_old: Optional[str] = ""
    price_new: Optional[str] = ""
    cta_label: Optional[str] = ""
    cta_link: Optional[str] = ""


PROMO_DEFAULT = {
    "enabled": False,
    "title": "Ofertă PLUS – acces și la aplicația TV!",
    "message": "Abonează-te acum la Cartoonix PLUS și primești GRATUIT acces și la aplicația de TV! Plată unică, o singură dată.",
    "price_old": "80 RON",
    "price_new": "50 RON",
    "cta_label": "Vreau PLUS",
    "cta_link": "/plus",
}


@api_router.get("/settings/promo-popup")
async def get_promo_popup():
    s = await db.settings.find_one({"key": "promo_popup"})
    if not s:
        return PROMO_DEFAULT
    return {k: s.get(k, PROMO_DEFAULT.get(k)) for k in PROMO_DEFAULT}


@api_router.post("/admin/promo-popup")
async def set_promo_popup(data: PromoPopupInput, admin: dict = Depends(require_admin)):
    payload = {"key": "promo_popup", **data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.settings.update_one({"key": "promo_popup"}, {"$set": payload}, upsert=True)
    return {k: data.model_dump().get(k) for k in PROMO_DEFAULT}


# ---------- chat widget (floating CTA, editable from admin) ----------
class ChatWidgetInput(BaseModel):
    enabled: bool = False
    text: Optional[str] = ""
    image_url: Optional[str] = ""
    link: Optional[str] = ""


CHAT_WIDGET_DEFAULT = {
    "enabled": True,
    "text": "Hai la discuție, hai pe chat!",
    "image_url": "/chat-widget-bg.webp",
    "link": "/lobby/chat",
}


@api_router.get("/settings/chat-widget")
async def get_chat_widget():
    s = await db.settings.find_one({"key": "chat_widget"})
    if not s:
        return CHAT_WIDGET_DEFAULT
    return {k: s.get(k, CHAT_WIDGET_DEFAULT.get(k)) for k in CHAT_WIDGET_DEFAULT}


@api_router.post("/admin/chat-widget")
async def set_chat_widget(data: ChatWidgetInput, admin: dict = Depends(require_admin)):
    payload = {"key": "chat_widget", **data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.settings.update_one({"key": "chat_widget"}, {"$set": payload}, upsert=True)
    return {k: data.model_dump().get(k) for k in CHAT_WIDGET_DEFAULT}


# ---------- plus widget (floating CTA, editable from admin) ----------
PLUS_WIDGET_DEFAULT = {
    "enabled": True,
    "text": "Abonează-te la Cartoonix PLUS!",
    "image_url": "/plus-widget-bg.webp",
    "link": "/plus",
}


@api_router.get("/settings/plus-widget")
async def get_plus_widget():
    s = await db.settings.find_one({"key": "plus_widget"})
    if not s:
        return PLUS_WIDGET_DEFAULT
    return {k: s.get(k, PLUS_WIDGET_DEFAULT.get(k)) for k in PLUS_WIDGET_DEFAULT}


@api_router.post("/admin/plus-widget")
async def set_plus_widget(data: ChatWidgetInput, admin: dict = Depends(require_admin)):
    payload = {"key": "plus_widget", **data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.settings.update_one({"key": "plus_widget"}, {"$set": payload}, upsert=True)
    return {k: data.model_dump().get(k) for k in PLUS_WIDGET_DEFAULT}


# ---------- maintenance ----------
class MaintenanceInput(BaseModel):
    enabled: bool


@api_router.get("/settings/maintenance")
async def get_maintenance():
    s = await db.settings.find_one({"key": "maintenance"})
    return {"enabled": bool(s and s.get("enabled"))}


@api_router.post("/admin/maintenance")
async def set_maintenance(data: MaintenanceInput, admin: dict = Depends(require_admin)):
    await db.settings.update_one(
        {"key": "maintenance"},
        {"$set": {"key": "maintenance", "enabled": data.enabled, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"enabled": data.enabled}


# ---------- UI settings (avatar frames, etc.) ----------
class UISettingsInput(BaseModel):
    avatar_frames_enabled: bool


@api_router.get("/settings/ui")
async def get_ui_settings():
    s = await db.settings.find_one({"key": "ui"})
    # default: frames enabled (true) unless admin turned them off
    enabled = True if not s else bool(s.get("avatar_frames_enabled", True))
    return {"avatar_frames_enabled": enabled}


@api_router.post("/admin/settings/ui")
async def set_ui_settings(data: UISettingsInput, admin: dict = Depends(require_admin)):
    await db.settings.update_one(
        {"key": "ui"},
        {"$set": {
            "key": "ui",
            "avatar_frames_enabled": data.avatar_frames_enabled,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"avatar_frames_enabled": data.avatar_frames_enabled}


# ==================== CHAT MODERATION (admin) ====================
class MuteInput(BaseModel):
    user_id: str
    duration: str = "1h"  # one of MUTE_DURATIONS keys


class ModUserInput(BaseModel):
    user_id: str


@api_router.post("/admin/chat/mute")
async def admin_mute_user(data: MuteInput, admin: dict = Depends(require_admin)):
    if data.duration not in MUTE_DURATIONS:
        raise HTTPException(status_code=400, detail="Durată invalidă")
    target = await find_user_by_id(data.user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Nu poți da mute unui administrator")
    minutes = MUTE_DURATIONS[data.duration]
    if minutes is None:
        until = datetime(9999, 12, 31, tzinfo=timezone.utc)
    else:
        until = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    await db.users.update_one({"_id": target["_id"]}, {"$set": {"muted_until": until.isoformat()}})
    return {"ok": True, "muted_until": until.isoformat()}


@api_router.post("/admin/chat/unmute")
async def admin_unmute_user(data: ModUserInput, admin: dict = Depends(require_admin)):
    target = await find_user_by_id(data.user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    await db.users.update_one({"_id": target["_id"]}, {"$set": {"muted_until": None}})
    return {"ok": True}


@api_router.post("/admin/chat/ban")
async def admin_chat_ban(data: ModUserInput, admin: dict = Depends(require_admin)):
    target = await find_user_by_id(data.user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Nu poți bana un administrator")
    await db.users.update_one({"_id": target["_id"]}, {"$set": {"banned": True}})
    return {"ok": True}


@api_router.post("/admin/chat/unban")
async def admin_chat_unban(data: ModUserInput, admin: dict = Depends(require_admin)):
    target = await find_user_by_id(data.user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    await db.users.update_one({"_id": target["_id"]}, {"$set": {"banned": False}})
    return {"ok": True}


@api_router.delete("/admin/chat/message/{msg_id}")
async def admin_delete_message(msg_id: str, admin: dict = Depends(require_admin)):
    try:
        oid = ObjectId(msg_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalid")
    res = await db.chat_messages.update_one(
        {"_id": oid},
        {"$set": {"deleted": True, "deleted_by": user_name(admin), "deleted_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mesaj inexistent")
    return {"ok": True}


@api_router.delete("/admin/chat/clear")
async def admin_clear_chat(room: str = "global", admin: dict = Depends(require_admin)):
    if room not in ("global", "plus"):
        room = "global"
    res = await db.chat_messages.delete_many({"room": room})
    return {"ok": True, "deleted": res.deleted_count, "room": room}


@api_router.get("/admin/chat/messages")
async def admin_recent_messages(room: str = "global", admin: dict = Depends(require_admin)):
    if room not in ("global", "plus"):
        room = "global"
    msgs = await db.chat_messages.find({"room": room}).sort("created_at", -1).limit(80).to_list(80)
    out = []
    for m in msgs:
        d = dict(m)
        d["id"] = str(d.pop("_id"))
        out.append(d)
    return out


@api_router.get("/admin/chat/moderation")
async def admin_moderation_lists(admin: dict = Depends(require_admin)):
    now_iso = datetime.now(timezone.utc).isoformat()
    muted = await db.users.find({"muted_until": {"$gt": now_iso}}).to_list(500)
    banned = await db.users.find({"banned": True}).to_list(500)
    return {
        "muted": [serialize_user(u) for u in muted],
        "banned": [serialize_user(u) for u in banned],
    }


# ==================== CartoonixTV BOT config ====================
class BotConfigInput(BaseModel):
    enabled: bool = False
    interval_minutes: int = 30
    messages: List[str] = []
    room: str = "global"  # global | plus | both


DEFAULT_BOT_CFG = {"enabled": False, "interval_minutes": 30, "messages": [], "room": "global"}


@api_router.get("/admin/chat/bot")
async def get_bot_config(admin: dict = Depends(require_admin)):
    s = await db.settings.find_one({"key": "chat_bot"})
    if not s:
        return DEFAULT_BOT_CFG
    return {
        "enabled": bool(s.get("enabled", False)),
        "interval_minutes": int(s.get("interval_minutes", 30)),
        "messages": s.get("messages", []),
        "room": s.get("room", "global"),
    }


@api_router.post("/admin/chat/bot")
async def set_bot_config(data: BotConfigInput, admin: dict = Depends(require_admin)):
    room = data.room if data.room in ("global", "plus", "both") else "global"
    interval = max(1, int(data.interval_minutes or 30))
    messages = [m.strip() for m in (data.messages or []) if m and m.strip()][:50]
    await db.settings.update_one(
        {"key": "chat_bot"},
        {"$set": {
            "key": "chat_bot",
            "enabled": bool(data.enabled),
            "interval_minutes": interval,
            "messages": messages,
            "room": room,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"enabled": bool(data.enabled), "interval_minutes": interval, "messages": messages, "room": room}


# ==================== Announcement bar (homepage) ====================
class AnnouncementInput(BaseModel):
    enabled: bool = False
    text: str = ""
    link_url: Optional[str] = ""
    bg_color: str = "#ec1c24"
    text_color: str = "#ffffff"


@api_router.get("/settings/announcement")
async def get_announcement():
    s = await db.settings.find_one({"key": "announcement"})
    if not s:
        return {"enabled": False, "text": "", "link_url": "", "bg_color": "#ec1c24", "text_color": "#ffffff"}
    return {
        "enabled": bool(s.get("enabled", False)),
        "text": s.get("text", ""),
        "link_url": s.get("link_url", ""),
        "bg_color": s.get("bg_color", "#ec1c24"),
        "text_color": s.get("text_color", "#ffffff"),
    }


@api_router.post("/admin/settings/announcement")
async def set_announcement(data: AnnouncementInput, admin: dict = Depends(require_admin)):
    await db.settings.update_one(
        {"key": "announcement"},
        {"$set": {
            "key": "announcement",
            "enabled": bool(data.enabled),
            "text": data.text.strip(),
            "link_url": (data.link_url or "").strip(),
            "bg_color": data.bg_color or "#ec1c24",
            "text_color": data.text_color or "#ffffff",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}


# ==================== Popup announcement ====================
class PopupInput(BaseModel):
    enabled: bool = False
    title: str = ""
    body: str = ""
    image_url: Optional[str] = ""
    link_url: Optional[str] = ""
    link_label: Optional[str] = ""


@api_router.get("/settings/popup")
async def get_popup():
    s = await db.settings.find_one({"key": "popup"})
    if not s:
        return {"enabled": False, "id": "", "title": "", "body": "", "image_url": "", "link_url": "", "link_label": ""}
    return {
        "enabled": bool(s.get("enabled", False)),
        "id": s.get("updated_at", ""),
        "title": s.get("title", ""),
        "body": s.get("body", ""),
        "image_url": s.get("image_url", ""),
        "link_url": s.get("link_url", ""),
        "link_label": s.get("link_label", ""),
    }


@api_router.post("/admin/settings/popup")
async def set_popup(data: PopupInput, admin: dict = Depends(require_admin)):
    await db.settings.update_one(
        {"key": "popup"},
        {"$set": {
            "key": "popup",
            "enabled": bool(data.enabled),
            "title": data.title.strip(),
            "body": data.body.strip(),
            "image_url": (data.image_url or "").strip(),
            "link_url": (data.link_url or "").strip(),
            "link_label": (data.link_label or "").strip(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}



@api_router.get("/")
async def root():
    return {"message": "Cartoonix API"}


# ---------- admin: global avatar reset ----------
@api_router.post("/admin/reset-avatars")
async def admin_reset_avatars(admin: dict = Depends(require_admin)):
    """Reset ALL users' avatar to the default avatar."""
    res = await db.users.update_many({}, {"$set": {"avatar_url": DEFAULT_AVATAR}})
    return {"ok": True, "updated": res.modified_count, "default_avatar": DEFAULT_AVATAR}


# ---------- Jellyfin (Cartoonix TV) account provisioning — PLUS only ----------
def _jellyfin_client() -> httpx.AsyncClient:
    url, key = _jellyfin_conf()
    if not url or not key:
        logger.error(f"[jellyfin] not configured (url_set={bool(url)}, key_set={bool(key)})")
        missing = f"URL: {'OK' if url else 'LIPSĂ'}, Cheie: {'OK' if key else 'LIPSĂ'}"
        raise HTTPException(status_code=503, detail=f"Cartoonix TV nu este configurat momentan ({missing}). Verifică backend/.env și repornește backend-ul.")
    return httpx.AsyncClient(
        base_url=url,
        headers={
            "Authorization": f'MediaBrowser Token="{key}"',
            "Accept": "application/json",
        },
        timeout=httpx.Timeout(20.0, connect=6.0),
    )


async def _jellyfin_find_user(http: httpx.AsyncClient, name: str):
    r = await http.get("/Users")
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="Nu s-a putut contacta serverul Cartoonix TV")
    wanted = name.strip().casefold()
    for u in r.json():
        if str(u.get("Name", "")).strip().casefold() == wanted:
            return u
    return None


class JellyfinRegisterInput(BaseModel):
    password: str = Field(min_length=6, max_length=200)


@api_router.get("/jellyfin/status")
async def jellyfin_status(user: dict = Depends(get_current_user)):
    if not user_is_plus(user):
        raise HTTPException(status_code=403, detail="Cartoonix TV este disponibil doar pentru membrii Cartoonix PLUS")
    email = user.get("email", "")
    async with _jellyfin_client() as http:
        existing = await _jellyfin_find_user(http, email)
    jellyfin_url, _ = _jellyfin_conf()
    return {"exists": existing is not None, "username": email, "jellyfin_url": jellyfin_url}


@api_router.post("/jellyfin/register")
async def jellyfin_register(data: JellyfinRegisterInput, user: dict = Depends(get_current_user)):
    if not user_is_plus(user):
        raise HTTPException(status_code=403, detail="Cartoonix TV este disponibil doar pentru membrii Cartoonix PLUS")
    email = user.get("email", "")
    if not email:
        raise HTTPException(status_code=400, detail="Contul tău nu are o adresă de email validă")
    async with _jellyfin_client() as http:
        existing = await _jellyfin_find_user(http, email)
        if existing:
            raise HTTPException(status_code=409, detail="Ai deja un cont Cartoonix TV cu acest email. Folosește parola setată pentru a te conecta.")
        r = await http.post("/Users/New", json={"Name": email, "Password": data.password})
        if r.status_code == 401:
            raise HTTPException(status_code=502, detail="Cheia serverului Cartoonix TV este invalidă")
        if r.status_code == 403:
            raise HTTPException(status_code=502, detail="Cheia serverului Cartoonix TV nu are drepturi suficiente")
        if r.status_code not in (200, 204):
            raise HTTPException(status_code=502, detail=f"Nu s-a putut crea contul Cartoonix TV ({r.status_code})")
        created = {}
        try:
            created = r.json()
        except Exception:
            pass
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"jellyfin_username": email, "jellyfin_created_at": datetime.now(timezone.utc).isoformat()}},
    )
    jellyfin_url, _ = _jellyfin_conf()
    return {"ok": True, "username": email, "jellyfin_user_id": created.get("Id"), "jellyfin_url": jellyfin_url}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- seed ----------
DEMO_SHOWS = [
    {
        "title": "Captain Nova",
        "description": "Un supererou mascat apără orașul neon de forțele întunericului în aventuri pline de acțiune.",
        "thumbnail": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/031236dfef77d08885c3e0c4fb5b828f4e26baf3b9bc1d3155d2093383dedd7c.png",
        "banner": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/76a50c88ba7bd95171c0c4c5440190a2abc123034b77e4425ef587d9926b54eb.png",
        "category": "Populare acum",
        "channel": "Cartoon Network",
        "year": "2003",
        "genres": ["Acțiune", "Supereroi"],
    },
    {
        "title": "Space Buddies",
        "description": "Un copil astronaut și prietenul lui extraterestru explorează planete colorate și pline de surprize.",
        "thumbnail": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/832401c62380cc3f454c3db411987ec3685b7e67741cfd4deb5e2856acc4da82.png",
        "category": "Populare acum",
        "channel": "Jetix",
        "year": "2005",
        "genres": ["Aventură", "SF"],
    },
    {
        "title": "Ninja Force",
        "description": "Trei războinici ninja apără satul de umbre folosind arte marțiale și puteri secrete.",
        "thumbnail": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/c27c5f671b01b6977313ed30d737c72110b691f93df2bdc01c7809a7d247ed7f.png",
        "category": "Jetix Clasice",
        "channel": "Jetix",
        "year": "2004",
        "genres": ["Acțiune", "Arte marțiale"],
    },
    {
        "title": "Buddy & Rex",
        "description": "Doi prieteni animale trăiesc cele mai amuzante aventuri într-o comedie plină de energie.",
        "thumbnail": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/81e8a562457d6c4acd31b235085e81fcb3b18238bc7c2f338e168de5ec9cf2f6.png",
        "category": "Comedii",
        "channel": "Boomerang",
        "year": "2001",
        "genres": ["Comedie"],
    },
    {
        "title": "Luna Magica",
        "description": "O tânără vrăjitoare și micul ei dragon descoperă lumea magiei într-o aventură fermecată.",
        "thumbnail": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/6d006af20ec32c576faf383647d597debe0d1e656fdb19e5bca194cd553c4d6c.png",
        "category": "Fantezie",
        "channel": "Minimax",
        "year": "2006",
        "genres": ["Fantezie", "Magie"],
    },
    {
        "title": "Turbo Racers",
        "description": "Curse futuriste cu mașini spectaculoase pe piste de neon la viteze amețitoare.",
        "thumbnail": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/8ae0559159b9f0017458565ea11bf050a52a132987cf6d5de2b416d4720bc525.png",
        "category": "Acțiune",
        "channel": "Cartoon Network",
        "year": "2007",
        "genres": ["Acțiune", "Curse"],
    },
    {
        "title": "Monster Pals",
        "description": "Un copil curajos și un monstru prietenos pornesc în aventuri prin pădurea fermecată.",
        "thumbnail": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/760ba3ab1aab116042a0a0a7ece291fda41c94502972a8a9b839734552c10921.png",
        "category": "Fantezie",
        "channel": "Minimax",
        "year": "2008",
        "genres": ["Aventură", "Fantezie"],
    },
    {
        "title": "Mega Bot",
        "description": "Un robot uriaș pilotat de un copil apără orașul de amenințări gigantice.",
        "thumbnail": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/6cc909d1567574c80131c9b09b54b8ba587188e2918a57e0069e89d41fade342.png",
        "category": "Acțiune",
        "channel": "Cartoon Network",
        "year": "2005",
        "genres": ["Acțiune", "Roboți"],
    },
]

SAMPLE_VIDEOS = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
]


@app.on_event("startup")
async def startup():
    # Index creation is best-effort: on a large/imported production DB a unique index can fail
    # (e.g. duplicate emails) — that must NOT crash startup and take the whole API down (520).
    try:
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.warning(f"Could not create unique email index (falling back to non-unique): {e}")
        try:
            await db.users.create_index("email")
        except Exception as e2:
            logger.warning(f"Could not create email index at all: {e2}")
    for idx in (("otp_verifications", "email", {"unique": True}),
                ("otp_verifications", "expiresAt", {"expireAfterSeconds": 0})):
        coll, field, opts = idx
        try:
            await db[coll].create_index(field, **opts)
        except Exception as e:
            logger.warning(f"Could not create index {coll}.{field}: {e}")

    # Drop erroneous legacy unique `id_1` indexes (from PHP migration). Our schema derives `id`
    # from Mongo `_id`, so a unique index on a (usually missing/null) `id` field breaks all inserts
    # with "E11000 dup key { id: null }". Safe to drop across app collections.
    for coll in ("chat_messages", "notifications", "suggestions", "watchparties",
                 "payment_transactions", "shows", "settings"):
        try:
            existing = await db[coll].index_information()
            if "id_1" in existing:
                await db[coll].drop_index("id_1")
                logger.warning(f"Dropped erroneous unique index id_1 on {coll}")
        except Exception as e:
            logger.warning(f"Could not check/drop id_1 index on {coll}: {e}")

    # chat_messages indexes for stats/leaderboard/presence performance (best-effort)
    for field in ("user_id", "room", "created_at", "pinned"):
        try:
            await db.chat_messages.create_index(field)
        except Exception as e:
            logger.warning(f"Could not create chat_messages index {field}: {e}")
    try:
        await db.users.create_index("chat_last_seen")
    except Exception as e:
        logger.warning(f"Could not create users.chat_last_seen index: {e}")

    # seed admin (create-only, NON-destructive). Never crash startup if envs are missing.
    try:
        admin_email = (os.environ.get("ADMIN_EMAIL") or "").lower()
        admin_password = os.environ.get("ADMIN_PASSWORD") or ""
        if admin_email and admin_password:
            existing = await db.users.find_one({"email": admin_email})
            if existing is None:
                now_iso = datetime.now(timezone.utc).isoformat()
                await db.users.insert_one({
                    "id": str(uuid.uuid4()),
                    "email": admin_email,
                    "password_hash": hash_password(admin_password),
                    "nickname": "Admin",
                    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=Admin",
                    "role": "admin",
                    "subscription": "plus",
                    "email_verified": True,
                    "created_at": now_iso,
                    "last_active": now_iso,
                })
            elif "id" not in existing:
                # backfill UUID id for a legacy admin doc
                await db.users.update_one({"_id": existing["_id"]}, {"$set": {"id": str(uuid.uuid4())}})
        else:
            logger.warning("ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin seed.")
    except Exception as e:
        logger.warning(f"Admin seed skipped due to error: {e}")

    # Demo seeding runs ONLY in local/dev (guarded by SEED_DEMO) so it never pollutes production.
    seed_demo = os.environ.get("SEED_DEMO", "false").lower() == "true"
    if not seed_demo:
        logger.info("Cartoonix startup complete (SEED_DEMO off)")
        return

    # seed test user (real schema)
    test_email = "test@cartoonix.ro"
    if await db.users.find_one({"email": test_email}) is None:
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": test_email,
            "password_hash": hash_password("test1234"),
            "nickname": "Cont Test",
            "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Ziggy",
            "role": "user",
            "subscription": "free",
            "email_verified": True,
            "created_at": now_iso,
            "last_active": now_iso,
        })
    # seed shows
    if await db.shows.count_documents({}) == 0:
        for i, s in enumerate(DEMO_SHOWS):
            eps = []
            for e in range(1, 7):
                eps.append({
                    "number": e,
                    "title": f"Episodul {e}",
                    "video_url": SAMPLE_VIDEOS[e % len(SAMPLE_VIDEOS)],
                    "duration": "22 min",
                })
            doc = dict(s)
            doc["vps_path"] = f"/var/www/cartoons/{s['title'].lower().replace(' ', '_')}"
            doc["episodes"] = eps
            doc["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.shows.insert_one(doc)
    # seed notifications
    if await db.notifications.count_documents({}) == 0:
        base = datetime.now(timezone.utc)
        seed_notifs = [
            {
                "title": "🎉 Bine ai venit la Cartoonix!",
                "body": "Ne bucurăm să te avem alături. Explorează biblioteca cu desenele copilăriei de pe Cartoon Network, Jetix, Minimax și Boomerang.",
                "image": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/76a50c88ba7bd95171c0c4c5440190a2abc123034b77e4425ef587d9926b54eb.png",
                "cta_label": "Explorează",
                "cta_link": "/browse",
                "created_at": (base - timedelta(days=1)).isoformat(),
            },
            {
                "title": "👑 Cartoonix PLUS a sosit!",
                "body": "Deblochează toate episoadele, streaming fără reclame și descărcări offline. Doar 50 RON pe lună.",
                "image": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/6d006af20ec32c576faf383647d597debe0d1e656fdb19e5bca194cd553c4d6c.png",
                "cta_label": "Vezi PLUS",
                "cta_link": "/plus",
                "created_at": (base - timedelta(days=3)).isoformat(),
            },
            {
                "title": "🆕 Desene noi adăugate",
                "body": "Am adăugat noi seriale clasice în bibliotecă. Verifică secțiunea Ultimele Adăugate!",
                "image": "https://static.prod-images.emergentagent.com/jobs/d62dd950-d3ee-4e8f-8661-5ce4364784fd/images/c27c5f671b01b6977313ed30d737c72110b691f93df2bdc01c7809a7d247ed7f.png",
                "cta_label": "Vezi noutățile",
                "cta_link": "/home",
                "created_at": (base - timedelta(days=5)).isoformat(),
            },
        ]
        await db.notifications.insert_many(seed_notifs)
    logger.info("Cartoonix startup complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
