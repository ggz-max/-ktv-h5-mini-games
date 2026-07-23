# Pencil Operator Pack

This is the executable handoff pack for the Pencil operator. It is generated from `image-manifest.json` and `style-approval.json`; do not edit it by hand.

## Current Gate

| Item | State |
| --- | --- |
| Pencil source | `designs/pencil-source/mouth-hard-diary.pen` |
| Manifest status | `pending_pencil_import` |
| Style approval | `pending_user_confirmation` |
| Direction | 深夜便利贴 + 霓虹批注 |
| Runtime export root | `h5/assets/visuals/pencil-export/` |

## Operator Sequence

1. Open Pencil and create or open the project source file below.
2. Import every source image listed in this pack into `00 Image2 Source Board`.
3. Build the named boards and preserve filename labels beside the imported images.
4. Review the visual direction with the user using `designs/imagegen-review.html` and the Pencil boards.
5. After the user approves, update `style-approval.json` to `approved` with `approvedBy`, `approvedAt`, and concise approval notes.
6. Export the named Pencil nodes into `h5/assets/visuals/pencil-export/`.
7. Run `npm run pencil:finalization-checklist` and use `designs/pencil-source/finalization-checklist.md` for final approval/export checking.
8. Run `npm run pencil:register-exports` as a dry-run. It must pass before any manifest status is updated.
9. Run `npm run pencil:register-exports -- --yes` to set manifest `status` and export target statuses to `pencil_exported`.
10. Run final gates: `npm run verify:style-approval:final`, `npm run verify:assets:final`, `npm run verify:browser`, `npm run verify:launch`.

## Absolute Paths

Use these paths when importing or exporting from the desktop Pencil app.

```text
Pencil file: D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\mouth-hard-diary.pen
Source image directory: D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\images
Runtime export directory: D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\h5\assets\visuals\pencil-export\
Import checklist CSV: D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\pencil-import-checklist.csv
Import checklist JSON: D:\AIproject\production\ktv-h5-extension\app-projects\mouth-hard-diary\designs\pencil-source\pencil-import-checklist.json
```

## Import Checklist

Before importing images, open `designs/pencil-source/pencil-import-checklist.csv` or `designs/pencil-source/pencil-import-checklist.json` and work through the rows in order. Each row contains the absolute source path, target board, role label, dimensions, and SHA-256 fingerprint.

## Boards To Build

| Board | Size | Job |
| --- | --- | --- |
| 00 Image2 Source Board | flexible | Import every source image with filename labels, role labels, and SHA-256 notes. |
| 01 Home Hero Direction | 390 x 844 | Compose the H5 home hero visual from the clean background and neon sticky hero crop. |
| 02 Result Report Card | 390 x 844 | Compose result-page report texture and keep a text-safe card area. |
| 03 Share Poster | 1080 x 1440 | Compose a shareable poster background that keeps report text readable. |
| 04 Sticker Kit | flexible | Organize sticker source and export the sticker sheet or selected crops. |

## Source Imports

| # | File | Role | Board | Size | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| 1 | `images/source-home-bg-clean-image2.png` | `home_ui_background` | 01 Home Hero Direction | 853 x 1844 | `188914e77352672a1b5782a01c64d92e40222e9d8c7063afcf1e440f2574db8d` |
| 2 | `images/source-hero-neon-sticky-image2.png` | `hero_visual` | 01 Home Hero Direction | 941 x 1672 | `8d39b2b1b5fc79b4f9ae2e65904c0c1f046704ebe595f8501bbea3c14bc323f2` |
| 3 | `images/source-result-card-bg-image2.png` | `result_card_background` | 02 Result Report Card | 941 x 1672 | `fd3b15a750126a75a1d8f5b2dbe8e3fa7c052c6b00e59a47867cb7d9ada99741` |
| 4 | `images/source-share-poster-image2.png` | `share_poster_background` | 03 Share Poster | 941 x 1672 | `c359b1c3756f404544099ef1a0b7abfb78f26776fc84cbf7429836651b2c3712` |
| 5 | `images/source-status-dashboard-image2.png` | `brand_secondary_visual` | 00 Image2 Source Board | 941 x 1672 | `9808da6269cd785c08d4c56225c91a0f3455b231aa045f25a7d7b8311587823f` |
| 6 | `images/source-sticker-sheet-image2.png` | `sticker_kit` | 04 Sticker Kit | 1254 x 1254 | `6c4649d4e73a36ce60c2860e274d7bb1a57f28ba700f43ca6e6e0bf9bf4f1d76` |

Primary source assets:

- `images/source-home-bg-clean-image2.png`: Clean portrait background with enough lower negative space for H5 title and CTA.
- `images/source-hero-neon-sticky-image2.png`: Strongest tactile report visual; use as top hero crop or campaign visual.
- `images/source-result-card-bg-image2.png`: Large blank paper area; best for report text and energy bars.
- `images/source-share-poster-image2.png`: Large central blank card; best for downloadable social poster.
- `images/source-sticker-sheet-image2.png`: Sticker sheet source; import to Pencil and split/crop if individual stickers are needed.

Secondary or reserve source assets:

- `images/source-status-dashboard-image2.png`: High-quality but less sharp emotionally; reserve for app intro or empty state.

## Export Nodes

| # | Pencil node | Source board | Export file | Expected size | Runtime usage | Current status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `export/hero-report-collage` | 01 Home Hero Direction | `h5/assets/visuals/pencil-export/hero-report-collage.png` | 941 x 1672 | required | `temporary_preview` |
| 2 | `export/share-poster-bg` | 03 Share Poster | `h5/assets/visuals/pencil-export/share-poster-bg.png` | 941 x 1672 | required | `temporary_preview` |
| 3 | `export/report-stickers` | 04 Sticker Kit | `h5/assets/visuals/pencil-export/report-stickers.png` | 1254 x 1254 | optional_future | `pending` |

## Confirmation Script

Use these questions during the style check. Approval should be based on Pencil boards, not only on loose image2 sources.

1. 这个方向是否成立：深夜便利贴 + 霓虹批注？
2. 整体是否太暗，或者太像心理咨询产品？
3. 发疯感是否足够，但不压抑？
4. 首页主视觉是否一眼能看懂生成报告？
5. 结果卡是否值得保存或分享？

## Non-Negotiables

- Do not hand-edit or parse the `.pen` file.
- Do not let H5 reference `designs/pencil-source/images/`, `source-*-image2.png`, or `-image2` filenames.
- Temporary preview files in `h5/assets/visuals/pencil-export/` must be overwritten from Pencil before launch.
- Do not hand-edit `image-manifest.json` to `pencil_exported`; use `npm run pencil:register-exports -- --yes` after Pencil export.
- Final delivery requires the `.pen` file, approved style record, Pencil-exported runtime PNGs, and passing final asset gates.

