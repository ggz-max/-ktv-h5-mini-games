const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const outputPath = path.join(root, "designs", "pencil-source", "finalization-checklist.md");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function absolute(relativePath) {
  return path.join(root, relativePath).replace(/\//g, "\\");
}

const approvedTemplate = {
  project: approval.project,
  status: "approved",
  reviewPage: approval.reviewPage,
  pencilFile: approval.pencilFile,
  directionName: approval.directionName,
  decisionSummary: approval.decisionSummary,
  approvedBy: "YOUR_NAME",
  approvedAt: new Date().toISOString(),
  approvalNotes: "Confirmed from Pencil boards after importing image2 sources and checking H5-safe crops."
};

const exportRows = (manifest.exportTargets || []).map((target) => [
  `\`${target.expectedNodeName}\``,
  target.sourceBoard,
  `\`${absolute(target.destination)}\``,
  `${target.expectedWidth} x ${target.expectedHeight}`,
  target.runtimeUsage || "required",
  `\`${target.status}\``,
  fs.existsSync(path.join(root, target.destination || "")) ? "file exists" : "missing"
]);

const sourceRows = (manifest.images || []).map((image) => [
  `\`${image.file}\``,
  image.role,
  image.recommendedBoard,
  `${image.width} x ${image.height}`,
  fs.existsSync(path.join(root, "designs", "pencil-source", image.file || "")) ? "file exists" : "missing"
]);

const lines = [
  "# Pencil Finalization Checklist",
  "",
  "Use this checklist after the image2 direction has been reviewed and the Pencil boards are ready. It is generated from `image-manifest.json` and `style-approval.json`; regenerate it instead of hand-editing stale values.",
  "",
  "## Current State",
  "",
  table(["Item", "State"], [
    ["Manifest status", `\`${manifest.status || "missing"}\``],
    ["Style approval", `\`${approval.status || "missing"}\``],
    ["Pencil source", `\`${manifest.pencilFile || "missing"}\``],
    ["Runtime export root", `\`${manifest.runtimeExportRoot || "missing"}\``],
    ["Direction", approval.directionName || "-"]
  ]),
  "",
  "## Approval Record Template",
  "",
  "Only apply this shape after the user confirms the visual direction from Pencil boards. Keep `selectedSources` from the existing approval file; update the approval fields, do not remove source decisions.",
  "",
  "```json",
  JSON.stringify(approvedTemplate, null, 2),
  "```",
  "",
  "Generate a reviewable approval draft before applying anything to the live approval file:",
  "",
  "```bash",
  "npm run style:approval-draft -- --by=YOUR_NAME --notes=\"Confirmed from Pencil boards.\"",
  "npm run verify:style-approval-draft",
  "node tools/apply-style-approval-draft.js",
  "node tools/apply-style-approval-draft.js --yes",
  "```",
  "",
  "## Source Import Check",
  "",
  table(["Source file", "Role", "Board", "Size", "State"], sourceRows),
  "",
  "## Pencil Export Check",
  "",
  table(["Pencil node", "Board", "Export destination", "Expected size", "Runtime usage", "Manifest status", "File state"], exportRows),
  "",
  "## Command Sequence",
  "",
  "```bash",
  "npm run pencil:operator-pack",
  "npm run pencil:finalization-checklist",
  "npm run verify:style-approval",
  "npm run style:approval-draft -- --by=YOUR_NAME --notes=\"Confirmed from Pencil boards.\"",
  "npm run verify:style-approval-draft",
  "node tools/apply-style-approval-draft.js --yes",
  "npm run pencil:register-exports",
  "npm run pencil:register-exports -- --yes",
  "npm run verify:style-approval:final",
  "npm run verify:assets:final",
  "npm run verify:browser",
  "npm run verify:launch",
  "```",
  "",
  "## Hard Rules",
  "",
  "- Approval must come after Pencil boards exist; do not approve only loose image2 files.",
  "- Do not hand-edit or parse the `.pen` file.",
  "- Do not hand-edit `image-manifest.json` to `pencil_exported`; use `npm run pencil:register-exports -- --yes`.",
  "- H5 must only reference `h5/assets/visuals/pencil-export/` runtime images.",
  "- Final launch still requires runtime cleanup after Pencil assets pass.",
  ""
];

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`wrote ${path.relative(root, outputPath)}`);
