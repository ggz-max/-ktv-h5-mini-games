# Preflight Report

Generated: 2026-07-29T05:19:41.413Z

This report is the final preflight view before real sampling. If it says `internal_only`, do not recruit real users or interpret traffic as real conversion data.

## Current Mode

| item | value |
| --- | --- |
| mode | internal_only |
| can sample real users | no |
| blocking summary | runtime JSONL 未清空; runtime 含本地验证标记 |
| launch gate | `npm run verify:launch` |

## Design Gates

| gate | status | detail |
| --- | --- | --- |
| style approval | ok | 李广哲 @ 2026-06-29T06:10:36.967Z |
| Pencil source | ok | designs/pencil-source/mouth-hard-diary.pen |
| Pencil exports | ok | ready |

Review links: `/designs/imagegen-review.html`, `/designs/style-approval.json`, `/designs/asset-index.md`, `/designs/operator-pack.md`, `/designs/handoff-packet.md`.

## Pencil Assets

| asset | status | destination |
| --- | --- | --- |
| hero-report-collage.png | pencil_exported | h5/assets/visuals/pencil-export/hero-report-collage.png |
| share-poster-bg.png | pencil_exported | h5/assets/visuals/pencil-export/share-poster-bg.png |
| report-stickers.png | pencil_exported | h5/assets/visuals/pencil-export/report-stickers.png |

Pencil 最终切图已完成。

## Runtime Data

| file | rows |
| --- | --- |
| reports.jsonl | 2 |
| events.jsonl | 0 |
| interviews.jsonl | 0 |
| total | 2 |

当前 runtime 含 verify_data / verify_variant / verify_user 标记，不能用于真实采样结论。

## Sampling Materials

| item | value |
| --- | --- |
| sampling links version | 2026-06-26-real-sampling-v1 |
| sampling links | 8 |
| cards index | exists |
| safety SOP | exists |
| launch handoff | exists |
| launch rehearsal | exists |

## Next Commands

```bash
powershell -ExecutionPolicy Bypass -File tools\check-pencil-readiness.ps1
npm run verify:assets:final
npm run sampling:prepare -- --yes
npm run verify:launch
```

## Operator Notes

- 不要在 `verify:launch` 通过前对外采样。
- 不要把 `temporary_preview` 当作最终视觉资产。
- 不要把本地验证数据当作真实用户结论。
- 不要收真实手机号、微信或身份信息。
- 完整交接见 `docs/launch-handoff.md`；现场安全边界见 `experiments/sampling-safety-sop.md`。
