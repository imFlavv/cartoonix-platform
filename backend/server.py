from dotenv import load_dotenv
from pathlib import Path
import os

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
import logging
import bcrypt
import jwt

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------- helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
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


def serialize_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "email": doc["email"],
        "name": doc.get("name", ""),
        "avatar": doc.get("avatar", ""),
        "role": doc.get("role", "user"),
        "plus": doc.get("plus", False),
        "banned": doc.get("banned", False),
        "last_ip": doc.get("last_ip", ""),
        "total_time_seconds": doc.get("total_time_seconds", 0),
        "last_seen": doc.get("last_seen"),
        "created_at": doc.get("created_at"),
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
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
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


# ---------- auth routes ----------
@api_router.post("/auth/register")
async def register(data: RegisterInput, request: Request):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Acest email este deja folosit")
    ip = get_client_ip(request)
    if await db.banned_ips.find_one({"ip": ip}):
        raise HTTPException(status_code=403, detail="Acces interzis")
    doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "avatar": data.avatar or "",
        "role": "user",
        "plus": False,
        "banned": False,
        "last_ip": ip,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = create_access_token(str(res.inserted_id), email)
    return {"token": token, "user": serialize_user(doc)}


@api_router.post("/auth/login")
async def login(data: LoginInput, request: Request):
    email = data.email.lower()
    ip = get_client_ip(request)
    if await db.banned_ips.find_one({"ip": ip}):
        raise HTTPException(status_code=403, detail="Acces interzis de pe această adresă IP")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email sau parolă incorectă")
    if user.get("banned"):
        raise HTTPException(status_code=403, detail="Cont suspendat")
    settings = await db.settings.find_one({"key": "maintenance"})
    if settings and settings.get("enabled") and user.get("role") != "admin":
        raise HTTPException(status_code=503, detail="Platforma este momentan în mentenanță. Revenim curând!")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_ip": ip}})
    user["last_ip"] = ip
    token = create_access_token(str(user["_id"]), email)
    return {"token": token, "user": serialize_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


@api_router.put("/auth/avatar")
async def update_avatar(data: AvatarInput, user: dict = Depends(get_current_user)):
    if data.avatar in PREMIUM_AVATARS and not user.get("plus"):
        raise HTTPException(status_code=403, detail="Acest avatar este disponibil doar pentru membrii Cartoonix PLUS")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"avatar": data.avatar}})
    user["avatar"] = data.avatar
    return serialize_user(user)


@api_router.put("/auth/profile")
async def update_profile(data: ProfileInput, user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": data.name}})
    user["name"] = data.name
    return serialize_user(user)


@api_router.post("/auth/subscribe")
async def subscribe(user: dict = Depends(get_current_user)):
    # Placeholder pentru Stripe - momentan doar marcheaza PLUS activ (UI demo)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"plus": True}})
    user["plus"] = True
    return serialize_user(user)


# ---------- shows routes ----------
@api_router.get("/shows")
async def get_shows(category: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    shows = await db.shows.find(query).to_list(500)
    shows = [serialize_show(s) for s in shows]
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
    favs = await db.favorites.find({"user_id": str(user["_id"])}).sort("added_at", -1).to_list(500)
    for f in favs:
        f["id"] = str(f.pop("_id"))
    return favs


@api_router.post("/favorites/toggle")
async def toggle_favorite(data: ItemRef, user: dict = Depends(get_current_user)):
    key = _item_key(data.show_id, data.episode_number)
    existing = await db.favorites.find_one({"user_id": str(user["_id"]), "key": key})
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        return {"favorited": False}
    doc = data.model_dump()
    doc.update({
        "user_id": str(user["_id"]),
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
    pls = await db.playlists.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(200)
    for p in pls:
        p["id"] = str(p.pop("_id"))
    return pls


@api_router.post("/playlists")
async def create_playlist(data: PlaylistCreate, user: dict = Depends(get_current_user)):
    doc = {
        "user_id": str(user["_id"]),
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
    await db.playlists.delete_one({"_id": ObjectId(pid), "user_id": str(user["_id"])})
    return {"ok": True}


@api_router.post("/playlists/{pid}/toggle")
async def toggle_playlist_item(pid: str, data: ItemRef, user: dict = Depends(get_current_user)):
    pl = await db.playlists.find_one({"_id": ObjectId(pid), "user_id": str(user["_id"])})
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
    if not user.get("plus"):
        raise HTTPException(status_code=403, detail="Descărcarea este disponibilă doar pentru membrii Cartoonix PLUS")
    show = await db.shows.find_one({"_id": ObjectId(show_id)})
    if not show:
        raise HTTPException(status_code=404, detail="Desen inexistent")
    ep = next((e for e in show.get("episodes", []) if e["number"] == episode_number), None)
    if not ep:
        raise HTTPException(status_code=404, detail="Episod inexistent")
    return {"url": ep["video_url"], "filename": f"{show['title']} - Ep{episode_number}.mp4"}


# ---------- notifications ----------
@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find({}).sort("created_at", -1).to_list(100)
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
    text: str = Field(min_length=1, max_length=500)
    room: str = "global"


@api_router.get("/chat")
async def get_chat(room: str = "global", after: Optional[str] = None, user: dict = Depends(get_current_user)):
    if room not in ("global", "plus"):
        room = "global"
    if room == "plus" and not user.get("plus"):
        raise HTTPException(status_code=403, detail="Camera PLUS este doar pentru membrii Cartoonix PLUS")
    query = {"room": room}
    if after:
        query["created_at"] = {"$gt": after}
        msgs = await db.chat_messages.find(query).sort("created_at", 1).limit(200).to_list(200)
    else:
        msgs = await db.chat_messages.find(query).sort("created_at", -1).limit(60).to_list(60)
        msgs.reverse()
    for m in msgs:
        m["id"] = str(m.pop("_id"))
    return msgs


@api_router.post("/chat")
async def post_chat(data: ChatInput, user: dict = Depends(get_current_user)):
    room = data.room if data.room in ("global", "plus") else "global"
    if room == "plus" and not user.get("plus"):
        raise HTTPException(status_code=403, detail="Camera PLUS este doar pentru membrii Cartoonix PLUS")
    doc = {
        "user_id": str(user["_id"]),
        "name": user.get("name", "Anonim"),
        "avatar": user.get("avatar", ""),
        "plus": bool(user.get("plus", False)),
        "room": room,
        "text": data.text.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.chat_messages.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


# ---------- suggestions ----------
class SuggestionInput(BaseModel):
    text: str = Field(min_length=3, max_length=1000)


async def _last_suggestion(user_id: str):
    return await db.suggestions.find_one({"user_id": user_id}, sort=[("created_at", -1)])


@api_router.get("/suggestions/can")
async def can_suggest(user: dict = Depends(get_current_user)):
    last = await _last_suggestion(str(user["_id"]))
    if not last:
        return {"can": True, "next_at": None}
    last_dt = datetime.fromisoformat(last["created_at"])
    next_dt = last_dt + timedelta(hours=24)
    now = datetime.now(timezone.utc)
    return {"can": now >= next_dt, "next_at": next_dt.isoformat()}


@api_router.post("/suggestions")
async def create_suggestion(data: SuggestionInput, user: dict = Depends(get_current_user)):
    last = await _last_suggestion(str(user["_id"]))
    if last:
        last_dt = datetime.fromisoformat(last["created_at"])
        if datetime.now(timezone.utc) < last_dt + timedelta(hours=24):
            raise HTTPException(status_code=429, detail="Poți trimite o singură sugestie la 24 de ore. Revino mai târziu!")
    doc = {
        "user_id": str(user["_id"]),
        "name": user.get("name", ""),
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
async def admin_list_users(q: Optional[str] = None, admin: dict = Depends(require_admin)):
    query = {}
    if q:
        query = {"$or": [
            {"email": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}},
        ]}
    users = await db.users.find(query).sort("created_at", -1).to_list(1000)
    return [serialize_user(u) for u in users]


@api_router.put("/admin/users/{uid}")
async def admin_update_user(uid: str, data: AdminUserUpdate, admin: dict = Depends(require_admin)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if "email" in updates:
        updates["email"] = updates["email"].lower()
        clash = await db.users.find_one({"email": updates["email"], "_id": {"$ne": ObjectId(uid)}})
        if clash:
            raise HTTPException(status_code=400, detail="Email deja folosit de alt cont")
    if updates:
        await db.users.update_one({"_id": ObjectId(uid)}, {"$set": updates})
    user = await db.users.find_one({"_id": ObjectId(uid)})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    return serialize_user(user)


@api_router.put("/admin/users/{uid}/password")
async def admin_reset_password(uid: str, data: PasswordReset, admin: dict = Depends(require_admin)):
    await db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"password_hash": hash_password(data.password)}})
    return {"ok": True}


@api_router.delete("/admin/users/{uid}")
async def admin_delete_user(uid: str, admin: dict = Depends(require_admin)):
    if str(admin["_id"]) == uid:
        raise HTTPException(status_code=400, detail="Nu te poți șterge pe tine")
    await db.users.delete_one({"_id": ObjectId(uid)})
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
        "user_id": str(user["_id"]),
        "key": key,
        "show_id": data.show_id,
        "episode_number": data.episode_number,
        "position": data.position,
        "duration": data.duration,
        "completed": data.completed,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.watch_progress.update_one(
        {"user_id": str(user["_id"]), "key": key},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True}


@api_router.get("/progress/{show_id}")
async def get_show_progress(show_id: str, user: dict = Depends(get_current_user)):
    rows = await db.watch_progress.find({"user_id": str(user["_id"]), "show_id": show_id}).to_list(500)
    result = {}
    for r in rows:
        result[str(r["episode_number"])] = {
            "position": r.get("position", 0),
            "duration": r.get("duration", 0),
            "completed": r.get("completed", False),
        }
    return result


# ---------- presence & time tracking ----------
@api_router.post("/presence")
async def heartbeat(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    add = 0
    last = user.get("last_seen")
    if last:
        try:
            delta = (now - datetime.fromisoformat(last)).total_seconds()
            if 0 < delta <= 90:
                add = int(delta)
        except Exception:
            add = 0
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_seen": now.isoformat()}, "$inc": {"total_time_seconds": add}},
    )
    return {"ok": True}


@api_router.get("/presence/online")
async def online_count():
    threshold = (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()
    count = await db.users.count_documents({"last_seen": {"$gte": threshold}})
    return {"online": count}


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


@api_router.get("/")
async def root():
    return {"message": "Cartoonix API"}


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
    await db.users.create_index("email", unique=True)
    # seed admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "avatar": "https://api.dicebear.com/9.x/bottts/svg?seed=Admin",
            "role": "admin",
            "plus": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
    # seed test user
    test_email = "test@cartoonix.ro"
    if await db.users.find_one({"email": test_email}) is None:
        await db.users.insert_one({
            "email": test_email,
            "password_hash": hash_password("test1234"),
            "name": "Cont Test",
            "avatar": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Ziggy",
            "role": "user",
            "plus": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
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
