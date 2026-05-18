"""Cartoonix main FastAPI app."""
import logging
import os
import random
import shutil
import string
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import (APIRouter, Depends, FastAPI, File, Form, HTTPException, Header, Request,
                     UploadFile, status)
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ------------ DB ------------
MONGO_URL = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(MONGO_URL)
db = client[os.environ["DB_NAME"]]

# ------------ App ------------
app = FastAPI(title="Cartoonix API", version="1.0.0")
api_router = APIRouter(prefix="/api")
app.include_router(api_router)

# Uploads
UPLOAD_DIR = ROOT_DIR / "uploads"
(UPLOAD_DIR / "avatars").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "videos").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "thumbnails").mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ------------ Logging ------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("cartoonix")

# ------------ Imports after db exists (avoid circular) ------------
from auth import (create_access_token, get_current_user,  # noqa: E402
                  get_current_user_optional, hash_password, require_admin,
                  serialize_user, verify_password)
from email_service import send_verification_email, send_simple_contest_confirmation, send_password_reset_email  # noqa: E402
from models import (AvatarOption, Cartoon, CartoonCreate, CartoonUpdate,  # noqa: E402
                    Category, Episode, EpisodeCreate, EpisodeUpdate,
                    FavoriteToggle, Playlist, PlaylistAddItem, PlaylistCreate,
                    RecordWatch, ResendCodeRequest, TokenResponse,
                    UpdateUserRequest, UserCreate, UserLogin, UserPublic,
                    VerifyEmailRequest, new_id, now_utc)
from seed import seed_avatars, seed_categories  # noqa: E402

# Stripe (used by early-access checkout verification + webhook)
import stripe as _stripe  # noqa: E402
_STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
_STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
if _STRIPE_SECRET_KEY:
    _stripe.api_key = _STRIPE_SECRET_KEY


# ------------ Startup ------------
@app.on_event("startup")
async def on_startup():
    await seed_categories(db)
    await seed_avatars(db, ROOT_DIR / "seed_data" / "avatars.json")
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("nickname", unique=True)
    await db.categories.create_index("slug", unique=True)
    await db.cartoons.create_index("category_id")
    await db.episodes.create_index("cartoon_id")
    await db.verification_codes.create_index("email")
    await db.verification_codes.create_index("expires_at", expireAfterSeconds=0)
    await db.pending_registrations.create_index("email", unique=True)
    await db.pending_registrations.create_index("expires_at", expireAfterSeconds=0)
    await db.watch_history.create_index("user_id")
    await db.favorites.create_index("user_id")
    await db.playlists.create_index("user_id")
    # Contests: one entry per (contest, user)
    await db.contest_entries.create_index(
        [("contest_id", 1), ("user_id", 1)], unique=True
    )
    await db.contest_entries.create_index("contest_id")
    await db.contest_entries.create_index("user_id")
    # Password resets: lookup by token, auto-expire via TTL on expires_at
    await db.password_resets.create_index("token", unique=True)
    await db.password_resets.create_index("user_id")
    await db.password_resets.create_index("expires_at", expireAfterSeconds=0)
    # Notifications (Inbox): per-user messages
    await db.notifications.create_index("user_id")
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.notifications.create_index("created_at")
    # Ensure permanent admins (super-admins always promoted)
    for super_email in ("albanflaviu24@gmail.com",):
        await db.users.update_one(
            {"email": super_email},
            {"$set": {"role": "admin", "email_verified": True}},
        )
    logger.info("Cartoonix startup complete.")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ------------ Helpers ------------
def gen_code(length=6) -> str:
    return "".join(random.choices(string.digits, k=length))


def _doc_to_dict(d: dict) -> dict:
    if not d:
        return d
    out = {k: v for k, v in d.items() if k != "_id"}
    # Convert ISO date strings back to datetime is handled by Pydantic when needed.
    return out


# ============================================================
#                        HEALTH
# ============================================================
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "cartoonix"}


# ============================================================
#                        PUBLIC SETTINGS
# ============================================================
DEFAULT_SETTINGS = {
    "presentation_mode": False,
    "maintenance_mode": False,
    "early_access_mode": False,
}


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"_id": "global"})
    if not doc:
        return dict(DEFAULT_SETTINGS)
    return {k: doc.get(k, v) for k, v in DEFAULT_SETTINGS.items()}


@api_router.get("/settings")
async def public_settings():
    """Public, read-only settings exposed to the frontend (e.g. presentation mode)."""
    return await get_settings_doc()


@api_router.get("/admin/settings")
async def admin_get_settings(user=Depends(require_admin)):
    return await get_settings_doc()


@api_router.patch("/admin/settings")
async def admin_update_settings(payload: dict, user=Depends(require_admin)):
    allowed = {k: v for k, v in payload.items() if k in DEFAULT_SETTINGS}
    if not allowed:
        raise HTTPException(400, "No valid settings provided")
    # Normalize booleans
    for k in allowed:
        if isinstance(DEFAULT_SETTINGS[k], bool):
            allowed[k] = bool(allowed[k])

    # Mutual exclusion between early_access_mode and presentation_mode.
    # Turning one ON automatically turns the other OFF.
    if allowed.get("early_access_mode") is True:
        allowed["presentation_mode"] = False
    elif allowed.get("presentation_mode") is True:
        allowed["early_access_mode"] = False

    await db.settings.update_one(
        {"_id": "global"},
        {"$set": allowed},
        upsert=True,
    )
    return await get_settings_doc()


# ============================================================
#                        AVATARS
# ============================================================
@api_router.get("/avatars")
async def list_avatars():
    items = await db.avatars.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return items


# ============================================================
#                        AUTH
# ============================================================
@api_router.post("/auth/register")
async def register(payload: UserCreate):
    """Stage 1 of registration. Stores a *pending* registration and emails a
    verification code. The actual user account is created only after the code
    is confirmed via /auth/verify-email.
    """
    if not payload.accepted_terms:
        raise HTTPException(status_code=400, detail="Trebuie să accepți Termenii și Condițiile")
    # Check uniqueness against existing users
    if await db.users.find_one({"email": payload.email.lower()}):
        raise HTTPException(status_code=400, detail="Acest email este deja înregistrat")
    if await db.users.find_one({"nickname": payload.nickname}):
        raise HTTPException(status_code=400, detail="Acest pseudonim este deja luat")
    # Also block if someone else has a *pending* registration with this nickname
    other_pending = await db.pending_registrations.find_one({
        "nickname": payload.nickname,
        "email": {"$ne": payload.email.lower()},
    })
    if other_pending:
        raise HTTPException(status_code=400, detail="Acest pseudonim este deja luat")

    code = gen_code()
    now = now_utc()
    pending_doc = {
        "email": payload.email.lower(),
        "nickname": payload.nickname,
        "avatar_url": payload.avatar_url,
        "subscription": payload.subscription,
        "password_hash": hash_password(payload.password),
        "accepted_terms_at": now.isoformat(),
        "code": code,
        "attempts": 0,
        "created_at": now.isoformat(),
        "expires_at": now + timedelta(minutes=15),
    }
    # Upsert by email so requesting again refreshes the code (same email = same registration intent)
    await db.pending_registrations.update_one(
        {"email": payload.email.lower()},
        {"$set": pending_doc},
        upsert=True,
    )
    sent = send_verification_email(payload.email, payload.nickname, code)
    if not sent:
        logger.warning(f"Verification email failed to send for {payload.email}")
    return {"success": True, "email": payload.email.lower()}


@api_router.post("/auth/verify-email", response_model=TokenResponse)
async def verify_email(payload: VerifyEmailRequest):
    """Stage 2 of registration. Validates the code and CREATES the user account."""
    email = payload.email.lower()
    pending = await db.pending_registrations.find_one({"email": email})
    if not pending:
        raise HTTPException(status_code=404, detail="Nicio înregistrare în așteptare. Te rugăm să te înregistrezi din nou.")

    expires_at = pending["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        await db.pending_registrations.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Codul de verificare a expirat. Te rugăm să te înregistrezi din nou.")

    attempts = int(pending.get("attempts", 0))
    if attempts >= 5:
        await db.pending_registrations.delete_one({"email": email})
        raise HTTPException(status_code=429, detail="Prea multe încercări. Te rugăm să te înregistrezi din nou.")

    if pending["code"] != payload.code:
        await db.pending_registrations.update_one(
            {"email": email},
            {"$inc": {"attempts": 1}},
        )
        raise HTTPException(status_code=401, detail="Cod de verificare invalid")

    # Double-check uniqueness right before insert (race-condition safety)
    if await db.users.find_one({"email": email}):
        await db.pending_registrations.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Acest email este deja înregistrat")
    if await db.users.find_one({"nickname": pending["nickname"]}):
        await db.pending_registrations.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Acest pseudonim este deja luat")

    # First user ever -> admin
    total = await db.users.count_documents({})
    role = "admin" if total == 0 else "user"

    user_id = new_id()
    user_doc = {
        "id": user_id,
        "nickname": pending["nickname"],
        "email": email,
        "avatar_url": pending["avatar_url"],
        "role": role,
        "subscription": pending.get("subscription", "free"),
        "email_verified": True,
        "password_hash": pending["password_hash"],
        "created_at": now_utc().isoformat(),
        "accepted_terms_at": pending.get("accepted_terms_at", now_utc().isoformat()),
    }
    await db.users.insert_one(user_doc)
    await db.pending_registrations.delete_one({"email": email})

    token = create_access_token(user_id, role)
    user_public = serialize_user(user_doc)
    user_public["created_at"] = user_doc["created_at"]
    return TokenResponse(access_token=token, user=UserPublic(**user_public))


@api_router.post("/auth/resend-code")
async def resend_code(payload: ResendCodeRequest):
    """Resend a code for an in-flight registration (pending) OR for an existing
    user that still hasn't verified (legacy accounts)."""
    email = payload.email.lower()

    # Throttle
    pending = await db.pending_registrations.find_one({"email": email})
    if pending:
        created_at = pending.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if created_at and (datetime.now(timezone.utc) - created_at).total_seconds() < 30:
            raise HTTPException(status_code=429, detail="Te rugăm să aștepți înainte de a solicita un alt cod.")

        code = gen_code()
        await db.pending_registrations.update_one(
            {"email": email},
            {"$set": {
                "code": code,
                "attempts": 0,
                "created_at": now_utc().isoformat(),
                "expires_at": now_utc() + timedelta(minutes=15),
            }},
        )
        send_verification_email(email, pending.get("nickname", "there"), code)
        return {"success": True}

    # Fallback: legacy unverified user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Nicio înregistrare găsită pentru acest email")
    if user.get("email_verified"):
        return {"success": True, "message": "Emailul este deja verificat"}
    last = await db.verification_codes.find_one({"email": email}, sort=[("created_at", -1)])
    if last:
        created_at = last.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if (datetime.now(timezone.utc) - created_at).total_seconds() < 30:
            raise HTTPException(status_code=429, detail="Te rugăm să aștepți înainte de a solicita un alt cod.")
    code = gen_code()
    await db.verification_codes.delete_many({"email": email})
    await db.verification_codes.insert_one({
        "email": email,
        "code": code,
        "created_at": now_utc().isoformat(),
        "expires_at": now_utc() + timedelta(minutes=15),
        "attempts": 0,
        "used": False,
    })
    send_verification_email(email, user.get("nickname", "there"), code)
    return {"success": True}


# ============================================================
#                    EARLY ACCESS REGISTRATION
# ============================================================
# 3-step flow used when admin enables `early_access_mode`.
#   Step 1: /api/early-access/register  -> validates data, stores pending,
#           sends verification code for FREE users, OR returns Stripe URL for PLUS.
#   Step 2 (PLUS only): /api/early-access/confirm-payment -> verifies Stripe
#           session, then sends the verification code.
#   Step 3: /api/early-access/verify    -> validates code, creates user, returns
#           access token (auto-login).
# Resend: /api/early-access/resend
#
# Token is a UUID stored in `pending_early_access._id` and serves as
# `client_reference_id` when redirecting to Stripe. It identifies the
# in-flight registration without leaking the email in URLs.

EARLY_ACCESS_STRIPE_LINK = os.environ.get(
    "EARLY_ACCESS_STRIPE_LINK",
    "https://buy.stripe.com/dRm3co18J0GQ7SxdgG9EI02",
)


class EarlyAccessRegister(BaseModel):
    nickname: str = Field(min_length=2, max_length=32)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    plan: Literal["free", "plus"]
    accepted_terms: bool
    avatar_url: Optional[str] = None


class EarlyAccessConfirmPayment(BaseModel):
    token: Optional[str] = None  # Optional: we can find by session_id if token is lost
    session_id: str


class EarlyAccessVerify(BaseModel):
    token: str
    code: str = Field(min_length=6, max_length=6)


class EarlyAccessResend(BaseModel):
    token: str


async def _ea_get_default_avatar() -> str:
    """Best-effort: return the URL of the first seeded avatar option."""
    av = await db.avatars.find_one({}, {"_id": 0}, sort=[("order", 1)])
    if av and av.get("url"):
        return av["url"]
    return "/api/uploads/avatars/default.png"


@api_router.post("/early-access/register")
async def early_access_register(payload: EarlyAccessRegister):
    if not payload.accepted_terms:
        raise HTTPException(400, "Trebuie să accepți Termenii și Condițiile")

    email = payload.email.lower()
    nickname = payload.nickname.strip()

    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Acest email este deja înregistrat")
    if await db.users.find_one({"nickname": nickname}):
        raise HTTPException(400, "Acest pseudonim este deja luat")

    # Drop any previous pending entry for this email (allow re-start)
    await db.pending_early_access.delete_many({"email": email})

    token = new_id()
    now = now_utc()
    # Validate avatar against the seeded list; fall back to default if invalid/missing.
    chosen_avatar = (payload.avatar_url or "").strip()
    if chosen_avatar:
        valid = await db.avatars.find_one({"url": chosen_avatar})
        if not valid:
            chosen_avatar = ""
    avatar_url = chosen_avatar or await _ea_get_default_avatar()

    requires_payment = payload.plan == "plus"
    code = None if requires_payment else gen_code()

    doc = {
        "_id": token,
        "email": email,
        "nickname": nickname,
        "password_hash": hash_password(payload.password),
        "plan": payload.plan,
        "avatar_url": avatar_url,
        "accepted_terms_at": now.isoformat(),
        "requires_payment": requires_payment,
        "payment_verified": not requires_payment,
        "code": code,
        "attempts": 0,
        "created_at": now.isoformat(),
        "expires_at": now + timedelta(minutes=120),  # Extended to 2 hours for mobile users
    }
    await db.pending_early_access.insert_one(doc)

    if not requires_payment:
        sent = send_verification_email(email, nickname, code)
        if not sent:
            logger.warning(f"[early-access] verification email failed for {email}")
        return {"success": True, "token": token, "next": "verify"}

    # PLUS — build Stripe payment link with client_reference_id and prefilled email.
    sep = "&" if "?" in EARLY_ACCESS_STRIPE_LINK else "?"
    stripe_url = (
        f"{EARLY_ACCESS_STRIPE_LINK}{sep}"
        f"client_reference_id={token}"
        f"&prefilled_email={email}"
    )
    return {"success": True, "token": token, "next": "payment", "stripe_url": stripe_url}


@api_router.post("/early-access/confirm-payment")
async def early_access_confirm_payment(payload: EarlyAccessConfirmPayment):
    """Verify Stripe Checkout Session, mark pending as paid, send verification code.
    Can work with or without token — if token is missing, we find by session_id."""
    logger.info(f"[early-access] confirm-payment called token={payload.token[:8] if payload.token else 'NONE'}... session={payload.session_id[:12]}...")

    # Try to find pending record
    pending = None
    
    if payload.token:
        # Standard flow: look up by token
        try:
            pending = await db.pending_early_access.find_one({"_id": payload.token})
        except Exception as e:
            logger.error(f"[early-access] DB find_one by token failed: {e}")
            raise HTTPException(500, "Eroare bază de date. Încearcă din nou.")
    
    # If not found by token or token was missing, try to verify Stripe first and find by client_reference_id
    if not pending:
        if not _STRIPE_SECRET_KEY:
            logger.error("[early-access] STRIPE_SECRET_KEY is not configured on the server")
            raise HTTPException(503, "Stripe nu este configurat pe server. Contactează administratorul.")
        
        try:
            session = _stripe.checkout.Session.retrieve(payload.session_id)
        except Exception as e:
            logger.error(f"[early-access] Stripe retrieve failed: {e}")
            raise HTTPException(400, "Sesiunea de plată nu a putut fi verificată.")
        
        # Extract client_reference_id (which is our token)
        try:
            s_client_ref = getattr(session, "client_reference_id", None)
            if not s_client_ref:
                raise HTTPException(400, "Sesiunea Stripe nu conține referința necesară.")
            
            # Try to find pending by this token
            pending = await db.pending_early_access.find_one({"_id": s_client_ref})
            if not pending:
                raise HTTPException(404, "Înregistrarea nu a fost găsită sau a expirat.")
            
            # Update our token for subsequent operations
            payload.token = s_client_ref
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[early-access] Failed to extract client_reference_id: {e}")
            raise HTTPException(500, "Nu am putut verifica sesiunea de plată.")

    if not pending:
        raise HTTPException(404, "Înregistrarea nu a fost găsită sau a expirat.")

    # Check if already verified
    if pending.get("payment_verified") and pending.get("code"):
        logger.info("[early-access] already verified, returning success with token")
        return {
            "success": True, 
            "already_verified": True,
            "token": pending["_id"],  # Return token for frontend recovery
            "email": pending.get("email", ""),
        }

    # Verify Stripe payment
    if not _STRIPE_SECRET_KEY:
        logger.error("[early-access] STRIPE_SECRET_KEY is not configured on the server")
        raise HTTPException(503, "Stripe nu este configurat pe server. Contactează administratorul.")

    try:
        session = _stripe.checkout.Session.retrieve(payload.session_id)
    except Exception as e:
        logger.error(f"[early-access] Stripe retrieve failed: {e}")
        raise HTTPException(400, "Sesiunea de plată nu a putut fi verificată.")

    # Stripe SDK v15+ returns Session objects that no longer expose dict-style .get().
    # Use getattr() for safe attribute access on Stripe objects.
    try:
        s_status = getattr(session, "status", None)
        s_payment_status = getattr(session, "payment_status", None)
        s_client_ref = getattr(session, "client_reference_id", None) or ""
        s_amount_total = getattr(session, "amount_total", None)
        s_currency = getattr(session, "currency", None) or "eur"

        status_ok = s_status == "complete"
        payment_ok = s_payment_status == "paid"
        ref_ok = s_client_ref == payload.token
    except Exception as e:
        logger.error(f"[early-access] Stripe session inspection failed: {e}")
        raise HTTPException(500, "Răspuns Stripe invalid.")

    if not (status_ok and payment_ok and ref_ok):
        logger.warning(
            f"[early-access] payment verification failed: status={s_status} "
            f"payment_status={s_payment_status} ref_match={ref_ok}"
        )
        raise HTTPException(400, "Plata nu este confirmată.")

    code = gen_code()
    now = now_utc()
    try:
        await db.pending_early_access.update_one(
            {"_id": payload.token},
            {"$set": {
                "payment_verified": True,
                "stripe_session_id": payload.session_id,
                "stripe_amount_total": s_amount_total,
                "stripe_currency": s_currency.upper(),
                "code": code,
                "attempts": 0,
                "expires_at": now + timedelta(minutes=120),  # Extended to 2 hours
            }},
        )
    except Exception as e:
        logger.error(f"[early-access] DB update_one failed: {e}")
        raise HTTPException(500, "Eroare la salvarea plății. Contactează suportul.")

    # Email sending is best-effort — never fail the response on email errors.
    try:
        sent = send_verification_email(pending.get("email", ""), pending.get("nickname", ""), code)
        if not sent:
            logger.warning(f"[early-access] verification email failed for {pending.get('email')}")
    except Exception as e:
        logger.error(f"[early-access] email send unexpected error: {e}")

    return {
        "success": True,
        "token": payload.token,  # Return token so frontend can save it
        "email": pending.get("email", ""),
    }


@api_router.post("/early-access/verify", response_model=TokenResponse)
async def early_access_verify(payload: EarlyAccessVerify):
    pending = await db.pending_early_access.find_one({"_id": payload.token})
    if not pending:
        raise HTTPException(404, "Înregistrarea nu a fost găsită sau a expirat.")

    expires_at = pending["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        await db.pending_early_access.delete_one({"_id": payload.token})
        raise HTTPException(400, "Codul de verificare a expirat. Te rugăm să te înregistrezi din nou.")

    if not pending.get("payment_verified"):
        raise HTTPException(400, "Plata nu a fost confirmată încă.")

    attempts = int(pending.get("attempts", 0))
    if attempts >= 5:
        await db.pending_early_access.delete_one({"_id": payload.token})
        raise HTTPException(429, "Prea multe încercări. Te rugăm să te înregistrezi din nou.")

    if pending.get("code") != payload.code:
        await db.pending_early_access.update_one(
            {"_id": payload.token},
            {"$inc": {"attempts": 1}},
        )
        raise HTTPException(401, "Cod de verificare invalid")

    email = pending["email"]
    nickname = pending["nickname"]

    if await db.users.find_one({"email": email}):
        await db.pending_early_access.delete_one({"_id": payload.token})
        raise HTTPException(400, "Acest email este deja înregistrat")
    if await db.users.find_one({"nickname": nickname}):
        await db.pending_early_access.delete_one({"_id": payload.token})
        raise HTTPException(400, "Acest pseudonim este deja luat")

    total = await db.users.count_documents({})
    role = "admin" if total == 0 else "user"

    user_id = new_id()
    user_doc = {
        "id": user_id,
        "nickname": nickname,
        "email": email,
        "avatar_url": pending.get("avatar_url") or await _ea_get_default_avatar(),
        "role": role,
        "subscription": pending.get("plan", "free"),
        "email_verified": True,
        "password_hash": pending["password_hash"],
        "created_at": now_utc().isoformat(),
        "accepted_terms_at": pending.get("accepted_terms_at", now_utc().isoformat()),
        "early_access": True,
        "stripe_session_id": pending.get("stripe_session_id"),
    }
    await db.users.insert_one(user_doc)
    await db.pending_early_access.delete_one({"_id": payload.token})

    access = create_access_token(user_id, role)
    user_public = serialize_user(user_doc)
    user_public["created_at"] = user_doc["created_at"]
    return TokenResponse(access_token=access, user=UserPublic(**user_public))


@api_router.post("/early-access/resend")
async def early_access_resend(payload: EarlyAccessResend):
    pending = await db.pending_early_access.find_one({"_id": payload.token})
    if not pending:
        raise HTTPException(404, "Înregistrarea nu a fost găsită sau a expirat.")
    if not pending.get("payment_verified"):
        raise HTTPException(400, "Plata nu a fost confirmată încă.")

    last_code_at = pending.get("last_code_sent_at")
    if isinstance(last_code_at, str):
        last_code_at = datetime.fromisoformat(last_code_at)
    if last_code_at and last_code_at.tzinfo is None:
        last_code_at = last_code_at.replace(tzinfo=timezone.utc)
    created_at = pending.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    ref = last_code_at or created_at
    if ref and (datetime.now(timezone.utc) - ref).total_seconds() < 30:
        raise HTTPException(429, "Te rugăm să aștepți înainte de a solicita un alt cod.")

    code = gen_code()
    now = now_utc()
    await db.pending_early_access.update_one(
        {"_id": payload.token},
        {"$set": {
            "code": code,
            "attempts": 0,
            "last_code_sent_at": now.isoformat(),
            "expires_at": now + timedelta(minutes=45),
        }},
    )
    send_verification_email(pending["email"], pending["nickname"], code)
    return {"success": True}


# ============================================================
#               UPGRADE FROM FREE -> PLUS (Stripe)
# ============================================================
# Used by logged-in FREE users (typically while early-access mode is ON
# and they are on the EarlyAccessSuccessPage). Reuses the same Stripe
# Payment Link as the registration flow, but with a different
# `client_reference_id` shape: `upgrade_<user_id>`.

class UpgradeConfirm(BaseModel):
    session_id: str


@api_router.post("/users/me/upgrade-checkout")
async def create_upgrade_checkout(user=Depends(get_current_user)):
    """Return a Stripe payment URL for upgrading the current FREE user to PLUS."""
    if user.get("subscription") == "plus":
        raise HTTPException(400, "Ai deja planul PLUS.")

    ref = f"upgrade_{user['id']}"
    sep = "&" if "?" in EARLY_ACCESS_STRIPE_LINK else "?"
    stripe_url = (
        f"{EARLY_ACCESS_STRIPE_LINK}{sep}"
        f"client_reference_id={ref}"
        f"&prefilled_email={user.get('email','')}"
    )
    return {"success": True, "stripe_url": stripe_url}


@api_router.post("/users/me/confirm-upgrade")
async def confirm_upgrade(payload: UpgradeConfirm, user=Depends(get_current_user)):
    """Verify Stripe session and upgrade the current user to PLUS."""
    # Idempotent success if already on PLUS
    if user.get("subscription") == "plus":
        fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
        return {"success": True, "already_upgraded": True, "user": serialize_user(fresh or user)}

    if not _STRIPE_SECRET_KEY:
        logger.error("[upgrade] STRIPE_SECRET_KEY is not configured")
        raise HTTPException(503, "Stripe nu este configurat pe server. Contactează administratorul.")

    try:
        session = _stripe.checkout.Session.retrieve(payload.session_id)
    except Exception as e:
        logger.error(f"[upgrade] Stripe retrieve failed: {e}")
        raise HTTPException(400, "Sesiunea de plată nu a putut fi verificată.")

    s_status = getattr(session, "status", None)
    s_payment_status = getattr(session, "payment_status", None)
    s_client_ref = getattr(session, "client_reference_id", None) or ""
    s_amount_total = getattr(session, "amount_total", None)
    s_currency = getattr(session, "currency", None) or "eur"

    expected_ref = f"upgrade_{user['id']}"
    if s_status != "complete" or s_payment_status != "paid":
        logger.warning(
            f"[upgrade] payment not confirmed status={s_status} payment_status={s_payment_status}"
        )
        raise HTTPException(400, "Plata nu este confirmată.")
    if s_client_ref != expected_ref:
        logger.warning(
            f"[upgrade] client_reference_id mismatch: got={s_client_ref} expected={expected_ref}"
        )
        raise HTTPException(400, "Sesiunea de plată nu corespunde acestui cont.")

    # Idempotency: prevent same session_id being applied to two users
    existing = await db.users.find_one({"upgrade_stripe_session_id": payload.session_id})
    if existing and existing.get("id") != user["id"]:
        raise HTTPException(400, "Această sesiune a fost deja utilizată.")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "subscription": "plus",
            "upgrade_stripe_session_id": payload.session_id,
            "upgrade_amount_total": s_amount_total,
            "upgrade_currency": (s_currency or "eur").upper(),
            "upgraded_at": now_utc().isoformat(),
        }},
    )

    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"success": True, "user": serialize_user(fresh or user)}


# ============================================================
#                        CONTESTS
# ============================================================
# 4 hardcoded contests: 2 FREE (open to everyone), 2 PLUS (only for plus users).
# Users enter once; backend stores an entry doc in `contest_entries`.
# Admin sees totals and can list participants per contest.

CARTOONIX_CONTESTS: List[dict] = [
    {
        "id": "cinema_toystory5",
        "title": "Bilete la cinema – Toy Story 5",
        "prize": "3 bilete duble la cinema",
        "description": "Câștigă unul dintre cele 3 bilete duble pentru Toy Story 5 — perfect pentru o seară specială la cinema.",
        "plan": "free",
        "emoji": "🎬",
        "order": 1,
        "deadline_iso": "2026-05-25T20:00:00+03:00",
    },
    {
        "id": "lego_set",
        "title": "Seturi LEGO",
        "prize": "Unul dintre cele 3 seturi LEGO",
        "description": "Trei seturi LEGO așteaptă să fie câștigate. Pune-ți imaginația la treabă!",
        "plan": "free",
        "emoji": "🧱",
        "order": 2,
        "deadline_iso": "2026-05-25T20:00:00+03:00",
    },
    {
        "id": "emag_voucher_500",
        "title": "Voucher eMAG 500 lei",
        "prize": "Voucher eMAG în valoare de 500 lei",
        "description": "Cumpără ce vrei tu cu un voucher eMAG de 500 lei. Doar pentru membrii Cartoonix PLUS.",
        "plan": "plus",
        "emoji": "🎁",
        "order": 3,
        "deadline_iso": "2026-05-25T20:00:00+03:00",
    },
    {
        "id": "media_player_xiaomi",
        "title": "Media Player Xiaomi",
        "prize": "Un Media Player Xiaomi",
        "description": "Adaugă un Media Player Xiaomi în living și transformă-ți televizorul. Doar pentru membrii Cartoonix PLUS.",
        "plan": "plus",
        "emoji": "📺",
        "order": 4,
        "deadline_iso": "2026-05-25T20:00:00+03:00",
    },
]


def _contest_by_id(contest_id: str) -> Optional[dict]:
    return next((c for c in CARTOONIX_CONTESTS if c["id"] == contest_id), None)


@api_router.get("/contests")
async def list_contests(user=Depends(get_current_user)):
    """Cartoonix contests: per-user state + total entries for each."""
    counts: dict = {}
    cursor = db.contest_entries.aggregate([
        {"$group": {"_id": "$contest_id", "n": {"$sum": 1}}}
    ])
    async for row in cursor:
        counts[row["_id"]] = row["n"]

    user_entries: set = set()
    async for e in db.contest_entries.find(
        {"user_id": user["id"]}, {"_id": 0, "contest_id": 1}
    ):
        user_entries.add(e["contest_id"])

    items = []
    user_plan = user.get("subscription", "free")
    for c in sorted(CARTOONIX_CONTESTS, key=lambda x: x.get("order", 0)):
        items.append({
            **c,
            "entered": c["id"] in user_entries,
            "entry_count": counts.get(c["id"], 0),
            "locked_for_plan": c["plan"] == "plus" and user_plan != "plus",
        })
    return {"items": items, "user_plan": user_plan}


@api_router.post("/contests/{contest_id}/enter")
async def enter_contest(contest_id: str, user=Depends(get_current_user)):
    contest = _contest_by_id(contest_id)
    if not contest:
        raise HTTPException(404, "Concurs inexistent.")

    user_plan = user.get("subscription", "free")
    if contest["plan"] == "plus" and user_plan != "plus":
        raise HTTPException(
            403,
            "Acest concurs este rezervat membrilor Cartoonix PLUS.",
        )

    existing = await db.contest_entries.find_one({
        "contest_id": contest_id,
        "user_id": user["id"],
    })
    if existing:
        return {"success": True, "already_entered": True}

    doc = {
        "_id": new_id(),
        "contest_id": contest_id,
        "user_id": user["id"],
        "nickname": user.get("nickname", ""),
        "email": user.get("email", ""),
        "plan_at_entry": user_plan,
        "created_at": now_utc().isoformat(),
    }
    try:
        await db.contest_entries.insert_one(doc)
    except Exception as e:
        # Race condition fallback (unique index): treat as already entered
        logger.warning(f"[contests] insert race for {contest_id}/{user['id']}: {e}")
        return {"success": True, "already_entered": True}

    return {"success": True, "already_entered": False}


@api_router.get("/admin/contests")
async def admin_list_contests(user=Depends(require_admin)):
    """Admin overview: each contest + total entries + last entry date."""
    counts: dict = {}
    last_at: dict = {}
    cursor = db.contest_entries.aggregate([
        {"$group": {
            "_id": "$contest_id",
            "n": {"$sum": 1},
            "last_at": {"$max": "$created_at"},
        }}
    ])
    async for row in cursor:
        counts[row["_id"]] = row["n"]
        last_at[row["_id"]] = row.get("last_at")

    items = []
    for c in sorted(CARTOONIX_CONTESTS, key=lambda x: x.get("order", 0)):
        items.append({
            **c,
            "entry_count": counts.get(c["id"], 0),
            "last_entry_at": last_at.get(c["id"]),
        })
    total = await db.contest_entries.count_documents({})
    return {"items": items, "total_entries": total}


@api_router.get("/admin/contests/{contest_id}/entries")
async def admin_list_contest_entries(
    contest_id: str,
    user=Depends(require_admin),
    page: int = 1,
    page_size: int = 50,
    q: Optional[str] = None,
):
    contest = _contest_by_id(contest_id)
    if not contest:
        raise HTTPException(404, "Concurs inexistent.")

    page = max(1, int(page or 1))
    page_size = max(1, min(200, int(page_size or 50)))

    query: dict = {"contest_id": contest_id}
    if q:
        q_clean = q.strip()
        if q_clean:
            import re as _re
            safe = _re.escape(q_clean)
            query["$or"] = [
                {"email": {"$regex": safe, "$options": "i"}},
                {"nickname": {"$regex": safe, "$options": "i"}},
            ]

    total = await db.contest_entries.count_documents(query)
    skip = (page - 1) * page_size

    # We also want fresh avatar/subscription info — join via $lookup-like fetch
    entries = (
        await db.contest_entries.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(page_size)
        .to_list(page_size)
    )

    user_ids = [e.get("user_id") for e in entries if e.get("user_id")]
    users_by_id: dict = {}
    if user_ids:
        async for u in db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "avatar_url": 1, "subscription": 1, "email": 1, "nickname": 1},
        ):
            users_by_id[u["id"]] = u

    enriched = []
    for e in entries:
        u = users_by_id.get(e.get("user_id"), {})
        enriched.append({
            "user_id": e.get("user_id"),
            "nickname": u.get("nickname") or e.get("nickname"),
            "email": u.get("email") or e.get("email"),
            "avatar_url": u.get("avatar_url"),
            "current_plan": u.get("subscription"),
            "plan_at_entry": e.get("plan_at_entry"),
            "created_at": e.get("created_at"),
        })

    pages = (total + page_size - 1) // page_size if total else 0
    return {
        "contest": contest,
        "items": enriched,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email sau parolă incorectă")
    token = create_access_token(user["id"], user.get("role", "user"))
    return TokenResponse(access_token=token, user=UserPublic(**serialize_user(user)))


# ============================================================
#                  PASSWORD RESET / CHANGE
# ============================================================

# Minimum password complexity helper.
# Rules: >= 8 chars, at least one uppercase, one lowercase, one digit,
# and one special character (we allow a wide set so common keyboards work).
import re as _pw_re  # local alias

_PASSWORD_SPECIAL = r"!@#$%^&*()\-_=+\[\]{};:'\",.<>/?\\|`~"

def _validate_strong_password(password: str) -> Optional[str]:
    if not password or len(password) < 8:
        return "Parola trebuie să conțină cel puțin 8 caractere."
    if not _pw_re.search(r"[A-Z]", password):
        return "Parola trebuie să conțină cel puțin o literă mare."
    if not _pw_re.search(r"[a-z]", password):
        return "Parola trebuie să conțină cel puțin o literă mică."
    if not _pw_re.search(r"\d", password):
        return "Parola trebuie să conțină cel puțin o cifră."
    if not _pw_re.search(rf"[{_PASSWORD_SPECIAL}]", password):
        return "Parola trebuie să conțină cel puțin un caracter special."
    return None


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


def _public_site_url() -> str:
    """Return base URL for password reset links (sent to email)."""
    url = (
        os.environ.get("PUBLIC_SITE_URL")
        or os.environ.get("FRONTEND_URL")
        or "https://cartoonix.ro"
    )
    return url.rstrip("/")


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """Request a password reset email. Always returns success to avoid email enumeration."""
    email_norm = (payload.email or "").strip().lower()
    if not email_norm:
        # Still respond positively to prevent enumeration / bot probing
        return {"success": True}

    user = await db.users.find_one({"email": email_norm})
    if user:
        # Invalidate any previous unused tokens for this user
        try:
            await db.password_resets.delete_many({"user_id": user["id"], "used": False})
        except Exception as e:
            logger.warning(f"[forgot-password] cleanup failed: {e}")

        token = new_id() + new_id().replace("-", "")  # ~ 50+ chars, hard to guess
        token = token.replace("-", "")[:48]
        now = now_utc()
        expires_at = now + timedelta(minutes=60)
        await db.password_resets.insert_one({
            "_id": new_id(),
            "token": token,
            "user_id": user["id"],
            "email": email_norm,
            "created_at": now,
            "expires_at": expires_at,
            "used": False,
        })
        reset_url = f"{_public_site_url()}/reset-password?token={token}"
        try:
            send_password_reset_email(email_norm, user.get("nickname") or "", reset_url)
        except Exception as e:
            logger.error(f"[forgot-password] send failed: {e}")

    return {"success": True}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    token = (payload.token or "").strip()
    if not token:
        raise HTTPException(400, "Token lipsă.")

    err = _validate_strong_password(payload.new_password)
    if err:
        raise HTTPException(400, err)

    record = await db.password_resets.find_one({"token": token})
    if not record:
        raise HTTPException(400, "Link-ul de resetare nu este valid.")
    if record.get("used"):
        raise HTTPException(400, "Acest link de resetare a fost deja folosit.")

    expires_at = record.get("expires_at")
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        except Exception:
            expires_at = None
    if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
        # MongoDB returns naive UTC datetimes — coerce to aware
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < now_utc():
        raise HTTPException(400, "Link-ul de resetare a expirat.")

    user_id = record.get("user_id")
    if not user_id:
        raise HTTPException(400, "Token invalid.")

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "Contul asociat nu mai există.")

    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
    await db.password_resets.update_one(
        {"token": token},
        {"$set": {"used": True, "used_at": now_utc()}},
    )
    return {"success": True}


@api_router.post("/auth/change-password")
async def change_password(payload: ChangePasswordRequest, user=Depends(get_current_user)):
    """In-app password change: requires the current password."""
    if not payload.old_password:
        raise HTTPException(400, "Parola actuală este obligatorie.")
    if not verify_password(payload.old_password, user.get("password_hash", "")):
        raise HTTPException(400, "Parola actuală este incorectă.")
    if payload.old_password == payload.new_password:
        raise HTTPException(400, "Parola nouă trebuie să fie diferită de cea actuală.")
    err = _validate_strong_password(payload.new_password)
    if err:
        raise HTTPException(400, err)

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
    return {"success": True}


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user=Depends(get_current_user)):
    return UserPublic(**serialize_user(user))


@api_router.patch("/auth/me", response_model=UserPublic)
async def update_me(payload: UpdateUserRequest, user=Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if "nickname" in update and update["nickname"] != user.get("nickname"):
        if await db.users.find_one({"nickname": update["nickname"]}):
            raise HTTPException(status_code=400, detail="Acest pseudonim este deja luat")
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return UserPublic(**serialize_user(user))


# ============================================================
#                        CATEGORIES
# ============================================================
@api_router.get("/categories", response_model=List[Category])
async def list_categories():
    items = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(20)
    return [Category(**i) for i in items]


@api_router.get("/categories/{slug}", response_model=Category)
async def get_category(slug: str):
    item = await db.categories.find_one({"slug": slug}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Category not found")
    return Category(**item)


# ============================================================
#                        CARTOONS (public)
# ============================================================
@api_router.get("/cartoons")
async def list_cartoons(category: Optional[str] = None, q: Optional[str] = None, limit: int = 200):
    query = {}
    if category:
        cat = await db.categories.find_one({"slug": category}, {"_id": 0})
        if not cat:
            return []
        query["category_id"] = cat["id"]
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    items = await db.cartoons.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    # Enrich with episode_count
    for it in items:
        it["episode_count"] = await db.episodes.count_documents({"cartoon_id": it["id"]})
    return items


@api_router.get("/cartoons/{cartoon_id}")
async def get_cartoon(cartoon_id: str):
    c = await db.cartoons.find_one({"id": cartoon_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Cartoon not found")
    episodes = await db.episodes.find({"cartoon_id": cartoon_id}, {"_id": 0}).sort([("season", 1), ("episode_number", 1)]).to_list(500)
    c["episodes"] = episodes
    c["episode_count"] = len(episodes)
    return c


# ============================================================
#                        ADMIN: CARTOONS
# ============================================================
@api_router.post("/admin/cartoons")
async def admin_create_cartoon(payload: CartoonCreate, user=Depends(require_admin)):
    cat = await db.categories.find_one({"id": payload.category_id}, {"_id": 0})
    if not cat:
        raise HTTPException(400, "Invalid category_id")
    doc = payload.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_utc().isoformat()
    doc["updated_at"] = now_utc().isoformat()
    await db.cartoons.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.patch("/admin/cartoons/{cartoon_id}")
async def admin_update_cartoon(cartoon_id: str, payload: CartoonUpdate, user=Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if update:
        update["updated_at"] = now_utc().isoformat()
        result = await db.cartoons.update_one({"id": cartoon_id}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Cartoon not found")
    c = await db.cartoons.find_one({"id": cartoon_id}, {"_id": 0})
    return c


@api_router.delete("/admin/cartoons/{cartoon_id}")
async def admin_delete_cartoon(cartoon_id: str, user=Depends(require_admin)):
    await db.episodes.delete_many({"cartoon_id": cartoon_id})
    result = await db.cartoons.delete_one({"id": cartoon_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Cartoon not found")
    return {"success": True}


# ============================================================
#                        ADMIN: EPISODES
# ============================================================
@api_router.post("/admin/episodes")
async def admin_create_episode(payload: EpisodeCreate, user=Depends(require_admin)):
    if not await db.cartoons.find_one({"id": payload.cartoon_id}):
        raise HTTPException(400, "Invalid cartoon_id")
    doc = payload.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_utc().isoformat()
    await db.episodes.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.patch("/admin/episodes/{episode_id}")
async def admin_update_episode(episode_id: str, payload: EpisodeUpdate, user=Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if update:
        result = await db.episodes.update_one({"id": episode_id}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Episode not found")
    return await db.episodes.find_one({"id": episode_id}, {"_id": 0})


@api_router.delete("/admin/episodes/{episode_id}")
async def admin_delete_episode(episode_id: str, user=Depends(require_admin)):
    result = await db.episodes.delete_one({"id": episode_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Episode not found")
    return {"success": True}


# ============================================================
#                        ADMIN: UPLOADS
# ============================================================
@api_router.post("/admin/upload/video")
async def admin_upload_video(file: UploadFile = File(...), user=Depends(require_admin)):
    safe_ext = (Path(file.filename or "video.mp4").suffix or ".mp4").lower()
    if safe_ext not in {".mp4", ".webm", ".mov", ".m4v", ".mkv"}:
        raise HTTPException(400, "Unsupported video format")
    name = f"{uuid.uuid4().hex}{safe_ext}"
    dest = UPLOAD_DIR / "videos" / name
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"url": f"/api/uploads/videos/{name}", "filename": name, "size": dest.stat().st_size}


@api_router.post("/admin/upload/thumbnail")
async def admin_upload_thumbnail(file: UploadFile = File(...), user=Depends(require_admin)):
    safe_ext = (Path(file.filename or "img.jpg").suffix or ".jpg").lower()
    if safe_ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        raise HTTPException(400, "Unsupported image format")
    name = f"{uuid.uuid4().hex}{safe_ext}"
    dest = UPLOAD_DIR / "thumbnails" / name
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"url": f"/api/uploads/thumbnails/{name}", "filename": name, "size": dest.stat().st_size}


@api_router.post("/admin/import-folder")
async def admin_import_folder(payload: dict, user=Depends(require_admin)):
    """Scan a server folder and import .mp4/.webm files as episodes for a given cartoon."""
    folder = payload.get("folder")
    cartoon_id = payload.get("cartoon_id")
    if not folder or not cartoon_id:
        raise HTTPException(400, "folder and cartoon_id required")
    if not await db.cartoons.find_one({"id": cartoon_id}):
        raise HTTPException(400, "Invalid cartoon_id")
    folder_p = Path(folder)
    # Allow only paths under /app/backend/uploads for safety
    try:
        folder_p.resolve().relative_to(UPLOAD_DIR.resolve())
    except Exception:
        raise HTTPException(400, f"Folder must be inside {UPLOAD_DIR}")
    if not folder_p.exists() or not folder_p.is_dir():
        raise HTTPException(400, "Folder does not exist")
    added = []
    existing_count = await db.episodes.count_documents({"cartoon_id": cartoon_id})
    files = sorted([f for f in folder_p.glob("*") if f.suffix.lower() in {".mp4", ".webm", ".mov", ".m4v", ".mkv"}])
    for idx, fpath in enumerate(files, start=1):
        rel = fpath.resolve().relative_to(UPLOAD_DIR.resolve())
        url = f"/api/uploads/{rel.as_posix()}"
        doc = {
            "id": new_id(),
            "cartoon_id": cartoon_id,
            "title": fpath.stem.replace("_", " ").replace("-", " ").title(),
            "season": 1,
            "episode_number": existing_count + idx,
            "description": "",
            "duration_seconds": 0,
            "video_url": url,
            "source_type": "upload",
            "thumbnail_url": "",
            "created_at": now_utc().isoformat(),
        }
        await db.episodes.insert_one(doc)
        added.append({k: v for k, v in doc.items() if k != "_id"})
    return {"imported": len(added), "episodes": added}


# ============================================================
#                        ADMIN: USERS
# ============================================================
@api_router.get("/admin/users")
async def admin_list_users(
    user=Depends(require_admin),
    page: int = 1,
    page_size: int = 50,
    q: Optional[str] = None,
):
    page = max(1, int(page or 1))
    page_size = max(1, min(200, int(page_size or 50)))

    query: dict = {}
    if q:
        q_clean = q.strip()
        if q_clean:
            import re as _re
            safe = _re.escape(q_clean)
            query["$or"] = [
                {"email": {"$regex": safe, "$options": "i"}},
                {"nickname": {"$regex": safe, "$options": "i"}},
            ]

    total = await db.users.count_documents(query)
    skip = (page - 1) * page_size
    items = (
        await db.users.find(query, {"_id": 0, "password_hash": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(page_size)
        .to_list(page_size)
    )
    pages = (total + page_size - 1) // page_size if total else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@api_router.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, payload: dict, user=Depends(require_admin)):
    allowed = {k: v for k, v in payload.items() if k in {"role", "subscription", "email_verified"}}
    if not allowed:
        raise HTTPException(400, "No valid fields")
    await db.users.update_one({"id": user_id}, {"$set": allowed})
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return u


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user=Depends(require_admin)):
    if user_id == user["id"]:
        raise HTTPException(400, "Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "User not found")
    return {"success": True}


# ============================================================
#                        ADMIN: STATS
# ============================================================
@api_router.get("/admin/stats")
async def admin_stats(user=Depends(require_admin)):
    users_count = await db.users.count_documents({})
    cartoons_count = await db.cartoons.count_documents({})
    episodes_count = await db.episodes.count_documents({})
    plus_count = await db.users.count_documents({"subscription": "plus"})
    verified_count = await db.users.count_documents({"email_verified": True})
    recent_cartoons = await db.cartoons.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_episodes = await db.episodes.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    return {
        "users_count": users_count,
        "cartoons_count": cartoons_count,
        "episodes_count": episodes_count,
        "plus_count": plus_count,
        "verified_count": verified_count,
        "recent_cartoons": recent_cartoons,
        "recent_episodes": recent_episodes,
    }


# ============================================================
#                        USER: FAVORITES
# ============================================================
@api_router.get("/me/favorites")
async def list_favorites(user=Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    cartoon_ids = [f["cartoon_id"] for f in favs]
    cartoons = await db.cartoons.find({"id": {"$in": cartoon_ids}}, {"_id": 0}).to_list(500)
    return cartoons


@api_router.post("/me/favorites/toggle")
async def toggle_favorite(payload: FavoriteToggle, user=Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": user["id"], "cartoon_id": payload.cartoon_id})
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        return {"favorited": False}
    await db.favorites.insert_one({
        "id": new_id(),
        "user_id": user["id"],
        "cartoon_id": payload.cartoon_id,
        "created_at": now_utc().isoformat(),
    })
    return {"favorited": True}


@api_router.get("/me/favorites/check/{cartoon_id}")
async def is_favorited(cartoon_id: str, user=Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": user["id"], "cartoon_id": cartoon_id})
    return {"favorited": bool(existing)}


# ============================================================
#                        USER: HISTORY
# ============================================================
@api_router.post("/me/history")
async def record_watch(payload: RecordWatch, user=Depends(get_current_user)):
    # Upsert by (user, episode) to avoid bloat; update progress and watched_at
    await db.watch_history.update_one(
        {"user_id": user["id"], "episode_id": payload.episode_id},
        {"$set": {
            "user_id": user["id"],
            "cartoon_id": payload.cartoon_id,
            "episode_id": payload.episode_id,
            "progress_seconds": payload.progress_seconds,
            "watched_at": now_utc().isoformat(),
        }, "$setOnInsert": {"id": new_id()}},
        upsert=True,
    )
    return {"success": True}


@api_router.get("/me/history")
async def list_history(user=Depends(get_current_user)):
    items = await db.watch_history.find({"user_id": user["id"]}, {"_id": 0}).sort("watched_at", -1).limit(100).to_list(100)
    # Enrich with cartoon+episode
    cartoon_ids = list({i["cartoon_id"] for i in items})
    episode_ids = list({i["episode_id"] for i in items})
    cartoons = {c["id"]: c for c in await db.cartoons.find({"id": {"$in": cartoon_ids}}, {"_id": 0}).to_list(500)}
    episodes = {e["id"]: e for e in await db.episodes.find({"id": {"$in": episode_ids}}, {"_id": 0}).to_list(500)}
    enriched = []
    for h in items:
        enriched.append({**h, "cartoon": cartoons.get(h["cartoon_id"]), "episode": episodes.get(h["episode_id"])})
    return enriched


# ============================================================
#                        USER: PLAYLISTS (Plus only)
# ============================================================
def _require_plus(user):
    if user.get("subscription") != "plus":
        raise HTTPException(status_code=403, detail="Playlist-urile sunt o funcție Cartoonix Plus")


@api_router.get("/me/playlists")
async def list_playlists(user=Depends(get_current_user)):
    if user.get("subscription") != "plus":
        return []
    return await db.playlists.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)


@api_router.post("/me/playlists")
async def create_playlist(payload: PlaylistCreate, user=Depends(get_current_user)):
    _require_plus(user)
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "name": payload.name,
        "description": payload.description,
        "cartoon_ids": [],
        "created_at": now_utc().isoformat(),
    }
    await db.playlists.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.post("/me/playlists/{playlist_id}/items")
async def add_to_playlist(playlist_id: str, payload: PlaylistAddItem, user=Depends(get_current_user)):
    _require_plus(user)
    pl = await db.playlists.find_one({"id": playlist_id, "user_id": user["id"]})
    if not pl:
        raise HTTPException(404, "Playlist not found")
    if payload.cartoon_id not in pl.get("cartoon_ids", []):
        await db.playlists.update_one({"id": playlist_id}, {"$addToSet": {"cartoon_ids": payload.cartoon_id}})
    return await db.playlists.find_one({"id": playlist_id}, {"_id": 0})


@api_router.delete("/me/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str, user=Depends(get_current_user)):
    _require_plus(user)
    result = await db.playlists.delete_one({"id": playlist_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Playlist not found")
    return {"success": True}


# ============================================================
#                        CONTESTS (public)
# ============================================================
import re as _re

# Contest catalog — keep in sync with frontend ConcursuriPage.jsx
CONTESTS = {
    "toy-story-5": {
        "id": "toy-story-5",
        "name": "Premiera Toy Story 5",
        "type": "free",
    },
    "abonamente-plus": {
        "id": "abonamente-plus",
        "name": "15 Abonamente Cartoonix PLUS",
        "type": "free",
    },
    "disneyland-paris": {
        "id": "disneyland-paris",
        "name": "Marele Premiu — Disneyland Paris",
        "type": "paid",
    },
}

_EMAIL_RE = _re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@api_router.post("/contests/enter")
async def enter_free_contest(payload: dict):
    """Register an email for a free contest and send confirmation."""
    email = (payload.get("email") or "").strip().lower()
    contest_id = (payload.get("contest_id") or "").strip()
    if not _EMAIL_RE.match(email):
        raise HTTPException(400, "Adresă de email invalidă")
    contest = CONTESTS.get(contest_id)
    if not contest or contest["type"] != "free":
        raise HTTPException(400, "Concurs invalid")

    # Prevent duplicate entry for the same email+contest
    existing = await db.contest_entries.find_one({"email": email, "contest_id": contest_id})
    if existing:
        return {"success": True, "duplicate": True, "message": "Ești deja înscris la acest concurs."}

    await db.contest_entries.insert_one({
        "id": new_id(),
        "email": email,
        "contest_id": contest_id,
        "contest_name": contest["name"],
        "type": "free",
        "created_at": now_utc().isoformat(),
    })

    sent = send_simple_contest_confirmation(email, contest["name"])
    if not sent:
        logger.warning(f"Confirmation email failed for contest {contest_id} to {email}")
    return {"success": True, "duplicate": False, "email_sent": sent}


@api_router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, stripe_signature: Optional[str] = Header(None)):
    """Receive Stripe events. On checkout.session.completed → send confirmation email."""
    raw_body = await request.body()

    event = None
    if _STRIPE_WEBHOOK_SECRET and stripe_signature:
        try:
            event = _stripe.Webhook.construct_event(
                raw_body, stripe_signature, _STRIPE_WEBHOOK_SECRET
            )
        except _stripe.error.SignatureVerificationError:
            logger.error("Stripe webhook signature verification failed")
            raise HTTPException(status_code=400, detail="Invalid signature")
        except Exception as e:
            logger.error(f"Stripe webhook parse error: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
    else:
        # No webhook secret configured yet — parse raw JSON (development only).
        import json as _json
        try:
            event = _json.loads(raw_body.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON")
        logger.warning("STRIPE_WEBHOOK_SECRET not configured — accepting event without signature verification.")

    event_type = event.get("type") if isinstance(event, dict) else event["type"]
    if event_type == "checkout.session.completed":
        data_obj = (event.get("data", {}) if isinstance(event, dict) else event["data"]).get("object", {})
        email = (
            (data_obj.get("customer_details") or {}).get("email")
            or data_obj.get("customer_email")
            or ""
        ).strip().lower()
        amount_total = data_obj.get("amount_total")  # cents
        currency = (data_obj.get("currency") or "eur").upper()
        session_id = data_obj.get("id") or ""

        contest = CONTESTS["disneyland-paris"]

        if email:
            # Persist entry — idempotent by session_id
            await db.contest_entries.update_one(
                {"stripe_session_id": session_id} if session_id else {"_id": new_id()},
                {"$setOnInsert": {
                    "id": new_id(),
                    "email": email,
                    "contest_id": contest["id"],
                    "contest_name": contest["name"],
                    "type": "paid",
                    "amount_total": amount_total,
                    "currency": currency,
                    "stripe_session_id": session_id,
                    "created_at": now_utc().isoformat(),
                }},
                upsert=True,
            )
            sent = send_simple_contest_confirmation(email, contest["name"])
            logger.info(f"Stripe checkout.session.completed → email={email} sent={sent}")
        else:
            logger.warning(f"Stripe checkout.session.completed missing email (session={session_id})")

    return {"received": True}


# ============================================================
#                  ANNOUNCEMENTS (Update Popup)
# ============================================================
# Static list of platform-wide announcements. The user-facing popup
# shows the LATEST one the user has not yet dismissed.
# `id` should be stable; appending a new entry triggers a new popup
# for everyone (because nobody has dismissed it yet).
ANNOUNCEMENTS = [
    {
        "id": "2026-02-resetare-parola",
        "version": "v1.4",
        "date": "Mai 2026",
        "title": "Noutăți Cartoonix",
        "subtitle": "Cont mai sigur, mai ușor de recuperat",
        "highlights": [
            "🔐 Resetare parolă prin email — recuperează-ți contul în câteva secunde dacă uiți parola.",
            "🔑 Schimbare parolă din meniul Setări — direct din contul tău, fără să te deconectezi.",
            "📬 Inbox real — primește mesaje și anunțuri direct în platformă.",
        ],
    },
]


def _latest_announcement():
    return ANNOUNCEMENTS[-1] if ANNOUNCEMENTS else None


@api_router.get("/announcements/latest")
async def latest_announcement(user=Depends(get_current_user)):
    """Return the most recent announcement the user hasn't dismissed yet."""
    ann = _latest_announcement()
    if not ann:
        return {"announcement": None}
    seen = set(user.get("seen_announcements") or [])
    if ann["id"] in seen:
        return {"announcement": None}
    return {"announcement": ann}


@api_router.post("/announcements/{announcement_id}/dismiss")
async def dismiss_announcement(announcement_id: str, user=Depends(get_current_user)):
    """Mark an announcement as seen for the current user."""
    if not any(a["id"] == announcement_id for a in ANNOUNCEMENTS):
        raise HTTPException(404, "Anunț inexistent")
    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"seen_announcements": announcement_id}},
    )
    return {"success": True}


# ============================================================
#                   NOTIFICATIONS (Inbox)
# ============================================================
class NotificationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=140)
    body: str = Field(..., min_length=1, max_length=2000)
    target: Literal["all", "free", "plus", "user"] = "all"
    user_id: Optional[str] = None  # required when target == "user"
    icon: Optional[str] = None     # optional lucide icon name (frontend mapped)


def _serialize_notification(doc: dict) -> dict:
    return {
        "id": doc.get("id"),
        "title": doc.get("title", ""),
        "body": doc.get("body", ""),
        "icon": doc.get("icon"),
        "read": bool(doc.get("read", False)),
        "created_at": doc.get("created_at"),
    }


@api_router.get("/notifications")
async def list_notifications(user=Depends(get_current_user), limit: int = 50):
    limit = max(1, min(200, int(limit or 50)))
    items = (
        await db.notifications.find({"user_id": user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
        .to_list(limit)
    )
    return {"items": [_serialize_notification(i) for i in items]}


@api_router.get("/notifications/unread-count")
async def unread_notifications_count(user=Depends(get_current_user)):
    """Combined unread badge: pending announcement + unread notifications."""
    notif_count = await db.notifications.count_documents(
        {"user_id": user["id"], "read": False}
    )
    announcement_pending = 0
    ann = _latest_announcement()
    if ann:
        seen = set(user.get("seen_announcements") or [])
        if ann["id"] not in seen:
            announcement_pending = 1
    return {
        "notifications": notif_count,
        "announcement": announcement_pending,
        "total": notif_count + announcement_pending,
    }


@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    res = await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"read": True, "read_at": now_utc().isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Notificare inexistentă")
    return {"success": True}


@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(user=Depends(get_current_user)):
    res = await db.notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True, "read_at": now_utc().isoformat()}},
    )
    return {"success": True, "updated": res.modified_count}


@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user=Depends(get_current_user)):
    res = await db.notifications.delete_one(
        {"id": notification_id, "user_id": user["id"]}
    )
    if res.deleted_count == 0:
        raise HTTPException(404, "Notificare inexistentă")
    return {"success": True}


# ----- Admin: send notifications -----
@api_router.post("/admin/notifications")
async def admin_send_notification(payload: NotificationCreate, user=Depends(require_admin)):
    """Send a notification to all users, a subscription tier, or a single user."""
    # Build recipient query
    query: dict = {}
    if payload.target == "all":
        query = {}
    elif payload.target in ("free", "plus"):
        query = {"subscription": payload.target}
    elif payload.target == "user":
        if not payload.user_id:
            raise HTTPException(400, "user_id este obligatoriu pentru target=user")
        query = {"id": payload.user_id}
    else:
        raise HTTPException(400, "Target invalid")

    recipients = await db.users.find(query, {"_id": 0, "id": 1}).to_list(100000)
    if not recipients:
        raise HTTPException(404, "Niciun destinatar nu corespunde criteriilor.")

    now_iso = now_utc().isoformat()
    docs = [
        {
            "id": new_id(),
            "user_id": r["id"],
            "title": payload.title.strip(),
            "body": payload.body.strip(),
            "icon": payload.icon,
            "read": False,
            "created_at": now_iso,
            "sent_by": user["id"],
        }
        for r in recipients
    ]
    if docs:
        await db.notifications.insert_many(docs)
    return {"success": True, "sent": len(docs)}


@api_router.get("/admin/notifications")
async def admin_list_notifications(
    user=Depends(require_admin),
    page: int = 1,
    page_size: int = 50,
):
    """List recent notifications grouped by send batch (same title/body/created_at)."""
    page = max(1, int(page or 1))
    page_size = max(1, min(200, int(page_size or 50)))
    # Aggregate by (title, body, created_at second) so the admin sees one row per broadcast.
    pipeline = [
        {"$sort": {"created_at": -1}},
        {
            "$group": {
                "_id": {"title": "$title", "body": "$body", "created_at": "$created_at"},
                "count": {"$sum": 1},
                "read_count": {"$sum": {"$cond": ["$read", 1, 0]}},
                "sample_id": {"$first": "$id"},
                "sent_by": {"$first": "$sent_by"},
            }
        },
        {"$sort": {"_id.created_at": -1}},
        {"$skip": (page - 1) * page_size},
        {"$limit": page_size},
    ]
    rows = await db.notifications.aggregate(pipeline).to_list(page_size)
    items = [
        {
            "title": r["_id"].get("title"),
            "body": r["_id"].get("body"),
            "created_at": r["_id"].get("created_at"),
            "recipients": r.get("count", 0),
            "read_count": r.get("read_count", 0),
        }
        for r in rows
    ]
    return {"items": items, "page": page, "page_size": page_size}


# ============================================================
# Mount router & middleware
# ============================================================
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
