const fs = require("fs");
const path = require("path");
const { resolveLevelData, solveLevel } = require("./level-tools");

const levelsPath = path.join(__dirname, "..", "frontend", "src", "levels.json");
const rawLevelData = JSON.parse(fs.readFileSync(levelsPath, "utf8"));
const levels = resolveLevelData(rawLevelData);

const summaries = levels.map((level, index) => {
  const result = solveLevel(level, index);
  return `${result.level.name}: ${result.sequence.length}/${result.level.moves} paths`;
});

console.log(`Level verification passed:\n${summaries.join("\n")}`);
