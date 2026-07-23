const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const outputJsonPath = path.join(root, "designs", "pencil-source", "pencil-import-checklist.json");
const outputCsvPath = path.join(root, "designs", "pencil-source", "pencil-import-checklist.csv");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function absolute(relativePath) {
  return path.join(root, "designs", "pencil-source", relativePath).replace(/\//g, "\\");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const imports = (manifest.images || []).map((image, index) => ({
  order: index + 1,
  sourceFile: image.file,
  absolutePath: absolute(image.file),
  role: image.role,
  recommendedBoard: image.recommendedBoard,
  priority: image.priority,
  width: image.width,
  height: image.height,
  byteSize: image.byteSize,
  sha256: image.sha256,
  labelText: `${image.role} / ${image.file}`,
  operatorCheck: "import into Pencil, add filename label, verify SHA-256, then place on recommended board",
  notes: image.notes
}));

const boards = [...new Set(imports.map((item) => item.recommendedBoard))].map((board) => ({
  board,
  imports: imports.filter((item) => item.recommendedBoard === board).map((item) => item.sourceFile)
}));

const payload = {
  project: manifest.project,
  generatedAt: new Date().toISOString(),
  pencilFile: manifest.pencilFile,
  sourceRoot: "designs/pencil-source/images/",
  policy: "Do not edit .pen by script. Use this checklist to import image2 sources into Pencil and verify labels, boards, and hashes.",
  imports,
  boards
};

const headers = [
  "order",
  "sourceFile",
  "absolutePath",
  "role",
  "recommendedBoard",
  "priority",
  "width",
  "height",
  "byteSize",
  "sha256",
  "labelText",
  "operatorCheck",
  "notes"
];

const csv = [
  headers.join(","),
  ...imports.map((item) => headers.map((header) => csvEscape(item[header])).join(","))
].join("\n");

fs.writeFileSync(outputJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
fs.writeFileSync(outputCsvPath, `${csv}\n`, "utf8");
console.log(path.relative(root, outputJsonPath));
console.log(path.relative(root, outputCsvPath));
