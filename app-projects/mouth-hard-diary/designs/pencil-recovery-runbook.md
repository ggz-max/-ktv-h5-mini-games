# Pencil 恢复手册

## 当前状态

Pencil MCP 当前无法连接桌面端：

```text
failed to connect to running Pencil app: desktop
transport not connected to app: desktop
```

本机当前状态：

- `.pencil` 数据目录存在：`C:\Users\GGG\.pencil`
- 当前没有 Pencil 桌面进程。
- Pencil 桌面可执行文件已通过本机快捷方式找到：`D:\我的\Pencil\Pencil.exe`
- 参考项目 `ktv-personality-universe` 下存在历史 `.pen` 文件，但它们不能证明本项目的 UI 图片链路已经完成。

## 恢复后的第一步

不要先继续改 H5。先在项目根目录运行：

```bash
npm run pencil:open
```

确认输出里的 Pencil 可执行文件和目标 `.pen` 路径无误后，再运行：

```bash
npm run pencil:open -- --yes
```

这只会打开 Pencil，不会创建、读取或修改 `.pen`。打开后，在 Pencil 里创建或打开本项目的 Pencil 设计源。

目标源文件：

```text
D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\mouth-hard-diary.pen
```

如果 Pencil 只能先打开历史文件，请在 Pencil 内另存为本项目源文件，再继续本项目设计。不要手动读取、复制或编辑 `.pen` 文件内容。

## 导入源资产

将这些 image2 原图导入 Pencil：

```text
D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-home-bg-clean-image2.png
D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-hero-neon-sticky-image2.png
D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-result-card-bg-image2.png
D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-share-poster-image2.png
D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-status-dashboard-image2.png
D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-sticker-sheet-image2.png
```

这些文件也记录在：

```text
designs/pencil-source/image-manifest.json
```

## 建议画板

### 00 Image2 Source Board

用途：素材档案。

放入 6 张 image2 源图，保留文件名或用途标签，便于之后追踪。

### 01 Home Hero Direction

尺寸：`390 x 844`

建议：

- 背景使用 `source-home-bg-clean-image2.png`。
- 上方可局部叠入 `source-hero-neon-sticky-image2.png` 裁切。
- 页面必须保留标题、说明、主按钮区域。

导出目标：

```text
h5/assets/visuals/pencil-export/hero-report-collage.png
```

### 02 Result Report Card

尺寸：`390 x 844`

建议：

- 背景使用 `source-result-card-bg-image2.png`。
- 中央留白承载今日称号、主文案、能量条和三条解释。

### 03 Share Poster

尺寸：`1080 x 1440`

建议：

- 背景使用 `source-share-poster-image2.png` 或 `source-result-card-bg-image2.png`。
- 叠加实际报告内容后，确认截图和保存后的可读性。

导出目标：

```text
h5/assets/visuals/pencil-export/share-poster-bg.png
```

### 04 Sticker Kit

用途：贴纸资产。

导入 `source-sticker-sheet-image2.png`，按需要切分：

- low battery
- overthinking cloud
- lightning cloud
- hot pink note
- crossed smile
- moon pillow
- energy meter
- bandaged heart

导出目标：

```text
h5/assets/visuals/pencil-export/report-stickers.png
```

## 导出后验收

从 Pencil 导出到 H5 后运行：

```bash
cd D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary
npm run verify:pencil-handoff
npm run verify:assets
npm run verify:assets:final
npm run verify
npm run verify:browser
```

浏览器验证截图：

```text
h5/screenshots/home.png
h5/screenshots/result.png
```

## 重要原则

- `.pen` 是设计源，不要让 H5 直接依赖 image2 原图。
- `h5/assets/visuals/pencil-export/` 只放 Pencil 导出物。
- 当前 `pencil-export` 中的文件是临时预览，恢复 Pencil 后必须覆盖。
- `verify:assets:final` 通过前，不能把 UI 图片链路视为完成。
