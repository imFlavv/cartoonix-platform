import glob, os, shutil
from PIL import Image

DIR = "/app/frontend/public/avatars"
BACKUP = os.path.join(DIR, "_orig_backup")
os.makedirs(BACKUP, exist_ok=True)

TOP_MARGIN = 0.05      # small even margin above the head
BOTTOM_MARGIN = 0.02   # character bottom nearly touches the frame bottom
THRESH_BOTTOM_GAP = 6.0  # only fix avatars whose bottom gap exceeds this (%)


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


def normalize(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    left, top, right, bottom, bg = content_bbox(im)
    cw = right - left
    ch = bottom - top
    bottom_gap = (h - 1 - bottom) / h * 100
    if bottom_gap <= THRESH_BOTTOM_GAP:
        return f"skip {os.path.basename(path)} (bottom_gap={bottom_gap:.1f}%)"

    # choose square crop size S so content fits with desired margins
    S = max(ch / (1 - TOP_MARGIN - BOTTOM_MARGIN), cw / 0.9)
    S = int(round(S))
    bottom_margin_px = BOTTOM_MARGIN * S
    # position of content inside the SxS output
    crop_left = int(round(left - (S - cw) / 2))
    crop_top = int(round(bottom - (S - bottom_margin_px)))

    canvas = Image.new("RGB", (S, S), bg)
    canvas.paste(im, (-crop_left, -crop_top))
    out = canvas.resize((1024, 1024), Image.LANCZOS)
    out.save(path)
    return f"FIXED {os.path.basename(path)} (was bottom_gap={bottom_gap:.1f}%, S={S})"


files = sorted(glob.glob(os.path.join(DIR, "*.png")))
for f in files:
    # backup once
    b = os.path.join(BACKUP, os.path.basename(f))
    if not os.path.exists(b):
        shutil.copy2(f, b)
for f in files:
    print(normalize(f))
