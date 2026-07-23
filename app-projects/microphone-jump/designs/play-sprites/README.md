# Play Sprites

Generated on 2026-07-03 with `gpt-image-2` for the playable foreground layer.

These assets replace the earlier prototype SVG/CSS foreground objects. The main game should use these PNG sprites for the moving player and platforms, while CSS is only responsible for positioning, glow, shadow, and animation.

## Source Files

Green-screen source renders:

- `source/player-mic-green.png`
- `source/platform-speaker-green.png`
- `source/platform-lyric-green.png`
- `source/platform-light-green.png`
- `source/platform-sofa-green.png`

## Frontend Assets

Optimized transparent PNGs used by the H5:

- `frontend/assets/play-sprites/player-mic.png`
- `frontend/assets/play-sprites/platform-speaker.png`
- `frontend/assets/play-sprites/platform-lyric.png`
- `frontend/assets/play-sprites/platform-light.png`
- `frontend/assets/play-sprites/platform-sofa.png`

## Notes

- The foreground layer in `frontend/src/main.js` imports these sprites through `PLAY_SPRITES`.
- Do not use `mic-mascot.svg` or CSS-drawn platform shapes for the main playable objects.
- Verification preview: `verification/play-sprites-real-preview.png`.
