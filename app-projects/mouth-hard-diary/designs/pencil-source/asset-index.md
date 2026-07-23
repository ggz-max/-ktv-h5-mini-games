# Pencil Source Asset Index

This index is generated from the current image2 source files and should travel with the Pencil `.pen` source. It exists so the Pencil import step can verify that the exact source images were used before any H5 runtime export is accepted.

## Source File

```text
designs/pencil-source/mouth-hard-diary.pen
```

Current status: `pending_pencil_import`.

## Import Boards

| Board | Source assets |
|---|---|
| `00 Image2 Source Board` | All six image2 source files, with filename labels and role notes. |
| `01 Home Hero Direction` | `source-home-bg-clean-image2.png`, `source-hero-neon-sticky-image2.png` |
| `02 Result Report Card` | `source-result-card-bg-image2.png` |
| `03 Share Poster` | `source-share-poster-image2.png` |
| `04 Sticker Kit` | `source-sticker-sheet-image2.png` |

## Source Fingerprints

| File | Role | Size | Bytes | SHA-256 |
|---|---|---:|---:|---|
| `images/source-home-bg-clean-image2.png` | `home_ui_background` | 853 x 1844 | 2064448 | `188914e77352672a1b5782a01c64d92e40222e9d8c7063afcf1e440f2574db8d` |
| `images/source-hero-neon-sticky-image2.png` | `hero_visual` | 941 x 1672 | 2394817 | `8d39b2b1b5fc79b4f9ae2e65904c0c1f046704ebe595f8501bbea3c14bc323f2` |
| `images/source-result-card-bg-image2.png` | `result_card_background` | 941 x 1672 | 2333233 | `fd3b15a750126a75a1d8f5b2dbe8e3fa7c052c6b00e59a47867cb7d9ada99741` |
| `images/source-share-poster-image2.png` | `share_poster_background` | 941 x 1672 | 2481358 | `c359b1c3756f404544099ef1a0b7abfb78f26776fc84cbf7429836651b2c3712` |
| `images/source-status-dashboard-image2.png` | `brand_secondary_visual` | 941 x 1672 | 1661808 | `9808da6269cd785c08d4c56225c91a0f3455b231aa045f25a7d7b8311587823f` |
| `images/source-sticker-sheet-image2.png` | `sticker_kit` | 1254 x 1254 | 2436433 | `6c4649d4e73a36ce60c2860e274d7bb1a57f28ba700f43ca6e6e0bf9bf4f1d76` |

## Export Nodes

| Pencil node | Runtime export | Status |
|---|---|---|
| `export/hero-report-collage` | `h5/assets/visuals/pencil-export/hero-report-collage.png` | `temporary_preview` |
| `export/share-poster-bg` | `h5/assets/visuals/pencil-export/share-poster-bg.png` | `temporary_preview` |
| `export/report-stickers` | `h5/assets/visuals/pencil-export/report-stickers.png` | `pending` |

## Final Gate

Final UI image delivery is not complete until:

1. `designs/pencil-source/mouth-hard-diary.pen` exists.
2. The six source files above have been imported into Pencil.
3. The user has confirmed the visual direction in Pencil.
4. The export nodes above have been exported from Pencil into `h5/assets/visuals/pencil-export/`.
5. `designs/pencil-source/image-manifest.json` has manifest status `pencil_exported`.
6. Every export target status is `pencil_exported`.
7. `npm run verify:assets:final` passes.
