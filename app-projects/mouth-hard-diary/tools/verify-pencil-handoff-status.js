const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "docs", "pencil-handoff-status.md");
const jsonPath = path.join(root, "docs", "pencil-handoff-status.json");

execFileSync(process.execPath, [path.join(root, "tools", "generate-pencil-handoff-status.js"), "--check"], {
  cwd: root,
  stdio: "pipe",
  timeout: 15000
});

const report = fs.readFileSync(reportPath, "utf8");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const required = [
  "Pencil Handoff Status",
  "does not create, parse, or edit `.pen` files",
  "Project .pen exists",
  "Style approved from Pencil boards",
  "Required Pencil exports ready",
  "Next action:",
  "npm run pencil:watch-source",
  "npm run pencil:handoff-status",
  "npm run pencil:register-exports",
  "npm run verify:assets:final",
  "export/hero-report-collage",
  "export/share-poster-bg"
];

const problems = [];
required.forEach((snippet) => {
  if (!report.includes(snippet)) {
    problems.push(`handoff status report missing snippet: ${snippet}`);
  }
});

if (!data.pencilPath || !Array.isArray(data.exportTargets) || data.exportTargets.length < 3) {
  problems.push("handoff status JSON missing pencilPath or exportTargets");
}
if (typeof data.pencilExists !== "boolean" || typeof data.styleApproved !== "boolean") {
  problems.push("handoff status JSON must expose boolean gate fields");
}
if (!data.nextAction) {
  problems.push("handoff status JSON missing nextAction");
}
if (!data.pencilExists && !data.nextAction.includes("Save the project source")) {
  problems.push("handoff status should instruct saving the .pen when target is missing");
}

if (problems.length) {
  console.error("Pencil handoff status problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`pencil handoff status verify ok: pencilExists=${data.pencilExists}, exports=${data.exportTargets.length}`);
