# H5 Asset Usage

This report proves which Pencil runtime exports are referenced by the H5 surface. It is generated from `image-manifest.json` plus the H5 HTML/CSS/JS files.

## Runtime Export Usage

| Export | Destination | Runtime usage | H5 references | Manifest status |
| --- | --- | --- | --- | --- |
| hero-report-collage.png | `h5/assets/visuals/pencil-export/hero-report-collage.png` | required | `h5/index.html` | pencil_exported |
| share-poster-bg.png | `h5/assets/visuals/pencil-export/share-poster-bg.png` | required | `h5/app.js` | pencil_exported |
| report-stickers.png | `h5/assets/visuals/pencil-export/report-stickers.png` | optional_future | - | pencil_exported |

## Guardrails

- H5 must not reference `designs/pencil-source/`.
- H5 must not reference `source-*-image2.png`.
- Required runtime exports must be referenced from `h5/assets/visuals/pencil-export/`.
- Optional future exports may be declared before the UI uses them.

