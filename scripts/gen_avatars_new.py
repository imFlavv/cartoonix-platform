import asyncio
import os
import base64
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
API_KEY = os.getenv("EMERGENT_LLM_KEY")
OUT_DIR = "/app/frontend/public/avatars"
MODEL = "gemini-3.1-flash-image-preview"

STYLE = (
    "Flat 2D cartoon mascot avatar, thick dark navy outline, clean cel-shaded flat vibrant colors, "
    "friendly big expressive eyes, cute wholesome kids cartoon style. "
    "IMPORTANT FRAMING: head-and-shoulders bust portrait, the FACE must be LARGE and CENTERED in the exact middle of a perfectly square 1:1 frame, "
    "head fully visible with a small even margin above it, shoulders/upper chest at the bottom, character centered horizontally, "
    "no body below the chest, do NOT crop the top of the head, do NOT show the waist. "
    "Plain solid single-color background (no scenery, no text, no border) so it looks great cropped inside a circle."
)

AVATARS = {
    "superhero": "A cheerful kid superhero wearing a colorful eye mask and a small cape, confident happy smile. Solid bright red background.",
    "panda": "A cute happy panda character. Solid mint-teal background.",
    "unicorn": "A cute magical unicorn with a pastel rainbow mane and a small golden horn, sweet smile. Solid lavender-purple background.",
    "dragon": "A cute friendly baby dragon with tiny wings and big round eyes, playful smile. Solid warm orange background.",
    "mermaid": "A cheerful mermaid kid with flowing teal hair and a small seashell accessory, happy smile. Solid ocean-blue background.",
}


async def gen_one(name: str, subject: str):
    prompt = f"{subject} {STYLE}"
    chat = LlmChat(api_key=API_KEY, session_id=f"avatar-{name}", system_message="You are an expert avatar illustrator.")
    chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])
    msg = UserMessage(text=prompt)
    try:
        _, images = await chat.send_message_multimodal_response(msg)
        if images:
            img_bytes = base64.b64decode(images[0]["data"])
            path = os.path.join(OUT_DIR, f"{name}.png")
            with open(path, "wb") as f:
                f.write(img_bytes)
            print(f"OK {name} -> {path} ({len(img_bytes)} bytes)")
        else:
            print(f"FAIL {name}: no image returned")
    except Exception as e:
        print(f"ERROR {name}: {e}")


async def main():
    for name, subj in AVATARS.items():
        await gen_one(name, subj)


if __name__ == "__main__":
    asyncio.run(main())
