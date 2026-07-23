const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const checklistPath = path.join(root, "designs", "pencil-source", "finalization-checklist.md");
const problems = [];

execFileSync(process.execPath, [path.join(root, "tools", "generate-pencil-finalization-checklist.js")], {
  cwd: root,
  stdio: "pipe"
});

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const content = fs.existsSync(checklistPath) ? fs.readFileSync(checklistPath, "utf8") : "";

function requireText(text, label) {
  if (!content.includes(text)) problems.push(`finalization checklist missing ${label}: ${text}`);
}

[
  "# Pencil Finalization Checklist",
  "## Current State",
  "## Approval Record Template",
  "## Source Import Check",
  "## Pencil Export Check",
  "## Command Sequence",
  "## Hard Rules",
  "npm run pencil:register-exports -- --yes",
  "npm run style:approval-draft",
  "npm run verify:style-approval-draft",
  "node tools/apply-style-approval-draft.js --yes",
  "npm run verify:assets:final",
  "H5 must only reference `h5/assets/visuals/pencil-export/`"
].forEach((text) => requireText(text, "required section"));

requireText(manifest.status, "manifest status");
requireText(manifest.pencilFile, "pencil file");
requireText(manifest.runtimeExportRoot, "runtime export root");
requireText(approval.status, "style approval status");
requireText(approval.directionName, "direction name");
requireText('"status": "approved"', "approval template status");
requireText('"approvedBy": "YOUR_NAME"', "approval template approver");

(manifest.images || []).forEach((image) => {
  requireText(image.file, `source file ${image.file}`);
  requireText(image.role, `source role ${image.role}`);
  requireText(image.recommendedBoard, `source board ${image.recommendedBoard}`);
  requireText(`${image.width} x ${image.height}`, `source size ${image.file}`);
});

(manifest.exportTargets || []).forEach((target) => {
  requireText(target.expectedNodeName, `export node ${target.expectedNodeName}`);
  requireText(target.sourceBoard, `export board ${target.sourceBoard}`);
  requireText(path.join(root, target.destination).replace(/\//g, "\\"), `absolute export destination ${target.name}`);
  requireText(`${target.expectedWidth} x ${target.expectedHeight}`, `export size ${target.name}`);
  requireText(target.runtimeUsage || "required", `export runtime usage ${target.name}`);
  requireText(target.status, `export status ${target.name}`);
});

if (problems.length) {
  console.error("Pencil finalization checklist problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`pencil finalization checklist verify ok: ${manifest.images.length} sources, ${manifest.exportTargets.length} exports`);
