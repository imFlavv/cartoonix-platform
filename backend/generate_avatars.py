"""
Generates 15 cartoon-style avatars using Gemini Nano Banana and stores
them in /app/backend/uploads/avatars/. Outputs a JSON manifest at
/app/backend/seed_data/avatars.json with file paths and URLs.
"""
import asyncio
import base64
import json
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

OUT_DIR = ROOT / "uploads" / "avatars"
OUT_DIR.mkdir(parents=True, exist_ok=True)
SEED_DIR = ROOT / "seed_data"
SEED_DIR.mkdir(exist_ok=True)
MANIFEST_PATH = SEED_DIR / "avatars.json"

API_KEY = os.getenv("EMERGENT_LLM_KEY")

# 15 prompts covering varied styles for nostalgic cartoon avatars
PROMPTS = [
    ("hero_boy", "A fun cartoon-style avatar portrait of a cheerful adventurous boy with messy brown hair, big smile, retro 90s Saturday morning cartoon aesthetic, bold clean lines, vibrant flat colors, head and shoulders, centered on a vibrant flat orange background, square 1:1, friendly, polished, suitable for user profile avatar."),
    ("hero_girl", "A fun cartoon-style avatar portrait of a cheerful confident girl with pink pigtails and bright eyes, 90s cartoon style, bold clean line art, vibrant flat colors, head and shoulders, centered on a flat teal background, square 1:1, friendly smile, polished, suitable for user profile avatar."),
    ("ninja", "A fun cartoon-style avatar of a cute cartoon ninja character with mask and eye patch showing only smiling eyes, retro animation style, bold clean lines, vibrant flat colors, head and shoulders, centered on a flat red background, square 1:1, polished avatar."),
    ("space_kid", "A cute cartoon astronaut kid in a tiny helmet with stars reflected in the visor, smiling, retro 90s cartoon style, bold clean lines, vibrant flat colors, head and shoulders, centered on a flat deep blue background with two small stars, square 1:1, polished avatar."),
    ("robot", "A cute cartoon retro robot avatar with rectangular head, antenna with a tiny heart, smiling LED face, 90s cartoon style, bold lines, vibrant flat colors, head and shoulders, centered on a flat lime green background, square 1:1, polished avatar."),
    ("cat_hero", "A fun cartoon orange tabby cat superhero avatar with a tiny cape and goggles, smiling, retro 90s cartoon style, bold clean lines, vibrant flat colors, head and shoulders, centered on a flat purple background (solid, not gradient), square 1:1, polished avatar."),
    ("dog_skater", "A cute cartoon brown dog with backwards cap and sunglasses, tongue out, retro 90s cartoon style, bold lines, vibrant flat colors, head and shoulders, centered on a flat yellow background, square 1:1, polished avatar."),
    ("wizard_kid", "A cute cartoon wizard kid with pointy hat decorated with stars, holding a tiny wand, smiling, retro 90s cartoon aesthetic, bold lines, vibrant flat colors, head and shoulders, centered on a flat magenta background (solid), square 1:1, polished avatar."),
    ("alien_friendly", "A cute friendly cartoon green alien with two antennae and three smiling eyes, retro Saturday morning cartoon style, bold clean lines, vibrant flat colors, head and shoulders, centered on a flat aqua background, square 1:1, polished avatar."),
    ("pirate_kid", "A cute cartoon kid pirate with red bandana and eye patch, smiling, retro 90s cartoon style, bold lines, vibrant flat colors, head and shoulders, centered on a flat dark teal background, square 1:1, polished avatar."),
    ("knight_kid", "A cute cartoon kid knight in light armor with tiny sword tip visible, smiling, retro 90s cartoon style, bold lines, vibrant flat colors, head and shoulders, centered on a flat indigo background (solid), square 1:1, polished avatar."),
    ("dino_friend", "A cute cartoon baby green dinosaur with big friendly eyes and tiny spikes, smiling, retro 90s cartoon style, bold lines, vibrant flat colors, head and shoulders, centered on a flat sunny orange background, square 1:1, polished avatar."),
    ("fox_explorer", "A cute cartoon orange fox with explorer hat and binoculars on neck strap, smiling, retro 90s cartoon style, bold lines, vibrant flat colors, head and shoulders, centered on a flat olive green background, square 1:1, polished avatar."),
    ("monkey_dj", "A fun cartoon monkey wearing headphones, smiling, retro 90s cartoon style, bold lines, vibrant flat colors, head and shoulders, centered on a flat hot pink background (solid), square 1:1, polished avatar."),
    ("panda_chef", "A cute cartoon panda wearing a tiny chef hat, smiling, retro 90s cartoon style, bold clean lines, vibrant flat colors, head and shoulders, centered on a flat warm red background, square 1:1, polished avatar."),
]


async def generate_one(slug, prompt):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"avatar-{slug}",
        system_message="You generate vibrant, friendly cartoon avatars in classic Saturday-morning style.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    msg = UserMessage(text=prompt)
    _, images = await chat.send_message_multimodal_response(msg)
    if not images:
        return None
    img = images[0]
    mime = img.get("mime_type", "image/png")
    ext = "jpg" if "jpeg" in mime or "jpg" in mime else "png"
    data = img["data"]
    try:
        image_bytes = base64.b64decode(data)
    except Exception:
        image_bytes = data if isinstance(data, (bytes, bytearray)) else str(data).encode()
    out_path = OUT_DIR / f"{slug}.{ext}"
    with open(out_path, "wb") as f:
        f.write(image_bytes)
    return {"slug": slug, "filename": f"{slug}.{ext}", "url": f"/uploads/avatars/{slug}.{ext}", "size": len(image_bytes)}


async def main():
    results = []
    for slug, prompt in PROMPTS:
        existing = list(OUT_DIR.glob(f"{slug}.*"))
        if existing:
            fp = existing[0]
            results.append({"slug": slug, "filename": fp.name, "url": f"/uploads/avatars/{fp.name}", "size": fp.stat().st_size})
            print(f"  [skip] {slug} already exists -> {fp.name}")
            continue
        print(f"  [gen ] {slug} ...", flush=True)
        try:
            r = await generate_one(slug, prompt)
            if r:
                results.append(r)
                print(f"         saved {r['filename']} ({r['size']} bytes)")
            else:
                print(f"         FAILED no images for {slug}")
        except Exception as e:
            print(f"         FAILED {slug}: {e}")
    with open(MANIFEST_PATH, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nManifest written: {MANIFEST_PATH} ({len(results)} avatars)")


if __name__ == "__main__":
    asyncio.run(main())
