const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const briefPath = path.join(root, "docs", "founder-brief.md");
const runtimeDir = path.join(root, "server", "data", "runtime");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const styleApprovalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const mojibake = /[\u9362\u5a23\u68e3\u95c7\u943a\u9359\u7ec9\u5a34\u20ac\ufffd]/;

execFileSync(process.execPath, [path.join(root, "tools", "generate-founder-brief.js")], {
  cwd: root,
  stdio: "pipe"
});

if (!fs.existsSync(briefPath)) {
  throw new Error("founder brief was not generated");
}

const content = fs.readFileSync(briefPath, "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const styleApproval = JSON.parse(fs.readFileSync(styleApprovalPath, "utf8"));
const problems = [];
const pendingExports = (manifest.exportTargets || []).filter((item) => item.status !== "pencil_exported");

function jsonlCount(fileName) {
  const filePath = path.join(runtimeDir, fileName);
  if (!fs.existsSync(filePath)) return 0;
  const text = fs.readFileSync(filePath, "utf8").trim();
  return text ? text.split(/\r?\n/).length : 0;
}

function requireText(text) {
  if (!content.includes(text)) {
    problems.push(`founder brief missing: ${text}`);
  }
}

[
  "# Founder Brief: Mouth Hard Diary",
  "## Decision",
  "## User Thesis",
  "## Evidence",
  "## Entry Variants",
  "## App Direction",
  "## Sampling Plan",
  "## UI / Pencil Status",
  "## Next Moves",
  "link pack",
  "style approval",
  "Pencil source",
  "Pencil exports",
  "Pencil gate"
].forEach(requireText);

if (content.includes("internal_only")) {
  requireText("internal_only");
} else {
  requireText("eligible_after_gates");
}

if (pendingExports.length) {
  requireText("temporary H5 preview");
}
if (jsonlCount("reports.jsonl") || jsonlCount("events.jsonl") || jsonlCount("interviews.jsonl")) {
  requireText("当前 runtime 含本地验证或种子数据");
}

requireText(`sample | reports=${jsonlCount("reports.jsonl")}, events=${jsonlCount("events.jsonl")}, interviews=${jsonlCount("interviews.jsonl")}`);
requireText(styleApproval.status === "approved" ? "style approval | ok" : `style=${styleApproval.status || "missing"}`);
if (manifest.pencilFile && !fs.existsSync(path.join(root, manifest.pencilFile))) {
  requireText(`missing: ${manifest.pencilFile}`);
}
pendingExports.forEach((item) => requireText(`${item.name}:${item.status}`));
if (!pendingExports.length) {
  requireText("Pencil exports | ok");
}

if (mojibake.test(content)) {
  problems.push("founder brief contains mojibake text");
}

if (problems.length) {
  console.error("Founder brief problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log("founder brief verify ok");
