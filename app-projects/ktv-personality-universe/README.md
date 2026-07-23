# KTV 人格宇宙

## 当前方向

轻量级 App / H5 打包 APK 方向：**KTV 人格宇宙**。

一句话：

> 测出你的 KTV 人格，获得一张可分享、可收集的人格卡。

## 为什么做这个

- 不像美团，不依赖全国门店/商户信息收录。
- 不和已有 K歌 App 的录唱/练歌功能内耗。
- 不强依赖包厢阵容数据，优先读取历史点唱画像；没有真实数据时用兜底画像也能玩，朋友点开分享也能继续测。
- 像 MBTI、星座、网易云年度报告、游戏称号，容易产生分享。
- 更好玩，更容易制造啊哈时刻。

## 核心体验

1. 测测你的 KTV 人格。
2. 得到一个强称号，例如“气氛发动机”。
3. 拿到一张身份感强的人格卡。
4. 保存进档案库，看到下一张目标。
5. 分享给朋友，让对方点开也能测自己。

## 当前视觉概念

- `designs/assets/ktv-personality-universe-concept-v1.png`
- `designs/assets/demo-launcher-concept-v1.png`
- `designs/assets/library-replay-mission-concept-v1.png`
- `designs/assets/personality-abnormal-atlas-poster-v1.png`
- `designs/assets/room-lineup-share-poster-v1.png`
- `designs/assets/share-entry-invite-concept-v1.png`
- `designs/assets/library-vault-concept-v1.png`
- `product/personality-system-v1.md`
- `product/experience-design-v1.md`
- `research/sbti-logic.md`

视觉关键词：

- 霓虹 KTV
- 人格测试
- 分享图
- 宇宙感
- 强分享海报
- 少字、高冲击、好玩
- 避免罪案/违法/治安联想，聚焦“我的人格卡”“朋友也来测”的身份分享

## 当前不做

- 不做本地生活聚合。
- 不做陌生人社交广场。
- 不做在线 K歌。
- 不做复杂内容流。

## 首发人格方向

不使用“深情主唱、中华曲库、气氛组”这类大众标签，改成“简单英文词 + 中文人格 + 自嘲解读”体系。英文必须是用户看得懂的词，中文负责解释 KTV 场景。

当前 H5 已接入 12 张可收集人格卡。内部仍保留稳定 code 方便存档和分享链接，用户看到的是更像 SBTI 的「简单英文词 + 中文人格」：

- `STAR`：主场星 / 快歌和开场曲偏好高
- `SKIPPER`：切歌师 / 切歌和控场倾向强
- `LOVER`：纯爱者 / 纯情情歌和慢歌占比高
- `JOKER`：小丑 / 受伤情歌、入戏和自嘲感强

当前核心口号：

> 测出你的 KTV 人格，朋友点开也能玩。

## 第一版 MVP 焦点

先不要做完整 App，先把一个体验做到爆：

> 测出人格，获得一张可装备、可保存、可分享的人格卡。

链路：

1. H5 入口：测出你的 KTV 人格。
2. 扫描页：根据历史点唱画像生成测试仪式。
3. 结果页：给个人 KTV 人格词和命中证据。
4. 奖励页：领取并入档案，直接选择看档案、分享或再测。
5. 档案库页：用卡池盘看到已拥有卡片、未解锁卡位和下一张目标。
6. 分享图内容页：生成“我的 KTV 人格卡”。
7. 分享页：保存海报、系统分享、复制文案，让朋友点开也能看到来源人格卡并测自己。

## 当前 MVP 交付

基于第二张概念海报 `room-lineup-share-poster-v1.png`，已完成一个围绕 3 个核心功能的 H5 MVP：测人格、收集卡、生成分享图。

- `product/mvp-prd-room-lineup.md`：聚焦 PRD。
- `product/demo-ops-playbook.md`：Demo 运营实验手册，包含本地入口、漏斗埋点、实验判断和三核心验证。
- `product/singing-data-integration.md`：真实点歌数据接入契约，包含画像字段、聚合口径、会员标识、服务端接口和联调验收。
- `designs/ui-design-room-lineup.md`：UI 设计说明。
- `C:\Users\GGG\.pencil\documents\0cf953ab-2c12-4d36-a2ea-3e289397ddaf\pencil-welcome-desktop.pen`：当前真实 Pencil 视觉资产库，集中管理 gpt-image-2 生成的图片资产；项目内同步源在 `designs/pencil-source/`，备份在 `designs/pencil-backups/`。
- `designs/asset-workflow.md`：Pencil -> 导出切图 -> H5 引用的设计与前端交接规则。
- `www-room-lineup/assets/visuals/`：H5 可直接引用的 PNG 切图资产，包含从 Pencil 导出的 12 张潮玩人格头像、12 张 v2 人格主卡、档案库资产、分享图资产、扫描/奖励徽章。
- `www-room-lineup/index.html`：H5 MVP 入口。
- `www-room-lineup/demo-launcher.html`：团队演示入口页，集中打开首屏 A/B、档案库、卡片详情、分享页和运营漏斗等常用状态。
- `www-room-lineup/styles.css`：霓虹卡牌视觉。
- `www-room-lineup/app.js`：入口 -> 读取点唱画像 -> 生成测试 -> 结果 -> 领取并入档案 -> 档案库/分享/再测选择 -> 动态收藏进度 -> 分享确认交互。
- `www-room-lineup/manifest.webmanifest`：PWA 安装信息，用于类 App 预览和后续 H5 打包 APK。
- `www-room-lineup/sw.js`：基础离线缓存，预缓存 Demo 必需页面、脚本、样式和核心视觉资源。
- `tools/verify-share-poster.js`：本地 Chrome CDP 检查脚本，验证保存海报会生成 PNG。
- `tools/verify-collection-flow.js`：本地 Chrome CDP 检查脚本，验证再测后收藏进度会更新。
- `tools/verify-pick-scan-flow.js`：本地 Chrome CDP 检查脚本，验证历史点唱画像会影响测试结果。
- `tools/verify-mission-flow.js`：本地 Chrome CDP 检查脚本，验证档案库下一步行动会记录点击并跳转再测/分享。
- `tools/health-check.js`：演示前健康检查，验证 JS 语法、图片引用、关键 DOM、截图和风险词。
- `www-room-lineup/screenshots/h5-entry.png`：入口页截图。
- `www-room-lineup/screenshots/h5-demo-launcher.png`：团队演示入口页截图。
- `www-room-lineup/screenshots/h5-demo-launcher-mobile.png`：团队演示入口页窄屏走查截图。
- `www-room-lineup/screenshots/h5-entry-pwa.png`：PWA 配置接入后的入口页截图。
- `www-room-lineup/screenshots/h5-entry-variant-test.png`：首屏 A/B 测试 B 版截图。
- `www-room-lineup/screenshots/h5-entry-context.png`：带包厢/入口上下文参数的入口页截图。
- `www-room-lineup/screenshots/h5-scan-enhanced.png`：增强扫描页截图。
- `www-room-lineup/screenshots/h5-result.png`：个人结果页截图。
- `www-room-lineup/screenshots/h5-reward.png`：人格卡奖励页截图。
- `www-room-lineup/screenshots/h5-equipped.png`：已装备人格卡截图。
- `www-room-lineup/screenshots/h5-library.png`：人格档案库截图。
- `www-room-lineup/screenshots/h5-library-mission.png`：档案库下一步行动截图。
- `www-room-lineup/screenshots/h5-library-collection.png`：动态收藏态档案库截图。
- `www-room-lineup/screenshots/h5-library-param-demo.png`：URL 参数直达收藏态截图。
- `www-room-lineup/screenshots/h5-card-detail-locked.png`：未解锁人格卡详情截图。
- `www-room-lineup/screenshots/h5-lineup.png`：分享图内容页截图。
- `www-room-lineup/screenshots/h5-share.png`：分享确认页截图。
- `www-room-lineup/screenshots/h5-share-backurl.png`：旧版回流截图，当前主链路改为分享再进入测试。
- `www-room-lineup/screenshots/h5-share-system-share.png`：带系统分享按钮的分享页截图。
- `www-room-lineup/screenshots/h5-ops.png`：本地运营漏斗面板截图。
- `www-room-lineup/screenshots/h5-ops-export.png`：带事件导出按钮的运营面板截图。

## 当前可体验入口

本地启动：

```bash
cd www-room-lineup
python -m http.server 5202 --bind 127.0.0.1
```

访问：

- 演示入口页：`http://127.0.0.1:5202/demo-launcher.html`
- 普通体验：`http://127.0.0.1:5202/`
- A/B B 版入口：`http://127.0.0.1:5202/?reset=1&variant=test`
- 分享进入体验：`http://127.0.0.1:5202/?reset=1&source=share&member=friend`
- 运营漏斗面板：`http://127.0.0.1:5202/?ops=1#library`
- 重置演示状态：`http://127.0.0.1:5202/?reset=1`
- 指定人格/收藏态：`http://127.0.0.1:5202/?reset=1&persona=ROMEO&owned=SPARK,ROMEO&bonus=2#library`
- 指定卡片详情：`http://127.0.0.1:5202/?reset=1&owned=SPARK&detail=SKIP#library`
- 指定分享落地页域名：`http://127.0.0.1:5202/?shareBase=https%3A%2F%2Fexample.com%2Fktv-persona#share`

`bonus=2` 表示在 `owned` 基础上额外解锁 2 张演示人格卡，方便快速检查档案库状态。

演示前检查：

```bash
node tools/health-check.js
```

服务端档案与额度验收：

```bash
npm run verify:server
```

## 当前产品闭环

- 参与感：点击后直接读取历史点唱画像，不让用户提前选择人格或状态。
- 爽感：扫描后给强人格代码、稀有度、掉落人格卡。
- 收集：人格卡沉淀到档案库，优先按服务端档案展示已拥有/未解锁和下一张目标，本地状态只做无后端兜底。
- 分享：生成我的 KTV 人格卡，支持 Canvas 合成下载海报、系统分享和复制带测试入口的文案。
- 复玩：档案库以“主卡 + 下一张锁卡 + 12 格卡池”推动再测或生成分享图。
- 运营验证：`?ops=1` 本地记录扫描、领奖、档案、下一步行动、分享等事件。
- 复盘导出：运营面板支持导出本地事件 JSON，方便现场试完后看路径。
- 场景归因：支持 `source/member` 参数，埋点和导出 JSON 会带上来源上下文。
- 分享再进入：复制文案和系统分享会带 `reset=1&source=share&member=friend#entry`，朋友点开后直接进入测试。
- 真实数据接入：支持 `POST /api/singing-profile` 直接写画像，也支持 `POST /api/song-events` 写点唱歌曲事件，由服务端自动聚合成人格画像。

## 下一步实验

- A/B 测试首屏文案：“测出你的 KTV 人格” vs “30 秒抽 KTV 人格卡”。
- 测试分享转化：直接保存海报 vs 先展示分享图。
- 用 gpt-image-2 精修 8 张程序化变体卡面，替换同名 PNG。
- 接真实点歌数据后，把线上会员 ID、最近 N 首点唱事件和门店来源打通，替换演示画像兜底。







