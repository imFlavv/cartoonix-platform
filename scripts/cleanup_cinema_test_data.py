import asyncio, os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")


async def main():
    cl = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = cl[os.environ["DB_NAME"]]
    r1 = await db.cinema_chat.delete_many({"text": {"$regex": "^TEST_"}})
    r2 = await db.cinema_tickets.delete_many({})
    r3 = await db.cinema_seats.delete_many({})
    print("chat removed", r1.deleted_count, "tickets removed", r2.deleted_count, "seats removed", r3.deleted_count)


asyncio.run(main())
