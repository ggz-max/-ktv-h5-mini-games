const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "designs", "pencil-source", "image-manifest.json"), "utf8"));
const approval = JSON.parse(fs.readFileSync(path.join(root, "designs", "pencil-source", "style-approval.json"), "utf8"));
const outputPath = path.join(root, "designs", "pencil-source", "handoff-packet.md");
const problems = [];

execFileSync(process.execPath, [path.join(root, "tools", "generate-pencil-handoff-packet.js")], {
  cwd: root,
  stdio: "pipe",
  timeout: 15000
});

const content = fs.readFileSync(outputPath, "utf8");

function requireText(text, label) {
  if (!content.includes(text)) problems.push(`handoff packet missing ${label}: ${text}`);
}

[
  "# Pencil Handoff Packet",
  "Job To Be Done",
  "Pencil Board Build",
  "Board Spec",
  "designs/pencil-source/pencil-board-spec.md",
  "pencil-import-checklist.csv",
  "pencil-import-checklist.json",
  "Import List",
  "Export List",
  "User Confirmation Script",
  "Command Handoff",
  "Stop Conditions",
  "npm run pencil:readiness-report",
  "npm run verify:pencil-readiness-report",
  "npm run style:approval-draft",
  "node tools/apply-style-approval-draft.js --yes",
  "npm run pencil:register-exports -- --yes",
  "npm run verify:assets:final",
  "Stop if Pencil cannot save"
].forEach((text) => requireText(text, "required text"));

requireText(manifest.pencilFile, "pencil file");
requireText(manifest.runtimeExportRoot, "runtime export root");
requireText(approval.directionName, "style direction");
requireText(approval.status, "approval status");
requireText(manifest.status, "manifest status");

(manifest.images || []).forEach((image) => {
  requireText(image.file.replace(/\//g, "\\"), `source absolute path ${image.file}`);
  requireText(image.role, `source role ${image.role}`);
  requireText(image.recommendedBoard, `source board ${image.recommendedBoard}`);
  requireText(`${image.width} x ${image.height}`, `source size ${image.file}`);
});

(manifest.exportTargets || []).forEach((target) => {
  requireText(target.expectedNodeName, `export node ${target.expectedNodeName}`);
  requireText(target.sourceBoard, `export board ${target.sourceBoard}`);
  requireText(target.destination.replace(/\//g, "\\"), `export destination ${target.name}`);
  requireText(`${target.expectedWidth} x ${target.expectedHeight}`, `export size ${target.name}`);
  requireText(target.status, `export status ${target.name}`);
});

(approval.confirmationQuestions || []).forEach((question) => {
  requireText(question, `confirmation question ${question}`);
});

if (problems.length) {
  console.error("Pencil handoff packet problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`pencil handoff packet verify ok: ${manifest.images.length} imports, ${manifest.exportTargets.length} exports`);
