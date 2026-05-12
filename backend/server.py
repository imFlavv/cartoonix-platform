"""Cartoonix main FastAPI app."""
import logging
import os
import random
import shutil
import string
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import (APIRouter, Depends, FastAPI, File, Form, HTTPException,
                     UploadFile, status)
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
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
from email_service import send_verification_email  # noqa: E402
from models import (AvatarOption, Cartoon, CartoonCreate, CartoonUpdate,  # noqa: E402
                    Category, Episode, EpisodeCreate, EpisodeUpdate,
                    FavoriteToggle, Playlist, PlaylistAddItem, PlaylistCreate,
                    RecordWatch, ResendCodeRequest, TokenResponse,
                    UpdateUserRequest, UserCreate, UserLogin, UserPublic,
                    VerifyEmailRequest, new_id, now_utc)
from seed import seed_avatars, seed_categories  # noqa: E402


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
    await db.watch_history.create_index("user_id")
    await db.favorites.create_index("user_id")
    await db.playlists.create_index("user_id")
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
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(payload: UserCreate):
    if not payload.accepted_terms:
        raise HTTPException(status_code=400, detail="You must accept the Terms & Conditions")
    # Check uniqueness
    if await db.users.find_one({"email": payload.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"nickname": payload.nickname}):
        raise HTTPException(status_code=400, detail="Nickname already taken")

    # First user -> admin
    total = await db.users.count_documents({})
    role = "admin" if total == 0 else "user"

    user_id = new_id()
    user_doc = {
        "id": user_id,
        "nickname": payload.nickname,
        "email": payload.email.lower(),
        "avatar_url": payload.avatar_url,
        "role": role,
        "subscription": payload.subscription,
        "email_verified": False,
        "password_hash": hash_password(payload.password),
        "created_at": now_utc().isoformat(),
        "accepted_terms_at": now_utc().isoformat(),
    }
    await db.users.insert_one(user_doc)

    # Generate verification code & send email
    code = gen_code()
    await db.verification_codes.delete_many({"email": payload.email.lower()})
    await db.verification_codes.insert_one({
        "email": payload.email.lower(),
        "code": code,
        "created_at": now_utc().isoformat(),
        "expires_at": now_utc() + timedelta(minutes=15),
        "attempts": 0,
        "used": False,
    })
    sent = send_verification_email(payload.email, payload.nickname, code)
    if not sent:
        logger.warning(f"Verification email failed to send for {payload.email}")

    # Return JWT immediately so frontend can call verify endpoint (but mark unverified)
    token = create_access_token(user_id, role)
    user_public = serialize_user(user_doc)
    # Convert created_at to datetime for response
    user_public["created_at"] = user_doc["created_at"]
    return TokenResponse(access_token=token, user=UserPublic(**user_public))


@api_router.post("/auth/verify-email")
async def verify_email(payload: VerifyEmailRequest):
    email = payload.email.lower()
    code_doc = await db.verification_codes.find_one(
        {"email": email, "used": False},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if not code_doc:
        raise HTTPException(status_code=404, detail="No verification code found. Please request a new one.")

    # Check expiry
    expires_at = code_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Verification code expired. Please request a new one.")

    attempts = int(code_doc.get("attempts", 0))
    if attempts >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new code.")

    if code_doc["code"] != payload.code:
        await db.verification_codes.update_one(
            {"email": email, "used": False},
            {"$inc": {"attempts": 1}},
        )
        raise HTTPException(status_code=401, detail="Invalid verification code")

    # Mark as used & verify user
    await db.verification_codes.update_one(
        {"email": email, "used": False},
        {"$set": {"used": True, "verified_at": now_utc().isoformat()}},
    )
    await db.users.update_one({"email": email}, {"$set": {"email_verified": True}})
    user = await db.users.find_one({"email": email}, {"_id": 0})
    return {"success": True, "user": serialize_user(user)}


@api_router.post("/auth/resend-code")
async def resend_code(payload: ResendCodeRequest):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("email_verified"):
        return {"success": True, "message": "Email already verified"}

    # Throttle: limit one code per 30s
    last = await db.verification_codes.find_one({"email": email}, sort=[("created_at", -1)])
    if last:
        created_at = last.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if (datetime.now(timezone.utc) - created_at).total_seconds() < 30:
            raise HTTPException(status_code=429, detail="Please wait before requesting another code.")

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


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user.get("role", "user"))
    return TokenResponse(access_token=token, user=UserPublic(**serialize_user(user)))


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user=Depends(get_current_user)):
    return UserPublic(**serialize_user(user))


@api_router.patch("/auth/me", response_model=UserPublic)
async def update_me(payload: UpdateUserRequest, user=Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if "nickname" in update and update["nickname"] != user.get("nickname"):
        if await db.users.find_one({"nickname": update["nickname"]}):
            raise HTTPException(status_code=400, detail="Nickname already taken")
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
async def admin_list_users(user=Depends(require_admin)):
    items = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return items


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
        raise HTTPException(status_code=403, detail="Playlists are a Cartoonix Plus feature")


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
