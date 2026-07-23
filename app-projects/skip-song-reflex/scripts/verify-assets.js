const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const requiredFiles = [
  "README.md",
  "research/market-and-mechanics.md",
  "product/mvp-prd.md",
  "designs/pencil-source-rules.md",
  "shared/game-config.json",
  "backend/server.js"
];

const missing = requiredFiles.filter(file => !fs.existsSync(path.join(rootDir, file)));

if (missing.length) {
  console.error("Missing required files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const penPath = path.join(rootDir, "designs", "skip-song-reflex.pen");
if (!fs.existsSync(penPath)) {
  console.warn("Pencil source is not available yet: designs/skip-song-reflex.pen");
}

const config = require(path.join(rootDir, "shared", "game-config.json"));
if (!Array.isArray(config.events) || config.events.length < 3) {
  throw new Error("game-config.json must define at least 3 events");
}

const allowedButtons = new Set(["cut", "grab", "rescue"]);
for (const event of config.events) {
  if (!allowedButtons.has(event.button)) {
    throw new Error(`event ${event.id} uses unsupported button: ${event.button}`);
  }
}

if (!Array.isArray(config.levels) || config.levels.length < 1) {
  throw new Error("game-config.json must define levels");
}

for (const [index, level] of config.levels.entries()) {
  if (!Array.isArray(level.starScores) || level.starScores.length !== 3) {
    throw new Error(`level ${level.id || index} must define 3 starScores`);
  }
  if (!Array.isArray(level.timeline) || level.timeline.length < 1) {
    throw new Error(`level ${level.id || index} must define timeline`);
  }
  if (!Number.isFinite(level.trackLeadMs) || level.trackLeadMs <= 0) {
    throw new Error(`level ${level.id || index} must define positive trackLeadMs`);
  }
  if ((level.badge === "困难" || level.badge === "高压") && level.trackLeadMs >= 1200) {
    throw new Error(`level ${level.id || index} is marked hard but trackLeadMs is too slow`);
  }
}

console.log("skip-song-reflex asset/config verification passed");
