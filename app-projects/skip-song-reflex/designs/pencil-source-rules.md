# Pencil 设计资产规则

## 当前状态

Pencil MCP 已连接到 `designs/skip-song-reflex.pen`。

已创建入口、玩法、游戏、结算、分享海报和资产板，并导出到 `designs/exports/`，同步给前端使用。

## 必须遵守

- 真实 UI 设计源必须存放在 `designs/skip-song-reflex.pen`。
- 前端实现所需的设计图、背景、按钮、卡片、海报框、游戏控台、事件卡等资产，必须从 `.pen` 导出到 `designs/exports/`。
- 前端只允许引用 `designs/exports/` 或同步到 `frontend/assets/pencil/` 的导出资产。
- 不允许绕过 Pencil 直接在前端中用脚本生成最终 UI 图。
- 不允许读取或手工解析 `.pen` 文件内容；`.pen` 只能通过 Pencil MCP 操作。

## 设计画板建议

当前 `.pen` 中包含这些画板：

1. `01 Entry`：入口页，390 x 844。
2. `02 Tutorial`：玩法提示层，390 x 844。
3. `03 Game`：游戏页，390 x 844。
4. `04 Result`：结算页，390 x 844。
5. `05 Share Poster`：分享海报，1080 x 1440。
6. `06 Asset Board`：可切图资产合集。

## 必需切图

- `bg-entry.png`：入口背景。
- `panel-game-console.png`：游戏控台底板。
- `track-reflex.png`：副歌轨道底图。
- `zone-hit.png`：判定区光效。
- `btn-cut.png`：切歌按钮。
- `btn-keep.png`：保留/别切按钮。
- `btn-rescue.png`：救场按钮。
- `card-event-chorus.png`：副歌事件卡。
- `card-event-danger.png`：危险事件卡。
- `card-event-rescue.png`：救场事件卡。
- `panel-result.png`：结果页底板。
- `frame-share-poster.png`：分享海报框。

## 前端引用策略

前端实现只引用 `frontend/assets/pencil/` 中同步自 `designs/exports/` 的 PNG 资产。新增界面或视觉变体时，先更新 `.pen`，再重新导出并同步。
