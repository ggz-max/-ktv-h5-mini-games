from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
VISUALS = ROOT / "www-room-lineup" / "assets" / "visuals"
FONT_BOLD = Path("C:/Windows/Fonts/msyhbd.ttc")
FONT_REG = Path("C:/Windows/Fonts/msyh.ttc")


VARIANTS = [
    {
        "code": "DROP",
        "name": "高空副歌",
        "src": "skin-card-echo-loop.png",
        "file": "skin-card-drop-chorus-drop.png",
        "a": "#38E8FF",
        "b": "#FFD55B",
        "pattern": "drop",
    },
    {
        "code": "MUTE",
        "name": "静音破冰",
        "src": "skin-card-boom-neon-burst.png",
        "file": "skin-card-mute-ice-break.png",
        "a": "#52FF8F",
        "b": "#38E8FF",
        "pattern": "mute",
    },
    {
        "code": "LOOP",
        "name": "循环上头",
        "src": "skin-card-sadfm-radio.png",
        "file": "skin-card-loop-repeat-fever.png",
        "a": "#FF38C8",
        "b": "#8A3CFF",
        "pattern": "loop",
    },
    {
        "code": "CTRL",
        "name": "全局控台",
        "src": "skin-card-cutx-switch.png",
        "file": "skin-card-ctrl-console-owner.png",
        "a": "#38E8FF",
        "b": "#8A3CFF",
        "pattern": "ctrl",
    },
    {
        "code": "HYPE",
        "name": "假高潮制造",
        "src": "skin-card-boom-neon-burst.png",
        "file": "skin-card-hype-fake-climax.png",
        "a": "#FFD55B",
        "b": "#FF38C8",
        "pattern": "hype",
    },
    {
        "code": "TONE",
        "name": "高音盲盒",
        "src": "skin-card-boom-neon-burst.png",
        "file": "skin-card-tone-high-note-blindbox.png",
        "a": "#FF5B7D",
        "b": "#FFD55B",
        "pattern": "tone",
    },
    {
        "code": "DUET",
        "name": "副驾主唱",
        "src": "skin-card-echo-loop.png",
        "file": "skin-card-duet-co-pilot.png",
        "a": "#52FF8F",
        "b": "#38E8FF",
        "pattern": "duet",
    },
    {
        "code": "DRAMA",
        "name": "尾音拉满",
        "src": "skin-card-sadfm-radio.png",
        "file": "skin-card-drama-tail-note.png",
        "a": "#FF38C8",
        "b": "#FFD55B",
        "pattern": "drama",
    },
]


def hex_rgba(value, alpha=255):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def font(size, bold=True):
    path = FONT_BOLD if bold and FONT_BOLD.exists() else FONT_REG
    return ImageFont.truetype(str(path), size=size)


def rounded_rect(draw, box, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def make_overlay(size, variant):
    w, h = size
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    a = hex_rgba(variant["a"], 210)
    b = hex_rgba(variant["b"], 190)
    pattern = variant["pattern"]

    if pattern == "loop":
        for i in range(5):
            box = (72 - i * 12, 230 + i * 36, w - 72 + i * 12, 334 + i * 48)
            draw.ellipse(box, outline=a, width=5)
    elif pattern == "ctrl":
        for y in range(132, h - 150, 70):
            draw.line((72, y, w - 72, y + 24), fill=a, width=5)
            x = 120 + (y % 210)
            draw.ellipse((x, y - 12, x + 28, y + 16), fill=b)
    elif pattern == "tone":
        for i in range(9):
            x = 70 + i * 46
            draw.line((x, h - 150, x + 24, 210 + (i % 4) * 32), fill=a, width=5)
        draw.arc((80, 135, w - 80, 410), 200, 340, fill=b, width=6)
    elif pattern == "duet":
        for x in (185, 325):
            draw.ellipse((x - 54, 238, x + 54, 346), outline=a, width=6)
            draw.line((x, 346, x - 44, 500), fill=b, width=6)
    elif pattern == "drama":
        points = [(84, h - 170), (180, 450), (325, 540), (w - 78, 185)]
        draw.line(points, fill=a, width=7, joint="curve")
        draw.text((w - 150, 138), "~", fill=b, font=font(92))
    elif pattern == "mute":
        for i in range(8):
            x = 42 + i * 60
            draw.line((x + 46, 130, x - 24, h - 125), fill=a, width=5)
        draw.line((92, 384, w - 92, 384), fill=b, width=5)
    else:
        for i in range(12):
            x = 70 + i * 35
            y = 150 + (i % 5) * 70
            r = 8 + (i % 3) * 5
            draw.ellipse((x - r, y - r, x + r, y + r), fill=a if i % 2 else b)

    return overlay.filter(ImageFilter.GaussianBlur(0.2))


def make_variant(variant):
    base = Image.open(VISUALS / variant["src"]).convert("RGBA").resize((512, 768))

    tint = Image.new("RGBA", base.size, (0, 0, 0, 0))
    tint_draw = ImageDraw.Draw(tint)
    for y in range(768):
        t = y / 767
        color = hex_rgba(variant["a"], int(76 * (1 - t))) if y < 384 else hex_rgba(variant["b"], int(86 * t))
        tint_draw.line((0, y, 512, y), fill=color)
    image = Image.alpha_composite(base, tint)
    image = Image.alpha_composite(image, make_overlay(image.size, variant))

    label = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(label)
    rounded_rect(draw, (34, 34, 478, 734), 38, outline=hex_rgba(variant["b"], 215), width=4)
    rounded_rect(draw, (44, 584, 468, 704), 26, fill=(8, 4, 18, 190), outline=hex_rgba(variant["a"], 225), width=3)
    draw.text((72, 616), variant["code"], fill=hex_rgba(variant["a"]), font=font(26))
    draw.text((72, 654), variant["name"], fill=(255, 247, 255, 255), font=font(34))
    draw.text((72, 692), "PERSONA CARD", fill=hex_rgba(variant["b"], 220), font=font(16, bold=False))
    image = Image.alpha_composite(image, label)
    image.save(VISUALS / variant["file"])
    print(variant["file"])


def main():
    for variant in VARIANTS:
        make_variant(variant)


if __name__ == "__main__":
    main()
