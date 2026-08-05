"""
Build a TRULY seamless capybara chat bubble center.png.

Strategy: sample ONE representative column from right.png's flat body area
(x=20, well past any left-edge anti-aliasing) and duplicate it N times.
Because every column of the tile is identical, `background-repeat: repeat-x`
cannot produce a visible seam — there is literally no pixel difference at any
tile boundary.

Run: python /app/scripts/build_capybara_center.py
"""
from pathlib import Path

from PIL import Image

ASSETS = Path("/app/frontend/public/chat/bubbles/capybara")
LEFT = ASSETS / "left.png"
RIGHT = ASSETS / "right.png"
CENTER_OUT = ASSETS / "center.png"

# Width of the generated center tile (pixels). Any width works since all columns are identical.
TILE_WIDTH = 40

# Which column of right.png to sample. It must be inside the FLAT body region —
# past any left-edge anti-aliasing but before the tail curvature starts.
SAMPLE_X = 20


def main() -> None:
    if not LEFT.exists() or not RIGHT.exists():
        raise SystemExit("missing left.png or right.png")

    left = Image.open(LEFT).convert("RGBA")
    right = Image.open(RIGHT).convert("RGBA")
    print(f"left.png:  {left.size}")
    print(f"right.png: {right.size}")

    # Extract ONE column, height = full image
    column = right.crop((SAMPLE_X, 0, SAMPLE_X + 1, right.height))
    print(f"sampled column x={SAMPLE_X}, size={column.size}")

    # Duplicate that column TILE_WIDTH times
    tile = Image.new("RGBA", (TILE_WIDTH, right.height), (0, 0, 0, 0))
    for x in range(TILE_WIDTH):
        tile.paste(column, (x, 0))

    tile.save(CENTER_OUT, "PNG")
    print(f"saved -> {CENTER_OUT} ({tile.size})")

    print(f"\nheights → left={left.height}, center={tile.height}, right={right.height}")


if __name__ == "__main__":
    main()
