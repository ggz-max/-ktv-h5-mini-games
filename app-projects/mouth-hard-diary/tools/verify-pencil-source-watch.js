const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const target = path.join(root, manifest.pencilFile || "designs/pencil-source/mouth-hard-diary.pen");
const existedBefore = fs.existsSync(target);
const problems = [];

let output = "";
let exitFailedAsExpected = false;
try {
  output = execFileSync(process.execPath, [
    path.join(root, "tools", "watch-pencil-source.js"),
    "--timeout=1000",
    "--interval=250"
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5000
  });
} catch (error) {
  output = `${error.stdout || ""}\n${error.stderr || ""}`;
  exitFailedAsExpected = error.status === 2;
}

const existedAfter = fs.existsSync(target);

[
  "Watching for Pencil source:",
  "This watcher does not create, parse, or edit .pen files."
].forEach((snippet) => {
  if (!output.includes(snippet)) {
    problems.push(`watcher output missing snippet: ${snippet}`);
  }
});

if (!existedBefore && !exitFailedAsExpected) {
  problems.push("watcher should time out with exit code 2 when target .pen is missing");
}
if (!existedBefore && !output.includes("Timed out waiting for Pencil source")) {
  problems.push("watcher should print timeout guidance when target .pen is missing");
}
if (existedAfter !== existedBefore) {
  problems.push("watcher changed target .pen existence");
}

const source = fs.readFileSync(path.join(root, "tools", "watch-pencil-source.js"), "utf8");
if (source.includes("writeFileSync") || source.includes("mkdirSync")) {
  problems.push("watcher must not write files directly");
}

if (problems.length) {
  console.error("Pencil source watcher problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`pencil source watcher verify ok: targetPenExists=${existedBefore}`);
