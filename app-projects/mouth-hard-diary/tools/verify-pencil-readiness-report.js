const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "docs", "pencil-readiness.md");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");

execFileSync(process.execPath, [path.join(root, "tools", "generate-pencil-readiness-report.js"), "--check"], {
  cwd: root,
  stdio: "pipe",
  timeout: 15000
});

const content = fs.readFileSync(reportPath, "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const pendingExports = (manifest.exportTargets || []).filter((target) => target.status !== "pencil_exported");
const required = [
  "Pencil Readiness Report",
  "image2 source images -> Pencil .pen design -> style approval -> Pencil exports -> H5 runtime references",
  "Pencil executable found",
  "Pencil shortcuts",
  "D:\\我的\\Pencil\\Pencil.exe",
  "Pencil process running",
  "Pencil .pen source file exists",
  "style-approval.json is approved",
  "required Pencil exports are final",
  "Current Blockers",
  "npm run pencil:open",
  "npm run pencil:open -- --yes",
  "Local Pencil Home Inspection",
  "session-desktop.json",
  "VS Code MCP server",
  "cannot prove this project's `.pen` source exists",
  "Known local `.pen` files",
  "designs/pencil-source/mouth-hard-diary.pen",
  "h5/assets/visuals/pencil-export/"
];

if (pendingExports.length) {
  required.push("temporary_preview");
} else {
  required.push("pencil_exported");
}

const missing = required.filter((snippet) => !content.includes(snippet));
if (missing.length) {
  console.error("Pencil readiness report missing snippets:");
  missing.forEach((snippet) => console.error(`- ${snippet}`));
  process.exit(1);
}

console.log("pencil readiness report verify ok");
