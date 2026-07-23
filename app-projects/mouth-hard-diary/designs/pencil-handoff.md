# Pencil 设计与切图交接

## 当前状态

Pencil MCP 当前无法连接桌面编辑器：

```text
failed to connect to running Pencil app: desktop
transport not connected to app: desktop
```

所以本轮不能直接创建或修改 `.pen` 文件，也不能从 Pencil 导出最终切图。当前 H5 里可见的图片只是为了本地预览保留的临时占位，不代表最终资产完成。

用户要求的最终流程必须保持不变：

1. 在 Pencil 里先设计或生成。
2. 用户确认视觉风格。
3. 从 Pencil 导出切图。
4. H5 引用 Pencil 导出的图片。

## 源文件位置

推荐 Pencil 源文件：

```text
designs/pencil-source/mouth-hard-diary.pen
```

image2 源图目录：

```text
designs/pencil-source/images/
```

H5 运行时切图目录：

```text
h5/assets/visuals/pencil-export/
```

重要规则：不要手动读取或编辑 `.pen` 文件，只能通过 Pencil 工具操作。

## 必建画板

| 画板 | 尺寸 | 目的 |
|---|---:|---|
| `00 Image2 Source Board` | 自适应 | 归档所有 image2 原图，保留文件名和用途标签。 |
| `01 Home Hero Direction` | 390 x 844 | 编排 H5 首页首屏主视觉。 |
| `02 Result Report Card` | 390 x 844 | 编排结果页报告质感和视觉语言。 |
| `03 Share Poster` | 1080 x 1440 | 编排可保存、可分享的海报背景。 |
| `04 Sticker Kit` | 自适应 | 归档贴纸素材板，按需要裁切或参考。 |

## 必导入源图

先把这些 image2 原图导入 `00 Image2 Source Board`：

```text
designs/pencil-source/images/source-home-bg-clean-image2.png
designs/pencil-source/images/source-hero-neon-sticky-image2.png
designs/pencil-source/images/source-result-card-bg-image2.png
designs/pencil-source/images/source-share-poster-image2.png
designs/pencil-source/images/source-status-dashboard-image2.png
designs/pencil-source/images/source-sticker-sheet-image2.png
```

## 页面方向

### Home

用途：首页首屏。

- 产品名：嘴硬日记
- 主标题：把今天的破事，翻译成精神状态报告
- 主视觉：精神状态报告卡拼贴
- 主按钮：生成我的今日报告
- 次按钮：先看一个样例
- 推荐源图：`source-home-bg-clean-image2.png`、`source-hero-neon-sticky-image2.png`
- 导出节点：`export/hero-report-collage`
- 导出文件：`h5/assets/visuals/pencil-export/hero-report-collage.png`

### Input

用途：输入选择页。

- 破事类型 chips
- 嘴硬风格 cards
- 可选短输入
- 固定底部按钮
- 第一版主要由 H5 组件承载，不强制导出整页图片

### Result

用途：结果页和分享海报视觉基准。

- 今日称号
- 主文案
- 三个能量条：理智电量、嘴硬指数、需要睡觉
- 三条解释
- 今日建议
- 保存、复制、App 承接按钮
- 推荐源图：`source-result-card-bg-image2.png`

### Share Poster

用途：保存分享图底板。

- 推荐源图：`source-share-poster-image2.png` 或 `source-result-card-bg-image2.png`
- 导出节点：`export/share-poster-bg`
- 导出文件：`h5/assets/visuals/pencil-export/share-poster-bg.png`

### Sticker Kit

用途：结果页装饰、分享图装饰、后续 App 贴纸资产。

- 推荐源图：`source-sticker-sheet-image2.png`
- 导出节点：`export/report-stickers`
- 导出文件：`h5/assets/visuals/pencil-export/report-stickers.png`

## 风格确认点

请优先确认：

1. “深夜便利贴 + 霓虹批注”的方向是否成立。
2. 是否太暗，或太像心理咨询产品。
3. 发疯感是否足够，但不压抑。
4. 首页主视觉是否一眼能看懂“生成报告”。
5. 结果卡是否值得保存或分享。

确认后更新：

```text
designs/pencil-source/style-approval.json
```

最终导出前，这个文件必须是 `approved`，并记录 `approvedBy`、`approvedAt` 和确认备注。

## 必导出节点

| Pencil 节点名 | 导出目标 | 当前状态 |
|---|---|---|
| `export/hero-report-collage` | `h5/assets/visuals/pencil-export/hero-report-collage.png` | 临时预览，必须由 Pencil 覆盖。 |
| `export/share-poster-bg` | `h5/assets/visuals/pencil-export/share-poster-bg.png` | 临时预览，必须由 Pencil 覆盖。 |
| `export/report-stickers` | `h5/assets/visuals/pencil-export/report-stickers.png` | 待导出。 |

## H5 接入说明

当前 H5 首页引用：

```html
<img src="./assets/visuals/pencil-export/hero-report-collage.png">
```

分享海报生成引用：

```js
loadImage("./assets/visuals/pencil-export/share-poster-bg.png")
```

当前 H5 引用证据由以下命令生成：

```bash
npm run verify:h5-asset-usage
```

输出文件：

```text
docs/h5-asset-usage.md
```

H5 目录里的图片文件应被视为 Pencil 导出物。恢复 Pencil 后，必须将 image2 源图导入 `.pen`，在 Pencil 内确认和编排，再从 Pencil 导出覆盖这些文件。

## 验收命令

```bash
npm run verify:pencil-handoff
npm run verify:style-approval
npm run verify:assets
npm run verify:h5-asset-usage
npm run verify:assets:final
npm run verify:browser
```

`npm run verify:assets:final` 通过前，UI 图片流程不能视为完成。

最终模式必须同时满足：`designs/pencil-source/style-approval.json` 状态为 `approved`，并且已记录用户确认人和确认时间。

最终模式必须同时满足：`designs/pencil-source/mouth-hard-diary.pen` 存在，manifest 状态为 `pencil_exported`，每个导出目标状态为 `pencil_exported`，并且导出文件存在、尺寸正确。
