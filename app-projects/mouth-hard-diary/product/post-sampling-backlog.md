# Post-Sampling Product Backlog

Generated: 2026-07-29T05:19:41.928Z

## Decision Context

| item | value |
| --- | --- |
| verdict | 仅可内部联调 / internal_only |
| confidence | high |
| sample | reports=2, events=0, interviews=0 |
| save/share/regenerate/appCta | 0.0% / 0.0% / 0.0% / 0.0% |
| has verification data | yes |
| style approval | approved |
| Pencil source file | exists |
| Pencil pending exports | 0 |

## Backlog

| priority | type | item | evidence | acceptance |
| --- | --- | --- | --- | --- |
| P1 | h5 | 强化结果卡保存/分享价值 | 保存率 0.0%，分享率 0.0% | 移动端结果页无溢出；分享海报信息层级清晰；保存率目标 >=20%，分享率目标 >=12%。 |
| P2 | app | App 假门：历史报告/发疯档案 | App 兴趣第一名：暂无；访谈保存信号：0 | App 兴趣 archive 排名第一或访谈明确提到保存历史；下一版做历史列表原型。 |
| P2 | app | App 假门：精神状态日历 | 访谈日历/复访信号：0；二次生成率 0.0% | 二次生成率 >=25% 或访谈出现每日、日历、复访诉求。 |
| P2 | app | App 假门：嘴硬人格图鉴 | 人格/风格访谈信号：0；App 兴趣第一名：暂无 | persona_atlas 兴趣领先，或访谈出现人格、称号、收集诉求。 |
| P2 | content | 更多发疯模板和风格包 | 二次生成率 0.0%；风格访谈信号：0 | 二次生成率 >=10%，且风格/模板访谈信号为正。 |
| P2 | safety | 内容边界和冒犯反馈收敛 | 冒犯反馈 0/0；访谈尴尬/冒犯信号：0 | uncomfortable 反馈占比 <10%；高风险输入继续走温和兜底。 |
| P2 | growth | 分享回流入口和二维码海报 | 分享率 0.0% | shareback source 有独立报告样本，分享率 >=12%，回流链接进入采样链接包。 |
| P2 | growth | 轻留资/内测提醒承接 | 留资意向率 0.0% | 微信/手机号提醒意向率 >=2%，且继续不收真实联系方式直到合规方案就绪。 |
| Done | design | 完成 Pencil 最终视觉链路 | 视觉风格已确认；Pencil .pen 已存在；Pencil 导出已完成 | style-approval 为 approved，.pen 源文件存在，所有 exportTargets 为 pencil_exported，H5 只引用 Pencil 导出图，verify:assets:final 通过。 |

## Product Bets

- H5 must prove save/share/replay before an App is justified.
- App work should start from the strongest observed intent: archive, calendar, persona atlas, or style templates.
- Pencil remains the source of truth for UI images; temporary H5 preview assets are not launch assets.
- Privacy boundary stays strict: do not store raw user input or real contact details in this MVP.

## First Build Sequence

1. P1 强化结果卡保存/分享价值 - 如果报告卡更像可发群聊的内容，保存率和分享率会先提升。
2. P2 App 假门：历史报告/发疯档案 - 如果用户想回看，独立 App 才有长期承接理由。
3. P2 App 假门：精神状态日历 - 如果用户愿意每天测，日历是复访抓手。
4. P2 App 假门：嘴硬人格图鉴 - 人格收集和称号图鉴能把一次生成变成长期收集。
5. P2 更多发疯模板和风格包 - 用户愿意再生成时，风格包会提升复玩和分享。
