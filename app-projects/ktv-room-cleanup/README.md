# 包厢大扫除

## 项目定位

包厢大扫除是一款放在手机点歌 H5 入口里的轻量消除/收纳小游戏。

一句话：

> 把乱成一团的 KTV 包厢物件清掉，90 秒内爽一局，失败也能发群挑战。

## 为什么做这个

- 方向遵循 `decisions/0003-lightweight-copyable-minigame-benchmarking.md`：轻量、可快速复制、从成熟小游戏机制中找方向。
- 借鉴成熟小游戏里的堆叠消除、货柜消除、收纳整理、差一点通关和群聊挑战机制。
- 手机点歌 H5 是混合人群入口，首发题材必须性别中性，男性、女性、朋友局、同事局和中年用户都能看懂。
- 不做本地生活，不做组局平台，不做陌生人社交，不和已有 K 歌 App 主功能内耗。

## 当前阶段

上线验证阶段。

当前输出：

- `research/market-and-mechanics.md`：同类小游戏机制调研和啊哈时刻。
- `product/mvp-prd.md`：MVP PRD，收敛到 3 个核心功能。

## 数据看板

项目内置轻量 SQLite 埋点，不依赖第三方 SDK。

- 看板页面：`/admin/analytics`
- JSON 接口：`/api/analytics/summary`
- 默认数据文件：`backend/data/analytics.sqlite`
- 可通过 `DATA_DIR` 或 `ANALYTICS_DB_PATH` 修改存储位置。

当前最小漏斗：

- `cleanup_home_view`：来到首页
- `cleanup_start_click`：点击开始
- `cleanup_game_end`：完成一局
- `cleanup_share_click`：点击分享

## H5 与 App 分工

H5：

- 手机点歌入口曝光。
- 单局轻游戏体验。
- 失败/通关结果分享。
- App 下载或唤起 fake-door。

App：

- 关卡包、每日挑战、排行榜、皮肤和历史战绩。
- 不承接本地生活、门店聚合或复杂社交。
