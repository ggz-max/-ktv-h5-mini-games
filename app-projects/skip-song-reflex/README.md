# 切歌别手滑

## 项目定位

切歌别手滑是一款放在手机点歌 H5 入口里的轻量反应/节奏小游戏。

一句话：

> 副歌快到了，别手滑。30 秒看你能不能切对节奏、躲开社死歌。

## 为什么做这个

- 方向遵循 `decisions/0003-lightweight-copyable-minigame-benchmarking.md`：轻量、可快速复制、从成熟小游戏机制中找方向。
- 借鉴 `跳一跳`、手速榜、箭头反应、轻节奏挑战等成熟小游戏机制。
- 手机点歌 H5 是混合人群入口，切歌、抢副歌、手滑、冷场是男女用户和朋友局都能理解的 KTV 语境。
- 不做真实音频识别，不碰版权音乐播放，不和已有 K 歌 App 的录唱/练歌功能内耗。

## 当前阶段

MVP 已完成基础开发，包含调研、PRD、Pencil 原型资产、前端 H5、轻量后端接口和本地验证脚本。

当前输出：

- `research/market-and-mechanics.md`：同类反应/手速小游戏机制调研和啊哈时刻。
- `product/mvp-prd.md`：MVP PRD，收敛到 3 个核心功能。
- `designs/skip-song-reflex.pen`：Pencil 源文件，包含入口、玩法、游戏、结算、分享海报和资产板。
- `designs/exports/`：从 Pencil 导出的界面与组件切图。
- `frontend/`：基于 Pencil 导出资产实现的 H5。
- `backend/`：配置、排行榜、埋点事件接口。
- `verification/`：本地 Playwright 截图验证产物。

## H5 与 App 分工

H5：

- 手机点歌入口曝光。
- 单局 30-60 秒反应挑战。
- 失败/高分结果分享。
- 同局挑战链接。
- App 下载或唤起 fake-door。

App：

- 每日挑战、关卡包、好友榜、皮肤、历史战绩、赛季称号。
- 不承接本地生活、门店聚合、陌生人社交或 K 歌主功能。

## Pencil 状态

Pencil 已连接并完成 `designs/skip-song-reflex.pen`。

前端引用的界面图、控台、按钮、轨道、判定区、结果面板和分享海报均来自 Pencil 导出资产，并同步到 `frontend/assets/pencil/`。
