"""Quick test user/admin setup for chat testing.

Creates:
  - test_admin@cartoonix.ro / TestAdmin#2026 (role=admin, plan=free)
  - test_plus@cartoonix.ro  / TestPlus#2026  (role=user,  plan=plus)
  - test_free@cartoonix.ro  / TestFree#2026  (role=user,  plan=free, account_age=10 days)
  - test_new@cartoonix.ro   / TestNew#2026   (role=user,  plan=free, account_age=now)
All marked email_verified=True.
"""
import asyncio
import os
import sys
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
    },
    {
        "email": "test_plus@cartoonix.ro",
        "password": "TestPlus#2026",
        "nickname": "PlusUser",
        "role": "user",
        "subscription": "plus",
        "age_days": 30,
    },
    {
        "email": "test_free@cartoonix.ro",
        "password": "TestFree#2026",
        "nickname": "FreeUser",
        "role": "user",
        "subscription": "free",
        "age_days": 10,
    },
    {
        "email": "test_new@cartoonix.ro",
        "password": "TestNew#2026",
        "nickname": "NewUser",
        "role": "user",
        "subscription": "free",
        "age_days": 0,
    },
]


async def main():
    mongo = os.environ["MONGO_URL"]
    db_name = os.environ.get("DB_NAME", "cartoonix")
    client = AsyncIOMotorClient(mongo)
    db = client[db_name]
    import uuid

    for u in USERS:
        existing = await db.users.find_one({"email": u["email"]})
        now = datetime.now(timezone.utc)
        created_at = now - timedelta(days=u["age_days"])
        doc = {
            "email": u["email"],
            "nickname": u["nickname"],
            "password_hash": pwd.hash(u["password"]),
            "role": u["role"],
            "subscription": u["subscription"],
            "email_verified": True,
            "avatar_url": "/uploads/avatars/avatar-tom.png",
            "created_at": created_at,
        }
        if existing:
            await db.users.update_one(
                {"email": u["email"]},
                {"$set": doc},
            )
            print(f"Updated {u['email']} ({u['role']}, {u['subscription']}, age={u['age_days']}d)")
        else:
            doc["id"] = str(uuid.uuid4())
            await db.users.insert_one(doc)
            print(f"Created {u['email']} ({u['role']}, {u['subscription']}, age={u['age_days']}d)")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
