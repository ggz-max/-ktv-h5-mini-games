const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const outputJsonPath = path.join(root, "designs", "pencil-source", "pencil-import-checklist.json");
const outputCsvPath = path.join(root, "designs", "pencil-source", "pencil-import-checklist.csv");
const mojibake = /[\u9362\u9422\u71b8\u59e3\u93c3\u30e8\u7ecb\u5a09\u9225\u9435\u52ea\u9359\u6220\u6d93\u9428\u6dc7\u6fc6\u7035\u714e\u935a\u55d8\u8930\u64b3\u93c2\u56e9\u93c1\u6fb6\u6d98\u93c8\u6ec3\ufffd]/;

execFileSync(process.execPath, [path.join(root, "tools", "generate-pencil-import-checklist.js")], {
  cwd: root,
  stdio: "pipe"
});

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const payload = JSON.parse(fs.readFileSync(outputJsonPath, "utf8"));
const csv = fs.readFileSync(outputCsvPath, "utf8");
const problems = [];

if (payload.project !== manifest.project) problems.push("import checklist project mismatch");
if (payload.pencilFile !== manifest.pencilFile) problems.push("import checklist pencilFile mismatch");
if (!payload.generatedAt || Number.isNaN(Date.parse(payload.generatedAt))) problems.push("import checklist generatedAt missing or invalid");
if (!Array.isArray(payload.imports) || payload.imports.length !== manifest.images.length) problems.push("import checklist import count mismatch");
if (!Array.isArray(payload.boards) || payload.boards.length < 4) problems.push("import checklist board count too low");

(manifest.images || []).forEach((image, index) => {
  const row = payload.imports[index];
  if (!row || row.sourceFile !== image.file) problems.push(`missing import row: ${image.file}`);
  if (row && row.sha256 !== image.sha256) problems.push(`sha mismatch: ${image.file}`);
  if (row && row.recommendedBoard !== image.recommendedBoard) problems.push(`board mismatch: ${image.file}`);
  if (!csv.includes(image.file)) problems.push(`csv missing source: ${image.file}`);
  if (!csv.includes(image.sha256)) problems.push(`csv missing hash: ${image.file}`);
  if (!csv.includes(image.recommendedBoard)) problems.push(`csv missing board: ${image.file}`);
});

[
  "Do not edit .pen by script",
  "operatorCheck",
  "absolutePath",
  "00 Image2 Source Board",
  "01 Home Hero Direction",
  "04 Sticker Kit"
].forEach((snippet) => {
  if (!JSON.stringify(payload).includes(snippet) && !csv.includes(snippet)) {
    problems.push(`import checklist missing snippet: ${snippet}`);
  }
});

if (mojibake.test(JSON.stringify(payload)) || mojibake.test(csv)) {
  problems.push("import checklist contains mojibake text");
}

if (problems.length) {
  console.error("Pencil import checklist problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`pencil import checklist verify ok: ${payload.imports.length} imports, ${payload.boards.length} boards`);
