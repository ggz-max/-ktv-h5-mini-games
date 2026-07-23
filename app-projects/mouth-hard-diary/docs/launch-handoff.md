# Launch Handoff

这份文档给下一位运营、产品或创始人使用，用来判断“嘴硬日记 / 发疯报告”什么时候能从内部联调进入真实采样。

## 当前结论

当前只能内部联调，不能正式采样。原因不是 H5 或后端主流程缺失，而是还有两个正式投放前置条件未完成：

- 最终 UI 图片必须从 Pencil `.pen` 导出，当前仍有临时预览图。
- runtime JSONL 里仍有本地验证数据，正式采样前必须备份并清空。

唯一总门禁：

```bash
npm run verify:launch
```

只有这个命令全部通过，才允许把采样链接发给真实用户。

## 角色分工

| 角色 | 负责事项 | 验收证据 |
| --- | --- | --- |
| 产品 | 确认用户画像、MVP 范围、采样问题和下一轮 backlog | `product/mvp-prd.md`, `experiments/field-sampling-playbook.md`, `product/post-sampling-backlog.md` |
| 设计 | 在 Pencil 里沉淀 `.pen`，确认视觉风格，并导出最终切图 | `designs/pencil-source/mouth-hard-diary.pen`, `npm run verify:assets:final` |
| 前端 | H5 只引用 `h5/assets/visuals/pencil-export/` 下的导出图 | `npm run verify:assets`, `npm run verify:browser` |
| 后端 | 保证生成、埋点、访谈、导出、launch 状态可用 | `npm run verify:data`, `npm run verify:admin` |
| 运营 | 使用采样链接和卡片，现场访谈并录入后台 | `docs/sampling-links.md`, `docs/sampling-cards/index.html`, `experiments/field-sampling-playbook.md` |
| 创始人 | 看 founder brief 和 backlog 做下一步决策 | `docs/founder-brief.md`, `product/post-sampling-backlog.md` |

Pencil 资产状态可在 `http://127.0.0.1:4327/admin.html` 的“Pencil 资产工作台”查看；同一状态也由 `/api/v1/admin/pencil-assets` 输出。最终批准与导出登记按 `designs/pencil-source/finalization-checklist.md` 执行。

## 正式采样前步骤

1. 先运行 `npm run pencil:open` 确认 Pencil 可执行文件和本项目 `.pen` 目标路径。
2. 再运行 `npm run pencil:open -- --yes` 打开 Pencil 桌面应用。
3. 在 Pencil 中创建或打开：

```text
designs/pencil-source/mouth-hard-diary.pen
```

4. 导入 image2 源图：

```text
designs/pencil-source/images/
```

5. 按 `designs/pencil-source/operator-pack.md` 和 `designs/pencil-source/handoff-packet.md` 完成画板和导出节点。
6. 用户确认视觉风格。
7. 重新生成并打开最终确认清单：

```bash
npm run pencil:finalization-checklist
```

```text
designs/pencil-source/finalization-checklist.md
```

8. 生成风格确认草稿，检查后再应用到正式确认文件：

```bash
npm run style:approval-draft -- --by=YOUR_NAME --notes="Confirmed from Pencil boards."
npm run verify:style-approval-draft
node tools/apply-style-approval-draft.js
node tools/apply-style-approval-draft.js --yes
```

9. 从 Pencil 导出切图到：

```text
h5/assets/visuals/pencil-export/
```

10. 运行最终登记 dry-run，确认 approval、`.pen`、导出文件和尺寸都满足要求：

```bash
npm run pencil:register-exports
```

11. dry-run 通过后，由脚本登记最终导出状态，不要手动把 manifest 改成 `pencil_exported`：

```bash
npm run pencil:register-exports -- --yes
```

12. 运行：

```bash
npm run verify:assets:final
npm run verify:browser
```

13. 重新生成采样链接和投放卡片：

```bash
npm run sampling:links
npm run verify:sampling-links
npm run verify:sampling-cards
npm run verify:sampling-cards:browser
```

14. 只在准备正式采样时清空 runtime：

```bash
npm run sampling:prepare -- --yes
```

这一步会备份并清空当前 runtime JSONL，不要在仍需保留本地验证数据时执行。

15. 运行总门禁：

```bash
npm run verify:launch
```

## 采样当天

- 使用 `docs/sampling-links.md` 里的链接，不要手动改 URL 参数。
- 使用 `docs/sampling-cards/index.html` 和截图做现场卡片。
- 现场人员必须先读 `experiments/sampling-safety-sop.md`，遇到冒犯、隐私质疑或危机表达时按 SOP 停止或降级处理。
- 每完成 1 个用户，打开 `http://127.0.0.1:4327/admin.html` 录入访谈。
- 不复制用户原始输入进复盘文档，只记录概括和匿名反馈。
- 不收真实手机号、微信或身份信息，只记录提醒意向。

## 当晚复盘

采样结束后运行：

```bash
npm run review:runtime
npm run brief:founder
npm run verify:review
npm run verify:founder-brief
npm run verify:product-backlog
```

优先看这几个问题：

- `report`、`persona`、`translator` 哪个入口完成率更高？
- 保存率、分享率、二次生成率是否出现至少一个强信号？
- App 兴趣第一名是否能被访谈解释？
- KTV、社群、海报回流哪个来源更像真实增长入口？
- 内容是否被认为冒犯、像心理诊断或像广告？

## 不允许的动作

- 不要手动读取或编辑 `.pen` 文件。
- 不要让 H5 直接引用 `designs/pencil-source/images/`。
- 不要把 `temporary_preview` 图片当作最终视觉资产。
- 不要在 `verify:launch` 未通过时对外采样。
- 不要把本地验证数据当作真实用户结论。
- 不要在 MVP 阶段收真实联系方式。

## 当前阻塞

截至本文件最后一次更新，Pencil 可执行文件已通过本机快捷方式找到：`D:\我的\Pencil\Pencil.exe`。但 Pencil 桌面进程未运行，且本项目源文件 `designs/pencil-source/mouth-hard-diary.pen` 尚不存在。创建该 `.pen`、完成画板确认并从 Pencil 导出前，最终 UI 图片链路仍不能视为完成。
