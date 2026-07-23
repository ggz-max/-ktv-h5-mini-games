# 麦克风跳一跳

## 项目定位

麦克风跳一跳是一款放在手机点歌 H5 入口里的轻量蓄力跳跃小游戏。

一句话：

> 按住蓄力，松手让麦克风跳到下一个音箱。跳歪就下麦，跳准就继续刷分。

## 为什么做这个

- 遵循 `decisions/0003-lightweight-copyable-minigame-benchmarking.md`：轻量、可快速复制、必须有成熟小游戏母体。
- 直接借鉴微信现象级小游戏 `跳一跳` 的核心机制：按住蓄力、松手跳跃、落点判定、连续得分、失败后立刻再来。
- 和 `包厢大扫除` 一样上手轻，但玩法不重复：它不是清理/收纳/消除，而是蓄力手感和落点判断。
- KTV 入口语境足够直观：麦克风、音箱、舞台灯、歌词台都能被混合人群秒懂，男性用户也容易被高分挑战和“不服再来”驱动。

## 当前阶段

MVP 已完成基础开发，包含调研、PRD、静态 H5、构建脚本和本地 Playwright 验证脚本。

2026-07-02 已进行一次视觉与手感返工：第一版过于像工程 demo，舞台空、平台粗、反馈弱；当前版改为更接近小游戏的 KTV 舞台、图形化平台、即时最高分、落点反馈和更完整的结果/分享页。

2026-07-02 已把 `gpt-image-2` 生成的页面和图标设计稿接入实际 H5：前端资产位于 `frontend/assets/generated-ui/`，H5 结果页可进入分享、好友排行、每日挑战/皮肤、页面和图标资源页。

当前输出：

- `research/benchmark-and-mechanics.md`：爆款母体和机制换皮说明。
- `product/mvp-prd.md`：MVP PRD，明确 H5 与 App 分工。
- `frontend/`：可玩的静态 H5。
- `frontend/assets/generated-ui/`：已接入 H5 的生成式 UI 设计稿资源。
- `scripts/`：构建与本地验证脚本。
- `verification/`：本地验证截图输出目录。

## H5 与 App 分工

H5：

- 手机点歌入口曝光。
- 30-90 秒内完成一局蓄力跳跃挑战。
- 连续得分、失败结算、挑战图文案。
- App 下载或唤起 fake-door。

App：

- 好友榜、每日挑战、皮肤、平台主题包、历史最高分、赛季称号。
- 不承接本地生活、门店聚合、陌生人社交或 K 歌主功能。

## ThunderBox 部署

2026-07-23 已部署到 ThunderBox：

- 公网地址：`https://microphone-jump-web.tbox.ktvsky.com/`
- ThunderBox app id：`zmp8q6sldk2z3cougkgo5t9v`
- 部署分支：`thunderbox-microphone-jump`
- 部署方式：Dockerfile 构建，Node 静态服务承载 `dist/`。
- 验证截图：`verification/deployed-microphone-jump-web.png`

说明：`microphone-jump.tbox.ktvsky.com` 和 `microphone-jump-h5.tbox.ktvsky.com` 曾用于失败的构建尝试，当前可用公网地址以上方 `microphone-jump-web` 为准。

## 本地运行

```bash
npm install
npm run dev
```

默认预览地址：

```text
http://127.0.0.1:5316/
```

构建和验证：

```bash
npm run build
npm run verify:local
```
