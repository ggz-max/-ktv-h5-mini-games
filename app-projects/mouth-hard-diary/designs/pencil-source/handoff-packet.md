# Pencil Handoff Packet

This packet is for the person operating Pencil. It turns the image2 assets into final H5 runtime images without editing the `.pen` file by script.

## Job To Be Done

Create or open the project Pencil file, import the image2 assets, compose the UI boards, get visual approval, export the runtime PNGs, and run the final asset gates.

| Item | Value |
| --- | --- |
| Project | mouth-hard-diary |
| Pencil file | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\mouth-hard-diary.pen` |
| Runtime export root | `h5/assets/visuals/pencil-export/` |
| Runtime export root | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\h5\assets\visuals\pencil-export\` |
| Style direction | 深夜便利贴 + 霓虹批注 |
| Current approval status | approved |
| Current manifest status | pencil_exported |

## Board Spec

Use `designs/pencil-source/pencil-board-spec.md` as the board-level source of truth before building in Pencil.

Board spec absolute path: `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\pencil-board-spec.md`
Import checklist CSV: `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\pencil-import-checklist.csv`
Import checklist JSON: `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\pencil-import-checklist.json`

## Pencil Board Build

| Board | What to place | Acceptance check |
| --- | --- | --- |
| 00 Image2 Source Board | All source images with filename, role, size, and SHA labels. | Every file below is visible and traceable. |
| 01 Home Hero Direction | Home clean background plus neon sticky hero crop. | Works behind H5 title/CTA and does not fight foreground text. |
| 02 Result Report Card | Result card background and text-safe paper area. | Report text can sit on top without low contrast. |
| 03 Share Poster | Share poster background with central readable area. | Canvas feels worth saving and sharing. |
| 04 Sticker Kit | Sticker sheet source and selected crops if needed. | Optional sticker export can be produced later from the same .pen. |

## Import List

| # | Absolute source file | Role | Target board | Size | Priority |
| --- | --- | --- | --- | --- | --- |
| 1 | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-home-bg-clean-image2.png` | home_ui_background | 01 Home Hero Direction | 853 x 1844 | primary |
| 2 | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-hero-neon-sticky-image2.png` | hero_visual | 01 Home Hero Direction | 941 x 1672 | primary |
| 3 | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-result-card-bg-image2.png` | result_card_background | 02 Result Report Card | 941 x 1672 | primary |
| 4 | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-share-poster-image2.png` | share_poster_background | 03 Share Poster | 941 x 1672 | primary |
| 5 | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-status-dashboard-image2.png` | brand_secondary_visual | 00 Image2 Source Board | 941 x 1672 | secondary |
| 6 | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images\source-sticker-sheet-image2.png` | sticker_kit | 04 Sticker Kit | 1254 x 1254 | primary |

## Export List

| # | Pencil node | Board | Absolute export file | Expected size | Usage | Current status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | export/hero-report-collage | 01 Home Hero Direction | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\h5\assets\visuals\pencil-export\hero-report-collage.png` | 941 x 1672 | required | pencil_exported |
| 2 | export/share-poster-bg | 03 Share Poster | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\h5\assets\visuals\pencil-export\share-poster-bg.png` | 941 x 1672 | required | pencil_exported |
| 3 | export/report-stickers | 04 Sticker Kit | `D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\h5\assets\visuals\pencil-export\report-stickers.png` | 1254 x 1254 | optional_future | pencil_exported |

## User Confirmation Script

Run this against the Pencil boards, not against loose image2 files.

| # | Question | Decision |
| --- | --- | --- |
| 1 | 这个方向是否成立：深夜便利贴 + 霓虹批注？ | yes / adjust / reject |
| 2 | 整体是否太暗，或者太像心理咨询产品？ | yes / adjust / reject |
| 3 | 发疯感是否足够，但不压抑？ | yes / adjust / reject |
| 4 | 首页主视觉是否一眼能看懂生成报告？ | yes / adjust / reject |
| 5 | 结果卡是否值得保存或分享？ | yes / adjust / reject |

Record approval only after the user confirms the Pencil boards. The live file is `designs/pencil-source/style-approval.json`.

## Command Handoff

Before approval:

```bash
npm run pencil:readiness-report
npm run verify:pencil-readiness-report
npm run verify:style-approval
```

After visual approval:

```bash
npm run style:approval-draft -- --by=YOUR_NAME --notes="Confirmed from Pencil boards."
npm run verify:style-approval-draft
node tools/apply-style-approval-draft.js --yes
```

After Pencil export:

```bash
npm run pencil:register-exports
npm run pencil:register-exports -- --yes
npm run verify:style-approval:final
npm run verify:assets:final
npm run verify:browser
npm run verify:launch
```

## Stop Conditions

- Stop if Pencil cannot save `designs/pencil-source/mouth-hard-diary.pen`.
- Stop if the user has not confirmed the Pencil boards.
- Stop if any required export is still marked `temporary_preview` or `pending`.
- Stop if H5 references any `designs/pencil-source/images/` source image directly.
- Stop if someone asks to hand-edit `image-manifest.json` to bypass the register script.

