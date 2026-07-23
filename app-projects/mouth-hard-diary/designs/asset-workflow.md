# UI Asset Workflow

本项目所有 UI 图片资产必须先进入 Pencil `.pen` 文件作为设计源，再从 Pencil 导出给 H5 使用。

## Source Of Truth

推荐 Pencil 源文件：

```text
designs/pencil-source/mouth-hard-diary.pen
```

image2 / 生图原始输出：

```text
designs/pencil-source/images/
```

Pencil 备份：

```text
designs/pencil-backups/
```

H5 运行时导出目录：

```text
h5/assets/visuals/pencil-export/
```

`.pen` 是设计源文件和交接板。H5 不直接依赖 image2 原图，也不直接依赖 `.pen`，只引用从 Pencil 导出的 PNG/WebP。

## Working Loop

1. 用 image2 生成视觉原图。
2. 将原图保存到 `designs/pencil-source/images/`。
3. 将原图导入 Pencil `.pen`。
4. 在 Pencil 中完成 UI 编排、裁切和命名。
5. 用户确认视觉风格后，更新 `designs/pencil-source/style-approval.json`。
6. 从 Pencil 导出节点到 `h5/assets/visuals/pencil-export/`。
7. H5 只引用 `pencil-export` 中的导出文件。
8. 用本地浏览器验证 H5 页面加载、截图和交互。
9. 运行 `npm run verify:h5-asset-usage`，生成 `docs/h5-asset-usage.md`，确认必需导出图确实被 H5 引用。

交接清单见：

```text
designs/pencil-export-checklist.md
```

## Current Assets

源图指纹和 Pencil 导入索引见：

```text
designs/pencil-source/asset-index.md
```

| 文件 | 角色 |
|---|---|
| `source-home-bg-clean-image2.png` | image2 首页 UI 背景候选，待导入 Pencil |
| `source-hero-neon-sticky-image2.png` | image2 首页强主视觉候选，待导入 Pencil |
| `source-result-card-bg-image2.png` | image2 结果卡/分享卡背景候选，待导入 Pencil |
| `source-share-poster-image2.png` | image2 分享海报背景候选，待导入 Pencil |
| `source-status-dashboard-image2.png` | image2 品牌/空状态候选，待导入 Pencil |
| `source-sticker-sheet-image2.png` | image2 贴纸素材板候选，待导入 Pencil 后切分或参考 |

## Recommended Pencil Boards

恢复 Pencil 后建议建立这些画板：

| 画板 | 尺寸 | 内容 |
|---|---:|---|
| `00 Image2 Source Board` | 自适应 | 放入所有 `source-*-image2.png`，作为原始素材档案 |
| `01 Home Hero Direction` | 390 x 844 | 基于 `source-home-bg-clean-image2.png` 或 `source-hero-neon-sticky-image2.png` 编排首页 |
| `02 Result Report Card` | 390 x 844 | 基于 `source-result-card-bg-image2.png` 编排结果页 |
| `03 Share Poster` | 1080 x 1440 | 基于 `source-share-poster-image2.png` 或 `source-result-card-bg-image2.png` 编排分享海报 |
| `04 Sticker Kit` | 自适应 | 放入 `source-sticker-sheet-image2.png`，切分贴纸或作为风格参考 |

## Visual Direction Decision

当前优先方向：

- 首页 UI 底板：`source-home-bg-clean-image2.png`
- 首页强主视觉：`source-hero-neon-sticky-image2.png`
- 结果/分享卡底：`source-result-card-bg-image2.png`
- 朋友圈分享海报底：`source-share-poster-image2.png`

`source-status-dashboard-image2.png` 质量较高，但更像品牌空状态或 App 介绍页，不作为第一版 H5 主视觉。

## Temporary Preview Exception

当前 Pencil MCP 无法连接桌面编辑器，因此 `h5/assets/visuals/pencil-export/` 中临时复制了 image2 输出，用于本地预览和前端联调。

这只是过渡态。恢复 Pencil 后必须：

1. 将 `designs/pencil-source/images/` 的图导入 `.pen`。
2. 在 Pencil 内确认或重新编排。
3. 从 Pencil 导出覆盖 `h5/assets/visuals/pencil-export/`。

## Naming

- 原始 image2 图：`source-{purpose}-{variant}-image2.png`
- Pencil 导出首页主视觉：`hero-report-collage.png`
- Pencil 导出分享背景：`share-poster-bg.png`
- Pencil 导出贴纸组：`report-stickers.png`
- Pencil 导出页面截图：`ui-{page}.png`

## Guardrails

- 不把 UI 图片资产散落在 H5 根目录。
- 不让前端临时拼主视觉来替代设计源。
- 不直接修改 `.pen` 文件内容，只通过 Pencil 工具操作。
- H5 中的 `pencil-export` 文件必须能追溯到 `.pen` 节点。
- 运行 `npm run verify:assets`，确认 H5 没有直接引用 image2 源图，且运行时导出物已在 manifest 声明。
- 运行 `npm run verify:h5-asset-usage`，确认 H5 对 required Pencil 导出图有实际引用证据。
- 运行 `npm run verify:pencil-handoff`，确认交接文档、manifest、画板和导出节点保持一致。
- 运行 `npm run verify:style-approval`，确认视觉确认记录和 manifest 源图一致。
- 最终交付前运行 `npm run verify:assets:final`，确认 `designs/pencil-source/mouth-hard-diary.pen` 存在、manifest 状态是 `pencil_exported`、所有导出目标状态都是 `pencil_exported`，且导出文件存在、尺寸正确。
