const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const outputPath = path.join(root, "designs", "pencil-source", "handoff-packet.md");
const boardSpecPath = path.join(root, "designs", "pencil-source", "pencil-board-spec.md");
const importChecklistCsvPath = path.join(root, "designs", "pencil-source", "pencil-import-checklist.csv");
const importChecklistJsonPath = path.join(root, "designs", "pencil-source", "pencil-import-checklist.json");

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

const importRows = (manifest.images || []).map((image, index) => [
  String(index + 1),
  `\`${absolute(path.join("designs", "pencil-source", image.file))}\``,
  image.role,
  image.recommendedBoard,
  `${image.width} x ${image.height}`,
  image.priority || "-"
]);

const exportRows = (manifest.exportTargets || []).map((target, index) => [
  String(index + 1),
  target.expectedNodeName,
  target.sourceBoard,
  `\`${absolute(target.destination)}\``,
  `${target.expectedWidth} x ${target.expectedHeight}`,
  target.runtimeUsage || "required",
  target.status || "-"
]);

const questionRows = (approval.confirmationQuestions || []).map((question, index) => [
  String(index + 1),
  question,
  "yes / adjust / reject"
]);

const lines = [
  "# Pencil Handoff Packet",
  "",
  "This packet is for the person operating Pencil. It turns the image2 assets into final H5 runtime images without editing the `.pen` file by script.",
  "",
  "## Job To Be Done",
  "",
  "Create or open the project Pencil file, import the image2 assets, compose the UI boards, get visual approval, export the runtime PNGs, and run the final asset gates.",
  "",
  table(["Item", "Value"], [
    ["Project", manifest.project || "mouth-hard-diary"],
    ["Pencil file", `\`${absolute(manifest.pencilFile)}\``],
    ["Runtime export root", `\`${manifest.runtimeExportRoot}\``],
    ["Runtime export root", `\`${absolute(manifest.runtimeExportRoot)}\``],
    ["Style direction", approval.directionName || "-"],
    ["Current approval status", approval.status || "missing"],
    ["Current manifest status", manifest.status || "missing"]
  ]),
  "",
  "## Board Spec",
  "",
  "Use `designs/pencil-source/pencil-board-spec.md` as the board-level source of truth before building in Pencil.",
  "",
  `Board spec absolute path: \`${boardSpecPath.replace(/\//g, "\\")}\``,
  `Import checklist CSV: \`${importChecklistCsvPath.replace(/\//g, "\\")}\``,
  `Import checklist JSON: \`${importChecklistJsonPath.replace(/\//g, "\\")}\``,
  "",
  "## Pencil Board Build",
  "",
  table(["Board", "What to place", "Acceptance check"], [
    ["00 Image2 Source Board", "All source images with filename, role, size, and SHA labels.", "Every file below is visible and traceable."],
    ["01 Home Hero Direction", "Home clean background plus neon sticky hero crop.", "Works behind H5 title/CTA and does not fight foreground text."],
    ["02 Result Report Card", "Result card background and text-safe paper area.", "Report text can sit on top without low contrast."],
    ["03 Share Poster", "Share poster background with central readable area.", "Canvas feels worth saving and sharing."],
    ["04 Sticker Kit", "Sticker sheet source and selected crops if needed.", "Optional sticker export can be produced later from the same .pen."]
  ]),
  "",
  "## Import List",
  "",
  table(["#", "Absolute source file", "Role", "Target board", "Size", "Priority"], importRows),
  "",
  "## Export List",
  "",
  table(["#", "Pencil node", "Board", "Absolute export file", "Expected size", "Usage", "Current status"], exportRows),
  "",
  "## User Confirmation Script",
  "",
  "Run this against the Pencil boards, not against loose image2 files.",
  "",
  table(["#", "Question", "Decision"], questionRows),
  "",
  "Record approval only after the user confirms the Pencil boards. The live file is `designs/pencil-source/style-approval.json`.",
  "",
  "## Command Handoff",
  "",
  "Before approval:",
  "",
  "```bash",
  "npm run pencil:readiness-report",
  "npm run verify:pencil-readiness-report",
  "npm run verify:style-approval",
  "```",
  "",
  "After visual approval:",
  "",
  "```bash",
  "npm run style:approval-draft -- --by=YOUR_NAME --notes=\"Confirmed from Pencil boards.\"",
  "npm run verify:style-approval-draft",
  "node tools/apply-style-approval-draft.js --yes",
  "```",
  "",
  "After Pencil export:",
  "",
  "```bash",
  "npm run pencil:register-exports",
  "npm run pencil:register-exports -- --yes",
  "npm run verify:style-approval:final",
  "npm run verify:assets:final",
  "npm run verify:browser",
  "npm run verify:launch",
  "```",
  "",
  "## Stop Conditions",
  "",
  "- Stop if Pencil cannot save `designs/pencil-source/mouth-hard-diary.pen`.",
  "- Stop if the user has not confirmed the Pencil boards.",
  "- Stop if any required export is still marked `temporary_preview` or `pending`.",
  "- Stop if H5 references any `designs/pencil-source/images/` source image directly.",
  "- Stop if someone asks to hand-edit `image-manifest.json` to bypass the register script.",
  ""
];

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`wrote ${path.relative(root, outputPath)}`);
