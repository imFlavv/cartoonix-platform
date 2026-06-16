"""Watch Party — PLUS-only synchronized viewing rooms.

A single FastAPI module that exposes:
  * a REST surface under /api/watch-parties/...
  * a WebSocket endpoint /api/watch-parties/ws/{public_code}
  * an in-memory ConnectionManager (WatchPartyManager) that handles broadcast,
    chat history, reactions, presence and host-disconnect grace timer.

The module is intentionally self-contained: persistent state lives in a single
MongoDB collection (`watch_parties`), chat messages and reactions stay in
memory per-room (per user request — they disappear when the party ends or the
backend restarts), and the manager exposes the broadcast primitive that could
later be swapped for a Redis pub/sub adapter without touching the routes.

All authorization (PLUS check, host check, kicked check, invite acceptance,
party not ended) is performed *server-side* on every operation — both for
REST endpoints and for each WebSocket message.
"""
from __future__ import annotations

import asyncio
import logging
import secrets
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Literal, Optional

from fastapi import (APIRouter, Depends, HTTPException, Query, WebSocket,
                     WebSocketDisconnect, status)
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger("cartoonix.watch_party")

# ---------- Configurable constants ----------
WATCH_PARTY_MAX_GUESTS = 5           # max invited (host excluded)
WATCH_PARTY_MAX_PARTICIPANTS = WATCH_PARTY_MAX_GUESTS + 1  # 6 including host
WATCH_PARTY_MAX_QUEUE = 100
WATCH_PARTY_INACTIVITY_HOURS = 4     # auto-expire after N hours idle
WATCH_PARTY_HOST_GRACE_SECONDS = 120  # 2 min grace for host reconnect
WATCH_PARTY_HEARTBEAT_INTERVAL = 5    # client heartbeat cadence (informational)
WATCH_PARTY_CHAT_HISTORY = 200
WATCH_PARTY_CHAT_MAX_LEN = 500
WATCH_PARTY_CHAT_MIN_INTERVAL_MS = 700  # per-user soft rate limit
WATCH_PARTY_REACTION_MIN_INTERVAL_MS = 300
WATCH_PARTY_PUBLIC_CODE_LEN = 10
WATCH_PARTY_MAX_WS_PAYLOAD = 8 * 1024  # 8 KB per message


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


def _public_code() -> str:
    """URL-safe random code (no MongoDB id exposure, hard to enumerate)."""
    # 10 chars of URL-safe base64 ≈ 60 bits entropy
    return secrets.token_urlsafe(WATCH_PARTY_PUBLIC_CODE_LEN)[:WATCH_PARTY_PUBLIC_CODE_LEN]


# ---------- Pydantic models ----------
class WatchPartySettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    autoplay_next: bool = True
    lock_chat: bool = False  # disables chat for guests
    locked: bool = False     # party.lock/unlock — no new joins


class WatchPartyParticipant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    nickname: str
    avatar_url: str = ""
    role: Literal["host", "co_host", "guest"] = "guest"
    joined_at: str
    ready: bool = False
    connected: bool = False


class WatchPartyInvitation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    nickname: str
    avatar_url: str = ""
    status: Literal["pending", "accepted", "declined", "revoked"] = "pending"
    invited_at: str
    responded_at: Optional[str] = None


class WatchPartyQueueItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    episode_id: str
    cartoon_id: str
    title: str
    cartoon_title: str = ""
    thumbnail_url: str = ""
    duration_seconds: int = 0
    added_by: str
    added_at: str


class WatchPartyPlayerState(BaseModel):
    model_config = ConfigDict(extra="ignore")
    episode_id: Optional[str] = None
    queue_index: int = 0
    is_playing: bool = False
    position_seconds: float = 0.0
    playback_rate: float = 1.0
    updated_at_server: str = Field(default_factory=lambda: _now().isoformat())
    version: int = 0


# ---- Request payloads ----
class CreateWatchPartyReq(BaseModel):
    title: Optional[str] = Field(None, max_length=80)
    initial_episode_id: Optional[str] = None
    cartoon_id: Optional[str] = None


class InviteReq(BaseModel):
    user_id: Optional[str] = None
    nickname: Optional[str] = None  # accept either


class QueueAddReq(BaseModel):
    episode_id: str
    cartoon_id: str


class QueueReorderReq(BaseModel):
    item_ids: List[str]


# ============================================================
# In-memory manager
# ============================================================
class _RoomState:
    """Per-room in-memory state (connections, chat, reactions)."""

    __slots__ = ("connections", "chat", "host_disconnected_at", "lock",
                 "user_last_chat_ms", "user_last_react_ms")

    def __init__(self) -> None:
        # user_id -> list[WebSocket] (a user may open the room in multiple tabs)
        self.connections: Dict[str, List[WebSocket]] = {}
        # bounded chat history kept in RAM only
        self.chat: deque = deque(maxlen=WATCH_PARTY_CHAT_HISTORY)
        # When the host disconnects we start a grace timer task; this is the
        # timestamp at which the grace expires (or None when host is online).
        self.host_disconnected_at: Optional[float] = None
        self.lock = asyncio.Lock()
        self.user_last_chat_ms: Dict[str, int] = {}
        self.user_last_react_ms: Dict[str, int] = {}


class WatchPartyManager:
    """In-memory broadcast hub for Watch Parties.

    The manager keeps WebSocket fan-out and the room-local chat history.
    Persistent state lives in MongoDB; this class only mirrors the live
    presence and ephemeral data needed for low-latency interactions.
    """

    def __init__(self, db) -> None:
        self.db = db
        self.rooms: Dict[str, _RoomState] = {}
        self._lock = asyncio.Lock()

    # ---- room registry ----
    async def _room(self, code: str) -> _RoomState:
        async with self._lock:
            r = self.rooms.get(code)
            if r is None:
                r = _RoomState()
                self.rooms[code] = r
            return r

    async def drop_room(self, code: str) -> None:
        async with self._lock:
            self.rooms.pop(code, None)

    # ---- connections ----
    async def connect(self, code: str, user_id: str, ws: WebSocket) -> None:
        room = await self._room(code)
        async with room.lock:
            room.connections.setdefault(user_id, []).append(ws)

    async def disconnect(self, code: str, user_id: str, ws: WebSocket) -> None:
        room = await self._room(code)
        async with room.lock:
            lst = room.connections.get(user_id) or []
            if ws in lst:
                lst.remove(ws)
            if not lst:
                room.connections.pop(user_id, None)

    def is_user_connected(self, code: str, user_id: str) -> bool:
        room = self.rooms.get(code)
        if not room:
            return False
        return bool(room.connections.get(user_id))

    def connected_user_ids(self, code: str) -> List[str]:
        room = self.rooms.get(code)
        if not room:
            return []
        return list(room.connections.keys())

    # ---- broadcast ----
    async def send_to_user(self, code: str, user_id: str, payload: dict) -> None:
        room = self.rooms.get(code)
        if not room:
            return
        websockets = list(room.connections.get(user_id, []))
        for ws in websockets:
            try:
                await ws.send_json(payload)
            except Exception:
                pass

    async def broadcast(self, code: str, payload: dict, *,
                        skip_user: Optional[str] = None) -> None:
        room = self.rooms.get(code)
        if not room:
            return
        targets: List[WebSocket] = []
        for uid, conns in room.connections.items():
            if uid == skip_user:
                continue
            targets.extend(conns)
        for ws in targets:
            try:
                await ws.send_json(payload)
            except Exception:
                pass

    # ---- chat & reactions (in-memory only) ----
    def push_chat(self, code: str, entry: dict) -> None:
        room = self.rooms.get(code)
        if room is None:
            return
        room.chat.append(entry)

    def chat_history(self, code: str) -> List[dict]:
        room = self.rooms.get(code)
        if room is None:
            return []
        return list(room.chat)

    def rate_limit_chat(self, code: str, user_id: str) -> bool:
        room = self.rooms.get(code)
        if room is None:
            return True
        now_ms = int(time.monotonic() * 1000)
        last = room.user_last_chat_ms.get(user_id, 0)
        if now_ms - last < WATCH_PARTY_CHAT_MIN_INTERVAL_MS:
            return False
        room.user_last_chat_ms[user_id] = now_ms
        return True

    def rate_limit_reaction(self, code: str, user_id: str) -> bool:
        room = self.rooms.get(code)
        if room is None:
            return True
        now_ms = int(time.monotonic() * 1000)
        last = room.user_last_react_ms.get(user_id, 0)
        if now_ms - last < WATCH_PARTY_REACTION_MIN_INTERVAL_MS:
            return False
        room.user_last_react_ms[user_id] = now_ms
        return True

    # ---- host disconnect grace ----
    def mark_host_disconnected(self, code: str) -> None:
        room = self.rooms.get(code)
        if room is not None:
            room.host_disconnected_at = time.monotonic()

    def clear_host_disconnected(self, code: str) -> None:
        room = self.rooms.get(code)
        if room is not None:
            room.host_disconnected_at = None

    def host_grace_expired(self, code: str) -> bool:
        room = self.rooms.get(code)
        if room is None or room.host_disconnected_at is None:
            return False
        return (time.monotonic() - room.host_disconnected_at) > WATCH_PARTY_HOST_GRACE_SECONDS


# ============================================================
# Helpers — Mongo serialization
# ============================================================
def _serialize_party(doc: dict) -> dict:
    if not doc:
        return doc
    out = {k: v for k, v in doc.items() if k != "_id"}
    return out


def _participant_count(party: dict) -> int:
    return len(party.get("participants") or [])


def _is_host(party: dict, user_id: str) -> bool:
    return party.get("host_user_id") == user_id


def _is_co_host(party: dict, user_id: str) -> bool:
    return user_id in (party.get("co_host_user_ids") or [])


def _can_control(party: dict, user_id: str) -> bool:
    return _is_host(party, user_id) or _is_co_host(party, user_id)


def _participant_role(party: dict, user_id: str) -> Optional[str]:
    if _is_host(party, user_id):
        return "host"
    if _is_co_host(party, user_id):
        return "co_host"
    for p in party.get("participants") or []:
        if p.get("user_id") == user_id:
            return p.get("role", "guest")
    return None


def _has_accepted_invite(party: dict, user_id: str) -> bool:
    for inv in party.get("invitations") or []:
        if inv.get("user_id") == user_id and inv.get("status") == "accepted":
            return True
    return False


def _is_kicked(party: dict, user_id: str) -> bool:
    return user_id in (party.get("kicked_user_ids") or [])


def _is_participant(party: dict, user_id: str) -> bool:
    if _is_host(party, user_id):
        return True
    return any(p.get("user_id") == user_id for p in (party.get("participants") or []))


def _accepted_invite_count(party: dict) -> int:
    return sum(
        1 for inv in (party.get("invitations") or []) if inv.get("status") == "accepted"
    )


def _is_party_active(party: dict) -> bool:
    return party.get("status") in ("lobby", "playing", "paused")


def _next_expires_at() -> str:
    return (_now() + timedelta(hours=WATCH_PARTY_INACTIVITY_HOURS)).isoformat()


async def _bump_activity(db, code: str) -> None:
    await db.watch_parties.update_one(
        {"public_code": code},
        {"$set": {
            "last_activity_at": _now().isoformat(),
            "expires_at_dt": _now() + timedelta(hours=WATCH_PARTY_INACTIVITY_HOURS),
            "updated_at": _now().isoformat(),
        }},
    )


# ============================================================
# Factory — wires the router with project deps to avoid circular imports
# ============================================================
def create_router(*, get_current_user, db, decode_token):
    """Return the FastAPI APIRouter for Watch Party.

    ``get_current_user`` and ``db`` are passed in to mirror the chat module
    pattern and avoid importing server.py here. ``decode_token`` is used inside
    the WebSocket handshake where Depends() cannot be used.
    """
    router = APIRouter(prefix="/watch-parties", tags=["watch-party"])
    manager = WatchPartyManager(db)

    # ---------- internal helpers ----------
    async def _require_plus(user: dict) -> None:
        if user.get("role") == "admin":
            return
        if user.get("subscription") != "plus":
            raise HTTPException(403, "Watch Party este disponibil doar pentru membrii PLUS.")

    async def _watch_party_enabled() -> bool:
        """Global feature flag from db.settings (_id='global'). Defaults to True."""
        doc = await db.settings.find_one({"_id": "global"}, {"_id": 0, "watch_party_enabled": 1})
        if not doc:
            return True
        return doc.get("watch_party_enabled", True) is not False

    async def _require_feature_enabled() -> None:
        if not await _watch_party_enabled():
            raise HTTPException(403, "Watch Party este dezactivat momentan pe platformă.")

    async def _load_party_or_404(code: str) -> dict:
        party = await db.watch_parties.find_one({"public_code": code}, {"_id": 0})
        if not party:
            raise HTTPException(404, "Watch Party inexistent.")
        return party

    async def _ensure_member(party: dict, user_id: str) -> None:
        if _is_kicked(party, user_id):
            raise HTTPException(403, "Ai fost eliminat din această cameră.")
        if _is_host(party, user_id) or _has_accepted_invite(party, user_id):
            return
        raise HTTPException(403, "Nu ai invitație pentru această cameră.")

    def _public_view(party: dict, user_id: str) -> dict:
        """Serialize a party document for the client (omit internal extras)."""
        return {
            "public_code": party["public_code"],
            "title": party.get("title", ""),
            "host_user_id": party["host_user_id"],
            "co_host_user_ids": party.get("co_host_user_ids", []),
            "status": party.get("status", "lobby"),
            "settings": party.get("settings", {}),
            "participants": party.get("participants", []),
            "invitations": party.get("invitations", []),
            "queue": party.get("queue", []),
            "current_queue_index": party.get("current_queue_index", 0),
            "player_state": party.get("player_state", {}),
            "kicked_user_ids": party.get("kicked_user_ids", []),
            "created_at": party.get("created_at"),
            "updated_at": party.get("updated_at"),
            "last_activity_at": party.get("last_activity_at"),
            "expires_at": _iso(party.get("expires_at_dt")) or party.get("expires_at"),
            "your_role": _participant_role(party, user_id) or "viewer",
            "max_guests": WATCH_PARTY_MAX_GUESTS,
            "max_participants": WATCH_PARTY_MAX_PARTICIPANTS,
        }

    async def _broadcast_party_updated(code: str) -> None:
        party = await db.watch_parties.find_one({"public_code": code}, {"_id": 0})
        if not party:
            return
        # Build a generic snapshot the clients can re-use to refresh their state.
        payload = {
            "type": "party.updated",
            "party_id": code,
            "sent_at": _now().isoformat(),
            "payload": {
                "title": party.get("title", ""),
                "status": party.get("status"),
                "settings": party.get("settings", {}),
                "participants": party.get("participants", []),
                "invitations": party.get("invitations", []),
                "queue": party.get("queue", []),
                "current_queue_index": party.get("current_queue_index", 0),
                "player_state": party.get("player_state", {}),
                "host_user_id": party.get("host_user_id"),
                "co_host_user_ids": party.get("co_host_user_ids", []),
                "kicked_user_ids": party.get("kicked_user_ids", []),
            },
        }
        await manager.broadcast(code, payload)

    async def _notify_invitation(invitee_id: str, host_nickname: str,
                                 code: str, title: str) -> None:
        try:
            await db.notifications.insert_one({
                "id": f"wp_inv_{code}_{invitee_id}_{int(time.time())}",
                "user_id": invitee_id,
                "title": "Invitație Watch Party",
                "body": f"{host_nickname} te-a invitat în Watch Party: {title or 'Cartoonix Fest'}",
                "type": "watch_party_invite",
                "data": {"public_code": code},
                "read": False,
                "created_at": _now().isoformat(),
            })
        except Exception:
            logger.exception("watch_party invite notification failed")

    # =========================================================
    # REST endpoints
    # =========================================================
    @router.post("")
    async def create_party(payload: CreateWatchPartyReq,
                           user=Depends(get_current_user)):
        await _require_feature_enabled()
        await _require_plus(user)

        # Reuse an existing active party for this host if any (idempotency).
        existing = await db.watch_parties.find_one({
            "host_user_id": user["id"],
            "status": {"$in": ["lobby", "playing", "paused"]},
        }, {"_id": 0})
        if existing:
            return {"success": True, "party": _public_view(existing, user["id"])}

        code = _public_code()
        # Prevent duplicate codes in the rare race.
        while await db.watch_parties.find_one({"public_code": code}, {"_id": 1}):
            code = _public_code()

        title = (payload.title or f"Watch Party · {user.get('nickname', '')}").strip()[:80]

        queue: List[dict] = []
        current_index = 0
        if payload.initial_episode_id:
            ep = await db.episodes.find_one(
                {"id": payload.initial_episode_id}, {"_id": 0}
            )
            if ep:
                cartoon = await db.cartoons.find_one(
                    {"id": ep.get("cartoon_id")}, {"_id": 0}
                ) or {}
                queue.append({
                    "id": _public_code(),
                    "episode_id": ep["id"],
                    "cartoon_id": ep.get("cartoon_id", payload.cartoon_id or ""),
                    "title": ep.get("title", ""),
                    "cartoon_title": cartoon.get("title", ""),
                    "thumbnail_url": ep.get("thumbnail_url") or cartoon.get("thumbnail_url", ""),
                    "duration_seconds": int(ep.get("duration_seconds") or 0),
                    "added_by": user["id"],
                    "added_at": _now().isoformat(),
                })

        host_participant = {
            "user_id": user["id"],
            "nickname": user.get("nickname", ""),
            "avatar_url": user.get("avatar_url", ""),
            "role": "host",
            "joined_at": _now().isoformat(),
            "ready": True,
            "connected": False,
        }
        now = _now()
        doc = {
            "id": _public_code(),
            "public_code": code,
            "title": title,
            "host_user_id": user["id"],
            "co_host_user_ids": [],
            "status": "lobby",
            "settings": WatchPartySettings().model_dump(),
            "participants": [host_participant],
            "invitations": [],
            "queue": queue,
            "current_queue_index": current_index,
            "player_state": WatchPartyPlayerState(
                episode_id=queue[0]["episode_id"] if queue else None,
                queue_index=0,
                is_playing=False,
                position_seconds=0.0,
                playback_rate=1.0,
                version=0,
            ).model_dump(),
            "kicked_user_ids": [],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "last_activity_at": now.isoformat(),
            "expires_at_dt": now + timedelta(hours=WATCH_PARTY_INACTIVITY_HOURS),
        }
        await db.watch_parties.insert_one(doc)
        return {"success": True, "party": _public_view(doc, user["id"])}

    @router.get("/active/me")
    async def my_active_party(user=Depends(get_current_user)):
        party = await db.watch_parties.find_one({
            "host_user_id": user["id"],
            "status": {"$in": ["lobby", "playing", "paused"]},
        }, {"_id": 0})
        return {"party": _public_view(party, user["id"]) if party else None}

    @router.get("/invitations/me")
    async def my_invitations(user=Depends(get_current_user)):
        cursor = db.watch_parties.find({
            "invitations": {
                "$elemMatch": {"user_id": user["id"], "status": "pending"},
            },
            "status": {"$in": ["lobby", "playing", "paused"]},
        }, {"_id": 0})
        items: List[dict] = []
        async for p in cursor:
            inv = next(
                (i for i in p.get("invitations", [])
                 if i.get("user_id") == user["id"] and i.get("status") == "pending"),
                None,
            )
            if not inv:
                continue
            items.append({
                "invitation_id": inv["id"],
                "public_code": p["public_code"],
                "title": p.get("title", ""),
                "host_nickname": next(
                    (pp.get("nickname", "") for pp in (p.get("participants") or [])
                     if pp.get("user_id") == p["host_user_id"]),
                    "",
                ),
                "invited_at": inv.get("invited_at"),
            })
        return {"items": items}

    @router.get("/{code}")
    async def get_party(code: str, user=Depends(get_current_user)):
        party = await _load_party_or_404(code)
        # Anyone PLUS who has an invitation (any status) or is a member can fetch
        # the room; otherwise only the host. We *don't* leak rooms purely by
        # guessing the code thanks to high-entropy codes, but we still verify.
        if not (_is_host(party, user["id"]) or _is_participant(party, user["id"])
                or any(i.get("user_id") == user["id"]
                       for i in party.get("invitations") or [])):
            await _require_plus(user)
            raise HTTPException(403, "Nu ai acces la această cameră.")
        return {"party": _public_view(party, user["id"])}

    @router.delete("/{code}")
    async def end_party(code: str, user=Depends(get_current_user)):
        party = await _load_party_or_404(code)
        if not _is_host(party, user["id"]):
            raise HTTPException(403, "Doar organizatorul poate închide camera.")
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$set": {
                "status": "ended",
                "updated_at": _now().isoformat(),
                # Keep the doc but expire it shortly so TTL cleans up.
                "expires_at_dt": _now() + timedelta(minutes=10),
            }},
        )
        await manager.broadcast(code, {
            "type": "party.ended",
            "party_id": code,
            "sent_at": _now().isoformat(),
            "payload": {"reason": "host_ended"},
        })
        await manager.drop_room(code)
        return {"success": True}

    @router.post("/{code}/end")
    async def end_party_alt(code: str, user=Depends(get_current_user)):
        # Mirror of DELETE for clients that prefer POST semantics.
        return await end_party(code, user)

    # ---- INVITATIONS ----
    @router.post("/{code}/invite")
    async def invite(code: str, payload: InviteReq, user=Depends(get_current_user)):
        party = await _load_party_or_404(code)
        if not _is_host(party, user["id"]):
            raise HTTPException(403, "Doar organizatorul poate trimite invitații.")
        if not _is_party_active(party):
            raise HTTPException(400, "Camera nu mai este activă.")

        target: Optional[dict] = None
        if payload.user_id:
            target = await db.users.find_one(
                {"id": payload.user_id}, {"_id": 0, "password_hash": 0}
            )
        elif payload.nickname:
            target = await db.users.find_one(
                {"nickname": payload.nickname}, {"_id": 0, "password_hash": 0}
            )
        if not target:
            raise HTTPException(404, "Utilizatorul nu există.")
        if target["id"] == user["id"]:
            raise HTTPException(400, "Nu te poți invita pe tine.")
        if target.get("subscription") != "plus" and target.get("role") != "admin":
            raise HTTPException(400, "Doar membrii PLUS pot fi invitați.")
        if _is_kicked(party, target["id"]):
            raise HTTPException(400, "Acest utilizator a fost eliminat din cameră.")
        # No duplicate active invite.
        for inv in party.get("invitations") or []:
            if inv["user_id"] == target["id"] and inv["status"] in ("pending", "accepted"):
                raise HTTPException(400, "Utilizatorul a fost deja invitat.")
        # Capacity check counts accepted invites only — pending invitations
        # don't yet consume a slot.
        if _accepted_invite_count(party) >= WATCH_PARTY_MAX_GUESTS:
            raise HTTPException(400, "Camera este plină.")

        invitation = {
            "id": _public_code(),
            "user_id": target["id"],
            "nickname": target.get("nickname", ""),
            "avatar_url": target.get("avatar_url", ""),
            "status": "pending",
            "invited_at": _now().isoformat(),
            "responded_at": None,
        }
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$push": {"invitations": invitation},
             "$set": {"updated_at": _now().isoformat()}},
        )
        await _notify_invitation(
            target["id"], user.get("nickname", ""), code, party.get("title", "")
        )
        await _bump_activity(db, code)
        await _broadcast_party_updated(code)
        return {"success": True, "invitation": invitation}

    @router.post("/{code}/invitations/{invitation_id}/accept")
    async def accept_invitation(code: str, invitation_id: str,
                                user=Depends(get_current_user)):
        await _require_plus(user)
        party = await _load_party_or_404(code)
        if not _is_party_active(party):
            raise HTTPException(400, "Camera nu mai este activă.")
        if _is_kicked(party, user["id"]):
            raise HTTPException(403, "Ai fost eliminat din această cameră.")

        # Locate the invitation
        inv = next(
            (i for i in party.get("invitations") or []
             if i["id"] == invitation_id and i.get("user_id") == user["id"]),
            None,
        )
        if not inv:
            raise HTTPException(404, "Invitație inexistentă.")
        if inv["status"] != "pending":
            raise HTTPException(400, "Invitația nu mai este validă.")
        if _accepted_invite_count(party) >= WATCH_PARTY_MAX_GUESTS:
            raise HTTPException(400, "Camera este plină.")

        new_participant = {
            "user_id": user["id"],
            "nickname": user.get("nickname", ""),
            "avatar_url": user.get("avatar_url", ""),
            "role": "guest",
            "joined_at": _now().isoformat(),
            "ready": False,
            "connected": False,
        }
        await db.watch_parties.update_one(
            {"public_code": code, "invitations.id": invitation_id},
            {"$set": {
                "invitations.$.status": "accepted",
                "invitations.$.responded_at": _now().isoformat(),
                "updated_at": _now().isoformat(),
            }},
        )
        # Add participant if not already in the list.
        already = any(
            p.get("user_id") == user["id"] for p in party.get("participants") or []
        )
        if not already:
            await db.watch_parties.update_one(
                {"public_code": code},
                {"$push": {"participants": new_participant}},
            )
        await _bump_activity(db, code)
        await _broadcast_party_updated(code)
        return {"success": True}

    @router.post("/{code}/invitations/{invitation_id}/decline")
    async def decline_invitation(code: str, invitation_id: str,
                                 user=Depends(get_current_user)):
        party = await _load_party_or_404(code)
        inv = next(
            (i for i in party.get("invitations") or []
             if i["id"] == invitation_id and i.get("user_id") == user["id"]),
            None,
        )
        if not inv:
            raise HTTPException(404, "Invitație inexistentă.")
        if inv["status"] != "pending":
            return {"success": True}
        await db.watch_parties.update_one(
            {"public_code": code, "invitations.id": invitation_id},
            {"$set": {
                "invitations.$.status": "declined",
                "invitations.$.responded_at": _now().isoformat(),
                "updated_at": _now().isoformat(),
            }},
        )
        await _broadcast_party_updated(code)
        return {"success": True}

    @router.delete("/{code}/invitations/{invitation_id}")
    async def revoke_invitation(code: str, invitation_id: str,
                                user=Depends(get_current_user)):
        party = await _load_party_or_404(code)
        if not _is_host(party, user["id"]):
            raise HTTPException(403, "Doar organizatorul poate retrage invitații.")
        await db.watch_parties.update_one(
            {"public_code": code, "invitations.id": invitation_id},
            {"$set": {
                "invitations.$.status": "revoked",
                "invitations.$.responded_at": _now().isoformat(),
                "updated_at": _now().isoformat(),
            }},
        )
        await _broadcast_party_updated(code)
        return {"success": True}

    # ---- JOIN / LEAVE ----
    @router.post("/{code}/join")
    async def join_party(code: str, user=Depends(get_current_user)):
        await _require_feature_enabled()
        await _require_plus(user)
        party = await _load_party_or_404(code)
        if not _is_party_active(party):
            raise HTTPException(400, "Camera nu mai este activă.")
        await _ensure_member(party, user["id"])

        if not _is_participant(party, user["id"]):
            if _accepted_invite_count(party) >= WATCH_PARTY_MAX_GUESTS:
                raise HTTPException(400, "Camera este plină.")
            await db.watch_parties.update_one(
                {"public_code": code},
                {"$push": {"participants": {
                    "user_id": user["id"],
                    "nickname": user.get("nickname", ""),
                    "avatar_url": user.get("avatar_url", ""),
                    "role": "guest",
                    "joined_at": _now().isoformat(),
                    "ready": False,
                    "connected": False,
                }}},
            )
        await _bump_activity(db, code)
        await _broadcast_party_updated(code)
        return {"success": True}

    @router.post("/{code}/leave")
    async def leave_party(code: str, user=Depends(get_current_user)):
        party = await _load_party_or_404(code)
        if _is_host(party, user["id"]):
            # Host leaving via REST = end the party.
            return await end_party(code, user)
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$pull": {"participants": {"user_id": user["id"]}},
             "$set": {"updated_at": _now().isoformat()}},
        )
        await _broadcast_party_updated(code)
        return {"success": True}

    # ---- QUEUE ----
    @router.post("/{code}/queue")
    async def queue_add(code: str, payload: QueueAddReq,
                        user=Depends(get_current_user)):
        party = await _load_party_or_404(code)
        if not _can_control(party, user["id"]):
            raise HTTPException(403, "Doar organizatorul poate modifica playlist-ul.")
        if not _is_party_active(party):
            raise HTTPException(400, "Camera nu mai este activă.")
        if len(party.get("queue") or []) >= WATCH_PARTY_MAX_QUEUE:
            raise HTTPException(400, "Playlist-ul a atins limita maximă.")

        ep = await db.episodes.find_one({"id": payload.episode_id}, {"_id": 0})
        if not ep:
            raise HTTPException(404, "Episod inexistent.")
        cartoon = await db.cartoons.find_one(
            {"id": ep.get("cartoon_id")}, {"_id": 0}
        ) or {}
        item = {
            "id": _public_code(),
            "episode_id": ep["id"],
            "cartoon_id": ep.get("cartoon_id", payload.cartoon_id or ""),
            "title": ep.get("title", ""),
            "cartoon_title": cartoon.get("title", ""),
            "thumbnail_url": ep.get("thumbnail_url") or cartoon.get("thumbnail_url", ""),
            "duration_seconds": int(ep.get("duration_seconds") or 0),
            "added_by": user["id"],
            "added_at": _now().isoformat(),
        }
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$push": {"queue": item},
             "$set": {"updated_at": _now().isoformat()}},
        )
        # If queue was empty, set as current
        if not (party.get("queue") or []):
            await db.watch_parties.update_one(
                {"public_code": code},
                {"$set": {
                    "current_queue_index": 0,
                    "player_state.episode_id": ep["id"],
                    "player_state.queue_index": 0,
                    "player_state.position_seconds": 0,
                    "player_state.is_playing": False,
                    "player_state.updated_at_server": _now().isoformat(),
                }, "$inc": {"player_state.version": 1}},
            )
        await _bump_activity(db, code)
        await _broadcast_party_updated(code)
        return {"success": True, "item": item}

    @router.patch("/{code}/queue")
    async def queue_reorder(code: str, payload: QueueReorderReq,
                            user=Depends(get_current_user)):
        party = await _load_party_or_404(code)
        if not _can_control(party, user["id"]):
            raise HTTPException(403, "Doar organizatorul poate reordona playlist-ul.")
        current_queue = party.get("queue") or []
        current_ids = [q["id"] for q in current_queue]
        if sorted(payload.item_ids) != sorted(current_ids):
            raise HTTPException(400, "Lista de ID-uri trebuie să corespundă playlist-ului.")
        ordered = [next(q for q in current_queue if q["id"] == iid)
                   for iid in payload.item_ids]
        # Recompute current_queue_index based on the current episode_id.
        current_ep = (party.get("player_state") or {}).get("episode_id")
        new_idx = 0
        for i, q in enumerate(ordered):
            if q["episode_id"] == current_ep:
                new_idx = i
                break
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$set": {
                "queue": ordered,
                "current_queue_index": new_idx,
                "player_state.queue_index": new_idx,
                "updated_at": _now().isoformat(),
            }, "$inc": {"player_state.version": 1}},
        )
        await _bump_activity(db, code)
        await _broadcast_party_updated(code)
        return {"success": True}

    @router.delete("/{code}/queue/{item_id}")
    async def queue_remove(code: str, item_id: str,
                           user=Depends(get_current_user)):
        party = await _load_party_or_404(code)
        if not _can_control(party, user["id"]):
            raise HTTPException(403, "Doar organizatorul poate șterge din playlist.")
        queue = party.get("queue") or []
        if not any(q["id"] == item_id for q in queue):
            raise HTTPException(404, "Element inexistent.")
        new_queue = [q for q in queue if q["id"] != item_id]
        # Keep current playback if possible.
        cur_idx = int(party.get("current_queue_index") or 0)
        if not new_queue:
            update = {
                "queue": [],
                "current_queue_index": 0,
                "player_state.episode_id": None,
                "player_state.queue_index": 0,
                "player_state.is_playing": False,
                "player_state.position_seconds": 0,
                "updated_at": _now().isoformat(),
            }
        else:
            cur_ep = (party.get("player_state") or {}).get("episode_id")
            new_idx = 0
            for i, q in enumerate(new_queue):
                if q["episode_id"] == cur_ep:
                    new_idx = i
                    break
            else:
                new_idx = min(cur_idx, len(new_queue) - 1)
            update = {
                "queue": new_queue,
                "current_queue_index": new_idx,
                "player_state.queue_index": new_idx,
                "player_state.episode_id": new_queue[new_idx]["episode_id"],
                "updated_at": _now().isoformat(),
            }
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$set": update, "$inc": {"player_state.version": 1}},
        )
        await _bump_activity(db, code)
        await _broadcast_party_updated(code)
        return {"success": True}

    # ---- HOST CONTROLS ----
    @router.post("/{code}/kick/{user_id}")
    async def kick(code: str, user_id: str, user=Depends(get_current_user)):
        party = await _load_party_or_404(code)
        if not _is_host(party, user["id"]):
            raise HTTPException(403, "Doar organizatorul poate elimina participanți.")
        if user_id == user["id"]:
            raise HTTPException(400, "Nu te poți elimina pe tine.")
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$pull": {"participants": {"user_id": user_id}},
             "$addToSet": {"kicked_user_ids": user_id},
             "$set": {"updated_at": _now().isoformat()}},
        )
        await manager.broadcast(code, {
            "type": "participant.kicked",
            "party_id": code,
            "sent_at": _now().isoformat(),
            "payload": {"user_id": user_id},
        })
        await _broadcast_party_updated(code)
        # Close that user's sockets if connected.
        room = manager.rooms.get(code)
        if room:
            for ws in list(room.connections.get(user_id, []) or []):
                try:
                    await ws.close(code=4403)
                except Exception:
                    pass
        return {"success": True}

    @router.post("/{code}/transfer-host/{user_id}")
    async def transfer_host(code: str, user_id: str,
                            user=Depends(get_current_user)):
        party = await _load_party_or_404(code)
        if not _is_host(party, user["id"]):
            raise HTTPException(403, "Doar organizatorul poate transfera rolul.")
        if not _is_participant(party, user_id):
            raise HTTPException(400, "Utilizatorul nu este în cameră.")
        # Update host and bump versions
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$set": {
                "host_user_id": user_id,
                "updated_at": _now().isoformat(),
            }, "$pull": {"co_host_user_ids": user_id}},
        )
        # Refresh participants roles
        party = await _load_party_or_404(code)
        new_participants = []
        for p in party.get("participants") or []:
            np = dict(p)
            if np.get("user_id") == user_id:
                np["role"] = "host"
            elif np.get("user_id") == user["id"]:
                np["role"] = "guest"
            new_participants.append(np)
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$set": {"participants": new_participants}},
        )
        await _broadcast_party_updated(code)
        return {"success": True}

    # =========================================================
    # WebSocket
    # =========================================================
    @router.websocket("/ws/{public_code}")
    async def ws_endpoint(ws: WebSocket, public_code: str,
                          token: str = Query("")):
        # ---- auth & state validation ----
        if not token:
            await ws.close(code=4401)
            return
        try:
            payload = decode_token(token)
            user_id = payload.get("sub")
            if not user_id:
                raise ValueError
        except Exception:
            await ws.close(code=4401)
            return

        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user or user.get("banned"):
            await ws.close(code=4401)
            return
        if not await _watch_party_enabled():
            # Feature disabled platform-wide — reject before accept (4403).
            await ws.close(code=4403)
            return
        if user.get("role") != "admin" and user.get("subscription") != "plus":
            await ws.close(code=4403)
            return
        party = await db.watch_parties.find_one({"public_code": public_code}, {"_id": 0})
        if not party:
            await ws.close(code=4404)
            return
        if not _is_party_active(party):
            await ws.close(code=4410)
            return
        if _is_kicked(party, user_id):
            await ws.close(code=4403)
            return
        if not (_is_host(party, user_id) or _has_accepted_invite(party, user_id)):
            await ws.close(code=4403)
            return

        await ws.accept()
        await manager.connect(public_code, user_id, ws)
        is_host = _is_host(party, user_id)
        if is_host:
            manager.clear_host_disconnected(public_code)

        # Mark participant connected.
        await db.watch_parties.update_one(
            {"public_code": public_code, "participants.user_id": user_id},
            {"$set": {"participants.$.connected": True}},
        )

        # Send snapshot to the joining client.
        snapshot = {
            "type": "party.snapshot",
            "party_id": public_code,
            "sent_at": _now().isoformat(),
            "payload": _public_view(party, user_id) | {
                "chat_history": manager.chat_history(public_code),
                "connected_user_ids": manager.connected_user_ids(public_code),
            },
        }
        try:
            await ws.send_json(snapshot)
        except Exception:
            await manager.disconnect(public_code, user_id, ws)
            return

        # Tell everybody else this user is now connected.
        await manager.broadcast(public_code, {
            "type": "participant.joined",
            "party_id": public_code,
            "sent_at": _now().isoformat(),
            "payload": {
                "user_id": user_id,
                "nickname": user.get("nickname", ""),
                "avatar_url": user.get("avatar_url", ""),
            },
        }, skip_user=user_id)

        try:
            while True:
                raw = await ws.receive_text()
                if len(raw) > WATCH_PARTY_MAX_WS_PAYLOAD:
                    await ws.send_json({"type": "error",
                                        "payload": {"reason": "payload_too_large"}})
                    continue
                try:
                    msg = _safe_json_loads(raw)
                except Exception:
                    await ws.send_json({"type": "error",
                                        "payload": {"reason": "bad_json"}})
                    continue
                if not isinstance(msg, dict):
                    continue
                mtype = msg.get("type") or ""
                payload_in = msg.get("payload") or {}

                # Reload the latest party doc to make decisions on fresh state.
                party = await db.watch_parties.find_one(
                    {"public_code": public_code}, {"_id": 0}
                )
                if not party or not _is_party_active(party):
                    await ws.close(code=4410)
                    return

                await _handle_ws_message(
                    db=db, manager=manager, ws=ws, code=public_code,
                    user=user, party=party, mtype=mtype, payload=payload_in,
                    broadcast_party_updated=_broadcast_party_updated,
                )
        except WebSocketDisconnect:
            pass
        except Exception:
            logger.exception("watch_party WS loop error")
        finally:
            await manager.disconnect(public_code, user_id, ws)
            still_connected = manager.is_user_connected(public_code, user_id)
            if not still_connected:
                # Update DB and notify others.
                await db.watch_parties.update_one(
                    {"public_code": public_code, "participants.user_id": user_id},
                    {"$set": {"participants.$.connected": False}},
                )
                if is_host:
                    # Pause + start grace timer.
                    manager.mark_host_disconnected(public_code)
                    await db.watch_parties.update_one(
                        {"public_code": public_code},
                        {"$set": {
                            "player_state.is_playing": False,
                            "player_state.updated_at_server": _now().isoformat(),
                            "status": "paused",
                        }, "$inc": {"player_state.version": 1}},
                    )
                    asyncio.create_task(_host_grace_watchdog(
                        db=db, manager=manager, code=public_code
                    ))
                await manager.broadcast(public_code, {
                    "type": "participant.left",
                    "party_id": public_code,
                    "sent_at": _now().isoformat(),
                    "payload": {"user_id": user_id},
                })

    return router


def _safe_json_loads(raw: str):
    import json
    return json.loads(raw)


async def _host_grace_watchdog(*, db, manager: WatchPartyManager, code: str) -> None:
    """If the host doesn't come back within grace, end the party."""
    await asyncio.sleep(WATCH_PARTY_HOST_GRACE_SECONDS + 1)
    party = await db.watch_parties.find_one({"public_code": code}, {"_id": 0})
    if not party or party.get("status") == "ended":
        return
    host_id = party.get("host_user_id")
    if host_id and manager.is_user_connected(code, host_id):
        manager.clear_host_disconnected(code)
        return
    # Promote co-host if any is still connected.
    co_hosts = party.get("co_host_user_ids") or []
    surviving = next((u for u in co_hosts if manager.is_user_connected(code, u)), None)
    if surviving:
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$set": {"host_user_id": surviving, "updated_at": _now().isoformat()},
             "$pull": {"co_host_user_ids": surviving}},
        )
        await manager.broadcast(code, {
            "type": "role.updated",
            "party_id": code,
            "sent_at": _now().isoformat(),
            "payload": {"new_host_user_id": surviving, "reason": "auto_promoted"},
        })
        return
    # End the party.
    await db.watch_parties.update_one(
        {"public_code": code},
        {"$set": {
            "status": "ended",
            "updated_at": _now().isoformat(),
            "expires_at_dt": _now() + timedelta(minutes=10),
        }},
    )
    await manager.broadcast(code, {
        "type": "party.ended",
        "party_id": code,
        "sent_at": _now().isoformat(),
        "payload": {"reason": "host_timeout"},
    })
    await manager.drop_room(code)


# ============================================================
# WebSocket message dispatcher (kept as a free function to allow tests
# to drive the state machine without a live socket).
# ============================================================
async def _handle_ws_message(*, db, manager: WatchPartyManager, ws: WebSocket,
                             code: str, user: dict, party: dict,
                             mtype: str, payload: dict,
                             broadcast_party_updated: Callable) -> None:
    uid = user["id"]
    is_controller = _can_control(party, uid)

    if mtype == "party.heartbeat" or mtype == "player.heartbeat":
        # Hosts ping with the freshest player position; non-hosts can ping for
        # presence-only and we record their connected state.
        if is_controller and isinstance(payload.get("position_seconds"), (int, float)):
            await db.watch_parties.update_one(
                {"public_code": code},
                {"$set": {
                    "player_state.position_seconds": float(payload.get("position_seconds") or 0),
                    "player_state.is_playing": bool(payload.get("is_playing", False)),
                    "player_state.playback_rate": float(payload.get("playback_rate") or 1.0),
                    "player_state.episode_id": payload.get("episode_id")
                    or (party.get("player_state") or {}).get("episode_id"),
                    "player_state.updated_at_server": _now().isoformat(),
                    "last_activity_at": _now().isoformat(),
                }},
            )
        return

    if mtype == "player.sync_request":
        # Re-send the current state to the requester only.
        ps = (party.get("player_state") or {})
        await ws.send_json({
            "type": "player.sync",
            "party_id": code,
            "sent_at": _now().isoformat(),
            "payload": ps,
        })
        return

    if mtype in ("player.play", "player.pause", "player.seek", "episode.change"):
        if not is_controller:
            await ws.send_json({"type": "error",
                                "payload": {"reason": "not_authorized"}})
            return
        set_fields: Dict[str, Any] = {
            "player_state.updated_at_server": _now().isoformat(),
            "updated_at": _now().isoformat(),
            "last_activity_at": _now().isoformat(),
        }
        if mtype == "player.play":
            set_fields["player_state.is_playing"] = True
            if isinstance(payload.get("position_seconds"), (int, float)):
                set_fields["player_state.position_seconds"] = float(payload["position_seconds"])
            set_fields["status"] = "playing"
        elif mtype == "player.pause":
            set_fields["player_state.is_playing"] = False
            if isinstance(payload.get("position_seconds"), (int, float)):
                set_fields["player_state.position_seconds"] = float(payload["position_seconds"])
            set_fields["status"] = "paused"
        elif mtype == "player.seek":
            try:
                pos = float(payload.get("position_seconds") or 0)
            except Exception:
                pos = 0.0
            set_fields["player_state.position_seconds"] = max(0.0, pos)
        elif mtype == "episode.change":
            ep_id = payload.get("episode_id")
            queue = party.get("queue") or []
            idx = next(
                (i for i, q in enumerate(queue) if q["episode_id"] == ep_id), -1
            )
            if idx < 0:
                await ws.send_json({"type": "error",
                                    "payload": {"reason": "episode_not_in_queue"}})
                return
            set_fields.update({
                "player_state.episode_id": ep_id,
                "player_state.queue_index": idx,
                "player_state.position_seconds": 0.0,
                "player_state.is_playing": False,
                "current_queue_index": idx,
                "status": "lobby" if not payload.get("autoplay") else "playing",
            })

        await db.watch_parties.update_one(
            {"public_code": code},
            {"$set": set_fields, "$inc": {"player_state.version": 1}},
        )
        party2 = await db.watch_parties.find_one({"public_code": code}, {"_id": 0})
        ps = (party2 or {}).get("player_state", {})
        evt_type = {
            "player.play": "player.state",
            "player.pause": "player.state",
            "player.seek": "player.state",
            "episode.change": "episode.changed",
        }[mtype]
        await manager.broadcast(code, {
            "type": evt_type,
            "party_id": code,
            "sent_at": _now().isoformat(),
            "version": ps.get("version", 0),
            "payload": ps,
        })
        return

    if mtype == "participant.ready":
        ready = bool(payload.get("ready", True))
        await db.watch_parties.update_one(
            {"public_code": code, "participants.user_id": uid},
            {"$set": {"participants.$.ready": ready}},
        )
        await broadcast_party_updated(code)
        return

    if mtype == "chat.message":
        text = str(payload.get("text") or "").strip()
        if not text:
            return
        if len(text) > WATCH_PARTY_CHAT_MAX_LEN:
            text = text[:WATCH_PARTY_CHAT_MAX_LEN]
        if not manager.rate_limit_chat(code, uid):
            await ws.send_json({"type": "error",
                                "payload": {"reason": "chat_rate_limited"}})
            return
        entry = {
            "id": _public_code(),
            "user_id": uid,
            "nickname": user.get("nickname", ""),
            "avatar_url": user.get("avatar_url", ""),
            "role": _participant_role(party, uid) or "guest",
            "text": text,
            "created_at": _now().isoformat(),
        }
        manager.push_chat(code, entry)
        await manager.broadcast(code, {
            "type": "chat.message",
            "party_id": code,
            "sent_at": _now().isoformat(),
            "payload": entry,
        })
        return

    if mtype == "reaction.send":
        emoji = str(payload.get("emoji") or "").strip()[:8]
        if emoji not in {"heart", "laugh", "wow", "sad", "clap"}:
            return
        if not manager.rate_limit_reaction(code, uid):
            return
        await manager.broadcast(code, {
            "type": "reaction.received",
            "party_id": code,
            "sent_at": _now().isoformat(),
            "payload": {
                "user_id": uid,
                "nickname": user.get("nickname", ""),
                "emoji": emoji,
            },
        })
        return

    if mtype == "control.request":
        if is_controller:
            return  # noop
        host_id = party.get("host_user_id")
        if host_id:
            await manager.send_to_user(code, host_id, {
                "type": "control.requested",
                "party_id": code,
                "sent_at": _now().isoformat(),
                "payload": {
                    "user_id": uid,
                    "nickname": user.get("nickname", ""),
                },
            })
        return

    if mtype == "control.grant":
        if not _is_host(party, uid):
            return
        target_id = payload.get("user_id")
        if not target_id or not _is_participant(party, target_id):
            return
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$addToSet": {"co_host_user_ids": target_id}},
        )
        await broadcast_party_updated(code)
        return

    if mtype == "control.revoke":
        if not _is_host(party, uid):
            return
        target_id = payload.get("user_id")
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$pull": {"co_host_user_ids": target_id}},
        )
        await broadcast_party_updated(code)
        return

    if mtype == "party.lock" or mtype == "party.unlock":
        if not _is_host(party, uid):
            return
        await db.watch_parties.update_one(
            {"public_code": code},
            {"$set": {"settings.locked": mtype == "party.lock",
                      "updated_at": _now().isoformat()}},
        )
        await broadcast_party_updated(code)
        return

    if mtype == "party.leave":
        # Soft leave — just close the socket and let the disconnect handler do
        # cleanup. The REST endpoint handles permanent removal.
        try:
            await ws.close()
        except Exception:
            pass
        return

    # Unknown type → ignore (do not crash).
    return
