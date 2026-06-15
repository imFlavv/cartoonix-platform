"""Pydantic models for Cartoonix."""
from datetime import datetime, timezone
from typing import List, Optional, Literal
import uuid
from pydantic import BaseModel, EmailStr, Field, ConfigDict


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


# ============ USER ============
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nickname: str
    email: EmailStr
    avatar_url: str
    role: Literal["user", "admin"] = "user"
    subscription: Literal["free", "plus"] = "free"
    level: int = 1  # gamification level 1-10 (badge)
    email_verified: bool = False
    created_at: datetime
    presence_seconds: int = 0  # cumulative time spent online (for profile "Timp Online")


class UserCreate(BaseModel):
    nickname: str = Field(min_length=2, max_length=32)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    avatar_url: str
    subscription: Literal["free", "plus"] = "free"
    accepted_terms: bool


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class ResendCodeRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class UpdateUserRequest(BaseModel):
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    subscription: Optional[Literal["free", "plus"]] = None


# ============ CATEGORY ============
class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    slug: str
    name: str
    description: str
    accent_color: str  # hex
    logo_text: str  # Used for stylized SVG logos
    order: int = 0


# ============ CARTOON ============
class CartoonCreate(BaseModel):
    title: str
    description: str = ""
    year: Optional[int] = None
    category_id: str
    thumbnail_url: str = ""
    genres: List[str] = []


class CartoonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    year: Optional[int] = None
    category_id: Optional[str] = None
    thumbnail_url: Optional[str] = None
    genres: Optional[List[str]] = None


class Cartoon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str = ""
    year: Optional[int] = None
    category_id: str
    thumbnail_url: str = ""
    genres: List[str] = []
    episode_count: int = 0
    created_at: datetime
    updated_at: datetime


# ============ EPISODE ============
class EpisodeCreate(BaseModel):
    cartoon_id: str
    title: str
    season: int = 1
    episode_number: int = 1
    description: str = ""
    duration_seconds: int = 0
    video_url: str  # either absolute external url or relative /uploads/...
    source_type: Literal["upload", "external"] = "external"
    thumbnail_url: str = ""


class EpisodeUpdate(BaseModel):
    title: Optional[str] = None
    season: Optional[int] = None
    episode_number: Optional[int] = None
    description: Optional[str] = None
    duration_seconds: Optional[int] = None
    video_url: Optional[str] = None
    source_type: Optional[Literal["upload", "external"]] = None
    thumbnail_url: Optional[str] = None


class Episode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    cartoon_id: str
    title: str
    season: int = 1
    episode_number: int = 1
    description: str = ""
    duration_seconds: int = 0
    video_url: str
    source_type: Literal["upload", "external"] = "external"
    thumbnail_url: str = ""
    created_at: datetime


# ============ PLAYLIST ============
class PlaylistCreate(BaseModel):
    name: str
    description: str = ""


class PlaylistItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    cartoon_id: str
    episode_id: str


class Playlist(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    description: str = ""
    cartoon_ids: List[str] = []  # legacy — kept for backwards compat
    items: List[PlaylistItem] = []  # ordered list of episodes
    created_at: datetime


class PlaylistAddItem(BaseModel):
    cartoon_id: str


class PlaylistAddEpisode(BaseModel):
    cartoon_id: str
    episode_id: str


class PlaylistReorder(BaseModel):
    episode_ids: List[str]


# ============ WATCH HISTORY ============
class WatchHistoryEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    cartoon_id: str
    episode_id: str
    watched_at: datetime
    progress_seconds: int = 0


class RecordWatch(BaseModel):
    cartoon_id: str
    episode_id: str
    progress_seconds: int = 0


# ============ FAVORITE ============
class FavoriteToggle(BaseModel):
    cartoon_id: str


# ============ AVATAR ============
class AvatarOption(BaseModel):
    slug: str
    url: str
    label: Optional[str] = None
    tier: Optional[str] = None  # "free" (default) | "plus"
    animated: Optional[bool] = False
