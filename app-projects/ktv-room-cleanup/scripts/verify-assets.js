const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "frontend", "public", "assets", "pencil");
const required = [
  "board-bg.jpg",
  "messy-room.jpg",
  "microphone.jpg",
  "remote.jpg",
  "dice.jpg",
  "cup.jpg",
  "snack.jpg",
  "tissue.jpg",
  "glow-stick.jpg",
  "song-card.jpg",
  "charging-cable.jpg",
  "skip-button.jpg"
];

for (const name of required) {
  const file = path.join(assetsDir, name);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing Pencil asset: ${name}`);
  }
  const header = fs.readFileSync(file).subarray(0, 3).toString("hex");
  if (header !== "ffd8ff") {
    throw new Error(`Asset is not JPEG data: ${name}`);
  }
}

console.log(`Verified ${required.length} Pencil-derived assets.`);
