import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dir = path.resolve("public", "assets", "image2");
const assets = [
  ["home-bg", 768, 76],
  ["waiting-bg", 768, 76],
  ["table-bg", 768, 78],
  ["result-champion", 768, 78],
  ["result-blame", 768, 78],
  ["share-card-bg", 768, 78],
  ["desktop-surround-bg", 1280, 75],
  ["card-front", 512, 82],
  ["card-back", 512, 82],
  ["avatar-sprites", 768, 82],
  ["icon-sprites", 1024, 84],
  ["status-sprites", 1024, 84],
  ["tutorial-steps", 1152, 80],
  ["penalty-burst", 512, 84]
];

for (const [name, width, quality] of assets) {
  const input = path.join(dir, `${name}.png`);
  const output = path.join(dir, `${name}.webp`);
  if (!fs.existsSync(input)) throw new Error(`missing source asset: ${input}`);
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vf", `scale=${width}:-2`, "-c:v", "libwebp", "-quality", String(quality), "-compression_level", "6", output], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${name}`);
}

const total = assets.reduce((sum, [name]) => sum + fs.statSync(path.join(dir, `${name}.webp`)).size, 0);
console.log(`optimized ${assets.length} Image2 assets to ${(total / 1024 / 1024).toFixed(2)} MB WebP`);
