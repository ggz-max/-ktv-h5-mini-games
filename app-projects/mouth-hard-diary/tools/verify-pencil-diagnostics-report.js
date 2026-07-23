const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "docs", "pencil-connection-diagnostics.md");
const jsonPath = path.join(root, "docs", "pencil-connection-diagnostics.json");

execFileSync(process.execPath, [path.join(root, "tools", "generate-pencil-diagnostics-report.js"), "--check"], {
  cwd: root,
  stdio: "pipe",
  timeout: 15000
});

const report = fs.readFileSync(reportPath, "utf8");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const required = [
  "Pencil Connection Diagnostics",
  "does not create, parse, or edit `.pen` files",
  "Project target .pen",
  "Pencil desktop process",
  "Visible Pencil Window",
  "Automation note",
  "CDP note",
  "Debugging And Command Line",
  "Remote debugging flag detected",
  "Pencil-owned listening ports",
  "Pencil VS Code MCP server file",
  "designs/pencil-source/mouth-hard-diary.pen",
  "designs/pencil-source/operator-pack.md",
  "h5/assets/visuals/pencil-export/",
  "export/hero-report-collage",
  "export/share-poster-bg",
  "source-home-bg-clean-image2.png",
  "source-sticker-sheet-image2.png"
];

const problems = [];
required.forEach((snippet) => {
  if (!report.includes(snippet)) {
    problems.push(`Diagnostics report missing snippet: ${snippet}`);
  }
});

if (!data.projectRoot || !data.targetPen || !Array.isArray(data.sourceImages) || !Array.isArray(data.exports)) {
  problems.push("Diagnostics JSON missing required structured fields");
}
if (!Array.isArray(data.processes) || !Array.isArray(data.windows)) {
  problems.push("Diagnostics JSON must include process and window arrays");
}
if (data.sourceImages.length < 6) {
  problems.push(`Diagnostics JSON should list at least 6 source images, got ${data.sourceImages.length}`);
}
if (data.exports.length < 3) {
  problems.push(`Diagnostics JSON should list at least 3 export targets, got ${data.exports.length}`);
}
if (!data.mcpServerExists) {
  problems.push("Diagnostics should confirm local Pencil VS Code MCP server file exists");
}
if (!data.automationConclusion || !data.automationConclusion.includes("scripted save/export is not safe")) {
  problems.push("Diagnostics should record why scripted Pencil save/export is not safe");
}
if (!Array.isArray(data.commandLines) || typeof data.hasRemoteDebugging !== "boolean" || !Array.isArray(data.listeningPorts)) {
  problems.push("Diagnostics JSON must include commandLines, hasRemoteDebugging, and listeningPorts");
}
if (!data.cdpConclusion || !data.cdpConclusion.includes("CDP automation is unavailable")) {
  problems.push("Diagnostics should record why CDP automation is unavailable");
}
if (!data.targetPen.endsWith("designs\\pencil-source\\mouth-hard-diary.pen") &&
  !data.targetPen.endsWith("designs/pencil-source/mouth-hard-diary.pen")) {
  problems.push(`Unexpected target .pen path: ${data.targetPen}`);
}

if (problems.length) {
  console.error("Pencil diagnostics problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`pencil diagnostics verify ok: sources=${data.sourceImages.length}, exports=${data.exports.length}, targetPenExists=${data.targetPenExists}`);
