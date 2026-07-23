# UI Asset Workflow

本项目之后所有 UI 图片资产先在 Pencil 里生成、整理、确认，再导出给 H5 使用。

## Source Of Truth

- 当前 Pencil 源文件：`C:\Users\GGG\.pencil\documents\0cf953ab-2c12-4d36-a2ea-3e289397ddaf\pencil-welcome-desktop.pen`
- 项目内同步源文件：`designs/pencil-source/pencil-welcome-desktop.pen`
- 项目内同步图片目录：`designs/pencil-source/images/`
- 项目内备份目录：`designs/pencil-backups/`
- H5 运行时导出目录：`www-room-lineup/assets/visuals/`
- Pencil 里按分组管理：概念海报、H5 页面截图、人格头像、人格卡片、旧皮肤、UI 微资产。

`.pen` 是设计源文件和交接板。H5 不直接依赖 `.pen`，只引用从 Pencil 导出的 PNG/WebP。

注意：`designs/ktv-personality-assets.pen` 当前不是有效资产源，真实有资产板预览的是 Pencil 的 `pencil-welcome-desktop.pen`。后续需要在 Pencil 里将这份文件另存为项目资产文件，或继续以它作为源文件并同步备份。

## Working Loop

1. 在 Pencil 源文件里生成或设计图片。
2. 在 Pencil 里按分组命名和摆放，确认视觉方向。
3. 从 Pencil 导出需要给 H5 使用的节点。
4. 将导出文件放入 `www-room-lineup/assets/visuals/` 下的对应目录。
5. H5 只改引用路径，不在前端里临时拼视觉资产。
6. 用本地脚本和截图验证 H5 页面加载正常。

## Style Guardrails

人格头像方向：

- 潮玩盲盒感。
- Q 版、卡通、3D toy-like。
- 年轻人可收藏，不幼儿化。
- 每个人格必须有独立形象和道具，不只是换颜色。
- 避免写实卡牌、欧美 TCG、厚重奇幻风。

人格卡片方向：

- 以已确认的人格头像为核心图形。
- 卡框可以霓虹、稀有度、收集感，但不要压过角色。
- 避免模型自由生成导致风格漂移。
- 如果 AI 卡片跑偏，优先保留头像，在 Pencil 里手工搭卡框。

## Naming

- 人格头像：`avatar-{persona}-pencil.png`
- 人格卡片：`skin-card-{persona}-pencil.png`
- 概念海报：`concept-{topic}-pencil.png`
- UI 微资产：`ui-{name}-pencil.png`

`persona` 使用小写代码：`spark`, `skip`, `romeo`, `echo`, `drop`, `mute`, `loop`, `boss`, `hype`, `risk`, `duo`, `drama`。

## Current Note

2026-06-26 已验证：Codex 可以通过 Pencil MCP 连接桌面端，并能在 `pencil-welcome-desktop.pen` 中生成可见 AI 图片。外部本地 PNG 直接写入 `image fill.url` 不稳定，因此后续优先在 Pencil 内生成源资产，再导出给 H5。

2026-06-26 已接入：12 张人格头像已从 Pencil 源文件导出到 `www-room-lineup/assets/visuals/pencil-export/avatars/`，H5 当前使用这批潮玩头像。卡片皮肤暂不接入新生成版本，因为当前卡片偏儿童盲盒，后续应基于已确认头像手工组合卡框。
