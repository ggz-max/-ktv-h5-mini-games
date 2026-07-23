# 后端配合方案

## 目标

支持 H5 MVP 的报告生成、图片保存、分享统计、风险识别和 App 承接。

第一版可以用规则模板 + 轻量 AI 生成混合方案：

- 模板兜底：稳定、低成本、可控。
- AI 生成：提高个性化和新鲜感。

## 核心接口

### 0. 获取 H5 配置

`GET /api/v1/mouth-hard/config`

响应：

```json
{
  "version": "2026-06-26-content-v1",
  "scenes": [
    { "key": "work_pressure", "label": "上班/上学受气" }
  ],
  "styles": [
    {
      "key": "decent_breakdown",
      "label": "体面崩溃",
      "description": "看起来没事，其实已静音爆炸"
    }
  ]
}
```

用途：

- H5 动态渲染破事类型和嘴硬风格。
- 运营改内容库后，不需要同步改 H5 HTML。
- 前端上报 `configVersion`，便于分析不同内容版本表现。
- 支持入口文案实验，通过 `variant` 参数返回不同首页 copy。

入口实验参数：

```http
GET /api/v1/mouth-hard/config?variant=persona
```

当前 variant：

- `report`
- `persona`
- `translator`

### 1. 创建报告

`POST /api/v1/mouth-hard/reports`

请求：

```json
{
  "scene": "work_pressure",
  "style": "decent_breakdown",
  "text": "今天真的很累，但我不想承认。",
  "source": "ktv_h5",
  "campaign": "after_song",
  "channel": "ktv_screen_qr",
  "roomId": "optional",
  "storeId": "optional"
}
```

响应：

```json
{
  "reportId": "rpt_123",
  "riskLevel": "normal",
  "title": "体面崩溃观察员",
  "quote": "你不是没事，你只是把崩溃调成了静音模式。",
  "bullets": [
    "表面：还能回消息，甚至会发表情包。",
    "真实：心里已经开了三次庭。",
    "嘴硬：没关系，我只是暂时不想做人。"
  ],
  "advice": "先别复盘人生，先喝口水。",
  "energy": {
    "sanity": 36,
    "mouthHard": 91,
    "needSleep": 84
  },
  "shareImageUrl": null
}
```

### 2. 生成分享图

`POST /api/v1/mouth-hard/reports/{reportId}/share-image`

请求：

```json
{
  "theme": "neon_note",
  "format": "poster"
}
```

响应：

```json
{
  "reportId": "rpt_123",
  "shareImageUrl": "https://cdn.example.com/reports/rpt_123.png"
}
```

MVP 前端也可以先用 DOM 截图或静态模板生成，后端接口预留。

### 3. 埋点上报

`POST /api/v1/events`

事件：

- `mh_home_view`
- `mh_start_click`
- `mh_scene_select`
- `mh_style_select`
- `mh_text_submit`
- `mh_generate_success`
- `mh_generate_fail`
- `mh_save_click`
- `mh_share_click`
- `mh_copy_click`
- `mh_app_cta_click`
- `mh_app_interest_click`
- `mh_lead_intent_click`
- `mh_report_feedback_click`
- `mh_regenerate_click`

公共字段：

```json
{
  "event": "mh_generate_success",
  "anonymousId": "anon_123",
  "sessionId": "sess_123",
  "source": "ktv_h5",
  "campaign": "after_song",
  "channel": "ktv_screen_qr",
  "storeId": "optional",
  "roomId": "optional",
  "reportId": "optional",
  "timestamp": 1782460000000
}
```

## 数据表建议

### reports

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 报告 ID |
| anonymous_id | string | 匿名用户 ID |
| user_id | string/null | App 用户 ID |
| scene | string | 破事类型 |
| style | string | 风格 |
| has_text | boolean | 是否补充了输入 |
| input_length | number | 输入长度，仅用于判断输入成本 |
| risk_level | string | normal / caution / crisis |
| title | string | 称号 |
| quote | string | 主文案 |
| bullets | json | 三条解释 |
| advice | string | 今日建议 |
| energy | json | 能量条 |
| share_image_url | string/null | 分享图 |
| source | string | 来源 |
| created_at | datetime | 创建时间 |

### events

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 事件 ID |
| anonymous_id | string | 匿名用户 |
| session_id | string | 会话 |
| event | string | 事件名 |
| report_id | string/null | 报告 ID |
| source | string | 来源 |
| payload | json | 附加信息 |
| created_at | datetime | 时间 |

## MVP 本地数据沉淀

当前 MVP 先使用 JSONL 落盘，方便 fake-door 阶段快速回看数据，不依赖正式数据库。

运行时目录：

```text
server/data/runtime/
```

文件：

- `reports.jsonl`：每次报告生成记录。
- `events.jsonl`：前端埋点事件记录。
- `interviews.jsonl`：运营手动录入的用户访谈记录。

隐私边界：

- MVP 默认不保存用户输入原文，也不导出原始输入。
- 报告生成可以短暂使用 `text` 参与结果随机种子和风险词兜底，但落盘只保留 `hasText` / `inputLength`。
- 复盘如果需要用户原话，只能通过访谈记录保存概括后的关键反馈，不复制用户在输入框里的原始文本。
- 当前 fake-door 留资只记录 `wechat` / `phone` / `skip` 意向，不收真实手机号、微信号或身份信息。

本地查看接口：

```http
GET /api/v1/admin/runtime-summary
```

返回：

- `reports`：最近最多 500 条报告数量。
- `events`：最近最多 500 条事件数量。
- `eventCounts`：按事件名聚合。
- `funnelSummary`：总体转化漏斗。
- `variantSummary`：按入口实验 variant 聚合。
- `sourceSummary`：按来源 source 聚合。
- `appInterestSummary`：按 App 功能兴趣聚合。
- `leadSummary`：按上线提醒/留资意向聚合。
- `feedbackSummary`：按内容反馈聚合。
- `latestInterviews`：最近 10 条访谈记录。
- `decisionSummary`：把漏斗、App 兴趣、留资、内容反馈和访谈信号合成 MVP 决策建议。
- `latestReports`：最近 10 条报告。

本地导出接口：

```http
GET /api/v1/admin/runtime-export?limit=5000
```

返回：

- `exportedAt`：导出时间。
- `limit`：本次最多读取的 JSONL 行数。
- `summary`：与 `runtime-summary` 同口径的聚合摘要。
- `tables`：适合复制进表格的 CSV 文本。
- `reports`：报告明细数组。
- `events`：事件明细数组。
- `interviews`：访谈记录数组。

`tables` 包含：

- `eventCounts`：事件名和计数。
- `funnelSummary`：访问、开始、提交、生成、保存、承接漏斗。
- `variantSummary`：入口实验表现。
- `sourceSummary`：来源表现。
- `appInterestSummary`：App 功能兴趣表现。
- `leadSummary`：上线提醒/留资意向表现。
- `feedbackSummary`：内容反馈表现。
- `interviews`：访谈记录表。

后台页面 `http://127.0.0.1:4327/admin.html` 提供“导出数据”和“导出表格”按钮，前者下载完整 JSON，后者下载事件、漏斗、入口实验、来源表现、App 兴趣、留资意向、内容反馈 CSV 文本表，方便 fake-door 阶段复盘入口实验、来源表现、App 功能方向、留资意愿、内容命中感和最近报告。

投放状态接口：

```http
GET /api/v1/admin/launch-readiness
```

返回：

- `ok`：是否满足正式采样门禁。
- `mode`：`ready_for_real_sampling` / `internal_only`。
- `runtimeLines`：当前 runtime JSONL 行数。
- `pendingExports`：尚未完成 Pencil 最终导出的资源。
- `checks`：逐项门禁状态，覆盖最终 Pencil 切图、runtime 清空、验证数据标记和复盘文档状态。

后台页面会在“投放状态”面板展示该接口结果。只要显示“仅可内部联调”，就不要开始真实样本采集。

访谈记录接口：

```http
POST /api/v1/admin/interviews
```

字段：

| 字段 | 说明 |
|---|---|
| `segment` | 用户来源或分组 |
| `bestLine` | 哪句话最像用户 |
| `saveReason` | 为什么想保存或不想保存 |
| `appWish` | 如果有 App 希望有什么 |
| `concern` | 不希望它做什么、哪里冒犯 |

后台页面“访谈记录”表单会写入 `interviews.jsonl`，用于补足行为数据看不到的主观原因。

`decisionSummary` 字段：

| 字段 | 说明 |
|---|---|
| `verdict` | `internal_only` / `collect_more` / `iterate` / `mvp_deepen` / `marketing_h5` / `pause` |
| `label` | 给运营和产品看的中文判断 |
| `confidence` | `low` / `medium` / `high` |
| `sample` | 报告、事件、访谈、反馈、App 兴趣和留资样本量 |
| `metrics` | 保存、分享、App CTA、留资、命中和不适等核心比率 |
| `interestLeader` | App 兴趣第一名及占比 |
| `interviewSignals` | 访谈中保存历史、日历复访、换风格和冒犯顾虑的命中次数 |
| `reasons` | 当前判断的正向依据 |
| `blockers` | 当前不可进入下一阶段的阻塞项 |
| `nextActions` | 下一轮实验建议 |

`funnelSummary` 字段：

| 字段 | 说明 |
|---|---|
| `homeViews` | 首页曝光数，对应 `mh_home_view` |
| `starts` | 点击开始数，对应 `mh_start_click` |
| `textSubmits` | 输入提交数，对应 `mh_text_submit` |
| `generateSuccesses` | 生成成功事件数，对应 `mh_generate_success` |
| `reports` | 报告落盘数 |
| `saves` | 保存图片点击数 |
| `shares` | 分享点击数 |
| `copies` | 复制文案点击数 |
| `appCtas` | App 承接点击数 |
| `leadIntents` | 上线提醒/留资意向点击数 |
| `regenerates` | 看过结果后再次生成的点击数 |
| `startRate` | `starts / homeViews` |
| `submitRate` | `textSubmits / starts` |
| `generateRate` | `generateSuccesses / textSubmits` |
| `reportRate` | `reports / starts` |
| `saveRate` | `saves / reports` |
| `shareRate` | `shares / reports` |
| `copyRate` | `copies / reports` |
| `appCtaRate` | `appCtas / reports` |
| `leadIntentRate` | `leadIntents / reports` |
| `regenerateRate` | `regenerates / reports` |

`variantSummary` 字段：

| 字段 | 说明 |
|---|---|
| `events` | 该入口分组下的事件总数 |
| `reports` | 该入口分组下生成报告数 |
| `starts` | 点击开始数，对应 `mh_start_click` |
| `saves` | 点击保存数，对应 `mh_save_click` |
| `shares` | 点击分享数，对应 `mh_share_click` |
| `appCtas` | 点击 App 承接数，对应 `mh_app_cta_click` |
| `leadIntents` | 留资意向点击数 |
| `regenerates` | 二次生成点击数 |
| `reportRate` | `reports / starts` |
| `shareRate` | `shares / reports` |
| `regenerateRate` | `regenerates / reports` |

`sourceSummary` 字段：

| 字段 | 说明 |
|---|---|
| `events` | 该来源下的事件总数 |
| `reports` | 该来源下生成报告数 |
| `starts` | 点击开始数，对应 `mh_start_click` |
| `shares` | 点击分享数 |
| `leadIntents` | 留资意向点击数 |
| `reportRate` | `reports / starts` |
| `shareRate` | `shares / reports` |
| `leadIntentRate` | `leadIntents / reports` |

`appInterestSummary` 字段：

| key | 说明 |
|---|---|
| `archive` | 保存历史报告 |
| `calendar` | 精神状态日历 |
| `persona_atlas` | 嘴硬人格图鉴 |
| `style_templates` | 更多发疯模板 |

`mh_app_interest_click` 的 `payload.interest` 写入上述 key，用来判断 App 深做时优先做“档案保存”、“日历复访”、“人格收集”还是“模板扩展”。

`leadSummary` 字段：

| key | 说明 |
|---|---|
| `wechat` | 用户选择微信提醒 |
| `phone` | 用户选择手机号提醒 |
| `skip` | 用户明确暂不留资 |

`mh_lead_intent_click` 的 `payload.method` 写入上述 key。MVP 阶段只记录意向，不收集真实手机号或微信身份；真实留资需要单独补隐私授权、存储和删除机制。

`feedbackSummary` 字段：

| key | 说明 |
|---|---|
| `accurate` | 用户认为“太像我了” |
| `off` | 用户认为“不太准” |
| `uncomfortable` | 用户认为“有点冒犯” |

`mh_report_feedback_click` 的 `payload.feedback` 写入上述 key，用来判断内容命中感和冒犯风险。

H5 会从 URL 自动读取以下来源参数，并带入报告生成与埋点：

```text
?source=ktv&campaign=after_song&channel=room_qr&storeId=store_001&roomId=room_009
?utm_source=social&utm_campaign=friend_share&utm_medium=wechat
```

默认归因：

- 未带 URL 参数时，前端事件和报告统一使用 `source=h5_mvp`、`campaign=default`、`channel=direct`。
- 只带部分 URL 参数时，缺失字段使用上述默认值补齐，避免事件落到 `unknown` 而报告落到 `h5_mvp`。

第一轮入口实验优先看：

1. `starts / mh_home_view`：入口文案吸引力。
2. `reports / starts`：从入口到生成完成的转化。
3. `saves / reports`：结果图保存价值。
4. `appCtas / reports`：App 承接意愿。

验证命令：

```bash
npm run verify:data
```

注意：JSONL 只用于 MVP 本地验证。进入真实灰度后，应迁移到数据库或数据平台，并补充匿名用户 ID、来源、渠道、活动、门店、包厢、AB 实验分组等字段。

## 风险识别

第一版建议三层：

1. 关键词规则：自伤、自杀、伤害他人、暴力威胁。
2. AI 分类：normal / caution / crisis。
3. 生成策略：crisis 不走发疯文案，改为支持提示。

## 生成策略

### 模板兜底

当前 MVP 已采用内容库模板兜底，内容文件位于：

```text
server/data/report-content.json
```

按 scene + style 组合取模板：

- 标题池。
- 主文案池。
- bullet 模板。
- advice 池。

优点：

- 成本低。
- 可控。
- 适合 H5 首测。

内容发布流程：

1. 运营或产品修改 `server/data/report-content.json`。
2. 运行 `npm run verify:content`。
3. 运行 `npm run verify:copy`。
4. 运行 `npm run verify`。
5. 重启服务，使内容库生效。
6. 抽样请求 `/api/v1/mouth-hard/reports`，确认 `contentVersion` 和文案正确。

### AI 增强

输入：

- scene
- style
- text
- 禁止医疗诊断
- 禁止鼓励危险行为
- 输出 JSON

要求：

- 生成短句。
- 保持幽默但不伤害。
- 原始输入不直接暴露到分享图。

## 隐私

- 匿名用户可生成报告。
- 原始输入默认不展示在分享图。
- 原始输入如需保存，必须加密。
- MVP 上线提醒只记录 `wechat` / `phone` / `skip` 选择意向，不收真实手机号、微信 OpenID 或联系方式。
- 真实留资前必须增加明确授权、隐私说明、撤回和删除机制。
- 用户可删除历史报告。
- App 登录后才做跨设备历史同步。
