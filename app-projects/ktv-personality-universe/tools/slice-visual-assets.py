from pathlib import Path
from PIL import Image

out = Path(r"D:\AIproject\production\ktv-h5-extension\app-projects\ktv-personality-universe\www-room-lineup\assets\visuals")

def save_crop(src, name, box, size=None):
    im = Image.open(out / src).convert("RGBA")
    crop = im.crop(box)
    if size:
        crop = crop.resize(size, Image.Resampling.LANCZOS)
    crop.save(out / name)
    print(name, crop.size)

# Persona avatar sheet: 2x2 grid.
w, h = Image.open(out / "source-persona-avatars-sheet.png").size
padx, pady = int(w * 0.035), int(h * 0.035)
mid_x, mid_y = w // 2, h // 2
avatar_boxes = {
    "avatar-boom.png": (padx, pady, mid_x - padx, mid_y - pady),
    "avatar-cutx.png": (mid_x + padx, pady, w - padx, mid_y - pady),
    "avatar-sadfm.png": (padx, mid_y + pady, mid_x - padx, h - pady),
    "avatar-echo.png": (mid_x + padx, mid_y + pady, w - padx, h - pady),
}
for name, box in avatar_boxes.items():
    save_crop("source-persona-avatars-sheet.png", name, box, (512, 512))

# Skin card sheet: 2x2 grid.
w, h = Image.open(out / "source-skin-cards-sheet.png").size
padx, pady = int(w * 0.025), int(h * 0.025)
mid_x, mid_y = w // 2, h // 2
skin_boxes = {
    "skin-card-boom-neon-burst.png": (padx, pady, mid_x - padx, mid_y - pady),
    "skin-card-cutx-switch.png": (mid_x + padx, pady, w - padx, mid_y - pady),
    "skin-card-sadfm-radio.png": (padx, mid_y + pady, mid_x - padx, h - pady),
    "skin-card-echo-loop.png": (mid_x + padx, mid_y + pady, w - padx, h - pady),
}
for name, box in skin_boxes.items():
    save_crop("source-skin-cards-sheet.png", name, box, (512, 768))

# UI assets sheet: broad crops from arranged grid. Keep generous padding, then resize.
w, h = Image.open(out / "source-ui-assets-sheet.png").size
ui = {
    "ui-owned-skin-card.png": (0, 0, int(w*0.58), int(h*0.42), (720, 480)),
    "ui-locked-skin-slots.png": (int(w*0.55), 0, w, int(h*0.45), (640, 420)),
    "ui-equipped-badge.png": (0, int(h*0.42), int(w*0.38), int(h*0.67), (440, 220)),
    "ui-new-skin-unlocked-badge.png": (int(w*0.35), int(h*0.42), int(w*0.72), int(h*0.67), (520, 220)),
    "ui-save-archive-badge.png": (int(w*0.68), int(h*0.42), w, int(h*0.67), (520, 220)),
    "ui-scan-mic-orb.png": (0, int(h*0.62), int(w*0.36), h, (512, 512)),
    "ui-neon-progress-bar.png": (int(w*0.32), int(h*0.70), w, h, (900, 240)),
}
for name, (x1,y1,x2,y2,size) in ui.items():
    save_crop("source-ui-assets-sheet.png", name, (x1,y1,x2,y2), size)

# Normalize share poster to portrait preview asset.
im = Image.open(out / "share-poster-lineup.png").convert("RGBA")
im = im.resize((768, 1024), Image.Resampling.LANCZOS)
im.save(out / "share-poster-lineup-portrait.png")
print("share-poster-lineup-portrait.png", im.size)
