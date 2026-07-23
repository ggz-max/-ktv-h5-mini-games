const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const operatorPackPath = path.join(root, "designs", "pencil-source", "operator-pack.md");
const boardSpecPath = path.join(root, "designs", "pencil-source", "pencil-board-spec.md");
const importChecklistCsvPath = path.join(root, "designs", "pencil-source", "pencil-import-checklist.csv");
const importChecklistJsonPath = path.join(root, "designs", "pencil-source", "pencil-import-checklist.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const content = fs.existsSync(operatorPackPath) ? fs.readFileSync(operatorPackPath, "utf8") : "";
const problems = [];

function requireText(text, label) {
  if (!content.includes(text)) problems.push(`operator pack missing ${label}: ${text}`);
}

if (!content) {
  problems.push("operator pack missing: designs/pencil-source/operator-pack.md");
}
if (!fs.existsSync(boardSpecPath)) {
  problems.push("board spec missing: designs/pencil-source/pencil-board-spec.md");
}
if (!fs.existsSync(importChecklistCsvPath)) {
  problems.push("import checklist CSV missing: designs/pencil-source/pencil-import-checklist.csv");
}
if (!fs.existsSync(importChecklistJsonPath)) {
  problems.push("import checklist JSON missing: designs/pencil-source/pencil-import-checklist.json");
}

[
  "# Pencil Operator Pack",
  "This is the executable handoff pack",
  "## Current Gate",
  "## Operator Sequence",
  "## Absolute Paths",
  "## Import Checklist",
  "pencil-import-checklist.csv",
  "pencil-import-checklist.json",
  "## Boards To Build",
  "## Source Imports",
  "## Export Nodes",
  "## Confirmation Script",
  "## Non-Negotiables",
  "Do not hand-edit or parse the `.pen` file",
  "Temporary preview files",
  "npm run pencil:finalization-checklist",
  "finalization-checklist.md",
  "npm run pencil:register-exports",
  "npm run pencil:register-exports -- --yes",
  "npm run verify:assets:final"
].forEach((text) => requireText(text, "required section"));

requireText(manifest.pencilFile, "pencil file");
requireText(manifest.status, "manifest status");
requireText(manifest.runtimeExportRoot, "runtime export root");
requireText(approval.status, "approval status");
requireText(approval.directionName, "direction name");

manifest.images.forEach((image) => {
  requireText(image.file, `source image ${image.file}`);
  requireText(image.role, `source role ${image.role}`);
  requireText(image.recommendedBoard, `source board ${image.recommendedBoard}`);
  requireText(`${image.width} x ${image.height}`, `source size ${image.file}`);
  requireText(image.sha256, `source hash ${image.file}`);
});

manifest.exportTargets.forEach((target) => {
  requireText(target.expectedNodeName, `export node ${target.expectedNodeName}`);
  requireText(target.destination, `export destination ${target.destination}`);
  requireText(target.sourceBoard, `export board ${target.sourceBoard}`);
  requireText(`${target.expectedWidth} x ${target.expectedHeight}`, `export size ${target.name}`);
  requireText(target.runtimeUsage || "required", `export runtime usage ${target.name}`);
  requireText(target.status, `export status ${target.name}`);
});

(approval.confirmationQuestions || []).forEach((question) => {
  requireText(question, `confirmation question ${question}`);
});

if (problems.length) {
  console.error("Pencil operator pack problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`pencil operator pack verify ok: ${manifest.images.length} sources, ${manifest.exportTargets.length} exports`);
