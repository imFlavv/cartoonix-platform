"""Cartoonix main FastAPI app."""
import logging
import os
import random
import re
import shutil
import string
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import (APIRouter, Depends, FastAPI, File, Form, HTTPException, Header, Request,
                     UploadFile, status)
from fastapi.responses import JSONResponse, Response, StreamingResponse
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

# External video library (e.g. /media/videos on the VPS). Served through a
# custom range-enabled endpoint (see /api/media/videos/{path}) so seeking works
# for mp4/webm/mkv/etc. Configurable via VIDEO_DIR env.
VIDEO_DIR = os.environ.get("VIDEO_DIR", "/media/videos")
try:
    os.makedirs(VIDEO_DIR, exist_ok=True)
except Exception:
    pass

VIDEO_EXT_MIME = {
    "mp4": "video/mp4", "m4v": "video/mp4", "webm": "video/webm",
    "ogg": "video/ogg", "ogv": "video/ogg", "mkv": "video/x-matroska",
    "mov": "video/quicktime", "avi": "video/x-msvideo",
    "wmv": "video/x-ms-wmv", "flv": "video/x-flv", "mpeg": "video/mpeg",
    "mpg": "video/mpeg", "ts": "video/mp2t",
}


@api_router.get("/media/videos/{file_path:path}")
async def serve_video(file_path: str, request: Request):
    """Serve a video file from the external library with HTTP Range support
    (required for in-browser seeking). Guards against path traversal."""
    from urllib.parse import unquote
    base = os.path.realpath(VIDEO_DIR)
    target = os.path.realpath(os.path.join(base, unquote(file_path)))
    if not (target == base or target.startswith(base + os.sep)):
        raise HTTPException(status_code=403, detail="Forbidden")
    if not os.path.isfile(target):
        raise HTTPException(status_code=404, detail="Video not found")

    file_size = os.path.getsize(target)
    ext = os.path.splitext(target)[1].lower().lstrip(".")
    content_type = VIDEO_EXT_MIME.get(ext, "application/octet-stream")
    range_header = request.headers.get("range")

    def _iter(start: int, end: int, chunk: int = 1024 * 1024):
        with open(target, "rb") as f:
            f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                data = f.read(min(chunk, remaining))
                if not data:
                    break
                remaining -= len(data)
                yield data

    if range_header:
        m = re.match(r"bytes=(\d*)-(\d*)", range_header.strip())
        if m:
            start_s, end_s = m.group(1), m.group(2)
            start = int(start_s) if start_s else 0
            end = int(end_s) if end_s else file_size - 1
            end = min(end, file_size - 1)
            if start > end or start >= file_size:
                return Response(status_code=416, headers={"Content-Range": f"bytes */{file_size}"})
            length = end - start + 1
            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(length),
                "Cache-Control": "public, max-age=3600",
            }
            return StreamingResponse(_iter(start, end), status_code=206, headers=headers, media_type=content_type)

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Cache-Control": "public, max-age=3600",
    }
    return StreamingResponse(_iter(0, file_size - 1), status_code=200, headers=headers, media_type=content_type)


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
                    FavoriteToggle, Playlist, PlaylistAddEpisode,
                    PlaylistAddItem, PlaylistCreate, PlaylistReorder,
                    RecordWatch, ResendCodeRequest, TokenResponse,
                    UpdateUserRequest, UserCreate, UserLogin, UserPublic,
                    VerifyEmailRequest, new_id, now_utc)
from seed import seed_avatars, seed_categories  # noqa: E402
from chat import attach_handlers as _attach_chat_handlers  # noqa: E402
from staff import attach_staff_handlers as _attach_staff_handlers  # noqa: E402
from watch_party import create_router as _create_watch_party_router  # noqa: E402
from auth import decode_token as _decode_token_for_ws  # noqa: E402

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
    # Chat
    await db.chat_messages.create_index([("room", 1), ("created_at", -1)])
    await db.chat_messages.create_index("user_id")
    await db.chat_messages.create_index("id", unique=True)
    await db.chat_online.create_index("last_seen", expireAfterSeconds=600)
    # Lobby
    await db.lobby_polls.create_index("active")
    await db.lobby_polls.create_index("id", unique=True)
    await db.lobby_suggestions.create_index("user_id")
    await db.lobby_suggestions.create_index("created_at")
    await db.lobby_suggestions.create_index("read")
    await db.users.create_index("presence_seconds")
    # Staff applications
    await db.staff_applications.create_index("user_id", unique=True)
    await db.staff_applications.create_index("status")
    await db.staff_applications.create_index("created_at")
    # Banned IPs (admin-managed blocklist)
    await db.banned_ips.create_index("ip", unique=True)
    # Watch Party indexes
    await db.watch_parties.create_index("public_code", unique=True)
    await db.watch_parties.create_index("host_user_id")
    await db.watch_parties.create_index("status")
    await db.watch_parties.create_index("participants.user_id")
    await db.watch_parties.create_index("invitations.user_id")
    # TTL on `expires_at_dt` (Mongo only honors TTL on real BSON dates)
    await db.watch_parties.create_index("expires_at_dt", expireAfterSeconds=0)
    # Ensure permanent admins (super-admins always promoted)
    for super_email in ("albanflaviu24@gmail.com",):
        await db.users.update_one(
            {"email": super_email},
            {"$set": {"role": "admin", "email_verified": True}},
        )
    # Seed default banned words for chat (only if not initialised yet)
    from chat import DEFAULT_BANNED_WORDS_SEED, DEFAULT_CARTOONIXTV_MESSAGES
    settings_doc = await db.settings.find_one({"_id": "global"}) or {}
    if "chat_banned_words" not in settings_doc:
        await db.settings.update_one(
            {"_id": "global"},
            {"$set": {"chat_banned_words": sorted(set(DEFAULT_BANNED_WORDS_SEED))}},
            upsert=True,
        )
    if "cartoonixtv_messages" not in settings_doc:
        await db.settings.update_one(
            {"_id": "global"},
            {"$set": {"cartoonixtv_messages": list(DEFAULT_CARTOONIXTV_MESSAGES)}},
            upsert=True,
        )

    # Start the CartoonixTV background scheduler
    from chat import start_bot_scheduler
    start_bot_scheduler()

    logger.info("Cartoonix startup complete.")


@app.on_event("shutdown")
async def on_shutdown():
    from chat import stop_bot_scheduler
    stop_bot_scheduler()
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
#                  CLIENT IP / ACTIVITY TRACKING
# ============================================================
def get_client_ip(request: Optional[Request]) -> str:
    """Extract the original client IP, honoring X-Forwarded-For from the
    Kubernetes ingress / reverse proxy."""
    if request is None:
        return ""
    fwd = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
    if fwd:
        # XFF is a comma-separated list — take the first (original client)
        return fwd.split(",")[0].strip()
    client = request.client
    return client.host if client else ""


async def record_user_activity(user_id: str, ip: str) -> None:
    """Update the user's last_active timestamp + IP. Best-effort, never raises."""
    try:
        await db.users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "last_active": now_utc().isoformat(),
                    "last_ip": ip or "",
                }
            },
        )
    except Exception:
        # Activity tracking is non-critical; don't block requests.
        pass


# In-process cache of the banned-IP set, so the middleware doesn't hit Mongo
# on every /api/* request. TTL is short enough that newly banned IPs take
# effect within ~30 seconds.
_BANNED_IPS_CACHE: set[str] = set()
_BANNED_IPS_CACHE_TS: float = 0.0
_BANNED_IPS_TTL_SECONDS: float = 30.0


async def _is_ip_banned(ip: str) -> bool:
    """Cached lookup against the banned_ips collection."""
    if not ip:
        return False
    global _BANNED_IPS_CACHE, _BANNED_IPS_CACHE_TS
    import time as _time
    now = _time.monotonic()
    if now - _BANNED_IPS_CACHE_TS > _BANNED_IPS_TTL_SECONDS:
        try:
            docs = await db.banned_ips.find({}, {"_id": 0, "ip": 1}).to_list(5000)
            _BANNED_IPS_CACHE = {d.get("ip", "") for d in docs if d.get("ip")}
            _BANNED_IPS_CACHE_TS = now
        except Exception:
            # On failure, do not crash requests — keep stale cache.
            _BANNED_IPS_CACHE_TS = now
    return ip in _BANNED_IPS_CACHE


def _invalidate_banned_ips_cache() -> None:
    global _BANNED_IPS_CACHE_TS
    _BANNED_IPS_CACHE_TS = 0.0


@app.middleware("http")
async def block_banned_and_track_activity(request: Request, call_next):
    """1) Reject requests originating from banned IPs (cached, ~30s freshness).
    2) Throttled background-style update of user.last_active+last_ip happens in
       the auth dependency, not here, to keep this middleware lightweight.

    Runs only for /api/* routes; static / video range requests are excluded
    via the path prefix check to keep video streaming fast.
    """
    path = request.url.path or ""
    if not path.startswith("/api"):
        return await call_next(request)

    ip = get_client_ip(request)
    if ip and await _is_ip_banned(ip):
        return JSONResponse(
            status_code=403,
            content={
                "detail": "Acces interzis. Adresa ta IP a fost blocată.",
                "code": "ip_banned",
            },
        )

    return await call_next(request)


# ============================================================
#                        HEALTH
# ============================================================
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "cartoonix"}


# ============================================================
#               LIVE EVENT (single-event marathon)
# ============================================================
# Server-authoritative status for the live marathon stream. The video is
# served as a regular range-enabled file (see /api/media/videos/...), but the
# frontend constrains the player so that seeking is disabled and the playhead
# always reflects the elapsed time since the configured start.
#
# Config is persisted in db.settings under _id="live_event" and editable by
# admins via /api/admin/live/maraton. Env vars below are only used to seed the
# initial document on first read.
LIVE_DEFAULT_START_ISO = os.environ.get(
    "LIVE_START_ISO", "2026-06-01T13:00:00+00:00"  # 16:00 Europe/Bucharest
)
LIVE_DEFAULT_DURATION = int(os.environ.get("LIVE_DURATION_SECONDS", "28800"))  # 8h
LIVE_DEFAULT_VIDEO = os.environ.get("LIVE_VIDEO_PATH", "Maraton/0601.mp4")
LIVE_DEFAULT_TITLE = os.environ.get("LIVE_TITLE", "Maraton Cartoonix")
LIVE_DEFAULT_ENABLED = os.environ.get("LIVE_ENABLED", "1").strip() not in (
    "0", "false", "False", "",
)

LIVE_CONFIG_DEFAULTS = {
    "enabled": LIVE_DEFAULT_ENABLED,
    "title": LIVE_DEFAULT_TITLE,
    "start_iso": LIVE_DEFAULT_START_ISO,
    "duration_seconds": LIVE_DEFAULT_DURATION,
    "video_path": LIVE_DEFAULT_VIDEO,
    "youtube_url": "",
    "iframe_url": "https://player.mediadelivery.net/embed/674146/abb7021f-66bb-4671-938d-3ff089910d9d?autoplay=true&loop=false&muted=true&preload=true&responsive=true",
    "iframe_no_seek": True,
    "poster_url": "",
    "subtitle": "",
    "program": [
        "Noua Școală a Împăratului",
        "Ed, Edd și Eddy",
        "A.T.O.M",
        "Laboratorul lui Dexter",
        "Clanul Nebunaticilor De Alături",
        "Tinerii Titani",
        "Johnny Bravo",
        "Sonic X",
        "Sumbrele Aventuri Ale Lui Billy Și Mandy",
        "Vaca și Puiul",
    ],
}


def _extract_youtube_id(raw: str) -> str:
    """Accepts any common YouTube URL form and returns the 11-char video id.
    Returns empty string if input cannot be parsed."""
    import re
    s = str(raw or "").strip()
    if not s:
        return ""
    # Already an ID?
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", s):
        return s
    # youtu.be/<id>
    m = re.search(r"youtu\.be/([A-Za-z0-9_-]{11})", s)
    if m:
        return m.group(1)
    # youtube.com/watch?v=<id>
    m = re.search(r"[?&]v=([A-Za-z0-9_-]{11})", s)
    if m:
        return m.group(1)
    # youtube.com/embed/<id> or /live/<id> or /shorts/<id>
    m = re.search(r"youtube\.com/(?:embed|live|shorts)/([A-Za-z0-9_-]{11})", s)
    if m:
        return m.group(1)
    return ""


async def _live_config() -> dict:
    """Return the current live config, seeding defaults on first read."""
    doc = await db.settings.find_one({"_id": "live_event"})
    if not doc:
        return dict(LIVE_CONFIG_DEFAULTS)
    cfg = {k: doc.get(k, v) for k, v in LIVE_CONFIG_DEFAULTS.items()}
    # Auto-heal: if a previous admin saved a path with a redundant prefix,
    # normalize and persist it so the URL is always correct.
    raw = str(cfg.get("video_path") or "")
    normalized = _live_normalize_video_path(raw)
    if normalized and normalized != raw.lstrip("/"):
        cfg["video_path"] = normalized
        try:
            await db.settings.update_one(
                {"_id": "live_event"},
                {"$set": {"video_path": normalized}},
            )
        except Exception:
            pass
    return cfg


def _live_parse_start(start_iso: str) -> datetime:
    try:
        dt = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
    except Exception:
        dt = datetime.fromisoformat(LIVE_DEFAULT_START_ISO.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _live_normalize_video_path(raw: str) -> str:
    """Strip common prefixes the admin might leave in the field, so the URL
    is always built as `/api/media/videos/<relative>` regardless of input.
    Accepts variants like:
      - "Maraton/0601.mp4"
      - "/media/videos/Maraton/0601.mp4"
      - "media/videos/Maraton/0601.mp4"
      - "/api/media/videos/Maraton/0601.mp4"
      - "https://host/api/media/videos/Maraton/0601.mp4"
    """
    s = str(raw or "").strip()
    if not s:
        return ""
    # Strip http(s)://host
    if s.startswith("http://") or s.startswith("https://"):
        try:
            from urllib.parse import urlparse
            s = urlparse(s).path or s
        except Exception:
            pass
    s = s.lstrip("/")
    for prefix in ("api/media/videos/", "media/videos/"):
        if s.startswith(prefix):
            s = s[len(prefix):]
    return s.lstrip("/")


def _live_compute_state(cfg: dict) -> dict:
    """Compute public status payload from a config dict."""
    now = datetime.now(timezone.utc)
    if not cfg.get("enabled", True):
        return {
            "state": "disabled",
            "title": cfg.get("title") or LIVE_DEFAULT_TITLE,
            "now_iso": now.isoformat(),
        }
    duration = int(cfg.get("duration_seconds") or LIVE_DEFAULT_DURATION)
    start_dt = _live_parse_start(str(cfg.get("start_iso") or LIVE_DEFAULT_START_ISO))
    end_dt = start_dt + timedelta(seconds=duration)
    elapsed = (now - start_dt).total_seconds()
    if now < start_dt:
        state = "scheduled"
    elif now >= end_dt:
        state = "ended"
    else:
        state = "live"
    video_path = _live_normalize_video_path(cfg.get("video_path") or LIVE_DEFAULT_VIDEO)
    return {
        "state": state,
        "title": cfg.get("title") or LIVE_DEFAULT_TITLE,
        "subtitle": cfg.get("subtitle") or "",
        "poster_url": cfg.get("poster_url") or "",
        "start_iso": start_dt.isoformat(),
        "end_iso": end_dt.isoformat(),
        "now_iso": now.isoformat(),
        "duration_seconds": duration,
        "elapsed_seconds": max(0.0, min(float(duration), elapsed)),
        "seconds_until_start": max(0.0, (start_dt - now).total_seconds()),
        "seconds_until_end": max(0.0, (end_dt - now).total_seconds()),
        "video_url": f"/api/media/videos/{video_path}",
        "video_path": video_path,
        "youtube_url": cfg.get("youtube_url") or "",
        "youtube_id": _extract_youtube_id(cfg.get("youtube_url") or ""),
        "iframe_url": cfg.get("iframe_url") or "",
        "iframe_no_seek": bool(cfg.get("iframe_no_seek", True)),
        "program": list(cfg.get("program") or []),
    }


@api_router.get("/admin/live/probe")
async def admin_live_probe(user=Depends(require_admin)):
    """Server-side probe: report whether the configured video file exists, is
    readable by the backend process, and the expected video URL. Helps debug
    the „Stream-ul nu poate fi încărcat" error in production."""
    import stat as _stat
    cfg = await _live_config()
    video_path = _live_normalize_video_path(cfg.get("video_path") or LIVE_DEFAULT_VIDEO)
    base = os.path.realpath(VIDEO_DIR)
    target = os.path.realpath(os.path.join(base, video_path))
    info = {
        "video_dir": VIDEO_DIR,
        "video_dir_exists": os.path.isdir(base),
        "video_path": video_path,
        "resolved_target": target,
        "target_inside_base": target == base or target.startswith(base + os.sep),
        "exists": os.path.isfile(target),
        "readable": False,
        "size_bytes": None,
        "permissions": None,
        "owner_uid": None,
        "process_uid": os.geteuid() if hasattr(os, "geteuid") else None,
        "video_url": f"/api/media/videos/{video_path}",
        "samples_in_dir": [],
    }
    if info["exists"]:
        try:
            st = os.stat(target)
            info["size_bytes"] = st.st_size
            info["permissions"] = oct(st.st_mode & 0o777)
            info["owner_uid"] = st.st_uid
            info["readable"] = os.access(target, os.R_OK)
        except Exception as e:
            info["error"] = f"stat failed: {e!r}"
    # List first 8 files inside the parent folder for context
    parent = os.path.dirname(target)
    if os.path.isdir(parent):
        try:
            info["samples_in_dir"] = sorted(os.listdir(parent))[:8]
        except Exception:
            info["samples_in_dir"] = ["<unable to list>"]
    return info


# ============================================================
#               WINNERS (concursuri)
# ============================================================
# Curated list of contest winners shown on /castigatori. We resolve each
# nickname to a real user (for avatar) and fall back to a deterministic
# placeholder avatar when the user doesn't exist (e.g. external winners).

WINNERS_CONTESTS = [
    {
        "id": "cinema",
        "title": "Bilete Cinema",
        "subtitle": "Câștigători bilete la cinema",
        "icon": "ticket",
        "winners": ["IceFlower15", "euRadu", "Alina9021"],
    },
    {
        "id": "lego",
        "title": "Seturi LEGO",
        "subtitle": "Câștigători seturi LEGO",
        "icon": "blocks",
        "winners": ["Bibiinx", "Andrewnix", "Dunbi"],
    },
    {
        "id": "emag",
        "title": "Voucher eMAG",
        "subtitle": "Câștigător voucher eMAG",
        "icon": "shopping-bag",
        "winners": ["MrSeriouX"],
    },
    {
        "id": "xiaomi",
        "title": "Media Player Xiaomi",
        "subtitle": "Câștigător media player Xiaomi",
        "icon": "tv",
        "winners": ["D3xter"],
    },
]


def _placeholder_avatar(nickname: str) -> str:
    """Deterministic, friendly avatar for users not present in our DB."""
    seed = (nickname or "guest").strip()
    # DiceBear "thumbs" — colorful, neutral, no PII; works without API key.
    return f"https://api.dicebear.com/9.x/thumbs/svg?seed={seed}&radius=50"


@api_router.get("/winners")
async def get_winners():
    """Public list of contest winners.

    For each curated nickname we look up the real user (case-insensitive)
    to attach their actual avatar. Missing users get a deterministic
    DiceBear placeholder so the page always renders cleanly.
    """
    # Collect all unique nicknames in one query.
    all_nicks = []
    seen = set()
    for c in WINNERS_CONTESTS:
        for n in c["winners"]:
            k = n.lower()
            if k not in seen:
                seen.add(k)
                all_nicks.append(n)

    # Lookup users by nickname (case-insensitive). We build a regex with
    # alternations to avoid issuing 1 query per nickname.
    lookup: dict = {}
    if all_nicks:
        try:
            # MongoDB regex with case-insensitive flag, anchored full match
            pattern = "^(" + "|".join(re.escape(n) for n in all_nicks) + ")$"
            cursor = db.users.find(
                {"nickname": {"$regex": pattern, "$options": "i"}},
                {"_id": 0, "nickname": 1, "avatar_url": 1},
            )
            async for row in cursor:
                nk = (row.get("nickname") or "").lower()
                if nk:
                    lookup[nk] = row
        except Exception:
            lookup = {}

    out_contests = []
    for c in WINNERS_CONTESTS:
        winners = []
        for nick in c["winners"]:
            row = lookup.get(nick.lower())
            if row:
                winners.append({
                    "nickname": row.get("nickname") or nick,
                    "avatar_url": row.get("avatar_url") or _placeholder_avatar(nick),
                    "found": True,
                })
            else:
                winners.append({
                    "nickname": nick,
                    "avatar_url": _placeholder_avatar(nick),
                    "found": False,
                })
        out_contests.append({
            "id": c["id"],
            "title": c["title"],
            "subtitle": c["subtitle"],
            "icon": c["icon"],
            "winners": winners,
        })
    return {"contests": out_contests}


@api_router.get("/live/status")
async def live_status():
    """Public status payload for the marathon live stream."""
    cfg = await _live_config()
    return _live_compute_state(cfg)


@api_router.get("/presence/online")
async def presence_online():
    """Public, lightweight count of users currently considered "online".

    Uses the existing `chat_online` collection which is touched by the
    authenticated heartbeat. Anonymous visitors are not counted.
    """
    try:
        from datetime import timedelta as _td
        threshold = datetime.now(timezone.utc) - _td(seconds=90)
        count = await db.chat_online.count_documents({"last_seen": {"$gte": threshold}})
        return {"online_total": int(count)}
    except Exception:
        return {"online_total": 0}


# ============================================================
# LOBBY ENDPOINTS — feed for /lobby community page
# All require auth. Each endpoint is small and cacheable client-side.
# ============================================================


@api_router.get("/lobby/online")
async def lobby_online(user=Depends(get_current_user), limit: int = 20):
    """List of online users for the lobby sidebar — slim payload.

    Sorted by most-recently active first. Capped at 20 to keep the payload
    tiny even when 500 users are connected.
    """
    from datetime import timedelta as _td
    limit = max(1, min(50, int(limit or 20)))
    threshold = datetime.now(timezone.utc) - _td(seconds=90)
    cursor = (
        db.chat_online
        .find({"last_seen": {"$gte": threshold}}, {"_id": 1, "nickname": 1, "plan": 1, "last_seen": 1})
        .sort("last_seen", -1)
        .limit(limit)
    )
    online = []
    user_ids = []
    async for row in cursor:
        user_ids.append(row["_id"])
        online.append({
            "id": row["_id"],
            "nickname": row.get("nickname") or "",
            "plan": row.get("plan") or "free",
            "role": "user",
            "avatar_url": None,
        })
    if user_ids:
        # Single batched lookup for avatar + role (avoids 1+N queries)
        meta = {}
        async for u in db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "avatar_url": 1, "role": 1},
        ):
            meta[u["id"]] = {
                "avatar_url": u.get("avatar_url") or "",
                "role": u.get("role") or "user",
            }
        for o in online:
            m = meta.get(o["id"], {})
            o["avatar_url"] = m.get("avatar_url", "")
            o["role"] = m.get("role", "user")
    total = await db.chat_online.count_documents({"last_seen": {"$gte": threshold}})
    return {"items": online, "total": int(total)}


@api_router.get("/lobby/next-live")
async def lobby_next_live(user=Depends(get_current_user)):
    """Next scheduled Cartoonix TV marathon — reuses /live/status compute."""
    try:
        cfg = await _live_config()
        state = _live_compute_state(cfg)
        return state
    except Exception:
        return {"is_live": False, "next_start_at": None}


@api_router.get("/lobby/top-fans")
async def lobby_top_fans(user=Depends(get_current_user), limit: int = 5):
    """Most active chatters in the last 24h. Tiny aggregation, indexed scan."""
    from datetime import timedelta as _td
    limit = max(1, min(10, int(limit or 5)))
    cutoff = (datetime.now(timezone.utc) - _td(hours=24)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "deleted": {"$ne": True}, "user_id": {"$ne": "cartoonixtv-bot"}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}, "nickname": {"$last": "$nickname"}, "avatar_url": {"$last": "$avatar_url"}, "plan": {"$last": "$plan"}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    fans = []
    async for r in db.chat_messages.aggregate(pipeline):
        fans.append({
            "user_id": r["_id"],
            "nickname": r.get("nickname") or "",
            "avatar_url": r.get("avatar_url") or "",
            "plan": r.get("plan") or "free",
            "messages": int(r.get("count", 0)),
        })
    return {"items": fans}


@api_router.get("/lobby/recommendation")
async def lobby_recommendation(user=Depends(get_current_user)):
    """Daily-cached cartoon recommendation.

    Picks ONE cartoon per UTC calendar day for everyone (deterministic
    seed = today's date hash). This way:
      - users see the same recommendation on a given day, encouraging
        watch-party / chat conversation;
      - the panel doesn't change on every page refresh (which was the
        previous behaviour and felt unstable);
      - no extra collection — we compute on the fly from indexed cartoons.
    """
    try:
        import hashlib
        today_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        total = await db.cartoons.count_documents({})
        if total == 0:
            return {"cartoon": None}
        seed = int(hashlib.md5(today_key.encode()).hexdigest(), 16)
        skip = seed % total
        doc = await db.cartoons.find(
            {},
            {"_id": 0, "id": 1, "title": 1, "thumbnail_url": 1, "category": 1, "year": 1, "description": 1},
        ).sort("id", 1).skip(skip).limit(1).to_list(1)
        if not doc:
            return {"cartoon": None}
        return {"cartoon": doc[0], "rotates_at": (datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat())}
    except Exception:
        return {"cartoon": None}


@api_router.get("/lobby/top-online")
async def lobby_top_online(user=Depends(get_current_user), limit: int = 5):
    """Top users by cumulative on-platform time.

    Time is accumulated by the same heartbeat (`POST /chat/heartbeat`) that
    powers the online indicator: each heartbeat adds (now - last_seen) up
    to a 90s cap. Cheap, single-write per beat, no separate analytics
    pipeline needed. Returns the top {limit} users.
    """
    limit = max(1, min(20, int(limit or 5)))
    cursor = (
        db.users
        .find(
            {"presence_seconds": {"$gt": 0}},
            {"_id": 0, "id": 1, "nickname": 1, "avatar_url": 1, "subscription": 1, "role": 1, "presence_seconds": 1},
        )
        .sort("presence_seconds", -1)
        .limit(limit)
    )
    items = []
    async for u in cursor:
        items.append({
            "user_id": u.get("id"),
            "nickname": u.get("nickname") or "",
            "avatar_url": u.get("avatar_url") or "",
            "plan": u.get("subscription") or "free",
            "role": u.get("role") or "user",
            "seconds": int(u.get("presence_seconds") or 0),
        })
    return {"items": items}


@api_router.get("/lobby/winners")
async def lobby_winners(user=Depends(get_current_user), limit: int = 3):
    """Recent contest winners snippet for the lobby. Limit kept tiny."""
    limit = max(1, min(10, int(limit or 3)))
    items = []
    try:
        cursor = db.contest_entries.find(
            {"is_winner": True},
            {"_id": 0, "contest_id": 1, "user_id": 1, "nickname": 1, "won_at": 1, "prize": 1},
        ).sort("won_at", -1).limit(limit)
        async for w in cursor:
            items.append({
                "contest_id": w.get("contest_id"),
                "nickname": w.get("nickname") or "",
                "won_at": w.get("won_at"),
                "prize": w.get("prize"),
            })
    except Exception:
        items = []
    return {"items": items}


@api_router.get("/lobby/poll")
async def lobby_get_poll(user=Depends(get_current_user)):
    """Currently-active community poll + this user's vote (if any)."""
    poll = await db.lobby_polls.find_one({"active": True}, {"_id": 0}) if hasattr(db, "lobby_polls") else None
    if not poll:
        return {"poll": None}
    your_vote = None
    votes = poll.get("votes") or {}
    if isinstance(votes, dict):
        your_vote = votes.get(user["id"])
    # Compute tally without exposing individual votes
    counts = {}
    for v in votes.values():
        counts[v] = counts.get(v, 0) + 1
    return {
        "poll": {
            "id": poll.get("id"),
            "question": poll.get("question"),
            "options": poll.get("options") or [],
            "counts": counts,
            "total_votes": sum(counts.values()),
            "your_vote": your_vote,
            "created_at": poll.get("created_at"),
        }
    }


@api_router.post("/lobby/poll/{poll_id}/vote")
async def lobby_vote_poll(poll_id: str, payload: dict, user=Depends(get_current_user)):
    option = (payload or {}).get("option")
    if not option or not isinstance(option, str):
        raise HTTPException(400, "Opțiune invalidă.")
    poll = await db.lobby_polls.find_one({"id": poll_id, "active": True}, {"_id": 0})
    if not poll:
        raise HTTPException(404, "Sondaj inexistent sau încheiat.")
    if option not in (poll.get("options") or []):
        raise HTTPException(400, "Opțiunea nu există în acest sondaj.")
    await db.lobby_polls.update_one(
        {"id": poll_id},
        {"$set": {f"votes.{user['id']}": option}},
    )
    return {"success": True}


@api_router.post("/lobby/suggestion")
async def lobby_submit_suggestion(payload: dict, user=Depends(get_current_user)):
    """Suggestion box — quick free-text channel to admins. Capped & rate-limited."""
    text = ((payload or {}).get("text") or "").strip()
    if not text:
        raise HTTPException(400, "Sugestia este goală.")
    if len(text) > 600:
        raise HTTPException(400, "Sugestia depășește 600 de caractere.")
    # Per-user rate limit: max 1 / 24h
    from datetime import timedelta as _td
    cutoff = (datetime.now(timezone.utc) - _td(hours=24)).isoformat()
    recent = await db.lobby_suggestions.count_documents(
        {"user_id": user["id"], "created_at": {"$gte": cutoff}}
    )
    if recent >= 1:
        raise HTTPException(
            429,
            "Poți trimite o singură sugestie la fiecare 24h. Mai încearcă mâine!",
        )
    from models import new_id
    await db.lobby_suggestions.insert_one({
        "id": new_id(),
        "user_id": user["id"],
        "nickname": user.get("nickname") or "",
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False,
    })
    return {"success": True}


# ----- Admin: poll CRUD -----
@api_router.get("/admin/lobby/poll")
async def admin_lobby_get_poll(user=Depends(require_admin)):
    poll = await db.lobby_polls.find_one({"active": True}, {"_id": 0})
    return {"poll": poll}


@api_router.post("/admin/lobby/poll")
async def admin_lobby_create_poll(payload: dict, user=Depends(require_admin)):
    question = ((payload or {}).get("question") or "").strip()
    options = [str(o).strip() for o in ((payload or {}).get("options") or []) if str(o).strip()]
    if not question:
        raise HTTPException(400, "Întrebare obligatorie.")
    if len(options) < 2:
        raise HTTPException(400, "Sondajul trebuie să aibă cel puțin 2 opțiuni.")
    if len(options) > 6:
        raise HTTPException(400, "Maxim 6 opțiuni per sondaj.")
    # Deactivate any previously active poll — only one can be live
    await db.lobby_polls.update_many({"active": True}, {"$set": {"active": False}})
    from models import new_id
    doc = {
        "id": new_id(),
        "question": question[:200],
        "options": options[:6],
        "votes": {},
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.lobby_polls.insert_one(doc)
    return {"success": True, "poll": {k: v for k, v in doc.items() if k != "_id"}}


@api_router.patch("/admin/lobby/poll/{poll_id}")
async def admin_lobby_close_poll(poll_id: str, payload: dict, user=Depends(require_admin)):
    active = bool((payload or {}).get("active", False))
    res = await db.lobby_polls.update_one({"id": poll_id}, {"$set": {"active": active}})
    if res.matched_count == 0:
        raise HTTPException(404, "Sondaj inexistent.")
    return {"success": True}


@api_router.get("/admin/lobby/suggestions")
async def admin_lobby_list_suggestions(user=Depends(require_admin), limit: int = 50):
    limit = max(1, min(200, int(limit or 50)))
    items = []
    async for r in db.lobby_suggestions.find({}, {"_id": 0}).sort("created_at", -1).limit(limit):
        items.append(r)
    unread = await db.lobby_suggestions.count_documents({"read": False})
    return {"items": items, "unread": int(unread)}


@api_router.patch("/admin/lobby/suggestions/{sid}")
async def admin_lobby_mark_suggestion(sid: str, payload: dict, user=Depends(require_admin)):
    read = bool((payload or {}).get("read", True))
    res = await db.lobby_suggestions.update_one({"id": sid}, {"$set": {"read": read}})
    if res.matched_count == 0:
        raise HTTPException(404, "Sugestie inexistentă.")
    return {"success": True}


@api_router.get("/admin/live/maraton")
async def admin_live_get(user=Depends(require_admin)):
    cfg = await _live_config()
    return {"config": cfg, "status": _live_compute_state(cfg)}


@api_router.patch("/admin/live/maraton")
async def admin_live_update(payload: dict, user=Depends(require_admin)):
    """Admin update of the marathon live config. Accepts partial updates."""
    cfg = await _live_config()

    if "enabled" in payload:
        cfg["enabled"] = bool(payload["enabled"])
    if "title" in payload:
        cfg["title"] = str(payload["title"] or "").strip() or LIVE_DEFAULT_TITLE
    if "subtitle" in payload:
        cfg["subtitle"] = str(payload["subtitle"] or "").strip()
    if "poster_url" in payload:
        cfg["poster_url"] = str(payload["poster_url"] or "").strip()
    if "video_path" in payload:
        vp = _live_normalize_video_path(payload["video_path"])
        if vp:
            cfg["video_path"] = vp
    if "youtube_url" in payload:
        cfg["youtube_url"] = str(payload["youtube_url"] or "").strip()
    if "iframe_url" in payload:
        cfg["iframe_url"] = str(payload["iframe_url"] or "").strip()
    if "iframe_no_seek" in payload:
        cfg["iframe_no_seek"] = bool(payload["iframe_no_seek"])
    if "duration_seconds" in payload:
        try:
            cfg["duration_seconds"] = max(1, int(payload["duration_seconds"]))
        except Exception:
            raise HTTPException(400, "duration_seconds must be an integer")
    if "start_iso" in payload:
        raw = str(payload["start_iso"] or "").strip()
        try:
            # Validate by parsing
            datetime.fromisoformat(raw.replace("Z", "+00:00"))
            cfg["start_iso"] = raw
        except Exception:
            raise HTTPException(400, "start_iso must be ISO8601")
    if "program" in payload:
        raw = payload["program"]
        if isinstance(raw, list):
            cfg["program"] = [str(x).strip() for x in raw if str(x).strip()]
        elif isinstance(raw, str):
            cfg["program"] = [s.strip() for s in raw.split("\n") if s.strip()]
        else:
            raise HTTPException(400, "program must be a list or string")

    await db.settings.update_one(
        {"_id": "live_event"},
        {"$set": cfg},
        upsert=True,
    )
    return {"config": cfg, "status": _live_compute_state(cfg)}


# ============================================================
#                        PUBLIC SETTINGS
# ============================================================
DEFAULT_SETTINGS = {
    "presentation_mode": False,
    "maintenance_mode": False,
    "early_access_mode": False,
    # Support tickets feature toggle (controls /support page + nav link)
    "support_enabled": True,
    # Lobby page toggle — when False, only admins can access /lobby; everyone
    # else sees a friendly maintenance card.
    "lobby_enabled": True,
    # Dashboard announcement bar (shown under top nav when active)
    "announcement_active": False,
    "announcement_text": "",
    # Chat settings
    "chat_enabled": True,
    "chat_messages_enabled": True,
    "chat_slow_mode_seconds": 0,
    "chat_new_user_days": 3,
    "chat_banned_words": [],
    "chat_max_length": 300,
    "chat_block_links": True,
    "chat_pinned_message": None,
}


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"_id": "global"})
    if not doc:
        return dict(DEFAULT_SETTINGS)
    return {k: doc.get(k, v) for k, v in DEFAULT_SETTINGS.items()}


@api_router.get("/settings")
async def public_settings():
    """Public, read-only settings exposed to the frontend (e.g. presentation mode)."""
    full = await get_settings_doc()
    # Curate what's exposed publicly (no banned_words leak, no large lists).
    public_keys = {
        "presentation_mode",
        "maintenance_mode",
        "early_access_mode",
        "support_enabled",
        "lobby_enabled",
        "announcement_active",
        "announcement_text",
        "chat_enabled",
        "chat_messages_enabled",
        "chat_slow_mode_seconds",
        "chat_new_user_days",
        "chat_max_length",
        "chat_pinned_message",
    }
    return {k: full[k] for k in full if k in public_keys}


@api_router.get("/admin/settings")
async def admin_get_settings(user=Depends(require_admin)):
    return await get_settings_doc()


@api_router.patch("/admin/settings")
async def admin_update_settings(payload: dict, user=Depends(require_admin)):
    allowed = {k: v for k, v in payload.items() if k in DEFAULT_SETTINGS}
    if not allowed:
        raise HTTPException(400, "No valid settings provided")
    # Normalize values per default type (preserve None for chat_pinned_message)
    for k in list(allowed.keys()):
        default_v = DEFAULT_SETTINGS[k]
        if isinstance(default_v, bool):
            allowed[k] = bool(allowed[k])
        elif isinstance(default_v, int) and not isinstance(default_v, bool):
            try:
                allowed[k] = int(allowed[k])
            except Exception:
                del allowed[k]
        elif isinstance(default_v, list):
            if not isinstance(allowed[k], list):
                del allowed[k]
            else:
                allowed[k] = [str(x).strip() for x in allowed[k] if str(x).strip()]
        elif isinstance(default_v, str):
            allowed[k] = str(allowed[k] or "").strip()[:2000]

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
    """Return the curated avatar list, deduplicated by slug.

    Production data has historically picked up duplicate seed rows after
    schema migrations, which caused the register page to render the same
    avatars 2–4 times. We collapse duplicates here so the API contract is
    always one entry per slug regardless of DB state.
    """
    raw = await db.avatars.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    seen: set[str] = set()
    items: list[dict] = []
    for a in raw:
        slug = a.get("slug") or a.get("url") or a.get("filename")
        if not slug or slug in seen:
            continue
        seen.add(slug)
        items.append(a)
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
async def login(payload: UserLogin, request: Request):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email sau parolă incorectă")
    if user.get("banned"):
        raise HTTPException(
            status_code=403,
            detail="Contul tău a fost suspendat. Contactează suportul.",
        )
    # Record login activity
    ip = get_client_ip(request)
    now_iso = now_utc().isoformat()
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "last_login": now_iso,
                "last_active": now_iso,
                "last_ip": ip,
            }
        },
    )
    user["last_login"] = now_iso
    user["last_active"] = now_iso
    user["last_ip"] = ip
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
    # Enforce avatar tier: PLUS-only avatars are reserved for plus members / admins.
    if "avatar_url" in update and update["avatar_url"]:
        chosen = await db.avatars.find_one({"url": update["avatar_url"]}, {"_id": 0})
        if chosen and chosen.get("tier") == "plus":
            if user.get("subscription") != "plus" and user.get("role") != "admin":
                raise HTTPException(
                    status_code=403,
                    detail="Acest avatar este disponibil doar pentru membrii Cartoonix PLUS.",
                )
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
    query: dict = {}
    if category:
        cat = await db.categories.find_one({"slug": category}, {"_id": 0})
        if not cat:
            return []
        # Be tolerant: match by category_id (canonical) OR legacy `category` slug.
        # Some older docs / imports may have stored only the slug.
        query["$or"] = [
            {"category_id": cat["id"]},
            {"category": cat["slug"]},
        ]
    if q:
        query["title"] = {"$regex": re.escape(q), "$options": "i"}
    items = await db.cartoons.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    if not items:
        return []
    # Single grouped query for episode counts (avoids N+1).
    cartoon_ids = [it["id"] for it in items]
    pipeline = [
        {"$match": {"cartoon_id": {"$in": cartoon_ids}}},
        {"$group": {"_id": "$cartoon_id", "n": {"$sum": 1}}},
    ]
    counts = {row["_id"]: row["n"] async for row in db.episodes.aggregate(pipeline)}
    for it in items:
        it["episode_count"] = counts.get(it["id"], 0)
    return items


@api_router.get("/me/cartoons/{cartoon_id}/watched-episodes")
async def watched_episodes_for_cartoon(cartoon_id: str, user=Depends(get_current_user)):
    """Return the set of episode ids the current user has watched for a cartoon.
    "Watched" means we have any history row for that user+episode. Used by the
    detail page to mark previously-seen episodes."""
    cursor = db.watch_history.find(
        {"user_id": user["id"], "cartoon_id": cartoon_id},
        {"_id": 0, "episode_id": 1, "progress_seconds": 1, "watched_at": 1},
    )
    rows = await cursor.to_list(2000)
    return {
        "episode_ids": [r["episode_id"] for r in rows if r.get("episode_id")],
        "items": rows,
    }


@api_router.get("/cartoons/{cartoon_id}")
async def get_cartoon(cartoon_id: str):
    c = await db.cartoons.find_one({"id": cartoon_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Cartoon not found")
    episodes = await db.episodes.find({"cartoon_id": cartoon_id}, {"_id": 0}).sort([("sort_index", 1), ("season", 1), ("episode_number", 1)]).to_list(500)
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


class EpisodeReorderPayload(BaseModel):
    episode_ids: List[str]


def _resolve_episode_file_path(video_url: str) -> Optional[Path]:
    """Map an episode.video_url to an absolute file under VIDEO_DIR or UPLOAD_DIR.
    Returns None if the URL is external (http/https) or can't be resolved.
    """
    if not video_url:
        return None
    s = str(video_url).strip().replace("\\", "/")
    # Anything pointing off-site can't be downloaded by us
    if re.match(r"^https?://", s, re.IGNORECASE):
        return None

    # Normalize /api/media/videos/... or /media/videos/... → relative
    for marker in ("/api/media/videos/", "/media/videos/", "media/videos/"):
        idx = s.find(marker)
        if idx >= 0:
            rel = s[idx + len(marker):].lstrip("/")
            base = Path(VIDEO_DIR).resolve()
            target = (base / rel).resolve()
            if str(target) == str(base) or str(target).startswith(str(base) + os.sep):
                return target if target.is_file() else None
            return None

    # /api/uploads/videos/... or /uploads/videos/... → UPLOAD_DIR
    for marker in ("/api/uploads/", "/uploads/"):
        idx = s.find(marker)
        if idx >= 0:
            rel = s[idx + len(marker):].lstrip("/")
            base = UPLOAD_DIR.resolve()
            target = (base / rel).resolve()
            if str(target) == str(base) or str(target).startswith(str(base) + os.sep):
                return target if target.is_file() else None
            return None
    return None


def _safe_attachment_name(title: str, ext: str = "mp4") -> str:
    base = re.sub(r"[\\/:*?\"<>|\r\n\t]+", "_", (title or "episod").strip())[:80] or "episod"
    return f"{base}.{ext.lstrip('.')}"


@api_router.post("/me/episodes/{episode_id}/download-link")
async def create_episode_download_link(episode_id: str, user=Depends(get_current_user)):
    """PLUS-only. Returns a short-lived signed URL the browser can use directly
    via <a download> — auth header isn't required on that GET because the URL
    itself carries a 5-minute JWT bound to (user, episode, scope=download)."""
    if user.get("subscription") != "plus":
        raise HTTPException(403, "Funcție disponibilă doar pentru membri Cartoonix PLUS")
    ep = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
    if not ep:
        raise HTTPException(404, "Episode not found")
    file_path = _resolve_episode_file_path(ep.get("video_url", ""))
    if not file_path:
        raise HTTPException(400, "Acest episod nu poate fi descărcat (sursă externă sau lipsește fișierul).")

    import jwt as _jwt
    from auth import JWT_SECRET, JWT_ALGORITHM
    payload = {
        "sub": user["id"],
        "ep": episode_id,
        "scope": "download",
        "iat": now_utc(),
        "exp": now_utc() + timedelta(minutes=5),
    }
    token = _jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    ext = file_path.suffix.lstrip(".") or "mp4"
    return {
        "url": f"/api/episodes/download?dt={token}",
        "filename": _safe_attachment_name(ep.get("title", "Episod"), ext),
        "expires_in": 300,
    }


@api_router.get("/episodes/download")
async def download_episode_file(dt: str):
    """Stream the episode file as an attachment. Auth comes from the `dt` token."""
    import jwt as _jwt
    from auth import JWT_SECRET, JWT_ALGORITHM
    try:
        claims = _jwt.decode(dt, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except _jwt.ExpiredSignatureError:
        raise HTTPException(401, "Link expirat. Generează un link nou.")
    except _jwt.InvalidTokenError:
        raise HTTPException(401, "Token invalid.")
    if claims.get("scope") != "download":
        raise HTTPException(403, "Scope invalid")
    user_id = claims.get("sub")
    episode_id = claims.get("ep")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "subscription": 1, "banned": 1})
    if not user or user.get("banned"):
        raise HTTPException(403, "Acces interzis")
    if user.get("subscription") != "plus":
        raise HTTPException(403, "Abonamentul PLUS nu mai este activ.")

    ep = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
    if not ep:
        raise HTTPException(404, "Episod inexistent")
    file_path = _resolve_episode_file_path(ep.get("video_url", ""))
    if not file_path:
        raise HTTPException(404, "Fișierul video nu mai există pe server.")

    file_size = file_path.stat().st_size
    ext = file_path.suffix.lower().lstrip(".") or "mp4"
    content_type = VIDEO_EXT_MIME.get(ext, "application/octet-stream")
    filename = _safe_attachment_name(ep.get("title", "Episod"), ext)

    def _iter(chunk: int = 1024 * 1024):
        with open(file_path, "rb") as f:
            while True:
                data = f.read(chunk)
                if not data:
                    break
                yield data

    headers = {
        "Content-Length": str(file_size),
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
    }
    return StreamingResponse(_iter(), status_code=200, headers=headers, media_type=content_type)


@api_router.post("/admin/cartoons/{cartoon_id}/episodes/reorder")
async def admin_reorder_episodes(
    cartoon_id: str,
    payload: EpisodeReorderPayload,
    user=Depends(require_admin),
):
    """Persist a manual display order for a cartoon's episodes.

    The list `episode_ids` is the desired order top→bottom. We write a
    `sort_index` on each matching episode; the public detail endpoint sorts by
    `(sort_index, season, episode_number)`. Episodes not present in the payload
    keep their previous sort_index (effectively going to the bottom).
    """
    if not await db.cartoons.find_one({"id": cartoon_id}, {"_id": 0, "id": 1}):
        raise HTTPException(404, "Cartoon not found")
    if not payload.episode_ids:
        raise HTTPException(400, "episode_ids must not be empty")

    # Build a bulk update so it's a single round-trip
    from pymongo import UpdateOne
    ops = []
    for idx, ep_id in enumerate(payload.episode_ids):
        ops.append(
            UpdateOne(
                {"id": ep_id, "cartoon_id": cartoon_id},
                {"$set": {"sort_index": idx}},
            )
        )
    if ops:
        await db.episodes.bulk_write(ops, ordered=False)
    return {"success": True, "count": len(ops)}


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
    # Allow folders under the uploads dir OR the external video library (VIDEO_DIR)
    upload_base = UPLOAD_DIR.resolve()
    video_base = Path(VIDEO_DIR).resolve()
    resolved = folder_p.resolve()
    base_kind = None
    try:
        resolved.relative_to(upload_base)
        base_kind = "upload"
    except Exception:
        try:
            resolved.relative_to(video_base)
            base_kind = "video"
        except Exception:
            raise HTTPException(400, f"Folder must be inside {UPLOAD_DIR} or {VIDEO_DIR}")
    if not folder_p.exists() or not folder_p.is_dir():
        raise HTTPException(400, "Folder does not exist")
    added = []
    existing_count = await db.episodes.count_documents({"cartoon_id": cartoon_id})
    video_exts = {".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi", ".wmv", ".flv", ".mpeg", ".mpg", ".ts"}
    files = sorted([f for f in folder_p.glob("*") if f.suffix.lower() in video_exts])
    for idx, fpath in enumerate(files, start=1):
        fres = fpath.resolve()
        if base_kind == "upload":
            rel = fres.relative_to(upload_base)
            url = f"/api/uploads/{rel.as_posix()}"
            src_type = "upload"
        else:
            rel = fres.relative_to(video_base)
            url = f"/media/videos/{rel.as_posix()}"
            src_type = "external"
        doc = {
            "id": new_id(),
            "cartoon_id": cartoon_id,
            "title": fpath.stem.replace("_", " ").replace("-", " ").title(),
            "season": 1,
            "episode_number": existing_count + idx,
            "description": "",
            "duration_seconds": 0,
            "video_url": url,
            "source_type": src_type,
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
    allowed = {k: v for k, v in payload.items() if k in {"role", "subscription", "email_verified", "level"}}
    if not allowed:
        raise HTTPException(400, "No valid fields")
    if "level" in allowed:
        try:
            allowed["level"] = max(1, min(10, int(allowed["level"])))
        except (TypeError, ValueError):
            raise HTTPException(400, "Invalid level")
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
#                  ADMIN: BAN / IP MANAGEMENT
# ============================================================
class BanPayload(BaseModel):
    reason: Optional[str] = None


@api_router.post("/admin/users/{user_id}/ban")
async def admin_ban_user(
    user_id: str, payload: BanPayload, user=Depends(require_admin)
):
    """Mark a user as banned. The user is logged out on next request."""
    if user_id == user["id"]:
        raise HTTPException(400, "Nu te poți bana pe tine.")
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(404, "User not found")
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "banned": True,
                "banned_at": now_utc().isoformat(),
                "banned_reason": (payload.reason or "").strip()[:300],
                "banned_by": user["id"],
            }
        },
    )
    return {"success": True}


@api_router.post("/admin/users/{user_id}/unban")
async def admin_unban_user(user_id: str, user=Depends(require_admin)):
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {"banned": False},
            "$unset": {"banned_at": "", "banned_reason": "", "banned_by": ""},
        },
    )
    return {"success": True}


@api_router.post("/admin/users/{user_id}/ban-ip")
async def admin_ban_user_ip(
    user_id: str, payload: BanPayload, user=Depends(require_admin)
):
    """Ban the IP currently associated with this user (their last_ip)."""
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(404, "User not found")
    ip = (target.get("last_ip") or "").strip()
    if not ip:
        raise HTTPException(400, "Niciun IP înregistrat pentru acest utilizator încă.")
    await db.banned_ips.update_one(
        {"ip": ip},
        {
            "$set": {
                "ip": ip,
                "reason": (payload.reason or "").strip()[:300],
                "banned_by": user["id"],
                "user_id": user_id,
                "created_at": now_utc().isoformat(),
            }
        },
        upsert=True,
    )
    _invalidate_banned_ips_cache()
    return {"success": True, "ip": ip}


@api_router.get("/admin/banned-ips")
async def admin_list_banned_ips(user=Depends(require_admin)):
    docs = (
        await db.banned_ips.find({}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(500)
    )
    return docs


@api_router.delete("/admin/banned-ips/{ip}")
async def admin_unban_ip(ip: str, user=Depends(require_admin)):
    res = await db.banned_ips.delete_one({"ip": ip})
    if res.deleted_count == 0:
        raise HTTPException(404, "IP not in banlist")
    _invalidate_banned_ips_cache()
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
    items = await db.playlists.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    # Ensure items field exists for older docs
    for p in items:
        p.setdefault("items", [])
    return items


@api_router.get("/me/playlists/{playlist_id}")
async def get_playlist(playlist_id: str, user=Depends(get_current_user)):
    """Get a single playlist with full cartoon + episode objects resolved (for the player page)."""
    _require_plus(user)
    pl = await db.playlists.find_one({"id": playlist_id, "user_id": user["id"]}, {"_id": 0})
    if not pl:
        raise HTTPException(404, "Playlist not found")
    pl.setdefault("items", [])

    # Resolve episodes + cartoons in batch
    ep_ids = [it["episode_id"] for it in pl["items"]]
    cart_ids = list({it["cartoon_id"] for it in pl["items"]})

    episodes_by_id: dict = {}
    cartoons_by_id: dict = {}
    if ep_ids:
        async for e in db.episodes.find({"id": {"$in": ep_ids}}, {"_id": 0}):
            episodes_by_id[e["id"]] = e
    if cart_ids:
        async for c in db.cartoons.find({"id": {"$in": cart_ids}}, {"_id": 0}):
            cartoons_by_id[c["id"]] = c

    # Preserve user-defined order; drop items whose episode no longer exists
    resolved = []
    for it in pl["items"]:
        ep = episodes_by_id.get(it["episode_id"])
        if not ep:
            continue
        resolved.append({
            "cartoon_id": it["cartoon_id"],
            "episode_id": it["episode_id"],
            "episode": ep,
            "cartoon": cartoons_by_id.get(it["cartoon_id"]),
        })

    return {
        **pl,
        "resolved_items": resolved,
    }


@api_router.post("/me/playlists")
async def create_playlist(payload: PlaylistCreate, user=Depends(get_current_user)):
    _require_plus(user)
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "name": payload.name,
        "description": payload.description,
        "cartoon_ids": [],
        "items": [],
        "created_at": now_utc().isoformat(),
    }
    await db.playlists.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.post("/me/playlists/{playlist_id}/items")
async def add_to_playlist(playlist_id: str, payload: PlaylistAddItem, user=Depends(get_current_user)):
    """Legacy endpoint — adds an entire cartoon's episodes to the playlist."""
    _require_plus(user)
    pl = await db.playlists.find_one({"id": playlist_id, "user_id": user["id"]})
    if not pl:
        raise HTTPException(404, "Playlist not found")

    # Add cartoon_id for backward compat
    if payload.cartoon_id not in pl.get("cartoon_ids", []):
        await db.playlists.update_one(
            {"id": playlist_id},
            {"$addToSet": {"cartoon_ids": payload.cartoon_id}},
        )

    # Add all episodes (in order) as items, skipping ones already present
    existing_ep_ids = {it["episode_id"] for it in pl.get("items", [])}
    episodes = (
        await db.episodes.find({"cartoon_id": payload.cartoon_id}, {"_id": 0})
        .sort([("season", 1), ("episode_number", 1)])
        .to_list(500)
    )
    to_add = [
        {"cartoon_id": payload.cartoon_id, "episode_id": ep["id"]}
        for ep in episodes
        if ep["id"] not in existing_ep_ids
    ]
    if to_add:
        await db.playlists.update_one(
            {"id": playlist_id},
            {"$push": {"items": {"$each": to_add}}},
        )

    return await db.playlists.find_one({"id": playlist_id}, {"_id": 0})


@api_router.post("/me/playlists/{playlist_id}/episodes")
async def add_episode_to_playlist(
    playlist_id: str,
    payload: PlaylistAddEpisode,
    user=Depends(get_current_user),
):
    """Add a single episode to a playlist."""
    _require_plus(user)
    pl = await db.playlists.find_one({"id": playlist_id, "user_id": user["id"]})
    if not pl:
        raise HTTPException(404, "Playlist not found")

    # Validate episode exists and belongs to the given cartoon
    ep = await db.episodes.find_one(
        {"id": payload.episode_id, "cartoon_id": payload.cartoon_id},
        {"_id": 0},
    )
    if not ep:
        raise HTTPException(404, "Episode not found")

    existing = [it for it in pl.get("items", []) if it["episode_id"] == payload.episode_id]
    if existing:
        return {"success": True, "already_added": True}

    await db.playlists.update_one(
        {"id": playlist_id},
        {
            "$push": {
                "items": {
                    "cartoon_id": payload.cartoon_id,
                    "episode_id": payload.episode_id,
                }
            },
            "$addToSet": {"cartoon_ids": payload.cartoon_id},
        },
    )
    return {"success": True, "already_added": False}


@api_router.delete("/me/playlists/{playlist_id}/episodes/{episode_id}")
async def remove_episode_from_playlist(
    playlist_id: str, episode_id: str, user=Depends(get_current_user)
):
    """Remove a single episode from a playlist."""
    _require_plus(user)
    pl = await db.playlists.find_one({"id": playlist_id, "user_id": user["id"]})
    if not pl:
        raise HTTPException(404, "Playlist not found")
    await db.playlists.update_one(
        {"id": playlist_id},
        {"$pull": {"items": {"episode_id": episode_id}}},
    )
    return {"success": True}


@api_router.post("/me/playlists/{playlist_id}/reorder")
async def reorder_playlist(
    playlist_id: str, payload: PlaylistReorder, user=Depends(get_current_user)
):
    """Reorder playlist items. Body: {episode_ids: [ordered list of episode ids]}."""
    _require_plus(user)
    pl = await db.playlists.find_one({"id": playlist_id, "user_id": user["id"]})
    if not pl:
        raise HTTPException(404, "Playlist not found")

    current_items = pl.get("items", [])
    by_ep = {it["episode_id"]: it for it in current_items}
    new_items = [by_ep[eid] for eid in payload.episode_ids if eid in by_ep]
    # Append any items not in the supplied order (defensive)
    seen = set(payload.episode_ids)
    for it in current_items:
        if it["episode_id"] not in seen:
            new_items.append(it)

    await db.playlists.update_one(
        {"id": playlist_id},
        {"$set": {"items": new_items}},
    )
    return {"success": True}


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
# Support tickets
# ============================================================
(UPLOAD_DIR / "support").mkdir(parents=True, exist_ok=True)

SUPPORT_ALLOWED_EXT = {
    "png", "jpg", "jpeg", "gif", "webp",
    "pdf", "txt", "log", "csv", "json",
    "mp4", "mov", "webm",
    "zip",
}
SUPPORT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB
SUPPORT_STATUSES = ("open", "in_progress", "resolved", "closed")


class SupportTicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=140)
    message: str = Field(..., min_length=5, max_length=5000)
    attachment_url: Optional[str] = None


class SupportReplyCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    attachment_url: Optional[str] = None


class SupportStatusUpdate(BaseModel):
    status: Literal["open", "in_progress", "resolved", "closed"]


def _ticket_to_public(t: dict) -> dict:
    """Strip internal Mongo fields; ensure deterministic shape."""
    return {
        "id": t["id"],
        "user_id": t.get("user_id"),
        "user_email": t.get("user_email"),
        "user_nickname": t.get("user_nickname"),
        "title": t.get("title", ""),
        "message": t.get("message", ""),
        "attachment_url": t.get("attachment_url"),
        "status": t.get("status", "open"),
        "created_at": t.get("created_at"),
        "updated_at": t.get("updated_at"),
        "replies": t.get("replies", []),
        "reply_count": len(t.get("replies", [])),
    }


async def _require_support_enabled():
    """Reject end-user support actions when the feature is disabled in admin."""
    s = await get_settings_doc()
    if not s.get("support_enabled", True):
        raise HTTPException(403, "Sistemul de suport este momentan dezactivat.")


@api_router.post("/support/upload")
async def support_upload_attachment(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """Upload a single attachment for a support ticket or reply."""
    await _require_support_enabled()
    raw = file.filename or "file"
    safe_name = re.sub(r"[\\/:*?\"<>|\r\n\t]+", "_", raw)[:120] or "file"
    ext = (safe_name.rsplit(".", 1)[-1] if "." in safe_name else "").lower()
    if ext not in SUPPORT_ALLOWED_EXT:
        raise HTTPException(400, f"Tip de fișier neacceptat: .{ext or '?'}")

    # Stream-write while enforcing the size cap.
    new_name = f"{user['id']}_{int(now_utc().timestamp()*1000)}_{safe_name}"
    dest = UPLOAD_DIR / "support" / new_name
    total = 0
    try:
        with open(dest, "wb") as out:
            while True:
                chunk = await file.read(64 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > SUPPORT_MAX_UPLOAD_BYTES:
                    out.close()
                    try:
                        dest.unlink()
                    except Exception:
                        pass
                    raise HTTPException(413, "Fișierul depășește 8 MB.")
                out.write(chunk)
    finally:
        await file.close()

    return {
        "url": f"/api/uploads/support/{new_name}",
        "filename": safe_name,
        "size": total,
    }


@api_router.post("/support/tickets")
async def create_support_ticket(payload: SupportTicketCreate, user=Depends(get_current_user)):
    await _require_support_enabled()
    now = now_utc().isoformat()
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "user_email": user.get("email", ""),
        "user_nickname": user.get("nickname", ""),
        "title": payload.title.strip(),
        "message": payload.message.strip(),
        "attachment_url": (payload.attachment_url or "").strip() or None,
        "status": "open",
        "created_at": now,
        "updated_at": now,
        "replies": [],
    }
    await db.support_tickets.insert_one(doc)
    return _ticket_to_public(doc)


@api_router.get("/support/tickets")
async def list_my_support_tickets(user=Depends(get_current_user)):
    rows = (
        await db.support_tickets.find({"user_id": user["id"]}, {"_id": 0})
        .sort("updated_at", -1)
        .to_list(200)
    )
    return [_ticket_to_public(t) for t in rows]


@api_router.get("/support/tickets/{ticket_id}")
async def get_support_ticket(ticket_id: str, user=Depends(get_current_user)):
    t = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Ticket inexistent")
    is_admin = user.get("role") == "admin"
    if not is_admin and t.get("user_id") != user["id"]:
        raise HTTPException(403, "Nu ai acces la acest ticket")
    return _ticket_to_public(t)


@api_router.post("/support/tickets/{ticket_id}/reply")
async def reply_support_ticket(
    ticket_id: str,
    payload: SupportReplyCreate,
    user=Depends(get_current_user),
):
    is_admin = user.get("role") == "admin"
    if not is_admin:
        await _require_support_enabled()
    t = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Ticket inexistent")
    if not is_admin and t.get("user_id") != user["id"]:
        raise HTTPException(403, "Nu ai acces la acest ticket")
    if t.get("status") == "closed" and not is_admin:
        raise HTTPException(400, "Ticket-ul este închis. Deschide unul nou.")

    reply = {
        "id": new_id(),
        "author_id": user["id"],
        "author_nickname": user.get("nickname", ""),
        "author_role": user.get("role", "user"),
        "message": payload.message.strip(),
        "attachment_url": (payload.attachment_url or "").strip() or None,
        "created_at": now_utc().isoformat(),
    }
    # When a user replies on an unresolved ticket, keep status as-is.
    # When admin replies on "open", move to "in_progress" automatically.
    new_status = t.get("status", "open")
    if is_admin and new_status == "open":
        new_status = "in_progress"

    await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"replies": reply},
            "$set": {"status": new_status, "updated_at": now_utc().isoformat()},
        },
    )
    updated = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    return _ticket_to_public(updated)


# ----- Admin -----
@api_router.get("/admin/support/tickets")
async def admin_list_support_tickets(
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    user=Depends(require_admin),
):
    page = max(1, page)
    page_size = max(1, min(page_size, 200))
    flt: dict = {}
    if status_filter and status_filter in SUPPORT_STATUSES:
        flt["status"] = status_filter
    if q:
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        flt["$or"] = [
            {"title": rx},
            {"message": rx},
            {"user_email": rx},
            {"user_nickname": rx},
        ]

    # When admin filters by "suggestion", show ONLY lobby suggestions (no
    # real tickets). When no filter (or any other status) is set, merge
    # the lobby suggestions in alongside the tickets so the admin has a
    # single combined inbox.
    only_suggestions = status_filter == "suggestion"

    tickets: list = []
    ticket_total = 0
    if not only_suggestions:
        ticket_total = await db.support_tickets.count_documents(flt)
        rows = (
            await db.support_tickets.find(flt, {"_id": 0})
            .sort("updated_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
            .to_list(page_size)
        )
        tickets = [_ticket_to_public(t) for t in rows]

    # Inject suggestions when no status filter, or when explicitly asked.
    suggestion_items: list = []
    suggestion_total = 0
    if status_filter in (None, "", "suggestion"):
        s_flt: dict = {}
        if q:
            rx = {"$regex": re.escape(q.strip()), "$options": "i"}
            s_flt["$or"] = [{"text": rx}, {"nickname": rx}]
        suggestion_total = await db.lobby_suggestions.count_documents(s_flt)
        s_rows = (
            await db.lobby_suggestions.find(s_flt, {"_id": 0})
            .sort("created_at", -1)
            .limit(page_size if only_suggestions else 50)
            .to_list(page_size if only_suggestions else 50)
        )
        for s in s_rows:
            suggestion_items.append({
                "id": f"sg-{s.get('id')}",
                "suggestion_id": s.get("id"),
                "user_id": s.get("user_id"),
                "user_email": None,
                "user_nickname": s.get("nickname") or "",
                "title": "Sugestie din lobby",
                "message": s.get("text") or "",
                "attachment_url": None,
                "status": "suggestion",
                "created_at": s.get("created_at"),
                "updated_at": s.get("created_at"),
                "replies": [],
                "reply_count": 0,
                "read": bool(s.get("read")),
            })

    # Merge sorted by created_at desc when showing both
    combined = tickets + suggestion_items
    combined.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    if only_suggestions:
        combined = suggestion_items

    open_count = await db.support_tickets.count_documents({"status": {"$in": ["open", "in_progress"]}})
    return {
        "items": combined,
        "total": (suggestion_total if only_suggestions else ticket_total + suggestion_total),
        "open_count": open_count,
        "suggestion_total": int(suggestion_total),
        "page": page,
        "page_size": page_size,
    }


@api_router.patch("/admin/support/tickets/{ticket_id}")
async def admin_update_ticket_status(
    ticket_id: str,
    payload: SupportStatusUpdate,
    user=Depends(require_admin),
):
    t = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0, "id": 1})
    if not t:
        raise HTTPException(404, "Ticket inexistent")
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": {"status": payload.status, "updated_at": now_utc().isoformat()}},
    )
    updated = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    return _ticket_to_public(updated)


# ============================================================
# Mount router & middleware
# ============================================================
# Attach chat module handlers (resolves auth deps without circular import).
_chat_router = _attach_chat_handlers(get_current_user, require_admin)
api_router.include_router(_chat_router)

# Attach staff applications module
_staff_router = _attach_staff_handlers(get_current_user, require_admin)
api_router.include_router(_staff_router)

# Watch Party module (REST + WebSocket)
_watch_party_router = _create_watch_party_router(
    get_current_user=get_current_user,
    db=db,
    decode_token=_decode_token_for_ws,
)
api_router.include_router(_watch_party_router)

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
