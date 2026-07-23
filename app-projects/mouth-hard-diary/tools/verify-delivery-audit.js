const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const auditPath = path.join(root, "docs", "delivery-audit.md");
const auditJsonPath = path.join(root, "docs", "objective-completion-audit.json");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const mojibake = /[\u9362\u9422\u71b8\u59e3\u93c3\u30e8\u7ecb\u5a09\u9225\u9435\u52ea\u9359\u6220\u6d93\u9428\u6dc7\u6fc6\u7035\u714e\u935a\u55d8\u8930\u64b3\u93c2\u56e9\u93c1\u6fb6\u6d98\u93c8\u6ec3\ufffd]/;

execFileSync(process.execPath, [path.join(root, "tools", "generate-delivery-audit.js")], {
  cwd: root,
  stdio: "pipe"
});

const content = fs.existsSync(auditPath) ? fs.readFileSync(auditPath, "utf8") : "";
const auditJson = JSON.parse(fs.readFileSync(auditJsonPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const problems = [];
const pendingExports = (manifest.exportTargets || []).filter((target) => target.status !== "pencil_exported");
const pencilSourceExists = Boolean(manifest.pencilFile && fs.existsSync(path.join(root, manifest.pencilFile)));

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function jsonlCount(relativePath) {
  const text = read(relativePath).trim();
  return text ? text.split(/\r?\n/).length : 0;
}

function requireText(text, label) {
  if (!content.includes(text)) problems.push(`delivery audit missing ${label}: ${text}`);
}

[
  "# Delivery Audit",
  "user research, product design, UI/Pencil design, frontend, backend coordination",
  "Machine-readable audit",
  "docs/objective-completion-audit.json",
  "## Summary",
  "## Area Matrix",
  "## Requirement Matrix",
  "## Pencil Gate Snapshot",
  "## Runtime Gate Snapshot",
  "## Required Next Actions",
  "用户调研",
  "产品设计",
  "UI / Pencil 视觉链路",
  "前端 H5",
  "后端配合",
  "数据与隐私边界",
  "采样执行",
  "正式 launch readiness",
  "npm run verify:launch",
  "npm run verify:h5-asset-usage",
  "npm run pencil:register-exports"
].forEach((text) => requireText(text, "required scope"));

[
  "读取项目记忆并形成用户画像",
  "调研市面常见产品形态",
  "完成 MVP 产品设计",
  "先用 image2 生成源图",
  "导入 Pencil 并在 `.pen` 内沉淀 UI 设计",
  "你/我确认 Pencil 视觉风格",
  "从 Pencil 导出切图",
  "H5 引用 Pencil 导出图",
  "完成前端 H5 主流程",
  "完成后端配合与数据看板",
  "完成隐私边界与采样 SOP",
  "完成 launch 前总门禁"
].forEach((text) => requireText(text, "requirement matrix row"));

requireText("`docs/h5-asset-usage.md`, `npm run verify:h5-asset-usage`", "H5 asset usage evidence");
requireText("`designs/imagegen-review.html`", "style approval page evidence");
requireText("`designs/pencil-source/operator-pack.md`", "operator pack evidence");
requireText("`designs/pencil-source/handoff-packet.md`", "handoff packet evidence");

if (approval.status !== "approved") {
  requireText("Overall status | not ready", "current not-ready status");
  requireText(`blocked: ${approval.status || "missing"}`, "style blocker");
}
if (!pencilSourceExists) {
  requireText(`blocked: missing ${manifest.pencilFile || "unset"}`, "pencil source blocker");
}
pendingExports.forEach((target) => requireText(`${target.name}:${target.status}`, `pending export ${target.name}`));

(manifest.exportTargets || [])
  .filter((target) => (target.runtimeUsage || "required") === "required")
  .forEach((target) => {
    if (pendingExports.length) requireText(target.name, `required H5 export ${target.name}`);
  });

const runtimeRows = {
  reports: jsonlCount("server/data/runtime/reports.jsonl"),
  events: jsonlCount("server/data/runtime/events.jsonl"),
  interviews: jsonlCount("server/data/runtime/interviews.jsonl")
};

[
  ["reports.jsonl", runtimeRows.reports],
  ["events.jsonl", runtimeRows.events],
  ["interviews.jsonl", runtimeRows.interviews]
].forEach(([label, count]) => {
  requireText(`| ${label} | ${count} |`, `${label} runtime count`);
});

if (runtimeRows.reports || runtimeRows.events || runtimeRows.interviews) {
  requireText(`runtime not clean: reports=${runtimeRows.reports}, events=${runtimeRows.events}, interviews=${runtimeRows.interviews}`, "runtime blocker counts");
}

if (content.includes("Overall status | ready") && approval.status !== "approved") {
  problems.push("delivery audit claims ready while style approval is not approved");
}
if (mojibake.test(content) || content.includes("鈧?") || /[?]{4,}/.test(content)) {
  problems.push("delivery audit contains mojibake text");
}

if (!auditJson.generatedAt || Number.isNaN(Date.parse(auditJson.generatedAt))) {
  problems.push("objective completion audit missing generatedAt");
}
const expectedReady = approval.status === "approved" && pencilSourceExists && pendingExports.length === 0 &&
  runtimeRows.reports === 0 && runtimeRows.events === 0 && runtimeRows.interviews === 0;
if (auditJson.overallReady !== expectedReady) {
  problems.push(`objective completion audit overallReady=${auditJson.overallReady}, expected ${expectedReady}`);
}
if (auditJson.totalAreas !== 8 || !Array.isArray(auditJson.areas) || auditJson.areas.length !== 8) {
  problems.push("objective completion audit should contain 8 areas");
}
if (!Array.isArray(auditJson.requirements) || auditJson.requirements.length !== 12) {
  problems.push("objective completion audit should contain 12 requirements");
}
[
  { index: 4, label: "Pencil .pen UI design", ready: pencilSourceExists },
  { index: 5, label: "Pencil visual style approval", ready: approval.status === "approved" },
  { index: 6, label: "Pencil exports", ready: pendingExports.length === 0 },
  { index: 11, label: "launch readiness", ready: expectedReady }
].forEach(({ index, label, ready }) => {
  const row = auditJson.requirements[index];
  const expectedState = ready ? "complete" : "blocked";
  if (!row || row.state !== expectedState) {
    problems.push(`objective completion audit should mark ${expectedState}: ${label}`);
  }
});
if (!auditJson.pencilGate || !Array.isArray(auditJson.pencilGate.pendingExports)) {
  problems.push("objective completion audit missing Pencil pending exports");
} else if (pendingExports.length && !auditJson.pencilGate.pendingExports.includes("hero-report-collage.png:temporary_preview")) {
  problems.push("objective completion audit missing Pencil pending exports");
} else if (!pendingExports.length && auditJson.pencilGate.pendingExports.length !== 0) {
  problems.push("objective completion audit should have no Pencil pending exports");
}
if (!auditJson.runtimeGate || auditJson.runtimeGate.rows.reports !== runtimeRows.reports) {
  problems.push("objective completion audit runtime rows mismatch");
}

if (problems.length) {
  console.error("Delivery audit problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log("delivery audit verify ok");
