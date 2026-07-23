from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
out = Path(r"D:\AIproject\production\ktv-h5-extension\app-projects\ktv-personality-universe\www-room-lineup\assets\visuals")
files = [
"avatar-boom.png","avatar-cutx.png","avatar-sadfm.png","avatar-echo.png",
"skin-card-boom-neon-burst.png","skin-card-cutx-switch.png","skin-card-sadfm-radio.png","skin-card-echo-loop.png",
"ui-owned-skin-card.png","ui-locked-skin-slots.png","ui-equipped-badge.png","ui-new-skin-unlocked-badge.png","ui-save-archive-badge.png","ui-scan-mic-orb.png","ui-neon-progress-bar.png","share-poster-lineup-portrait.png"
]
thumb_w, thumb_h = 220, 220
cols = 4
rows = (len(files)+cols-1)//cols
sheet = Image.new("RGB", (cols*280, rows*280), "#050409")
d = ImageDraw.Draw(sheet)
for i, fn in enumerate(files):
    im = Image.open(out/fn).convert("RGB")
    im.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x = (i%cols)*280 + (thumb_w-im.width)//2 + 30
    y = (i//cols)*280 + 16
    sheet.paste(im, (x,y))
    d.text(((i%cols)*280+18, (i//cols)*280+238), fn, fill="#ffffff")
sheet.save(out/"visual-assets-contact-sheet.png")
print(out/"visual-assets-contact-sheet.png")
