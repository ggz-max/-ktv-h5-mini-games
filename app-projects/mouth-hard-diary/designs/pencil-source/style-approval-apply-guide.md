# Style Approval Apply Guide

This guide is generated as a review aid. It does not approve the style by itself; approval only becomes real after `style-approval.json` is updated and final style verification passes.

## Draft File

`designs/pencil-source/style-approval.approved-draft.json`

## Changed Fields

| Field | Current | Draft |
| --- | --- | --- |
| status | approved | approved |
| approvedBy | 李广哲 | PENDING_USER |
| approvedAt | 2026-06-29T06:10:36.967Z | 2026-07-09T05:44:13.937Z |
| approvalNotes | Confirmed from Pencil boards for launch: export frames exist in mouth-hard-diary.pen and Pencil exported hero, share poster, and sticker runtime PNGs. | Pending final user confirmation from Pencil boards. |

## Required Review

- Confirm the Pencil boards exist in `designs/pencil-source/mouth-hard-diary.pen`.
- Confirm the user accepted the direction from Pencil boards, not only the loose image2 review page.
- Confirm the selected source decisions still match `image-manifest.json`.
- Apply the draft only after these checks pass.

## Apply Command

```bash
node tools/apply-style-approval-draft.js --yes
npm run verify:style-approval:final
```

