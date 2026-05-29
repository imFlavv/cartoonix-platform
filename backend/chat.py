"""Cartoonix Chat module.

Public + admin chat endpoints. Features:
  - Two rooms: "global" (everyone) and "plus" (PLUS members only)
  - 5s base cooldown, progressive (5→15→60s) for flood offenders
  - New-user restriction (configurable, default 3 days)
  - Auto-moderation: banned words filter (RO+EN), spam, link block,
    duplicate flood, CAPS auto-correction
  - Admin: enable/disable chat, freeze messages (read-only), slow mode,
    mute/ban users, delete messages, pinned message, edit banned words

Storage:
  - chat_messages   : id, room, user_id, nickname, avatar_url, plan, content,
                      flags, created_at, deleted
  - chat_bans       : _id=user_id, type ("mute"|"ban"), until (datetime|None),
                      reason, created_by, created_at
  - chat_strikes    : _id=user_id, level (0/1/2), last_sent_at, rapid_count
  - chat_online     : _id=user_id, last_seen, nickname, plan (with TTL)
"""
from __future__ import annotations

import logging
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger("cartoonix.chat")

# ============================================================
# DEFAULT CHAT SETTINGS (merged into the global settings doc)
# ============================================================
DEFAULT_CHAT_SETTINGS = {
    "chat_enabled": True,            # if False, the widget is hidden for everyone
    "chat_messages_enabled": True,   # if False, chat is read-only
    "chat_slow_mode_seconds": 0,     # extra global cooldown on top of the 5s base
    "chat_new_user_days": 3,         # account age required to post
    "chat_banned_words": [],         # editable from admin (lowercase)
    "chat_max_length": 300,
    "chat_pinned_message": None,     # { content, nickname, created_at }
    "chat_block_links": True,
    # CartoonixTV "Nightbot"-style auto-poster
    "cartoonixtv_enabled": False,
    "cartoonixtv_interval_minutes": 15,
    "cartoonixtv_messages": [],
    "cartoonixtv_random_order": True,
    "cartoonixtv_rooms": ["global"],   # which rooms it posts in
}

# CartoonixTV bot identity (fixed, not a real user in the users collection)
CARTOONIXTV_BOT = {
    "id": "cartoonixtv-bot",
    "nickname": "CartoonixTV",
    "avatar_url": "/emoticons/transformer.gif",  # placeholder bot avatar (overridden in frontend)
    "plan": "bot",
    "role": "bot",
}

# Default seed messages (Romanian) used the very first time the admin opens the bot
DEFAULT_CARTOONIXTV_MESSAGES = [
    "📺 Bun venit pe Cartoonix! Lansarea oficială vine pe 1 iunie 2026.",
    "🎬 Știați că PLUS-ul deblochează camera secretă de chat și conținut exclusiv?",
    "🏆 Avem concursuri active — accesează /concursuri pentru detalii.",
    "💎 Upgrade la PLUS direct din profil — păstrează nostalgia la maxim!",
    "🔔 Verifică tab-ul Inbox pentru anunțuri importante.",
]

# Common Romanian + English profanity. Kept compact; admin can extend.
DEFAULT_BANNED_WORDS_SEED = [
    # English
    "fuck", "shit", "bitch", "asshole", "bastard", "dick", "pussy",
    "cunt", "motherfucker", "fucker", "cock", "wanker", "nigger",
    "faggot", "retard", "slut", "whore",
    # Romanian (common variants)
    "pula", "pulă", "pizda", "pizdă", "muie", "futu", "fut",
    "cacat", "căcat", "cur", "curva", "curvă", "bou", "boule",
    "prost", "prostule", "tâmpit", "tampit", "idiot", "imbecil",
    "fmm", "fpm", "ftg", "labar", "labă", "laba",
    "morții", "mortii", "dracu", "dracului", "mortu",
    "țigan", "tigan", "țiganca", "tiganca", "țigani", "tigani",
    "jegos", "jegoasa", "jegoasă", "scârbă", "scarba",
    "gunoi", "gunoiule", "handicapat",
]

# Pre-compiled
URL_RE = re.compile(
    r"(?i)(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|ro|net|org|io|tv|me|gg|app|xyz|info)\b)"
)


# ============================================================
# MODELS
# ============================================================
class SendMessage(BaseModel):
    room: Literal["global", "plus"] = "global"
    content: str = Field(min_length=1, max_length=400)


class ChatSettingsUpdate(BaseModel):
    chat_enabled: Optional[bool] = None
    chat_messages_enabled: Optional[bool] = None
    chat_slow_mode_seconds: Optional[int] = None
    chat_new_user_days: Optional[int] = None
    chat_banned_words: Optional[List[str]] = None
    chat_block_links: Optional[bool] = None
    chat_max_length: Optional[int] = None


class ModerateAction(BaseModel):
    user_id: str
    action: Literal["mute_5m", "mute_1h", "mute_24h", "mute_perm", "ban", "unmute", "unban"]
    reason: Optional[str] = None


class PinMessage(BaseModel):
    message_id: Optional[str] = None  # if null/empty → unpin (or use custom)
    content: Optional[str] = Field(default=None, max_length=500)
    # If content is provided, an admin "announcement" is pinned (no message_id required)


class BannedWordsUpdate(BaseModel):
    words: List[str]


class CartoonixTVUpdate(BaseModel):
    enabled: Optional[bool] = None
    interval_minutes: Optional[int] = None
    messages: Optional[List[str]] = None
    random_order: Optional[bool] = None
    rooms: Optional[List[Literal["global", "plus"]]] = None


class CartoonixTVPost(BaseModel):
    message: str = Field(min_length=1, max_length=400)
    room: Literal["global", "plus"] = "global"


# ============================================================
# HELPERS
# ============================================================
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize(text: str) -> str:
    """Lowercase + strip diacritics for moderation matching."""
    t = text.lower()
    nfkd = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in nfkd if not unicodedata.combining(c))
    # collapse repeated chars (so "puuuula" still matches "pula")
    t = re.sub(r"(.)\1{2,}", r"\1", t)
    return t


def _censor_word(word: str) -> str:
    return word[0] + "*" * (len(word) - 1) if len(word) > 1 else "*"


def _apply_word_filter(content: str, banned: List[str]) -> tuple[str, bool]:
    """Return (censored_content, had_profanity)."""
    if not banned:
        return content, False
    out = content
    found = False
    norm = _normalize(out)
    for w in banned:
        w = (w or "").strip().lower()
        if not w:
            continue
        # match on the normalized version, but rewrite on the original
        # using a case-insensitive regex on raw chars
        pattern = re.compile(r"\b" + re.escape(w) + r"[a-zăâîșțĂÂÎȘȚ]*\b", re.IGNORECASE)
        # Check also against normalized space:
        norm_pattern = re.compile(r"\b" + re.escape(w) + r"\w*\b")
        if pattern.search(out) or norm_pattern.search(norm):
            found = True
            out = pattern.sub(lambda m: _censor_word(m.group(0)), out)
    return out, found


def _excessive_caps(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    if len(letters) < 8:
        return False
    upper = sum(1 for c in letters if c.isupper())
    return (upper / len(letters)) > 0.7


def _collapse_repeats(text: str) -> str:
    return re.sub(r"(.)\1{4,}", r"\1\1\1", text)


def _account_age_seconds(user: dict) -> float:
    ca = user.get("created_at")
    if not ca:
        return 10 ** 9  # unknown → treat as "old"
    if isinstance(ca, str):
        try:
            dt = datetime.fromisoformat(ca.replace("Z", "+00:00"))
        except Exception:
            return 10 ** 9
    elif isinstance(ca, datetime):
        dt = ca
    else:
        return 10 ** 9
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (_now() - dt).total_seconds()


# ============================================================
# DEPENDENCY HELPERS (resolved lazily to avoid circular import)
# ============================================================
async def _get_db():
    from server import db
    return db


async def _get_settings_full() -> dict:
    """Read the merged global settings (presentation/maintenance/early + chat)."""
    db = await _get_db()
    doc = await db.settings.find_one({"_id": "global"}) or {}
    merged = {**DEFAULT_CHAT_SETTINGS}
    for k in DEFAULT_CHAT_SETTINGS:
        if k in doc:
            merged[k] = doc[k]
    return merged


async def _active_sanction(db, user_id: str) -> Optional[dict]:
    """Return the active sanction (mute/ban) for a user, if any."""
    doc = await db.chat_bans.find_one({"_id": user_id})
    if not doc:
        return None
    until = doc.get("until")
    if until is None:
        # permanent
        return doc
    if isinstance(until, str):
        try:
            until = datetime.fromisoformat(until.replace("Z", "+00:00"))
        except Exception:
            return None
    if isinstance(until, datetime) and until.tzinfo is None:
        until = until.replace(tzinfo=timezone.utc)
    if until and until > _now():
        # write back normalized value to be safe for downstream consumers
        doc["until"] = until
        return doc
    # expired — clean it up
    await db.chat_bans.delete_one({"_id": user_id})
    return None


def _format_message_doc(m: dict) -> dict:
    return {
        "id": m.get("id"),
        "room": m.get("room"),
        "user_id": m.get("user_id"),
        "nickname": m.get("nickname"),
        "avatar_url": m.get("avatar_url"),
        "plan": m.get("plan", "free"),
        "role": m.get("role", "user"),
        "level": int(m.get("level", 1)),
        "content": m.get("content"),
        "created_at": m.get("created_at"),
        "deleted": bool(m.get("deleted", False)),
        "censored": bool(m.get("censored", False)),
        "is_bot": bool(m.get("is_bot", False)),
    }


async def _post_bot_message(db, content: str, room: str = "global") -> dict:
    """Insert a CartoonixTV bot message into the chat (bypasses all user limits)."""
    from models import new_id
    now = _now()
    doc = {
        "id": new_id(),
        "room": room,
        "user_id": CARTOONIXTV_BOT["id"],
        "nickname": CARTOONIXTV_BOT["nickname"],
        "avatar_url": CARTOONIXTV_BOT["avatar_url"],
        "plan": CARTOONIXTV_BOT["plan"],
        "role": CARTOONIXTV_BOT["role"],
        "content": content.strip(),
        "censored": False,
        "deleted": False,
        "is_bot": True,
        "created_at": now.isoformat(),
    }
    await db.chat_messages.insert_one(doc)
    return doc


# ============================================================
# CARTOONIX TV BOT SCHEDULER (background asyncio task)
# ============================================================
_bot_task = None
_bot_state = {"index": 0}  # rotation pointer for non-random mode


async def _cartoonixtv_scheduler():
    """Background loop that posts a CartoonixTV message every X minutes.

    Survives partial-doc errors and keeps running until cancelled at shutdown.
    State (`cartoonixtv_last_sent_at`) is stored in the settings doc so
    intervals are honoured across process restarts.
    """
    import asyncio
    from random import choice, randrange

    logger.info("CartoonixTV scheduler started.")
    while True:
        try:
            db = await _get_db()
            doc = await db.settings.find_one({"_id": "global"}) or {}
            enabled = bool(doc.get("cartoonixtv_enabled", False))
            interval = int(doc.get("cartoonixtv_interval_minutes", 15) or 15)
            messages = [m for m in (doc.get("cartoonixtv_messages") or []) if (m or "").strip()]
            random_order = bool(doc.get("cartoonixtv_random_order", True))
            rooms = doc.get("cartoonixtv_rooms") or ["global"]
            chat_enabled = bool(doc.get("chat_enabled", True))

            if not enabled or not messages or not chat_enabled:
                await asyncio.sleep(30)
                continue

            interval = max(1, min(720, interval))  # 1 min .. 12 h
            last_iso = doc.get("cartoonixtv_last_sent_at")
            last_dt = None
            if isinstance(last_iso, str):
                try:
                    last_dt = datetime.fromisoformat(last_iso.replace("Z", "+00:00"))
                    if last_dt.tzinfo is None:
                        last_dt = last_dt.replace(tzinfo=timezone.utc)
                except Exception:
                    last_dt = None
            elif isinstance(last_iso, datetime):
                last_dt = last_iso
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)

            now = _now()
            due = last_dt is None or (now - last_dt).total_seconds() >= interval * 60
            if not due:
                # Sleep until due (capped to 30s for fresh settings reads)
                remaining = interval * 60 - (now - last_dt).total_seconds() if last_dt else 30
                await asyncio.sleep(max(5, min(30, remaining)))
                continue

            # Pick message
            if random_order:
                content = choice(messages)
            else:
                idx = _bot_state["index"] % len(messages)
                content = messages[idx]
                _bot_state["index"] = (idx + 1) % len(messages)

            # Post to each configured room
            for room in rooms:
                try:
                    await _post_bot_message(db, content, room=room)
                except Exception as e:
                    logger.warning(f"CartoonixTV failed to post in {room}: {e}")

            await db.settings.update_one(
                {"_id": "global"},
                {"$set": {"cartoonixtv_last_sent_at": now.isoformat()}},
                upsert=True,
            )
            logger.info(f"CartoonixTV posted to {rooms}: {content[:60]}…")
            await asyncio.sleep(min(interval * 60, 30))
        except asyncio.CancelledError:
            logger.info("CartoonixTV scheduler cancelled.")
            raise
        except Exception as e:
            logger.exception(f"CartoonixTV scheduler error: {e}")
            await asyncio.sleep(30)


def start_bot_scheduler():
    """Start the background scheduler (idempotent)."""
    import asyncio
    global _bot_task
    if _bot_task is None or _bot_task.done():
        _bot_task = asyncio.create_task(_cartoonixtv_scheduler())
    return _bot_task


def stop_bot_scheduler():
    global _bot_task
    if _bot_task and not _bot_task.done():
        _bot_task.cancel()


# ============================================================
# ROUTER
# ============================================================
chat_router = APIRouter(prefix="/chat", tags=["chat"])


# ----- read state (public-ish, requires auth) -----
@chat_router.get("/state")
async def chat_state(user=Depends(lambda: None)):  # patched below
    raise RuntimeError("placeholder — patched at import time")  # pragma: no cover


# Real handlers are registered below using add_api_route so we can inject
# the auth dependency cleanly without circular import.


def attach_handlers(get_current_user, require_admin):
    """Wire the chat router endpoints to the real auth dependencies.

    Called from server.py after both modules are imported.
    """
    # Remove the placeholder route added above
    chat_router.routes.clear()

    # --------- USER ENDPOINTS ---------
    @chat_router.get("/state")
    async def state(user=Depends(get_current_user)):
        db = await _get_db()
        s = await _get_settings_full()
        sanction = await _active_sanction(db, user["id"])
        strikes = await db.chat_strikes.find_one({"_id": user["id"]}) or {}
        last_sent = strikes.get("last_sent_at")
        level = int(strikes.get("level", 0))
        # Effective base cooldown = max(progressive level, slow_mode)
        level_cooldowns = [5, 15, 60]
        base_cd = level_cooldowns[min(level, 2)]
        slow = int(s.get("chat_slow_mode_seconds", 0) or 0)
        effective_cd = max(base_cd, slow)
        cooldown_remaining = 0
        if isinstance(last_sent, str):
            try:
                last_sent = datetime.fromisoformat(last_sent.replace("Z", "+00:00"))
            except Exception:
                last_sent = None
        if isinstance(last_sent, datetime) and last_sent.tzinfo is None:
            last_sent = last_sent.replace(tzinfo=timezone.utc)
        if last_sent:
            elapsed = (_now() - last_sent).total_seconds()
            cooldown_remaining = max(0, int(effective_cd - elapsed))

        # New-user restriction
        new_user_days = int(s.get("chat_new_user_days", 3) or 0)
        age_s = _account_age_seconds(user)
        restricted_until = None
        restricted = False
        if user.get("role") != "admin" and new_user_days > 0:
            if age_s < new_user_days * 86400:
                restricted = True
                remaining_s = new_user_days * 86400 - age_s
                restricted_until = (_now() + timedelta(seconds=remaining_s)).isoformat()

        # Mute / ban summary
        mute_until = None
        banned = False
        if sanction:
            if sanction.get("type") == "ban":
                banned = True
            else:
                u = sanction.get("until")
                if u:
                    if isinstance(u, datetime):
                        if u.tzinfo is None:
                            u = u.replace(tzinfo=timezone.utc)
                        mute_until = u.isoformat()
                    elif isinstance(u, str):
                        mute_until = u
                else:
                    # permanent mute
                    mute_until = "permanent"

        # Determine if user CAN send
        can_send = (
            s.get("chat_enabled", True)
            and s.get("chat_messages_enabled", True)
            and not banned
            and (sanction is None or sanction.get("type") != "mute")
            and not restricted
            and cooldown_remaining == 0
        )

        return {
            "settings": {
                "chat_enabled": s["chat_enabled"],
                "chat_messages_enabled": s["chat_messages_enabled"],
                "chat_slow_mode_seconds": s["chat_slow_mode_seconds"],
                "chat_new_user_days": s["chat_new_user_days"],
                "chat_max_length": s["chat_max_length"],
                "chat_block_links": s.get("chat_block_links", True),
                "chat_pinned_message": s.get("chat_pinned_message"),
            },
            "you": {
                "role": user.get("role", "user"),
                "plan": user.get("subscription", "free"),
                "can_send": can_send,
                "cooldown_remaining": cooldown_remaining,
                "cooldown_level": level,
                "mute_until": mute_until,
                "banned": banned,
                "restricted_new_user": restricted,
                "restricted_until": restricted_until,
            },
        }

    @chat_router.get("/messages")
    async def list_messages(
        room: str = Query("global", pattern="^(global|plus)$"),
        since: Optional[str] = None,
        limit: int = 50,
        user=Depends(get_current_user),
    ):
        db = await _get_db()
        s = await _get_settings_full()
        if not s.get("chat_enabled", True) and user.get("role") != "admin":
            return {"items": [], "room": room}
        # PLUS room: gate access
        if room == "plus":
            if user.get("role") != "admin" and user.get("subscription") != "plus":
                raise HTTPException(403, "Camera PLUS este rezervată membrilor PLUS.")
        q = {"room": room, "deleted": {"$ne": True}}
        if since:
            try:
                q["created_at"] = {"$gt": since}
            except Exception:
                pass
        limit = max(1, min(200, int(limit or 50)))
        cursor = db.chat_messages.find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
        items = list(reversed(await cursor.to_list(limit)))
        return {"items": [_format_message_doc(m) for m in items], "room": room}

    @chat_router.post("/send")
    async def send_message(payload: SendMessage, user=Depends(get_current_user)):
        db = await _get_db()
        s = await _get_settings_full()

        # Global flags
        if not s.get("chat_enabled", True):
            raise HTTPException(503, "Chat-ul este dezactivat.")
        if not s.get("chat_messages_enabled", True):
            raise HTTPException(403, "Mesajele sunt momentan oprite. Chat-ul este read-only.")

        # PLUS room gate
        if payload.room == "plus":
            if user.get("role") != "admin" and user.get("subscription") != "plus":
                raise HTTPException(403, "Camera PLUS este rezervată membrilor PLUS.")

        # Sanctions
        sanction = await _active_sanction(db, user["id"])
        if sanction:
            if sanction.get("type") == "ban":
                raise HTTPException(403, "Ai fost exclus permanent din chat.")
            if sanction.get("type") == "mute":
                until = sanction.get("until")
                if isinstance(until, datetime):
                    if until.tzinfo is None:
                        until = until.replace(tzinfo=timezone.utc)
                    mins = max(1, int((until - _now()).total_seconds() / 60))
                    raise HTTPException(403, f"Ești silențiat încă ~{mins} minut(e).")
                raise HTTPException(403, "Contul tău este silențiat în chat.")

        # New-user restriction (skip for admins)
        new_user_days = int(s.get("chat_new_user_days", 3) or 0)
        if user.get("role") != "admin" and new_user_days > 0:
            if _account_age_seconds(user) < new_user_days * 86400:
                raise HTTPException(
                    403,
                    f"Vei putea scrie în chat la {new_user_days} zile după înregistrare.",
                )

        # Validate length
        content = (payload.content or "").strip()
        max_len = int(s.get("chat_max_length", 300) or 300)
        if not content:
            raise HTTPException(400, "Mesajul este gol.")
        if len(content) > max_len:
            raise HTTPException(400, f"Mesajul depășește {max_len} caractere.")

        # Block external links (admin can still send them)
        if s.get("chat_block_links", True) and user.get("role") != "admin":
            if URL_RE.search(content):
                raise HTTPException(400, "Link-urile nu sunt permise în chat.")

        # Auto-correct CAPS abuse
        if _excessive_caps(content):
            content = content.capitalize()
        content = _collapse_repeats(content)

        # Profanity filter
        content, had_profanity = _apply_word_filter(
            content, s.get("chat_banned_words", []) or []
        )

        # Duplicate spam (same content as one of last 3 of this user)
        recent_user_msgs = await db.chat_messages.find(
            {"user_id": user["id"], "room": payload.room},
            {"_id": 0, "content": 1, "created_at": 1},
        ).sort("created_at", -1).limit(3).to_list(3)
        recent_contents = [m.get("content", "").strip().lower() for m in recent_user_msgs]
        if recent_contents.count(content.strip().lower()) >= 2:
            # Already sent the same line twice — block
            raise HTTPException(429, "Nu mai trimite același mesaj. Schimbă conversația.")

        # Cooldown handling (progressive)
        strikes = await db.chat_strikes.find_one({"_id": user["id"]}) or {}
        level = int(strikes.get("level", 0))
        last_sent = strikes.get("last_sent_at")
        if isinstance(last_sent, str):
            try:
                last_sent = datetime.fromisoformat(last_sent.replace("Z", "+00:00"))
            except Exception:
                last_sent = None
        if isinstance(last_sent, datetime) and last_sent.tzinfo is None:
            last_sent = last_sent.replace(tzinfo=timezone.utc)

        level_cooldowns = [5, 15, 60]
        slow = int(s.get("chat_slow_mode_seconds", 0) or 0)
        base_cd = level_cooldowns[min(level, 2)]
        effective_cd = max(base_cd, slow)

        now = _now()
        if last_sent:
            elapsed = (now - last_sent).total_seconds()
            if elapsed < effective_cd:
                remaining = int(effective_cd - elapsed)
                raise HTTPException(
                    429,
                    f"Așteaptă {remaining}s înainte să trimiți alt mesaj.",
                )
            # Rapid pattern: user is sending right at cooldown boundary repeatedly
            rapid_window = effective_cd + 3
            if elapsed <= rapid_window:
                # increment rapid_count; escalate when 3
                rapid = int(strikes.get("rapid_count", 0)) + 1
                if rapid >= 3 and level < 2:
                    level += 1
                    rapid = 0
            else:
                rapid = 0
            # Reset level if very long idle
            if elapsed > 90 and level > 0:
                level = max(0, level - 1)
                rapid = 0
        else:
            rapid = 0

        # Persist strikes
        await db.chat_strikes.update_one(
            {"_id": user["id"]},
            {"$set": {"level": level, "rapid_count": rapid, "last_sent_at": now}},
            upsert=True,
        )

        # Insert message
        from models import new_id
        msg_id = new_id()
        doc = {
            "id": msg_id,
            "room": payload.room,
            "user_id": user["id"],
            "nickname": user.get("nickname", ""),
            "avatar_url": user.get("avatar_url", ""),
            "plan": user.get("subscription", "free"),
            "role": user.get("role", "user"),
            "level": int(user.get("level", 1)),
            "content": content,
            "censored": had_profanity,
            "deleted": False,
            "created_at": now.isoformat(),
        }
        await db.chat_messages.insert_one(doc)

        # Touch online presence
        await db.chat_online.update_one(
            {"_id": user["id"]},
            {"$set": {
                "_id": user["id"],
                "nickname": user.get("nickname", ""),
                "plan": user.get("subscription", "free"),
                "last_seen": now,
            }},
            upsert=True,
        )

        return {"success": True, "message": _format_message_doc(doc)}

    @chat_router.post("/heartbeat")
    async def heartbeat(user=Depends(get_current_user)):
        db = await _get_db()
        await db.chat_online.update_one(
            {"_id": user["id"]},
            {"$set": {
                "_id": user["id"],
                "nickname": user.get("nickname", ""),
                "plan": user.get("subscription", "free"),
                "last_seen": _now(),
            }},
            upsert=True,
        )
        return {"success": True}

    @chat_router.get("/presence")
    async def presence(user=Depends(get_current_user)):
        db = await _get_db()
        threshold = _now() - timedelta(seconds=90)
        total = await db.chat_online.count_documents({"last_seen": {"$gte": threshold}})
        plus = await db.chat_online.count_documents(
            {"last_seen": {"$gte": threshold}, "plan": "plus"}
        )
        return {"online_total": total, "online_plus": plus}

    # --------- ADMIN ENDPOINTS ---------
    @chat_router.patch("/admin/settings")
    async def admin_update_chat_settings(
        payload: ChatSettingsUpdate, user=Depends(require_admin)
    ):
        db = await _get_db()
        update = {}
        for k, v in payload.model_dump(exclude_none=True).items():
            if k == "chat_slow_mode_seconds":
                update[k] = max(0, min(600, int(v)))
            elif k == "chat_new_user_days":
                update[k] = max(0, min(30, int(v)))
            elif k == "chat_max_length":
                update[k] = max(20, min(1000, int(v)))
            elif k == "chat_banned_words":
                cleaned = sorted({(w or "").strip().lower() for w in v if (w or "").strip()})
                update[k] = cleaned
            else:
                update[k] = v
        if update:
            await db.settings.update_one(
                {"_id": "global"}, {"$set": update}, upsert=True
            )
        s = await _get_settings_full()
        # Return only chat settings + a couple useful counters
        return {
            "settings": {k: s.get(k) for k in DEFAULT_CHAT_SETTINGS},
        }

    @chat_router.get("/admin/state")
    async def admin_chat_state(user=Depends(require_admin)):
        s = await _get_settings_full()
        db = await _get_db()
        total_msgs = await db.chat_messages.count_documents({})
        threshold = _now() - timedelta(seconds=90)
        online_total = await db.chat_online.count_documents({"last_seen": {"$gte": threshold}})
        # sanctions
        active_bans = await db.chat_bans.count_documents({})
        return {
            "settings": {k: s.get(k) for k in DEFAULT_CHAT_SETTINGS},
            "stats": {
                "total_messages": total_msgs,
                "online_total": online_total,
                "active_sanctions": active_bans,
            },
        }

    @chat_router.get("/admin/messages")
    async def admin_list_messages(
        room: str = Query("global", pattern="^(global|plus)$"),
        limit: int = 100,
        user=Depends(require_admin),
    ):
        db = await _get_db()
        limit = max(1, min(500, int(limit or 100)))
        items = await db.chat_messages.find(
            {"room": room}, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        items = list(reversed(items))
        return {"items": [_format_message_doc(m) for m in items], "room": room}

    @chat_router.delete("/admin/messages/{message_id}")
    async def admin_delete_message(message_id: str, user=Depends(require_admin)):
        db = await _get_db()
        res = await db.chat_messages.update_one(
            {"id": message_id},
            {"$set": {
                "deleted": True,
                "deleted_by": user["id"],
                "deleted_at": _now().isoformat(),
            }},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Mesaj inexistent.")
        # Also unpin if pinned
        s = await _get_settings_full()
        pin = s.get("chat_pinned_message") or {}
        if pin.get("message_id") == message_id:
            await db.settings.update_one(
                {"_id": "global"}, {"$set": {"chat_pinned_message": None}}, upsert=True
            )
        return {"success": True}

    @chat_router.post("/admin/pin")
    async def admin_pin_message(payload: PinMessage, user=Depends(require_admin)):
        db = await _get_db()
        # Path A: explicit unpin
        if not payload.message_id and not (payload.content and payload.content.strip()):
            await db.settings.update_one(
                {"_id": "global"}, {"$set": {"chat_pinned_message": None}}, upsert=True
            )
            return {"success": True, "pinned": None}

        # Path B: custom admin announcement (no message_id, just text)
        if payload.content and payload.content.strip():
            text = payload.content.strip()
            pin = {
                "message_id": None,
                "kind": "announcement",
                "room": "global",
                "user_id": user["id"],
                "nickname": user.get("nickname") or "Admin",
                "avatar_url": user.get("avatar_url"),
                "plan": user.get("subscription", "free"),
                "content": text,
                "pinned_at": _now().isoformat(),
                "pinned_by": user["id"],
            }
            await db.settings.update_one(
                {"_id": "global"}, {"$set": {"chat_pinned_message": pin}}, upsert=True
            )
            return {"success": True, "pinned": pin}

        # Path C: pin an existing chat message
        msg = await db.chat_messages.find_one(
            {"id": payload.message_id}, {"_id": 0}
        )
        if not msg:
            raise HTTPException(404, "Mesaj inexistent.")
        pin = {
            "message_id": msg["id"],
            "kind": "message",
            "room": msg.get("room"),
            "user_id": msg.get("user_id"),
            "nickname": msg.get("nickname"),
            "avatar_url": msg.get("avatar_url"),
            "plan": msg.get("plan", "free"),
            "content": msg.get("content"),
            "pinned_at": _now().isoformat(),
            "pinned_by": user["id"],
        }
        await db.settings.update_one(
            {"_id": "global"}, {"$set": {"chat_pinned_message": pin}}, upsert=True
        )
        return {"success": True, "pinned": pin}

    @chat_router.post("/admin/moderate")
    async def admin_moderate(payload: ModerateAction, user=Depends(require_admin)):
        db = await _get_db()
        target = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
        if not target:
            raise HTTPException(404, "Utilizator inexistent.")
        if target.get("id") == user["id"]:
            raise HTTPException(400, "Nu te poți sancționa pe tine.")
        if target.get("role") == "admin":
            raise HTTPException(400, "Nu poți sancționa un alt admin.")

        action = payload.action
        if action in ("unmute", "unban"):
            await db.chat_bans.delete_one({"_id": target["id"]})
            return {"success": True, "active": None}

        durations = {
            "mute_5m": 5 * 60,
            "mute_1h": 60 * 60,
            "mute_24h": 24 * 60 * 60,
        }
        if action in durations:
            until = _now() + timedelta(seconds=durations[action])
            doc = {
                "_id": target["id"],
                "type": "mute",
                "until": until,
                "reason": payload.reason,
                "created_by": user["id"],
                "created_at": _now(),
            }
        elif action == "mute_perm":
            doc = {
                "_id": target["id"],
                "type": "mute",
                "until": None,
                "reason": payload.reason,
                "created_by": user["id"],
                "created_at": _now(),
            }
        elif action == "ban":
            doc = {
                "_id": target["id"],
                "type": "ban",
                "until": None,
                "reason": payload.reason,
                "created_by": user["id"],
                "created_at": _now(),
            }
        else:
            raise HTTPException(400, "Acțiune invalidă.")

        await db.chat_bans.update_one(
            {"_id": target["id"]}, {"$set": doc}, upsert=True
        )
        return {
            "success": True,
            "active": {
                "type": doc["type"],
                "until": doc["until"].isoformat() if isinstance(doc["until"], datetime) else None,
                "reason": doc.get("reason"),
            },
        }

    @chat_router.get("/admin/users/{user_id}/history")
    async def admin_user_history(
        user_id: str, limit: int = 50, user=Depends(require_admin)
    ):
        db = await _get_db()
        limit = max(1, min(500, int(limit or 50)))
        target = await db.users.find_one(
            {"id": user_id}, {"_id": 0, "id": 1, "nickname": 1, "email": 1, "avatar_url": 1, "subscription": 1, "role": 1, "created_at": 1}
        )
        if not target:
            raise HTTPException(404, "Utilizator inexistent.")
        msgs = await db.chat_messages.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        sanction = await db.chat_bans.find_one({"_id": user_id}, {"_id": 0})
        if sanction and isinstance(sanction.get("until"), datetime):
            sanction["until"] = sanction["until"].isoformat()
        if sanction and isinstance(sanction.get("created_at"), datetime):
            sanction["created_at"] = sanction["created_at"].isoformat()
        return {
            "user": target,
            "messages": [_format_message_doc(m) for m in msgs],
            "sanction": sanction,
        }

    @chat_router.get("/admin/sanctions")
    async def admin_active_sanctions(user=Depends(require_admin)):
        db = await _get_db()
        items = await db.chat_bans.find({}).sort("created_at", -1).limit(200).to_list(200)
        out = []
        for s in items:
            if isinstance(s.get("until"), datetime):
                s["until"] = s["until"].isoformat()
            if isinstance(s.get("created_at"), datetime):
                s["created_at"] = s["created_at"].isoformat()
            target = await db.users.find_one(
                {"id": s.get("_id")},
                {"_id": 0, "id": 1, "nickname": 1, "email": 1, "avatar_url": 1, "subscription": 1},
            )
            out.append({
                "user_id": s.get("_id"),
                "type": s.get("type"),
                "until": s.get("until"),
                "reason": s.get("reason"),
                "created_at": s.get("created_at"),
                "user": target,
            })
        return {"items": out}

    # --------- CARTOONIX TV BOT (admin) ---------
    @chat_router.get("/admin/cartoonixtv")
    async def admin_get_cartoonixtv(user=Depends(require_admin)):
        db = await _get_db()
        doc = await db.settings.find_one({"_id": "global"}) or {}
        return {
            "enabled": bool(doc.get("cartoonixtv_enabled", False)),
            "interval_minutes": int(doc.get("cartoonixtv_interval_minutes", 15) or 15),
            "messages": list(doc.get("cartoonixtv_messages") or []),
            "random_order": bool(doc.get("cartoonixtv_random_order", True)),
            "rooms": list(doc.get("cartoonixtv_rooms") or ["global"]),
            "last_sent_at": doc.get("cartoonixtv_last_sent_at"),
            "bot": {
                "id": CARTOONIXTV_BOT["id"],
                "nickname": CARTOONIXTV_BOT["nickname"],
            },
        }

    @chat_router.patch("/admin/cartoonixtv")
    async def admin_update_cartoonixtv(
        payload: CartoonixTVUpdate, user=Depends(require_admin)
    ):
        db = await _get_db()
        update = {}
        if payload.enabled is not None:
            update["cartoonixtv_enabled"] = bool(payload.enabled)
        if payload.interval_minutes is not None:
            update["cartoonixtv_interval_minutes"] = max(1, min(720, int(payload.interval_minutes)))
        if payload.messages is not None:
            cleaned = [
                (m or "").strip()
                for m in payload.messages
                if (m or "").strip()
            ]
            # Cap each message to 400 chars to be consistent with normal chat
            cleaned = [m[:400] for m in cleaned]
            update["cartoonixtv_messages"] = cleaned
        if payload.random_order is not None:
            update["cartoonixtv_random_order"] = bool(payload.random_order)
        if payload.rooms is not None:
            rooms = sorted({r for r in payload.rooms if r in ("global", "plus")})
            if not rooms:
                rooms = ["global"]
            update["cartoonixtv_rooms"] = rooms

        if update:
            await db.settings.update_one(
                {"_id": "global"}, {"$set": update}, upsert=True
            )
        doc = await db.settings.find_one({"_id": "global"}) or {}
        return {
            "enabled": bool(doc.get("cartoonixtv_enabled", False)),
            "interval_minutes": int(doc.get("cartoonixtv_interval_minutes", 15) or 15),
            "messages": list(doc.get("cartoonixtv_messages") or []),
            "random_order": bool(doc.get("cartoonixtv_random_order", True)),
            "rooms": list(doc.get("cartoonixtv_rooms") or ["global"]),
            "last_sent_at": doc.get("cartoonixtv_last_sent_at"),
        }

    @chat_router.post("/admin/cartoonixtv/post-now")
    async def admin_post_bot_now(payload: CartoonixTVPost, user=Depends(require_admin)):
        """Push a one-off CartoonixTV announcement immediately."""
        db = await _get_db()
        s = await _get_settings_full()
        if not s.get("chat_enabled", True):
            raise HTTPException(503, "Chat-ul este dezactivat.")
        doc = await _post_bot_message(db, payload.message, room=payload.room)
        return {"success": True, "message": _format_message_doc(doc)}

    return chat_router
