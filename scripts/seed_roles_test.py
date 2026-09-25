"""Idempotent seed for role/rank/favorites testing (Cartoonix)."""
import asyncio
import os
import uuid
from datetime import datetime, timezone

import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "cartoonix")


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


ACCOUNTS = [
    {"email": "admin@cartoonix.ro", "password": "admin1234", "name": "Admin", "role": "admin", "subscription": "plus", "points": 0},
    {"email": "mod@cartoonix.ro", "password": "mod1234", "name": "Moderator Test", "role": "moderator", "subscription": "free", "points": 0},
    {"email": "founder@cartoonix.ro", "password": "founder1234", "name": "Fondator", "role": "founder", "subscription": "free", "points": 0},
    {"email": "donor@cartoonix.ro", "password": "donor1234", "name": "Donator Test", "role": "user", "subscription": "free", "points": 150},
    {"email": "test@cartoonix.ro", "password": "test1234", "name": "Cont Test", "role": "user", "subscription": "free", "points": 0},
]


async def main():
    c = AsyncIOMotorClient(MONGO_URL)
    db = c[DB_NAME]
    now = datetime.now(timezone.utc).isoformat()
    ids = {}
    for a in ACCOUNTS:
        existing = await db.users.find_one({"email": a["email"]})
        uid = (existing.get("id") if existing else None) or str(uuid.uuid4())
        ids[a["email"]] = uid
        doc = {
            "id": uid,
            "email": a["email"],
            "password_hash": hash_password(a["password"]),
            "nickname": a["name"],
            "avatar_url": "",
            "role": a["role"],
            "subscription": a["subscription"],
            "points": a["points"],
            "email_verified": True,
            "banned": False,
            "muted_until": None,
            "spins": 1,
            "created_at": (existing.get("created_at") if existing else now) or now,
            "last_active": now,
        }
        await db.users.update_one({"email": a["email"]}, {"$set": doc}, upsert=True)
        print("seeded", a["email"], "role=", a["role"])

    # Orphan favorite for test user (show that no longer exists on server)
    test_uid = ids["test@cartoonix.ro"]
    orphan_key = "orphan-old-vps-show:0"
    await db.favorites.update_one(
        {"user_id": test_uid, "key": orphan_key},
        {"$set": {
            "user_id": test_uid,
            "key": orphan_key,
            "show_id": "orphan-old-vps-show",
            "episode_number": 0,
            "show_title": "Desen vechi (de pe VPS-ul vechi)",
            "episode_title": "",
            "thumbnail": "",
            "channel": "Arhiva",
            "added_at": now,
        }},
        upsert=True,
    )
    print("seeded orphan favorite for test user")
    print("users total:", await db.users.count_documents({}))


if __name__ == "__main__":
    asyncio.run(main())
