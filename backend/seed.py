"""Seed the 3 fixed categories on startup."""
from datetime import datetime, timezone

CATEGORIES = [
    {
        "id": "cat-jetix",
        "slug": "jetix-foxkids",
        "name": "JETIX & Fox Kids",
        "description": "Action-packed classics from the JETIX & Fox Kids universe.",
        "accent_color": "#FF5A2A",
        "logo_text": "JETIX",
        "order": 1,
    },
    {
        "id": "cat-cn",
        "slug": "cartoon-network",
        "name": "Cartoon Network",
        "description": "The bold, the weird, and the unforgettable from Cartoon Network.",
        "accent_color": "#FFD84A",
        "logo_text": "CN",
        "order": 2,
    },
    {
        "id": "cat-minimax",
        "slug": "minimax",
        "name": "Minimax",
        "description": "Warm, magical and colorful stories from Minimax.",
        "accent_color": "#F05AA6",
        "logo_text": "MINIMAX",
        "order": 3,
    },
]


async def seed_categories(db):
    for cat in CATEGORIES:
        await db.categories.update_one(
            {"id": cat["id"]},
            {"$set": cat},
            upsert=True,
        )


async def seed_avatars(db, manifest_path):
    import json
    from pathlib import Path
    p = Path(manifest_path)
    if not p.exists():
        return
    try:
        avatars = json.loads(p.read_text())
    except Exception:
        return
    await db.avatars.delete_many({})
    if avatars:
        # Add absolute index for reproducibility
        for i, a in enumerate(avatars):
            a.setdefault("order", i)
        await db.avatars.insert_many(avatars)
