const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const confirmed = process.argv.slice(2).includes("--yes");

function run(script, args = []) {
  return execFileSync(process.execPath, [path.join(root, "tools", script), ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

if (!confirmed) {
  console.error("Refusing to prepare real sampling without --yes.");
  console.error("Use: npm run sampling:prepare -- --yes");
  process.exit(1);
}

const backupOutput = run("prepare-runtime-data.js", ["--clear", "--yes"]);
const reviewOutput = run("generate-runtime-review.js");

process.stdout.write(backupOutput);
process.stdout.write(reviewOutput);
console.log("real sampling runtime prepared");
