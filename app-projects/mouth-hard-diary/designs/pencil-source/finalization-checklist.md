# Pencil Finalization Checklist

Use this checklist after the image2 direction has been reviewed and the Pencil boards are ready. It is generated from `image-manifest.json` and `style-approval.json`; regenerate it instead of hand-editing stale values.

## Current State

| Item | State |
| --- | --- |
| Manifest status | `pencil_exported` |
| Style approval | `approved` |
| Pencil source | `designs/pencil-source/mouth-hard-diary.pen` |
| Runtime export root | `h5/assets/visuals/pencil-export/` |
| Direction | 深夜便利贴 + 霓虹批注 |

## Approval Record Template

Only apply this shape after the user confirms the visual direction from Pencil boards. Keep `selectedSources` from the existing approval file; update the approval fields, do not remove source decisions.

```json
{
  "project": "mouth-hard-diary",
  "status": "approved",
  "reviewPage": "designs/imagegen-review.html",
  "pencilFile": "designs/pencil-source/mouth-hard-diary.pen",
  "directionName": "深夜便利贴 + 霓虹批注",
  "decisionSummary": "首页底板使用 clean background，强视觉使用 neon sticky，结果卡使用 result card，分享海报使用 share poster，贴纸组进入 sticker kit。",
  "approvedBy": "YOUR_NAME",
  "approvedAt": "2026-07-29T05:19:42.374Z",
  "approvalNotes": "Confirmed from Pencil boards after importing image2 sources and checking H5-safe crops."
}
```

Generate a reviewable approval draft before applying anything to the live approval file:

```bash
npm run style:approval-draft -- --by=YOUR_NAME --notes="Confirmed from Pencil boards."
npm run verify:style-approval-draft
node tools/apply-style-approval-draft.js
node tools/apply-style-approval-draft.js --yes
```

## Source Import Check

| Source file | Role | Board | Size | State |
| --- | --- | --- | --- | --- |
| `images/source-home-bg-clean-image2.png` | home_ui_background | 01 Home Hero Direction | 853 x 1844 | file exists |
| `images/source-hero-neon-sticky-image2.png` | hero_visual | 01 Home Hero Direction | 941 x 1672 | file exists |
| `images/source-result-card-bg-image2.png` | result_card_background | 02 Result Report Card | 941 x 1672 | file exists |
| `images/source-share-poster-image2.png` | share_poster_background | 03 Share Poster | 941 x 1672 | file exists |
| `images/source-status-dashboard-image2.png` | brand_secondary_visual | 00 Image2 Source Board | 941 x 1672 | file exists |
| `images/source-sticker-sheet-image2.png` | sticker_kit | 04 Sticker Kit | 1254 x 1254 | file exists |

## Pencil Export Check

| Pencil node | Board | Export destination | Expected size | Runtime usage | Manifest status | File state |
| --- | --- | --- | --- | --- | --- | --- |
| `export/hero-report-collage` | 01 Home Hero Direction | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\h5\assets\visuals\pencil-export\hero-report-collage.png` | 941 x 1672 | required | `pencil_exported` | file exists |
| `export/share-poster-bg` | 03 Share Poster | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\h5\assets\visuals\pencil-export\share-poster-bg.png` | 941 x 1672 | required | `pencil_exported` | file exists |
| `export/report-stickers` | 04 Sticker Kit | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\h5\assets\visuals\pencil-export\report-stickers.png` | 1254 x 1254 | optional_future | `pencil_exported` | file exists |

## Command Sequence

```bash
npm run pencil:operator-pack
npm run pencil:finalization-checklist
npm run verify:style-approval
npm run style:approval-draft -- --by=YOUR_NAME --notes="Confirmed from Pencil boards."
npm run verify:style-approval-draft
node tools/apply-style-approval-draft.js --yes
npm run pencil:register-exports
npm run pencil:register-exports -- --yes
npm run verify:style-approval:final
npm run verify:assets:final
npm run verify:browser
npm run verify:launch
```

## Hard Rules

- Approval must come after Pencil boards exist; do not approve only loose image2 files.
- Do not hand-edit or parse the `.pen` file.
- Do not hand-edit `image-manifest.json` to `pencil_exported`; use `npm run pencil:register-exports -- --yes`.
- H5 must only reference `h5/assets/visuals/pencil-export/` runtime images.
- Final launch still requires runtime cleanup after Pencil assets pass.

