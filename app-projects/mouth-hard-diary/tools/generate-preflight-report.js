const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "docs", "preflight-report.md");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const styleApprovalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const samplingLinksPath = path.join(root, "docs", "sampling-links.generated.json");
const runtimeDir = path.join(root, "server", "data", "runtime");
const runtimeReviewPath = path.join(root, "docs", "runtime-review.md");

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function readJsonl(filePath) {
  return read(filePath)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return { malformed: true, raw: line };
      }
    });
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function hasVerificationMarkers(reports, events, interviews) {
  return reports.some((item) => item.source === "verify_data" || item.entryVariant === "verify_variant") ||
    events.some((item) => item.sessionId === "verify_data" || item.event === "verify_data_event") ||
    interviews.some((item) => item.segment === "verify_user" || item.source === "verify_data");
}

const manifest = readJson(manifestPath, { exportTargets: [] });
const styleApproval = readJson(styleApprovalPath, {});
const samplingLinks = readJson(samplingLinksPath, { version: "missing", links: [] });
const reports = readJsonl(path.join(runtimeDir, "reports.jsonl"));
const events = readJsonl(path.join(runtimeDir, "events.jsonl"));
const interviews = readJsonl(path.join(runtimeDir, "interviews.jsonl"));
const runtimeRows = reports.length + events.length + interviews.length;
const verificationMarkers = hasVerificationMarkers(reports, events, interviews);
const pendingExports = (manifest.exportTargets || []).filter((target) => target.status !== "pencil_exported");
const pencilSourceExists = Boolean(manifest.pencilFile && fs.existsSync(path.join(root, manifest.pencilFile)));
const styleApproved = styleApproval.status === "approved" && Boolean(styleApproval.approvedBy) && Boolean(styleApproval.approvedAt);
const review = read(runtimeReviewPath);
const reviewClean = review.includes("| 含测试数据 | 否 |");
const ready = styleApproved && pencilSourceExists && pendingExports.length === 0 && runtimeRows === 0 && !verificationMarkers && reviewClean;

const blockers = [];
if (!styleApproved) blockers.push("视觉风格尚未从 Pencil boards 确认");
if (!pencilSourceExists) blockers.push("Pencil .pen 源文件缺失");
if (pendingExports.length) blockers.push("最终 Pencil 导出切图未完成");
if (runtimeRows) blockers.push("runtime JSONL 未清空");
if (verificationMarkers) blockers.push("runtime 含本地验证标记");
if (!reviewClean) blockers.push("runtime review 仍是测试数据或已过期");

const lines = [
  "# Preflight Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "This report is the final preflight view before real sampling. If it says `internal_only`, do not recruit real users or interpret traffic as real conversion data.",
  "",
  "## Current Mode",
  "",
  table(["item", "value"], [
    ["mode", ready ? "ready_for_real_sampling" : "internal_only"],
    ["can sample real users", ready ? "yes" : "no"],
    ["blocking summary", blockers.length ? blockers.join("; ") : "none"],
    ["launch gate", "`npm run verify:launch`"]
  ]),
  "",
  "## Design Gates",
  "",
  table(["gate", "status", "detail"], [
    ["style approval", styleApproved ? "ok" : "blocked", styleApproved ? `${styleApproval.approvedBy} @ ${styleApproval.approvedAt}` : `status=${styleApproval.status || "missing"}`],
    ["Pencil source", pencilSourceExists ? "ok" : "blocked", pencilSourceExists ? manifest.pencilFile : `missing: ${manifest.pencilFile || "unset"}`],
    ["Pencil exports", pendingExports.length ? "blocked" : "ok", pendingExports.length ? pendingExports.map((target) => `${target.name}:${target.status || "unknown"}`).join(", ") : "ready"]
  ]),
  "",
  "Review links: `/designs/imagegen-review.html`, `/designs/style-approval.json`, `/designs/asset-index.md`, `/designs/operator-pack.md`, `/designs/handoff-packet.md`.",
  "",
  "## Pencil Assets",
  "",
  table(["asset", "status", "destination"], (manifest.exportTargets || []).map((target) => [
    target.name,
    target.status || "unknown",
    target.destination || "-"
  ])),
  "",
  pendingExports.length
    ? "Pencil 仍是当前最大外部阻塞：必须确认视觉风格、恢复 Pencil 桌面端、保存 `.pen`，并导出最终切图。"
    : "Pencil 最终切图已完成。",
  "",
  "## Runtime Data",
  "",
  table(["file", "rows"], [
    ["reports.jsonl", reports.length],
    ["events.jsonl", events.length],
    ["interviews.jsonl", interviews.length],
    ["total", runtimeRows]
  ]),
  "",
  verificationMarkers
    ? "当前 runtime 含 verify_data / verify_variant / verify_user 标记，不能用于真实采样结论。"
    : "当前 runtime 未发现本地验证标记。",
  "",
  "## Sampling Materials",
  "",
  table(["item", "value"], [
    ["sampling links version", samplingLinks.version || "missing"],
    ["sampling links", (samplingLinks.links || []).length],
    ["cards index", fs.existsSync(path.join(root, "docs", "sampling-cards", "index.html")) ? "exists" : "missing"],
    ["safety SOP", fs.existsSync(path.join(root, "experiments", "sampling-safety-sop.md")) ? "exists" : "missing"],
    ["launch handoff", fs.existsSync(path.join(root, "docs", "launch-handoff.md")) ? "exists" : "missing"],
    ["launch rehearsal", fs.existsSync(path.join(root, "docs", "launch-rehearsal.md")) ? "exists" : "missing"]
  ]),
  "",
  "## Next Commands",
  "",
  ready
    ? [
        "```bash",
        "npm run verify:launch",
        "npm run review:runtime",
        "npm run brief:founder",
        "```"
      ].join("\n")
    : [
        "```bash",
        "powershell -ExecutionPolicy Bypass -File tools\\check-pencil-readiness.ps1",
        "npm run verify:assets:final",
        "npm run sampling:prepare -- --yes",
        "npm run verify:launch",
        "```"
      ].join("\n"),
  "",
  "## Operator Notes",
  "",
  "- 不要在 `verify:launch` 通过前对外采样。",
  "- 不要把 `temporary_preview` 当作最终视觉资产。",
  "- 不要把本地验证数据当作真实用户结论。",
  "- 不要收真实手机号、微信或身份信息。",
  "- 完整交接见 `docs/launch-handoff.md`；现场安全边界见 `experiments/sampling-safety-sop.md`。",
  ""
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`preflight report ok: ready=${ready}, blockers=${blockers.length}`);
console.log(outputPath);
