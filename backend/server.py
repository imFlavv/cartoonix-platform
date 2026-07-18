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
        "created_at": doc.get("created_at"),
    }


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="Nu ești autentificat")
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utilizator inexistent")
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


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class AvatarInput(BaseModel):
    avatar: str


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
async def register(data: RegisterInput):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Acest email este deja folosit")
    doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "avatar": data.avatar or "",
        "role": "user",
        "plus": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = create_access_token(str(res.inserted_id), email)
    return {"token": token, "user": serialize_user(doc)}


@api_router.post("/auth/login")
async def login(data: LoginInput):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email sau parolă incorectă")
    token = create_access_token(str(user["_id"]), email)
    return {"token": token, "user": serialize_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


@api_router.put("/auth/avatar")
async def update_avatar(data: AvatarInput, user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"avatar": data.avatar}})
    user["avatar"] = data.avatar
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
    return [serialize_show(s) for s in shows]


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
    logger.info("Cartoonix startup complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
