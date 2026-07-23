const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const outputPath = path.join(root, "designs", "pencil-source", "operator-pack.md");
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

const sourceRows = manifest.images.map((image, index) => [
  String(index + 1),
  `\`${image.file}\``,
  `\`${image.role}\``,
  image.recommendedBoard,
  `${image.width} x ${image.height}`,
  `\`${image.sha256}\``
]);

const exportRows = manifest.exportTargets.map((target, index) => [
  String(index + 1),
  `\`${target.expectedNodeName}\``,
  target.sourceBoard,
  `\`${target.destination}\``,
  `${target.expectedWidth} x ${target.expectedHeight}`,
  target.runtimeUsage || "required",
  `\`${target.status}\``
]);

const boardRows = [
  ["00 Image2 Source Board", "flexible", "Import every source image with filename labels, role labels, and SHA-256 notes."],
  ["01 Home Hero Direction", "390 x 844", "Compose the H5 home hero visual from the clean background and neon sticky hero crop."],
  ["02 Result Report Card", "390 x 844", "Compose result-page report texture and keep a text-safe card area."],
  ["03 Share Poster", "1080 x 1440", "Compose a shareable poster background that keeps report text readable."],
  ["04 Sticker Kit", "flexible", "Organize sticker source and export the sticker sheet or selected crops."]
];

const primarySources = manifest.images.filter((image) => image.priority === "primary");
const secondarySources = manifest.images.filter((image) => image.priority !== "primary");

const lines = [
  "# Pencil Operator Pack",
  "",
  "This is the executable handoff pack for the Pencil operator. It is generated from `image-manifest.json` and `style-approval.json`; do not edit it by hand.",
  "",
  "## Current Gate",
  "",
  table(
    ["Item", "State"],
    [
      ["Pencil source", `\`${manifest.pencilFile}\``],
      ["Manifest status", `\`${manifest.status}\``],
      ["Style approval", `\`${approval.status}\``],
      ["Direction", approval.directionName],
      ["Runtime export root", `\`${manifest.runtimeExportRoot}\``]
    ]
  ),
  "",
  "## Operator Sequence",
  "",
  "1. Open Pencil and create or open the project source file below.",
  "2. Import every source image listed in this pack into `00 Image2 Source Board`.",
  "3. Build the named boards and preserve filename labels beside the imported images.",
  "4. Review the visual direction with the user using `designs/imagegen-review.html` and the Pencil boards.",
  "5. After the user approves, update `style-approval.json` to `approved` with `approvedBy`, `approvedAt`, and concise approval notes.",
  "6. Export the named Pencil nodes into `h5/assets/visuals/pencil-export/`.",
  "7. Run `npm run pencil:finalization-checklist` and use `designs/pencil-source/finalization-checklist.md` for final approval/export checking.",
  "8. Run `npm run pencil:register-exports` as a dry-run. It must pass before any manifest status is updated.",
  "9. Run `npm run pencil:register-exports -- --yes` to set manifest `status` and export target statuses to `pencil_exported`.",
  "10. Run final gates: `npm run verify:style-approval:final`, `npm run verify:assets:final`, `npm run verify:browser`, `npm run verify:launch`.",
  "",
  "## Absolute Paths",
  "",
  "Use these paths when importing or exporting from the desktop Pencil app.",
  "",
  "```text",
  `Pencil file: ${absolute(manifest.pencilFile)}`,
  `Source image directory: ${absolute("designs/pencil-source/images")}`,
  `Runtime export directory: ${absolute(manifest.runtimeExportRoot)}`,
  `Import checklist CSV: ${importChecklistCsvPath.replace(/\//g, "\\")}`,
  `Import checklist JSON: ${importChecklistJsonPath.replace(/\//g, "\\")}`,
  "```",
  "",
  "## Import Checklist",
  "",
  "Before importing images, open `designs/pencil-source/pencil-import-checklist.csv` or `designs/pencil-source/pencil-import-checklist.json` and work through the rows in order. Each row contains the absolute source path, target board, role label, dimensions, and SHA-256 fingerprint.",
  "",
  "## Boards To Build",
  "",
  table(["Board", "Size", "Job"], boardRows),
  "",
  "## Source Imports",
  "",
  table(["#", "File", "Role", "Board", "Size", "SHA-256"], sourceRows),
  "",
  "Primary source assets:",
  "",
  ...primarySources.map((image) => `- \`${image.file}\`: ${image.notes}`),
  "",
  "Secondary or reserve source assets:",
  "",
  ...secondarySources.map((image) => `- \`${image.file}\`: ${image.notes}`),
  "",
  "## Export Nodes",
  "",
  table(["#", "Pencil node", "Source board", "Export file", "Expected size", "Runtime usage", "Current status"], exportRows),
  "",
  "## Confirmation Script",
  "",
  "Use these questions during the style check. Approval should be based on Pencil boards, not only on loose image2 sources.",
  "",
  ...approval.confirmationQuestions.map((question, index) => `${index + 1}. ${question}`),
  "",
  "## Non-Negotiables",
  "",
  "- Do not hand-edit or parse the `.pen` file.",
  "- Do not let H5 reference `designs/pencil-source/images/`, `source-*-image2.png`, or `-image2` filenames.",
  "- Temporary preview files in `h5/assets/visuals/pencil-export/` must be overwritten from Pencil before launch.",
  "- Do not hand-edit `image-manifest.json` to `pencil_exported`; use `npm run pencil:register-exports -- --yes` after Pencil export.",
  "- Final delivery requires the `.pen` file, approved style record, Pencil-exported runtime PNGs, and passing final asset gates.",
  ""
];

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`wrote ${path.relative(root, outputPath)}`);
