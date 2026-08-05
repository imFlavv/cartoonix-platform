"""
Build a seamless capybara chat bubble center.png by slicing the flat body area
that touches the seam between center and right.png.

Strategy: right.png is designed to start with a FLAT vertical left edge (that's where
the tileable center is supposed to plug in). So we extract the leftmost `TILE_WIDTH`
columns of right.png — those pixels are guaranteed flat body.

The result: left.png ends with body → center.png (from right.png's left slice) → right.png
starts with the exact same pixels the center ends with = ZERO seam by construction.

Run: python /app/scripts/build_capybara_center.py
"""
from pathlib import Path

from PIL import Image

ASSETS = Path("/app/frontend/public/chat/bubbles/capybara")
LEFT = ASSETS / "left.png"
RIGHT = ASSETS / "right.png"
CENTER_OUT = ASSETS / "center.png"

TILE_WIDTH = 40  # pixels of flat body to sample from right.png


def main() -> None:
    if not LEFT.exists() or not RIGHT.exists():
        raise SystemExit("missing left.png or right.png")

    left = Image.open(LEFT).convert("RGBA")
    right = Image.open(RIGHT).convert("RGBA")
    print(f"left.png:  {left.size}")
    print(f"right.png: {right.size}")

    # Slice the LEFTMOST TILE_WIDTH columns of right.png — that's the flat body area.
    tile = right.crop((0, 0, TILE_WIDTH, right.height))
    print(f"tile size: {tile.size}")

    tile.save(CENTER_OUT, "PNG")
    print(f"saved -> {CENTER_OUT}")

    print(f"\nheights → left={left.height}, center={tile.height}, right={right.height}")


if __name__ == "__main__":
    main()
