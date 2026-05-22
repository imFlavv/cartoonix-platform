"""Quick test user/admin setup for chat testing.

Creates:
  - test_admin@cartoonix.ro / TestAdmin#2026 (role=admin, plan=free)
  - test_plus@cartoonix.ro  / TestPlus#2026  (role=user,  plan=plus)
  - test_free@cartoonix.ro  / TestFree#2026  (role=user,  plan=free, account_age=10 days)
  - test_new@cartoonix.ro   / TestNew#2026   (role=user,  plan=free, account_age=now)
All marked email_verified=True.

Avatars are picked dynamically from the seeded avatar list in the DB so we
never reference a non-existent file.
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta

sys.path.insert(0, "/app/backend")

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

USERS = [
    {
        "email": "test_admin@cartoonix.ro",
        "password": "TestAdmin#2026",
        "nickname": "ChatAdmin",
        "role": "admin",
        "subscription": "free",
        "age_days": 365,
        "avatar_slug": "wizard_kid",
    },
    {
        "email": "test_plus@cartoonix.ro",
        "password": "TestPlus#2026",
        "nickname": "PlusUser",
        "role": "user",
        "subscription": "plus",
        "age_days": 30,
        "avatar_slug": "hero_girl",
    },
    {
        "email": "test_free@cartoonix.ro",
        "password": "TestFree#2026",
        "nickname": "FreeUser",
        "role": "user",
        "subscription": "free",
        "age_days": 10,
        "avatar_slug": "hero_boy",
    },
    {
        "email": "test_new@cartoonix.ro",
        "password": "TestNew#2026",
        "nickname": "NewUser",
        "role": "user",
        "subscription": "free",
        "age_days": 0,
        "avatar_slug": "ninja",
    },
]


async def main():
    mongo = os.environ["MONGO_URL"]
    db_name = os.environ.get("DB_NAME", "cartoonix")
    client = AsyncIOMotorClient(mongo)
    db = client[db_name]

    # Load avatars from DB and build slug→url map (with fallback to the first).
    avs = await db.avatars.find({}, {"_id": 0, "slug": 1, "url": 1}).to_list(100)
    if not avs:
        raise RuntimeError("No avatars seeded. Start backend at least once first.")
    by_slug = {a["slug"]: a["url"] for a in avs}
    default_url = avs[0]["url"]

    for u in USERS:
        avatar_url = by_slug.get(u["avatar_slug"], default_url)
        now = datetime.now(timezone.utc)
        created_at = now - timedelta(days=u["age_days"])
        doc = {
            "email": u["email"],
            "nickname": u["nickname"],
            "password_hash": pwd.hash(u["password"]),
            "role": u["role"],
            "subscription": u["subscription"],
            "email_verified": True,
            "avatar_url": avatar_url,
            "created_at": created_at,
        }
        existing = await db.users.find_one({"email": u["email"]})
        if existing:
            await db.users.update_one(
                {"email": u["email"]},
                {"$set": doc},
            )
            action = "Updated"
        else:
            doc["id"] = str(uuid.uuid4())
            await db.users.insert_one(doc)
            action = "Created"
        print(f"{action} {u['email']} ({u['role']}, {u['subscription']}, age={u['age_days']}d) avatar={avatar_url}")

    # Also fix any historical chat_messages produced by these test users so their
    # past messages render with the real avatar.
    test_emails = [u["email"] for u in USERS]
    cursor = db.users.find({"email": {"$in": test_emails}}, {"_id": 0, "id": 1, "avatar_url": 1})
    async for u in cursor:
        await db.chat_messages.update_many(
            {"user_id": u["id"]},
            {"$set": {"avatar_url": u["avatar_url"]}},
        )

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
