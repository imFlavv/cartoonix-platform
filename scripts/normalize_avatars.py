import glob, os
from PIL import Image

DIR = "/app/frontend/public/avatars"
BACKUP = os.path.join(DIR, "_orig_backup")

TOP_MARGIN = 0.05       # small even margin above the head
BOTTOM_MARGIN = -0.04   # character bleeds slightly off the bottom edge (sits low, no gap)


def content_bbox(im):
    w, h = im.size
    px = im.load()
    bg = px[3, 3]

    def isbg(c):
        return abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) < 40

    top, bottom, left, right = h, 0, w, 0
    for y in range(h):
        for x in range(0, w, 4):
            if not isbg(px[x, y]):
                top = min(top, y); bottom = max(bottom, y)
                left = min(left, x); right = max(right, x)
    return left, top, right, bottom, bg


def normalize(src, dst):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    left, top, right, bottom, bg = content_bbox(im)
    cw = right - left
    ch = bottom - top

    # square crop size S so content fits with desired vertical margins
    S = max(ch / (1 - TOP_MARGIN - BOTTOM_MARGIN), cw / 0.9)
    S = int(round(S))
    bottom_margin_px = BOTTOM_MARGIN * S
    crop_left = int(round(left - (S - cw) / 2))
    crop_top = int(round(bottom - (S - bottom_margin_px)))

    canvas = Image.new("RGB", (S, S), bg)
    canvas.paste(im, (-crop_left, -crop_top))
    out = canvas.resize((1024, 1024), Image.LANCZOS)
    out.save(dst)
    return f"done {os.path.basename(dst)} (S={S})"


for b in sorted(glob.glob(os.path.join(BACKUP, "*.png"))):
    dst = os.path.join(DIR, os.path.basename(b))
    print(normalize(b, dst))
