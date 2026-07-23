# 小流量投放运行手册

目标：用 7 天小流量验证“嘴硬日记 / 发疯报告”是否值得进入 App 深做。

## 0. 当前约束

UI 图片最终流程尚未完成：

```text
Pencil 设计/生成 -> 用户确认风格 -> Pencil 导出切图 -> H5 引用导出图
```

当前 `h5/assets/visuals/pencil-export/` 中仍是临时预览图。正式对外投放前应优先恢复 Pencil 并通过：

```bash
npm run verify:assets:final
```

如果只是内部链路演练，可以继续使用临时预览图，但复盘中必须标注“视觉资产未最终确认”。

## 1. 投放前检查

正式采集真实样本前先跑总门禁：

```bash
npm run verify:launch
```

它会检查最终 Pencil 切图、核心 H5/后端链路、内容库、入口实验、runtime 是否已清空，以及 `docs/runtime-review.md` 是否仍含测试数据。当前 Pencil 未恢复时，这个命令应失败。

内部链路演练运行：

```bash
npm run verify
npm run verify:assets
npm run verify:data
npm run verify:admin
npm run verify:browser
npm run verify:review
npm run verify:runtime-prepare
```

确认：

- H5 可打开：`http://127.0.0.1:4327`
- 后台可打开：`http://127.0.0.1:4327/admin.html`
- 首页和结果页截图已生成：
  - `h5/screenshots/home.png`
  - `h5/screenshots/result.png`
  - `h5/screenshots/admin.png`
- `npm run verify:assets:final` 若失败，代表 Pencil 最终切图还没完成。
- `npm run verify:launch` 若失败，不要开始真实样本采集。

## 2. 清理测试数据

运行正式采样准备：

```bash
npm run sampling:prepare -- --yes
```

确认备份目录存在：

```text
server/data/runtime-backups/
```

该命令会同时备份并清空 `reports.jsonl`、`events.jsonl` 和 `interviews.jsonl`，并重新生成干净的 `docs/runtime-review.md`。

准备后运行：

```bash
npm run verify:launch
```

如果 `docs/runtime-review.md` 仍显示“含测试数据：是”，不要开始正式投放。

## 3. 投放 URL

先生成投放链接包：

```bash
npm run sampling:links
npm run verify:sampling-links
```

运营投放以 `docs/sampling-links.md` 为准，不手抄 URL。若需要换门店、房间、渠道或每日目标，只改 `experiments/sampling-links.json` 后重新生成。

入口实验：

```text
/?variant=report
/?variant=persona
/?variant=translator
```

KTV 场景：

```text
/?variant=report&source=ktv&campaign=after_song&channel=room_qr&storeId=store_001&roomId=room_009
/?variant=persona&source=ktv&campaign=after_song&channel=room_qr&storeId=store_001&roomId=room_009
/?variant=translator&source=ktv&campaign=after_song&channel=room_qr&storeId=store_001&roomId=room_009
```

社群场景：

```text
/?variant=report&source=social&campaign=seed_group&channel=wechat
/?variant=persona&source=social&campaign=seed_group&channel=wechat
/?variant=translator&source=social&campaign=seed_group&channel=wechat
```

分享回流：

```text
/?variant=translator&source=shareback&campaign=poster&channel=friend_chat
```

## 4. 每日复盘

打开后台：

```text
http://127.0.0.1:4327/admin.html
```

查看顺序：

1. 转化漏斗：确认流失发生在入口、提交、生成、保存、分享还是 App CTA。
2. 二次生成：确认用户看完报告后是否愿意再试一次，用于判断复玩和内容探索欲。
3. 入口实验表现：比较 `report` / `persona` / `translator` 的报告率、分享率、再生成率和 App CTA。
4. 来源表现：比较 `ktv` / `social` / `shareback` 的报告率、分享率和留资率。
5. App 兴趣：比较 `archive` / `calendar` / `persona_atlas` / `style_templates`。
6. 留资意向：比较 `wechat` / `phone` / `skip`。
7. 内容反馈：比较 `accurate` / `off` / `uncomfortable`。
8. 最近报告：抽样看标题和语气是否尴尬、冒犯、无聊。

导出：

- 点击“导出数据”：保留完整 JSON。
- 点击“导出表格”：保留事件、漏斗、入口、来源、App 兴趣、留资意向、内容反馈 CSV 文本表。
- 运行：

```bash
npm run review:runtime
```

输出：

```text
docs/runtime-review.md
```

## 5. 判断规则

进入下一阶段：

- 保存率 >= 20%，或分享率 >= 12%。
- “太像我了”反馈占内容反馈 >= 40%，且“有点冒犯” < 10%。
- App CTA 点击率 >= 5%。
- App 兴趣第一名占兴趣点击 >= 40%，并能被访谈解释。
- 微信/手机号提醒意向率 >= 2%，且 `skip` 没有明显压过二者总和。
- 访谈里有人明确说想保存历史、想每天测、想换风格。

继续调入口：

- 首页到开始 < 10%。
- 某个 variant 开始高但报告低。
- 社群来源明显好于 KTV，或反过来。

只做营销 H5：

- 点击和分享尚可，但 App CTA 和复访很弱。

暂停方向：

- 点击、保存、分享都低。
- 用户反馈内容尴尬、冒犯、像营销号。

## 6. 访谈抽样

每天找 2-3 个真实使用者，问：

1. 哪句话最像你？
2. 哪句话让你不想发？
3. 你会发给谁？
4. 你想保存它吗，为什么？
5. 明天你还会再测一次吗？
6. 如果有 App，你希望里面有什么？
7. 你不希望它做什么？

把访谈要点录入后台“访谈记录”表单。`npm run review:runtime` 会自动把最近访谈带进 `docs/runtime-review.md`。

后台“决策摘要”和日复盘“决策摘要”会把行为指标与访谈信号合成 `继续采样` / `进入 MVP 深做` / `先做传播型 H5` / `暂停方向` 等建议；真实采样前如果显示 `仅可内部联调`，先清空本地验证数据。

## 7. 回滚与异常

如果 H5 无法打开：

```bash
npm start
npm run verify
```

如果后台无数据：

```bash
npm run verify:data
```

如果导出或复盘异常：

```bash
npm run verify:review
npm run verify:runtime-prepare
```

如果视觉资产被误用：

```bash
npm run verify:assets
```

如果要确认最终视觉链路：

```bash
npm run verify:assets:final
```
