# Build Status

Last updated: 2026-06-28

## Current Stage

The project is in internal integration and real-world sampling preparation. The H5 flow, backend, data dashboard, sampling links, sampling cards, and review tooling are usable, but it is not ready for formal sampling yet.

The remaining blockers are intentional launch gates:

- Final visual assets must be created inside Pencil and exported from the project `.pen` file.
- The visual style must be confirmed by the user from the Pencil boards.
- Runtime verification data must be backed up and cleared before real sampling.

Local entry points:

- H5: `http://127.0.0.1:4327`
- Admin dashboard: `http://127.0.0.1:4327/admin.html`
- Pencil asset workbench: `http://127.0.0.1:4327/admin.html`, section "Pencil 资产工作台"
- Delivery audit: `http://127.0.0.1:4327/admin.html`, section "交付验收"
- Pencil readiness report: `http://127.0.0.1:4327/docs/pencil-readiness.md`

## Completed Capabilities

- H5 main flow: emotion input, report generation, regenerate, copy, save/share, feedback, App intent, and lead intent.
- Content system: supports breakup, pressure, nostalgia, mouth-hard, and self-mockery themes with lightweight safety boundaries.
- Backend APIs: local report generation, event logging, interview logging, runtime export, launch readiness, delivery audit, and Pencil asset status.
- Data persistence: reports, events, and interviews are written to JSONL files under `server/data/runtime/`.
- Admin dashboard: launch state, delivery audit, Pencil asset workbench, decision summary, funnel, entry experiments, source performance, App interest, leads, feedback, interviews, latest reports, JSON export, and CSV export.
- Sampling materials: scenario/channel/store/room sampling links and printable sampling cards.
- Operational docs: field sampling playbook, safety SOP, launch rehearsal, preflight report, runtime review, founder brief, and post-sampling backlog.
- Delivery audit: `docs/delivery-audit.md` tracks the full chain from research to launch gate.
- Privacy boundary: the frontend discloses anonymous event/report/feedback recording, and the backend does not store raw user input text.

## Pencil And Image Assets

The user-required image pipeline is:

1. Generate good-looking source images with image2.
2. Import them into Pencil and keep UI image assets inside the project `.pen` file.
3. Confirm the visual style from Pencil boards.
4. Export slices from Pencil.
5. Reference only Pencil-exported runtime images in H5.

Current image2 source images:

- `designs/pencil-source/images/`

Current asset control files:

- `designs/pencil-source/image-manifest.json`
- `designs/pencil-source/style-approval.json`
- `designs/pencil-source/style-approval.approved-draft.json`
- `designs/pencil-source/style-approval-apply-guide.md`
- `designs/pencil-source/asset-index.md`
- `designs/pencil-source/pencil-import-checklist.csv`
- `designs/pencil-source/pencil-import-checklist.json`
- `designs/pencil-source/operator-pack.md`
- `designs/pencil-source/finalization-checklist.md`
- `designs/pencil-source/handoff-packet.md`
- `designs/pencil-source/pencil-board-spec.md`
- `docs/pencil-readiness.md`
- `docs/pencil-connection-diagnostics.md`
- `docs/pencil-handoff-status.md`

Current runtime export directory:

- `h5/assets/visuals/pencil-export/`

Current visual review entry:

- `designs/imagegen-review.html`
- `designs/screenshots/imagegen-review.png`

This page is now the Pencil style approval entry. It shows the image2 source assets, Pencil export targets, confirmation questions, and post-approval command sequence.

Current Pencil blocker:

- Pencil desktop app is running from `D:\我的\Pencil\Pencil.exe`.
- The running Pencil app has not saved this project's `.pen` source yet.
- `designs/pencil-source/mouth-hard-diary.pen` does not exist yet.
- `style-approval.json` is still `pending_user_confirmation`.
- `hero-report-collage.png` and `share-poster-bg.png` are still marked `temporary_preview`.
- `report-stickers.png` is still `pending`.

Useful commands:

```bash
npm run pencil:readiness-report
npm run verify:pencil-readiness-report
npm run verify:assets:final
```

## Verification

Common internal checks:

```bash
npm run verify
npm run verify:data
npm run verify:admin
npm run verify:browser
npm run verify:imagegen-review
npm run verify:h5-asset-usage
npm run verify:privacy-data
npm run verify:pencil-operator-pack
npm run verify:pencil-import-checklist
npm run verify:pencil-finalization-checklist
npm run verify:pencil-readiness-report
npm run verify:pencil-open
npm run verify:pencil-diagnostics
npm run verify:pencil-handoff-status
npm run verify:pencil-source-watch
npm run verify:pencil-handoff-packet
npm run verify:pencil-register-guard
npm run verify:style-approval-draft
npm run verify:product-backlog
npm run verify:launch-rehearsal
npm run verify:launch-api
npm run verify:field-sampling
npm run verify:sampling-links
npm run verify:sampling-cards
npm run verify:sampling-cards:browser
npm run verify:review
npm run verify:founder-brief
npm run verify:docs-quality
npm run verify:project-text
npm run verify:delivery-audit
```

Formal launch gate:

```bash
npm run verify:launch
```

Expected current state: 41 checks total, 37 passing, 4 failing.

The failing checks are expected pre-launch blockers:

- Final Pencil exports: style is not approved, `.pen` is missing, and final Pencil exports are not registered.
- Runtime data is not empty.
- Runtime still contains local verification markers.
- Runtime review still reflects local test data.

## Pre-Launch Steps

1. Run `npm run pencil:open` to confirm the resolved Pencil executable and target `.pen` path.
2. Run `npm run pencil:open -- --yes` to open Pencil.
3. Create or open `designs/pencil-source/mouth-hard-diary.pen` inside Pencil.
4. Open `designs/pencil-source/operator-pack.md` and follow the absolute paths, board names, and export targets.
5. Open `designs/pencil-source/pencil-board-spec.md` and create the exact boards and export nodes listed there.
6. Import all image2 source images from `designs/pencil-source/images/`.
7. Complete the Pencil boards for home, input, result, share poster, and sticker assets.
8. Confirm the visual style from Pencil boards.
9. Run `npm run style:approval-draft -- --by=YOUR_NAME --notes="Confirmed from Pencil boards."`.
10. Run `npm run verify:style-approval-draft`, then apply with `node tools/apply-style-approval-draft.js --yes`.
11. Run `npm run pencil:finalization-checklist` and complete the checklist.
12. Export final slices from Pencil into `h5/assets/visuals/pencil-export/`.
13. Run `npm run pencil:register-exports`, then `npm run pencil:register-exports -- --yes` after the dry run is clean.
14. Run `npm run verify:style-approval:final` and `npm run verify:assets:final`.
15. Run `npm run sampling:links` to refresh real sampling links.
16. Only immediately before formal sampling, run `npm run sampling:prepare -- --yes` to back up and clear runtime data.
17. Run `npm run verify:launch`; launch only after all checks pass.

## Screenshots

Local browser verification has produced:

- `h5/screenshots/home.png`
- `h5/screenshots/result.png`
- `h5/screenshots/admin.png`
- `designs/screenshots/imagegen-review.png`
- `docs/sampling-cards/screenshots/index.png`
- `docs/sampling-cards/screenshots/01-ktv-room-report.png`

## Next Step

The priority is to restore Pencil access and finish the `.pen` asset source. After that, export final slices, register the manifest, clear runtime data only when real sampling is about to begin, and then rerun `npm run verify:launch`.
