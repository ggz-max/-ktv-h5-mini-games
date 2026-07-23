# Pencil Export Checklist

This checklist is the production gate for UI image assets.

## Source File

Expected Pencil source:

```text
designs/pencil-source/mouth-hard-diary.pen
```

Do not hand-edit `.pen` files. Use Pencil tools only.

## Boards To Create

| Board | Size | Purpose |
|---|---:|---|
| `00 Image2 Source Board` | flexible | Archive all image2 originals with labels. |
| `01 Home Hero Direction` | 390 x 844 | Compose the H5 home hero visual. |
| `02 Result Report Card` | 390 x 844 | Compose result-page report texture and visual language. |
| `03 Share Poster` | 1080 x 1440 | Compose downloadable poster background. |
| `04 Sticker Kit` | flexible | Organize sticker sheet and optional crops. |

## Required Source Imports

Import these files into `00 Image2 Source Board` first:

```text
designs/pencil-source/images/source-home-bg-clean-image2.png
designs/pencil-source/images/source-hero-neon-sticky-image2.png
designs/pencil-source/images/source-result-card-bg-image2.png
designs/pencil-source/images/source-share-poster-image2.png
designs/pencil-source/images/source-status-dashboard-image2.png
designs/pencil-source/images/source-sticker-sheet-image2.png
```

## Required Export Nodes

| Node name in Pencil | Export destination | Current state |
|---|---|---|
| `export/hero-report-collage` | `h5/assets/visuals/pencil-export/hero-report-collage.png` | Temporary preview; replace from Pencil. |
| `export/share-poster-bg` | `h5/assets/visuals/pencil-export/share-poster-bg.png` | Temporary preview; replace from Pencil. |
| `export/report-stickers` | `h5/assets/visuals/pencil-export/report-stickers.png` | Pending. |

## Confirmation Gate

Before exporting runtime PNGs:

1. Review `designs/imagegen-review.html`.
2. Confirm the visual direction with the user.
3. Update `designs/pencil-source/style-approval.json` to `approved`, with `approvedBy`, `approvedAt`, and notes from the confirmation.
4. In Pencil, build the boards and name export nodes exactly as above.
5. Export nodes to `h5/assets/visuals/pencil-export/`.
6. Update `designs/pencil-source/image-manifest.json` export target statuses to `pencil_exported`.
7. Run:

```bash
npm run verify:imagegen-review
npm run verify:style-approval:final
npm run verify:assets
npm run verify:h5-asset-usage
npm run verify:assets:final
npm run verify:browser
```

## Non-Negotiables

- H5 must not reference `designs/pencil-source/images/`.
- H5 must not reference `source-*-image2.png`.
- `h5/assets/visuals/pencil-export/` contains runtime exports only.
- `npm run verify:h5-asset-usage` must prove required exports are referenced by H5.
- Temporary preview files are allowed for local H5 layout work, but they do not satisfy the final Pencil requirement.
- `npm run verify:assets:final` must pass before this UI image flow can be considered complete.
- Final mode requires `designs/pencil-source/style-approval.json` to be `approved` before any Pencil export can be treated as production.
- Final mode requires `designs/pencil-source/mouth-hard-diary.pen` to exist, manifest status to be `pencil_exported`, every export target status to be `pencil_exported`, and every exported file to match its expected dimensions.
