"""Seed demo products for the Cartoonix Shop (idempotent)."""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

PRODUCTS = [
    {
        "name": "Figurină Robotix 3D",
        "description": "Figurină de colecție printată 3D în PLA premium, inspirată din desenele retro Cartoonix. Finisaj lucios portocaliu-gri, înălțime 15 cm. Fiecare piesă este printată și asamblată manual.",
        "price": 89.99,
        "images": ["/api/uploads/shop/robot.png"],
        "category": "Figurine 3D",
        "stock_enabled": True,
        "stock": 15,
        "badge": "Bestseller",
    },
    {
        "name": "Dragon Articulat 3D",
        "description": "Dragon flexibil printat 3D dintr-o singură bucată, complet articulat, cu filament gradient teal-mov. Lungime 40 cm. Perfect pentru birou sau colecție.",
        "price": 119.99,
        "images": ["/api/uploads/shop/dragon.png"],
        "category": "Figurine 3D",
        "stock_enabled": True,
        "stock": 8,
        "badge": None,
    },
    {
        "name": "Set Brelocuri Cartoonix",
        "description": "Set de 4 brelocuri printate 3D: televizorul retro Cartoonix și 3 steluțe colorate. Plastic PLA rezistent, inele metalice incluse.",
        "price": 34.99,
        "images": ["/api/uploads/shop/keychain.png"],
        "category": "Accesorii",
        "stock_enabled": False,
        "stock": 0,
        "badge": None,
    },
    {
        "name": "Cană Cartoonix Retro TV",
        "description": "Cană ceramică neagră de 330 ml cu print rezistent Cartoonix Retro TV în nuanțe amber. Se poate spăla în mașina de vase.",
        "price": 49.99,
        "images": ["/api/uploads/shop/mug.png"],
        "category": "Accesorii",
        "stock_enabled": True,
        "stock": 25,
        "badge": None,
    },
    {
        "name": "Tricou Retro 90s Cartoonix",
        "description": "Tricou negru din bumbac 100% cu grafică vibrantă retro anilor '90. Print DTG de calitate premium. Mărimi disponibile la cerere (menționează în notele comenzii).",
        "price": 79.99,
        "images": ["/api/uploads/shop/tshirt.png"],
        "category": "Îmbrăcăminte",
        "stock_enabled": True,
        "stock": 12,
        "badge": None,
    },
    {
        "name": "Lampă LED Lună 3D",
        "description": "Lampă de veghe printată 3D cu textură hexagonală și LED cald amber. Alimentare USB, întrerupător tactil. Diametru 14 cm.",
        "price": 149.99,
        "images": ["/api/uploads/shop/lamp.png"],
        "category": "Decorațiuni",
        "stock_enabled": True,
        "stock": 5,
        "badge": "Nou",
    },
]


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc).isoformat()
    created = 0
    for p in PRODUCTS:
        existing = await db.shop_products.find_one({"name": p["name"]})
        if existing:
            continue
        await db.shop_products.insert_one({
            "id": str(uuid.uuid4()),
            **p,
            "active": True,
            "rating_avg": 0,
            "rating_count": 0,
            "created_at": now,
            "updated_at": now,
        })
        created += 1
    print(f"Seeded {created} shop products.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
