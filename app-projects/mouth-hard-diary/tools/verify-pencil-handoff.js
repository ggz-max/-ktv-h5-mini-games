const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const workflowPath = path.join(root, "designs", "asset-workflow.md");
const checklistPath = path.join(root, "designs", "pencil-export-checklist.md");
const handoffPath = path.join(root, "designs", "pencil-handoff.md");
const assetIndexPath = path.join(root, "designs", "pencil-source", "asset-index.md");
const operatorPackPath = path.join(root, "designs", "pencil-source", "operator-pack.md");
const finalizationChecklistPath = path.join(root, "designs", "pencil-source", "finalization-checklist.md");
const handoffPacketPath = path.join(root, "designs", "pencil-source", "handoff-packet.md");
const boardSpecPath = path.join(root, "designs", "pencil-source", "pencil-board-spec.md");
const importChecklistJsonPath = path.join(root, "designs", "pencil-source", "pencil-import-checklist.json");
const importChecklistCsvPath = path.join(root, "designs", "pencil-source", "pencil-import-checklist.csv");
const styleApprovalPath = path.join(root, "designs", "pencil-source", "style-approval.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const problems = [];

function readRelative(filePath) {
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing handoff document: ${path.relative(root, filePath)}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

const workflow = readRelative(workflowPath);
const checklist = readRelative(checklistPath);
const handoff = readRelative(handoffPath);
const assetIndex = readRelative(assetIndexPath);
const operatorPack = readRelative(operatorPackPath);
const finalizationChecklist = readRelative(finalizationChecklistPath);
const handoffPacket = readRelative(handoffPacketPath);
const boardSpec = readRelative(boardSpecPath);
const importChecklistJson = readRelative(importChecklistJsonPath);
const importChecklistCsv = readRelative(importChecklistCsvPath);
const styleApproval = readRelative(styleApprovalPath);
const docs = [
  workflow,
  checklist,
  handoff,
  assetIndex,
  operatorPack,
  finalizationChecklist,
  handoffPacket,
  boardSpec,
  importChecklistJson,
  importChecklistCsv
].join("\n");

function requireText(text, label) {
  if (!docs.includes(text)) {
    problems.push(`Pencil handoff docs missing ${label}: ${text}`);
  }
}

function requireManifestField(value, label) {
  if (!value) {
    problems.push(`Manifest missing ${label}`);
  }
}

requireManifestField(manifest.project, "project");
requireManifestField(manifest.source, "source");
requireManifestField(manifest.status, "status");
requireManifestField(manifest.pencilFile, "pencilFile");
requireManifestField(manifest.runtimeExportRoot, "runtimeExportRoot");
requireManifestField(manifest.handoffPolicy, "handoffPolicy");

if (manifest.project !== "mouth-hard-diary") {
  problems.push(`Unexpected manifest project: ${manifest.project}`);
}
if (manifest.source !== "image2") {
  problems.push(`Manifest source must remain image2 until Pencil source takes over: ${manifest.source}`);
}
if (manifest.runtimeExportRoot !== "h5/assets/visuals/pencil-export/") {
  problems.push(`Unexpected runtime export root: ${manifest.runtimeExportRoot}`);
}
if (!Array.isArray(manifest.images) || manifest.images.length < 1) {
  problems.push("Manifest images must be a non-empty array");
}
if (!Array.isArray(manifest.exportTargets) || manifest.exportTargets.length < 1) {
  problems.push("Manifest exportTargets must be a non-empty array");
}

const boardNames = new Set();
(manifest.images || []).forEach((image) => {
  requireManifestField(image.file, "image.file");
  requireManifestField(image.role, `role for ${image.file}`);
  requireManifestField(image.recommendedBoard, `recommendedBoard for ${image.file}`);
  requireManifestField(image.priority, `priority for ${image.file}`);
  requireManifestField(image.notes, `notes for ${image.file}`);
  requireManifestField(image.byteSize, `byteSize for ${image.file}`);
  requireManifestField(image.sha256, `sha256 for ${image.file}`);
  if (image.sha256 && !/^[a-f0-9]{64}$/.test(image.sha256)) {
    problems.push(`Image source sha256 must be a 64-character hex digest: ${image.file}`);
  }
  if (!image.file || !image.file.startsWith("images/source-") || !image.file.endsWith("-image2.png")) {
    problems.push(`Image source must stay in source-*-image2.png convention: ${image.file}`);
  }
  if (image.recommendedBoard) boardNames.add(image.recommendedBoard);
  if (image.file) {
    requireText(image.file, `source image ${image.file}`);
    requireText(image.file.replace("images/", "designs/pencil-source/images/"), `source import ${image.file}`);
  }
  if (image.sha256) requireText(image.sha256, `source sha256 ${image.file}`);
});

(manifest.exportTargets || []).forEach((target) => {
  requireManifestField(target.name, "export target name");
  requireManifestField(target.destination, `destination for ${target.name}`);
  requireManifestField(target.sourceBoard, `sourceBoard for ${target.name}`);
  requireManifestField(target.expectedNodeName, `expectedNodeName for ${target.name}`);
  requireManifestField(target.status, `status for ${target.name}`);
  requireManifestField(target.runtimeUsage, `runtimeUsage for ${target.name}`);
  if (!["required", "optional_future"].includes(target.runtimeUsage)) {
    problems.push(`Export runtimeUsage must be required or optional_future: ${target.name}`);
  }
  if (!target.destination || !target.destination.startsWith(manifest.runtimeExportRoot || "")) {
    problems.push(`Export destination must stay under runtime export root: ${target.destination}`);
  }
  if (!target.expectedNodeName || !target.expectedNodeName.startsWith("export/")) {
    problems.push(`Export node must use export/ prefix: ${target.expectedNodeName}`);
  }
  if (target.mustReplaceFromPencil !== true) {
    problems.push(`Export target must require Pencil replacement: ${target.name}`);
  }
  if (target.sourceBoard) boardNames.add(target.sourceBoard);
  if (target.expectedNodeName) requireText(target.expectedNodeName, `export node ${target.expectedNodeName}`);
  if (target.destination) requireText(target.destination, `export destination ${target.destination}`);
  if (target.runtimeUsage) requireText(target.runtimeUsage, `export runtime usage ${target.name}`);
});

[
  "Pencil",
  ".pen",
  "image2",
  "h5/assets/visuals/pencil-export/",
  "npm run verify:assets",
  "npm run verify:h5-asset-usage",
  "npm run verify:assets:final",
  "npm run verify:style-approval",
  "designs/pencil-source/style-approval.json",
  "Do not hand-edit or parse the `.pen` file",
  "H5 may only reference runtime exports",
  "深夜便利贴 + 霓虹批注",
  "must be overwritten from Pencil",
  "Pencil Operator Pack",
  "Pencil Finalization Checklist",
  "Pencil Board Spec",
  "designs/pencil-source/pencil-board-spec.md",
  "pencil-import-checklist.csv",
  "pencil-import-checklist.json",
  "Operator Sequence",
  "Confirmation Script",
  "finalization-checklist.md",
  "npm run pencil:register-exports",
  "npm run pencil:register-exports -- --yes"
].forEach((text) => requireText(text, `workflow rule ${text}`));

[
  "manifest status `pencil_exported`",
  "Every export target status is `pencil_exported`",
  "style-approval.json` is `approved`",
  "Required export PNGs overwrite the temporary preview files"
].forEach((text) => requireText(text, `final gate ${text}`));

if (!styleApproval.includes("\"status\": \"pending_user_confirmation\"") &&
  !styleApproval.includes("\"status\": \"approved\"")) {
  problems.push("style-approval.json must expose pending_user_confirmation or approved status");
}

boardNames.forEach((board) => requireText(board, `board ${board}`));

if (problems.length) {
  console.error("Pencil handoff problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`pencil handoff verify ok: ${manifest.images.length} sources, ${manifest.exportTargets.length} exports, ${boardNames.size} boards`);
