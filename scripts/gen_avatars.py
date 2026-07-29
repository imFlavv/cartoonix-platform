import asyncio
import os
import base64
import sys
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
API_KEY = os.getenv("EMERGENT_LLM_KEY")
OUT = Path("/app/frontend/public/avatars")
OUT.mkdir(parents=True, exist_ok=True)

STYLE = (
    "Flat modern children's cartoon avatar illustration, single character, head and "
    "shoulders, centered, bold clean outlines, bright saturated colors, simple solid "
    "background, friendly and cute, mascot style, square 1:1, no text, no watermark, "
    "high quality vector-like shading. Character: "
)

CHARACTERS = [
    ("boy", "a cheerful boy explorer with brown hair and a backpack, warm orange background"),
    ("girl", "a happy girl with pink pigtails and a colorful shirt, teal background"),
    ("ninja", "a cute ninja kid in dark outfit with mask, deep yellow/gold background"),
    ("astronaut", "a smiling kid astronaut in a white space suit helmet, blue background"),
    ("robot", "a friendly boxy retro robot with a smiling screen face, green background"),
    ("cat", "an orange tabby cat with a little bow tie, purple background"),
    ("dog", "a cool brown dog wearing a cap and sunglasses, yellow background"),
    ("wizard", "a young wizard boy with a starry pointed hat and magic wand, magenta background"),
    ("alien", "a cute friendly green alien with big eyes, teal background"),
    ("pirate", "a brave pirate boy with a red bandana and eye patch, dark teal background"),
    ("knight", "a kid knight in shiny armor with a small shield, slate gray background"),
    ("dino", "an adorable green baby dinosaur smiling, warm yellow background"),
    ("fox", "a clever fox explorer wearing a safari hat, olive green background"),
    ("monkey", "a playful monkey wearing headphones, pink background"),
]


async def gen_one(name: str, desc: str, idx: int):
    chat = LlmChat(api_key=API_KEY, session_id=f"avatar-{name}-{idx}", system_message="You are an expert cartoon illustrator.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    msg = UserMessage(text=STYLE + desc)
    _, images = await chat.send_message_multimodal_response(msg)
    if images:
        img = images[0]
        data = base64.b64decode(img["data"])
        path = OUT / f"{name}.png"
        with open(path, "wb") as f:
            f.write(data)
        print(f"[OK] {idx+1}/{len(CHARACTERS)} saved {path.name} ({len(data)} bytes)", flush=True)
        return True
    print(f"[FAIL] {idx+1}/{len(CHARACTERS)} no image for {name}", flush=True)
    return False


async def main():
    ok = 0
    for idx, (name, desc) in enumerate(CHARACTERS):
        for attempt in range(2):
            try:
                if await gen_one(name, desc, idx):
                    ok += 1
                    break
            except Exception as e:
                print(f"[ERR] {name} attempt {attempt+1}: {e}", flush=True)
                await asyncio.sleep(2)
    print(f"DONE {ok}/{len(CHARACTERS)}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
