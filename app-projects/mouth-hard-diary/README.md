# 嘴硬日记 / 发疯报告

## 项目定位

嘴硬日记是一款面向年轻人的情绪表达产品。它不做严肃心理咨询，也不做传统长日记，而是把用户难以直说的疲惫、失恋、内耗、焦虑和怀旧，翻译成可笑、可保存、可分享的“发疯报告”。

一句话：

> 替用户把今天的破事，翻译成一张能发出去的精神状态报告。

## 目标用户

- 18-30 岁年轻用户，18-25 岁为主。
- 喜欢自嘲、玩梗、人格测试、发疯文学、朋友圈/群聊表达。
- 有情绪表达需求，但不一定愿意认真写日记或接受严肃安慰。
- 来自 KTV 入口的用户可作为第一批流量，但产品不局限于 KTV 场景。

## 当前阶段

从 0 到 1 MVP 探索：

1. 用户调研和机会判断。
2. 产品设计和 PRD。
3. Pencil UI 风格稿与切图。
4. H5 fake-door / MVP 原型。
5. 后端接口与数据埋点配合。
6. 真实流量验证。

## 核心原则

- 不医疗化：只做娱乐表达和情绪出口，不做诊断、治疗、危机干预承诺。
- 低输入成本：用户 30 秒内完成生成。
- 强表达物：输出必须能保存、能截图、能发群聊/朋友圈。
- 有嘴硬人格：产品语气要像懂梗的朋友，不像心理老师。
- 可沉淀：App 承接发疯档案、人格图鉴、情绪日历、风格模板和会员资产。
- 假门克制：MVP 只记录 App 兴趣和上线提醒意向，不收真实手机号或微信身份。

## H5 与 App 分工

H5：

- 流量入口和 fake-door 验证。
- 今日发疯报告生成。
- 结果海报保存/分享。
- App 下载或唤起导流。
- App 兴趣与上线提醒意向采样。

App：

- 历史报告与发疯档案。
- 嘴硬人格图鉴和称号墙。
- 私密日记、匿名树洞、好友共鸣。
- 高级模板、风格包、会员权益。

## 文档索引

- `research/user-research.md`：用户画像、动机和场景。
- `research/market-patterns.md`：常见产品形态和竞品启发。
- `product/mvp-prd.md`：MVP 产品需求。
- `product/post-sampling-backlog.md`：由采样数据生成的下一轮产品优先级清单。
- `backend/api-and-data-plan.md`：后端接口、数据结构和埋点。
- `experiments/validation-plan.md`：验证计划和成功阈值。
- `experiments/pilot-runbook.md`：7 天小流量投放执行手册。
- `experiments/field-sampling-playbook.md`：真实用户现场采样、观察、访谈和录入手册。
- `experiments/sampling-safety-sop.md`：真实采样时的隐私、冒犯、危机表达和停止采样处理边界。
- `experiments/sampling-links.json`：真实采样投放链接配置。
- `docs/sampling-links.md`：由 `npm run sampling:links` 生成的投放链接包。
- `docs/sampling-cards/index.html`：由 `npm run sampling:links` 生成的现场投放卡片索引。
- `docs/sampling-cards/screenshots/`：由 `npm run verify:sampling-cards:browser` 生成的现场卡片渲染截图。
- `designs/screenshots/imagegen-review.png`：由 `npm run verify:imagegen-review` 生成的 Pencil 风格确认页截图。
- `designs/ui-brief.md`：Pencil 设计简报和视觉方向。
- `designs/asset-workflow.md`：image2 -> Pencil -> H5 导出资产规则。
- `designs/pencil-export-checklist.md`：Pencil 画板、节点命名和导出门禁。
- `docs/build-status.md`：当前实现、验证结果和未完成项。
- `docs/delivery-audit.md`：从用户调研、产品、UI/Pencil、前后端到 launch 的交付矩阵。
- `docs/launch-handoff.md`：从内部联调到真实采样的角色分工、Pencil 前置、清库和复盘交接清单。
- `docs/preflight-report.md`：由 `npm run preflight:report` 生成的每日采样前状态总览。
- `docs/runtime-review.md`：由 `npm run review:runtime` 生成的本地运营日复盘。
- `docs/founder-brief.md`：由 `npm run brief:founder` 生成的创始团队决策简报。

## 投放前门禁

内部联调使用：

```bash
npm run verify
npm run verify:data
npm run verify:admin
npm run verify:docs-quality
npm run verify:delivery-audit
npm run verify:browser
npm run verify:imagegen-review
npm run verify:privacy-data
npm run verify:pencil-operator-pack
npm run verify:pencil-register-guard
npm run verify:product-backlog
npm run verify:launch-api
npm run verify:field-sampling
npm run verify:sampling-cards
npm run verify:sampling-cards:browser
```

正式采集真实样本前使用：

```bash
npm run sampling:links
npm run sampling:prepare -- --yes
npm run verify:launch
```

`sampling:links` 会根据 `experiments/sampling-links.json` 生成 `docs/sampling-links.md`、机器可读 JSON 和 `docs/sampling-cards/` 现场投放卡片。`verify:sampling-cards:browser` 会用本地 Chrome/Edge 渲染卡片并输出截图。`sampling:prepare` 会备份并清空 runtime JSONL，再生成干净日复盘。`verify:launch` 会要求投放链接包、现场投放卡片、卡片渲染、最终 Pencil 切图、runtime 清空和复盘文档都通过。当前 Pencil 未恢复时，这个命令应失败，不能用于真实对外投放。
