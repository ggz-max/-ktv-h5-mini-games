const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const pencilFile = path.join(root, manifest.pencilFile || "designs/pencil-source/mouth-hard-diary.pen");
const existedBefore = fs.existsSync(pencilFile);
const problems = [];

let output = "";
try {
  output = execFileSync(process.execPath, [path.join(root, "tools", "open-pencil.js")], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 15000
  });
} catch (error) {
  problems.push(`pencil:open dry-run failed: ${error.message}`);
  output = `${error.stdout || ""}\n${error.stderr || ""}`;
}

const existedAfter = fs.existsSync(pencilFile);
const required = [
  `Project: ${root}`,
  `Target Pencil file: ${pencilFile}`,
  `Target .pen exists: ${existedBefore}`,
  "Pencil executable:",
  "This script will not create, parse, or edit the .pen file.",
  "Dry run only. Run `npm run pencil:open -- --yes` to open Pencil."
];

required.forEach((snippet) => {
  if (!output.includes(snippet)) {
    problems.push(`pencil:open dry-run output missing: ${snippet}`);
  }
});

if (existedAfter !== existedBefore) {
  problems.push("pencil:open dry-run changed target .pen existence");
}

if (output.includes("Pencil launch requested")) {
  problems.push("pencil:open dry-run appears to have launched Pencil");
}

if (!fs.readFileSync(path.join(root, "tools", "open-pencil.js"), "utf8").includes("args.includes(\"--yes\")")) {
  problems.push("open-pencil.js must require explicit --yes before launching Pencil");
}

if (problems.length) {
  console.error("Pencil open helper problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`pencil open helper verify ok: targetPenExists=${existedBefore}`);
