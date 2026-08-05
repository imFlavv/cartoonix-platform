"""
Generate the 3 capybara chat bubble assets (left/center/right) via OpenAI gpt-image-1.
Run: python /app/scripts/gen_capybara_bubble.py
"""
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration  # noqa: E402

OUT_DIR = Path("/app/frontend/public/chat/bubbles/capybara")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Base style anchor used in every prompt so all three pieces match perfectly.
STYLE_ANCHOR = (
    "PRODUCTION-READY UI ASSET. Flat 2D vector cartoon illustration, transparent PNG background, no shadows outside the bubble, "
    "no text anywhere. The bubble color is warm cream/beige (#f5d599 to #f7d38e), with a thick dark chocolate brown outline (#5a2c17), "
    "consistent 6px stroke thickness on all edges. Simple flat lighting: a subtle lighter cream highlight along the top inner edge, "
    "no gradient banding, no drop shadows. All three assets share EXACTLY the same height, EXACTLY the same border thickness, "
    "EXACTLY the same colors and lighting. When placed side by side (left + tiled center + right), they must join seamlessly with "
    "zero visible vertical line between them. Style is friendly, chubby, cartoon capybara."
)

PROMPTS = {
    "left.png": (
        f"{STYLE_ANCHOR} "
        "This asset shows the LEFT CAP of a horizontal chat speech bubble. Layout: on the LEFT side there is a cute cartoon capybara HEAD "
        "sticking out of the bubble (round head, small rounded ears, black round eye, small dark nose), facing right, drawn in the same "
        "cream color as the bubble body with the same chocolate outline. On the RIGHT side, the bubble body starts and extends all the "
        "way to the right edge of the image with a PERFECTLY VERTICAL, straight, flat right edge (NO rounding, NO tail, NO curve). "
        "The top and bottom edges of the bubble body are horizontal straight lines with the chocolate outline. The image is a rectangle. "
        "The vertical right edge of the bubble must be flush with the right edge of the image so it can be joined seamlessly with a "
        "tileable center strip. Aspect ratio: roughly 4:3 wide."
    ),
    "center.png": (
        f"{STYLE_ANCHOR} "
        "This asset is the MIDDLE STRIP of a horizontal chat speech bubble. It is a SIMPLE FLAT RECTANGLE with: "
        "top edge = one straight horizontal chocolate outline line, bottom edge = one straight horizontal chocolate outline line, "
        "and cream/beige fill between them. NO rounded corners, NO decorations, NO tail, NO capybara parts, NO gradient variation, "
        "NO text. The LEFT edge and RIGHT edge of the image must be IDENTICAL vertical cross-sections so the strip tiles horizontally "
        "with zero visible seam when repeated (repeat-x). The strip must look infinitely tileable. Aspect ratio: very wide, roughly 4:1."
    ),
    "right.png": (
        f"{STYLE_ANCHOR} "
        "This asset shows the RIGHT CAP of the horizontal chat speech bubble. Layout: on the LEFT side of the image, the bubble body "
        "has a PERFECTLY VERTICAL, straight, flat left edge (flush with the image's left edge) so it can join the tileable center strip "
        "seamlessly. The bubble then curves smoothly into a ROUNDED RIGHT END. Attached to the bottom-right of the rounded cap is a small "
        "cute cartoon capybara TAIL (short stubby oval tail), drawn in the same cream color with the same chocolate outline as the bubble. "
        "The top and bottom edges of the bubble body must be at the SAME vertical positions as in left.png and center.png so the outline "
        "aligns perfectly. Aspect ratio: roughly 3:4 wide."
    ),
}


async def main():
    api_key = os.environ.get("EMERGENT_LLM_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: EMERGENT_LLM_KEY (or OPENAI_API_KEY) missing from /app/backend/.env")
        sys.exit(1)

    gen = OpenAIImageGeneration(api_key=api_key)

    for filename, prompt in PROMPTS.items():
        out_path = OUT_DIR / filename
        print(f"\n=== Generating {filename} ...")
        try:
            images = await gen.generate_images(
                prompt=prompt,
                model="gpt-image-1",
                number_of_images=1,
            )
        except Exception as e:
            print(f"  FAILED: {e}")
            continue
        if not images:
            print(f"  FAILED: no image returned")
            continue
        data = images[0]
        out_path.write_bytes(data)
        print(f"  saved -> {out_path} ({len(data)} bytes)")


if __name__ == "__main__":
    asyncio.run(main())
