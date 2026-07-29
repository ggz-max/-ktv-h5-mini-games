# Launch Rehearsal Report

Generated: 2026-07-29T05:19:41.308Z

This report is for founder/operator rehearsal before formal sampling. It is allowed to be green while launch is still blocked, because Pencil final exports and runtime cleanup are intentionally separate gates.

## Mode

| Item | Value |
| --- | --- |
| Current mode | visuals ready, runtime cleanup required |
| Launch gate | `npm run verify:launch` |
| Pencil readiness | `powershell -ExecutionPolicy Bypass -File tools\check-pencil-readiness.ps1` |
| Final asset gate | `npm run verify:assets:final` |

## Chain Status

| Area | State | Evidence |
| --- | --- | --- |
| Research | ready | User profile, market patterns, and content safety docs exist. |
| Product | ready | MVP PRD, content system, entry experiments, and post-sampling backlog exist. |
| Frontend | ready for internal rehearsal | H5 flow and admin dashboard have smoke/browser checks. |
| Backend | ready for internal rehearsal | Local APIs, JSONL runtime logging, exports, and launch APIs are implemented. |
| Sampling materials | ready for internal rehearsal | 8 links, printable cards, field playbook, and safety SOP. |
| Pencil source | ready | designs/pencil-source/mouth-hard-diary.pen |
| Style approval | ready | 李广哲 @ 2026-06-29T06:10:36.967Z |
| Pencil exports | ready | all exports registered |
| Runtime data | blocked for real sampling | 2 rows; verification markers=yes |

## Pencil Handoff

| Artifact | Path |
| --- | --- |
| Board spec | `designs/pencil-source/pencil-board-spec.md` |
| Operator pack | `designs/pencil-source/operator-pack.md` |
| Finalization checklist | `designs/pencil-source/finalization-checklist.md` |
| Handoff packet | `designs/pencil-source/handoff-packet.md` |
| Style approval | `designs/pencil-source/style-approval.json` |
| Runtime export root | `h5/assets/visuals/pencil-export/` |

## Rehearsal Script

1. Open `http://127.0.0.1:4327` and complete the H5 flow once with non-sensitive test text.
2. Open `http://127.0.0.1:4327/admin.html` and confirm launch status, delivery audit, events, reports, and sampling links render.
3. Open `designs/imagegen-review.html` and compare the source images against `designs/pencil-source/pencil-board-spec.md`.
4. Do not ask the user to approve final style until the same direction exists inside `mouth-hard-diary.pen`.
5. Do not treat sampling-card traffic as real launch data until `npm run verify:launch` passes.

## Stop Conditions

- Stop before real users if any required Pencil export is still `temporary_preview` or `pending`.
- Stop before real users if `designs/pencil-source/mouth-hard-diary.pen` is missing.
- Stop before real users if `style-approval.json` is not approved from Pencil boards.
- Stop before real users if runtime JSONL still has local verification data.
- Stop before collecting contact details; current MVP records only anonymous intent.

## Commands

```bash
npm run verify
npm run verify:browser
npm run verify:admin
npm run verify:launch-api
npm run verify:pencil-handoff
npm run verify:style-approval
npm run verify:launch
```
