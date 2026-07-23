# Pencil Board Spec

This file is the board-level source of truth for turning the image2 assets into Pencil-managed UI image assets. The `.pen` file must match these board names, export node names, and runtime destinations before final launch.

## Source File

- Pencil source file: `designs/pencil-source/mouth-hard-diary.pen`
- Source image directory: `designs/pencil-source/images/`
- Runtime export directory: `h5/assets/visuals/pencil-export/`
- Manifest: `designs/pencil-source/image-manifest.json`
- Style approval record: `designs/pencil-source/style-approval.json`
- Import checklist CSV: `designs/pencil-source/pencil-import-checklist.csv`
- Import checklist JSON: `designs/pencil-source/pencil-import-checklist.json`

Do not hand-edit or parse the `.pen` file. Use Pencil as the source editor, then export PNGs into the runtime export directory.

H5 may only reference runtime exports from `h5/assets/visuals/pencil-export/`. It must not reference `designs/pencil-source/images/` or loose image2 source files.

## Boards

| Board | Canvas | Required source images | Purpose |
|---|---:|---|---|
| `00 Image2 Source Board` | flexible | all `source-*-image2.png` files | Import wall with filename, role, size, and SHA-256 labels. |
| `01 Home Hero Direction` | 390 x 844 preview plus 941 x 1672 export area | `source-home-bg-clean-image2.png`, `source-hero-neon-sticky-image2.png` | Home hero visual and first-screen emotional tone. |
| `02 Result Report Card` | 390 x 844 preview plus 941 x 1672 export area | `source-result-card-bg-image2.png`, `source-sticker-sheet-image2.png` | Result card texture and report-safe blank area. |
| `03 Share Poster` | 1080 x 1440 preview plus 941 x 1672 export area | `source-share-poster-image2.png`, `source-result-card-bg-image2.png` | Save/share poster background with readable center. |
| `04 Sticker Kit` | flexible plus 1254 x 1254 export area | `source-sticker-sheet-image2.png` | Sticker sheet cleanup and optional future runtime export. |

## Export Nodes

| Node name | Board | Runtime destination | Size | Required now |
|---|---|---|---:|---|
| `export/hero-report-collage` | `01 Home Hero Direction` | `h5/assets/visuals/pencil-export/hero-report-collage.png` | 941 x 1672 | yes |
| `export/share-poster-bg` | `03 Share Poster` | `h5/assets/visuals/pencil-export/share-poster-bg.png` | 941 x 1672 | yes |
| `export/report-stickers` | `04 Sticker Kit` | `h5/assets/visuals/pencil-export/report-stickers.png` | 1254 x 1254 | optional future |

## Visual Direction

Direction name: 深夜便利贴 + 霓虹批注

- Keep the mood late-night, self-mocking, and emotionally safe.
- Use tactile paper, sticky notes, marker strokes, and neon annotations.
- Preserve enough blank area for H5 text overlays.
- Avoid therapy, diagnosis, medical, or crisis-service aesthetics.
- Avoid making the page look like a generic social quiz or horoscope result.

## Acceptance Criteria

Before `npm run pencil:register-exports -- --yes` is allowed:

- `mouth-hard-diary.pen` exists in `designs/pencil-source/`.
- All six image2 source files are imported into `00 Image2 Source Board`.
- Every source image has a visible filename label and role label.
- The three export nodes exist with the exact names listed above.
- Required export PNGs overwrite the temporary preview files in `h5/assets/visuals/pencil-export/`.
- `style-approval.json` is `approved` with `approvedBy`, `approvedAt`, and approval notes based on the Pencil boards.
- `npm run verify:style-approval:final` passes.
- `npm run verify:assets:final` passes.
- `npm run verify:h5-asset-usage` still proves H5 references only runtime Pencil exports.
