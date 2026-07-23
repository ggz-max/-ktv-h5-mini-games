import json
from pathlib import Path

project = Path(r"D:\AIproject\production\ktv-h5-extension\app-projects\ktv-personality-universe")
visuals = project / "www-room-lineup" / "assets" / "visuals"
pen_path = project / "designs" / "ktv-personality-assets.pen"

def image_frame(id_, name, filename, x, y, w, h, note=None):
    children = []
    children.append({
        "type": "rectangle",
        "id": f"{id_}_img",
        "x": 0,
        "y": 42,
        "name": filename,
        "width": w,
        "height": h - 42,
        "cornerRadius": 18,
        "fill": {"type": "image", "enabled": True, "url": str(visuals / filename), "mode": "fill"}
    })
    children.append({
        "type": "text",
        "id": f"{id_}_label",
        "x": 0,
        "y": 0,
        "fill": "#FFFFFF",
        "content": name,
        "fontFamily": "Inter",
        "fontSize": 24,
        "fontWeight": "800"
    })
    if note:
        children.append({
            "type": "text",
            "id": f"{id_}_note",
            "x": 0,
            "y": h + 10,
            "fill": "#BDA9D8",
            "content": note,
            "fontFamily": "Inter",
            "fontSize": 14,
            "fontWeight": "600"
        })
    return {
        "type": "frame",
        "id": id_,
        "x": x,
        "y": y,
        "name": name,
        "reusable": True,
        "clip": False,
        "width": w,
        "height": h + (42 if note else 0),
        "fill": "#00000000",
        "children": children,
    }

children = []
children.append({
    "type": "frame",
    "id": "asset_cover",
    "x": 0,
    "y": 0,
    "name": "00 Asset Library Cover",
    "reusable": True,
    "clip": True,
    "width": 1440,
    "height": 520,
    "fill": "#050409",
    "children": [
        {"type": "rectangle", "id": "cover_bg", "x": 0, "y": 0, "width": 1440, "height": 520, "fill": {"type": "gradient", "gradientType": "linear", "enabled": True, "rotation": 135, "size": {"height": 1}, "colors": [{"color": "#090416", "position": 0}, {"color": "#2B1040", "position": 0.58}, {"color": "#031417", "position": 1}]}},
        {"type": "text", "id": "cover_title", "x": 72, "y": 72, "fill": "#FFFFFF", "content": "KTV 人格宇宙 · GPT Image 资产库", "fontFamily": "Inter", "fontSize": 52, "fontWeight": "900"},
        {"type": "text", "id": "cover_subtitle", "x": 76, "y": 150, "fill": "#38E8FF", "content": "所有图片已复制到 www-room-lineup/assets/visuals，可直接被 HTML 引用", "fontFamily": "Inter", "fontSize": 24, "fontWeight": "800"},
        {"type": "rectangle", "id": "cover_sheet", "x": 860, "y": 56, "width": 440, "height": 390, "cornerRadius": 24, "fill": {"type": "image", "enabled": True, "url": str(visuals / "visual-assets-contact-sheet.png"), "mode": "fill"}},
        {"type": "text", "id": "cover_note", "x": 78, "y": 252, "fill": "#F3E8FF", "textGrowth": "fixed-width", "width": 660, "content": "使用方式：在 HTML 中引用 ./assets/visuals/xxx.png；在 Pencil 中打开本文件用于查看、管理和后续替换资产。当前头像、人格卡、分享海报为可用主资产；UI 小组件裁图可用于方向参考，后续可单独重生精修。", "fontFamily": "Inter", "fontSize": 24, "fontWeight": "700", "lineHeight": 1.45}
    ]
})

# Avatars
x0, y0 = 0, 650
for i, (name, fn) in enumerate([
    ("Avatar BOOM", "avatar-boom.png"),
    ("Avatar CUT-X", "avatar-cutx.png"),
    ("Avatar SAD-FM", "avatar-sadfm.png"),
    ("Avatar ECHO", "avatar-echo.png"),
]):
    children.append(image_frame(f"avatar_{i}", name, fn, x0 + i*340, y0, 300, 342))

# Skin cards
x0, y0 = 0, 1120
for i, (name, fn) in enumerate([
    ("Skin Card BOOM Neon Burst", "skin-card-boom-neon-burst.png"),
    ("Skin Card CUT-X Switch", "skin-card-cutx-switch.png"),
    ("Skin Card SAD-FM Radio", "skin-card-sadfm-radio.png"),
    ("Skin Card ECHO Loop", "skin-card-echo-loop.png"),
]):
    children.append(image_frame(f"skin_{i}", name, fn, x0 + i*370, y0, 330, 542))

# UI components
x0, y0 = 0, 1780
for i, (name, fn, w, h, note) in enumerate([
    ("UI Owned Skin Card", "ui-owned-skin-card.png", 360, 282, "方向参考，建议后续单独精修"),
    ("UI Locked Skin Slots", "ui-locked-skin-slots.png", 320, 252, "方向参考，建议后续单独精修"),
    ("UI Equipped Badge", "ui-equipped-badge.png", 260, 172, "可用作徽章方向"),
    ("UI New Skin Badge", "ui-new-skin-unlocked-badge.png", 300, 172, "可用作奖励徽章方向"),
    ("UI Save Archive Badge", "ui-save-archive-badge.png", 300, 172, "可用作保存确认方向"),
    ("UI Scan Mic Orb", "ui-scan-mic-orb.png", 300, 342, "可直接用于扫描页"),
    ("UI Neon Progress Bar", "ui-neon-progress-bar.png", 420, 172, "可用作进度条方向"),
]):
    col = i % 3
    row = i // 3
    children.append(image_frame(f"ui_{i}", name, fn, x0 + col*470, y0 + row*390, w, h, note))

# Poster and source sheets
children.append(image_frame("poster_share", "Share Poster Lineup Portrait", "share-poster-lineup-portrait.png", 0, 2700, 420, 602, "可作为分享海报底图，文字建议 HTML/CSS 叠加"))
children.append(image_frame("source_avatar_sheet", "Source Persona Avatars Sheet", "source-persona-avatars-sheet.png", 520, 2700, 420, 462, "gpt-image-2 原始角色表"))
children.append(image_frame("source_skin_sheet", "Source Skin Cards Sheet", "source-skin-cards-sheet.png", 1020, 2700, 420, 462, "gpt-image-2 原始人格卡表"))
children.append(image_frame("source_ui_sheet", "Source UI Assets Sheet", "source-ui-assets-sheet.png", 520, 3250, 420, 462, "gpt-image-2 原始 UI 组件表"))

pen = {"version": "2.11", "children": children}
pen_path.write_text(json.dumps(pen, ensure_ascii=False, indent=2), encoding="utf-8")
print(pen_path)
print(len(children))

