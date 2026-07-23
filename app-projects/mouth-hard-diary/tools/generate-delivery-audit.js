const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "docs", "delivery-audit.md");
const jsonOutputPath = path.join(root, "docs", "objective-completion-audit.json");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function readJson(filePath, fallback = {}) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : fallback;
}

function jsonlCount(relativePath) {
  const content = read(relativePath).trim();
  return content ? content.split(/\r?\n/).length : 0;
}

function hasVerificationMarkers() {
  const files = [
    "server/data/runtime/reports.jsonl",
    "server/data/runtime/events.jsonl",
    "server/data/runtime/interviews.jsonl"
  ];
  return files.some((file) => /verify_data|verify_variant|verify_user|verify_data_event/.test(read(file)));
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function status(ok) {
  return ok ? "complete" : "blocked";
}

const manifest = readJson(manifestPath, { images: [], exportTargets: [] });
const approval = readJson(approvalPath, {});
const styleApproved = approval.status === "approved" && Boolean(approval.approvedBy) && Boolean(approval.approvedAt);
const pencilSourceExists = Boolean(manifest.pencilFile && exists(manifest.pencilFile));
const pendingExports = (manifest.exportTargets || []).filter((target) => target.status !== "pencil_exported");
const runtimeRows = {
  reports: jsonlCount("server/data/runtime/reports.jsonl"),
  events: jsonlCount("server/data/runtime/events.jsonl"),
  interviews: jsonlCount("server/data/runtime/interviews.jsonl")
};
const runtimeClean = runtimeRows.reports === 0 && runtimeRows.events === 0 && runtimeRows.interviews === 0 && !hasVerificationMarkers();
const reviewClean = read("docs/runtime-review.md").includes("| 含测试数据 | 否 |");
const h5AssetUsage = read("docs/h5-asset-usage.md");
const requiredH5AssetsReferenced = (manifest.exportTargets || [])
  .filter((target) => (target.runtimeUsage || "required") === "required")
  .every((target) => h5AssetUsage.includes(target.name || "") && !h5AssetUsage.includes(`| ${target.name} | \`${target.destination}\` | required | - |`));
const sourceImagesReady = (manifest.images || []).length > 0 && (manifest.images || []).every((image) => exists(path.join("designs", "pencil-source", image.file || "")));
const finalExportsReady = pendingExports.length === 0 && manifest.status === "pencil_exported";

const areas = [
  {
    area: "用户调研",
    ok: exists("research/user-research.md") && exists("research/market-patterns.md"),
    evidence: "`research/user-research.md`, `research/market-patterns.md`",
    blocker: ""
  },
  {
    area: "产品设计",
    ok: exists("product/mvp-prd.md") && exists("product/content-system.md") && exists("experiments/validation-plan.md"),
    evidence: "`product/mvp-prd.md`, `product/content-system.md`, `experiments/validation-plan.md`",
    blocker: ""
  },
  {
    area: "UI / Pencil 视觉链路",
    ok: styleApproved && pencilSourceExists && pendingExports.length === 0,
    evidence: "`designs/pencil-source/style-approval.json`, `.pen`, `image-manifest.json`, `h5/assets/visuals/pencil-export/`",
    blocker: [
      styleApproved ? "" : `style=${approval.status || "missing"}`,
      pencilSourceExists ? "" : `missing=${manifest.pencilFile || "unset"}`,
      pendingExports.length ? `exports=${pendingExports.map((target) => `${target.name}:${target.status}`).join(", ")}` : ""
    ].filter(Boolean).join("; ")
  },
  {
    area: "前端 H5",
    ok: exists("h5/index.html") && exists("h5/app.js") && exists("h5/styles.css") && exists("h5/screenshots/home.png") && exists("h5/screenshots/result.png"),
    evidence: "`h5/index.html`, `h5/app.js`, `h5/styles.css`, browser screenshots",
    blocker: ""
  },
  {
    area: "后端配合",
    ok: exists("server/index.js") && exists("backend/api-and-data-plan.md") && exists("server/lib/decision-summary.js"),
    evidence: "`server/index.js`, `backend/api-and-data-plan.md`, runtime summary/export/admin APIs",
    blocker: ""
  },
  {
    area: "数据与隐私边界",
    ok: exists("tools/verify-privacy-data.js") && exists("experiments/sampling-safety-sop.md"),
    evidence: "`tools/verify-privacy-data.js`, `experiments/sampling-safety-sop.md`",
    blocker: ""
  },
  {
    area: "采样执行",
    ok: exists("docs/sampling-links.md") && exists("docs/sampling-cards/index.html") && exists("experiments/field-sampling-playbook.md"),
    evidence: "`docs/sampling-links.md`, `docs/sampling-cards/index.html`, `experiments/field-sampling-playbook.md`",
    blocker: ""
  },
  {
    area: "正式 launch readiness",
    ok: styleApproved && pencilSourceExists && pendingExports.length === 0 && runtimeClean && reviewClean,
    evidence: "`npm run verify:launch`",
    blocker: [
      styleApproved && pencilSourceExists && pendingExports.length === 0 ? "" : "final Pencil gate incomplete",
      runtimeClean ? "" : `runtime not clean: reports=${runtimeRows.reports}, events=${runtimeRows.events}, interviews=${runtimeRows.interviews}`,
      reviewClean ? "" : "runtime review stale_or_test_data"
    ].filter(Boolean).join("; ")
  }
];

const completeCount = areas.filter((area) => area.ok).length;
const overallReady = areas.every((area) => area.ok);

const requirements = [
  ["读取项目记忆并形成用户画像", exists("research/user-research.md") ? "complete" : "missing", "`research/user-research.md`", exists("research/user-research.md") ? "-" : "missing user research"],
  ["调研市面常见产品形态", exists("research/market-patterns.md") ? "complete" : "missing", "`research/market-patterns.md`", exists("research/market-patterns.md") ? "-" : "missing market patterns"],
  ["完成 MVP 产品设计", exists("product/mvp-prd.md") && exists("product/content-system.md") ? "complete" : "missing", "`product/mvp-prd.md`, `product/content-system.md`", exists("product/mvp-prd.md") && exists("product/content-system.md") ? "-" : "missing PRD/content system"],
  ["先用 image2 生成源图", sourceImagesReady ? "complete" : "missing", "`designs/pencil-source/images/`, `designs/pencil-source/asset-index.md`", sourceImagesReady ? "-" : "source image missing"],
  ["导入 Pencil 并在 `.pen` 内沉淀 UI 设计", pencilSourceExists ? "complete" : "blocked", "`designs/pencil-source/mouth-hard-diary.pen`, `designs/pencil-source/operator-pack.md`", pencilSourceExists ? "-" : `missing ${manifest.pencilFile || "unset"}`],
  ["你/我确认 Pencil 视觉风格", styleApproved ? "complete" : "blocked", "`designs/pencil-source/style-approval.json`, `designs/imagegen-review.html`", styleApproved ? "-" : `style=${approval.status || "missing"}`],
  ["从 Pencil 导出切图", finalExportsReady ? "complete" : "blocked", "`designs/pencil-source/image-manifest.json`, `h5/assets/visuals/pencil-export/`", finalExportsReady ? "-" : pendingExports.map((target) => `${target.name}:${target.status}`).join(", ")],
  ["H5 引用 Pencil 导出图", requiredH5AssetsReferenced ? "complete" : "blocked", "`docs/h5-asset-usage.md`, `npm run verify:h5-asset-usage`", requiredH5AssetsReferenced ? "-" : "required runtime export not referenced"],
  ["完成前端 H5 主流程", exists("h5/index.html") && exists("h5/app.js") && exists("h5/screenshots/home.png") && exists("h5/screenshots/result.png") ? "complete" : "missing", "`h5/index.html`, `h5/app.js`, `h5/screenshots/home.png`, `h5/screenshots/result.png`", "-"],
  ["完成后端配合与数据看板", exists("server/index.js") && exists("h5/admin.html") && exists("backend/api-and-data-plan.md") ? "complete" : "missing", "`server/index.js`, `h5/admin.html`, `backend/api-and-data-plan.md`", "-"],
  ["完成隐私边界与采样 SOP", exists("tools/verify-privacy-data.js") && exists("experiments/sampling-safety-sop.md") ? "complete" : "missing", "`tools/verify-privacy-data.js`, `experiments/sampling-safety-sop.md`", "-"],
  ["完成 launch 前总门禁", overallReady ? "complete" : "blocked", "`npm run verify:launch`", overallReady ? "-" : "final Pencil gate and runtime cleanup remain"]
];

const auditJson = {
  generatedAt: new Date().toISOString(),
  overallReady,
  completeAreas: completeCount,
  totalAreas: areas.length,
  primaryBlocker: overallReady ? "none" : "final Pencil export chain and runtime cleanup",
  areas,
  requirements: requirements.map(([requirement, state, evidence, blocker]) => ({ requirement, state, evidence, blocker })),
  pencilGate: {
    styleApproval: styleApproved ? `${approval.approvedBy} @ ${approval.approvedAt}` : `blocked: ${approval.status || "missing"}`,
    pencilSource: pencilSourceExists ? manifest.pencilFile : `blocked: missing ${manifest.pencilFile || "unset"}`,
    manifestStatus: manifest.status || "missing",
    pendingExports: pendingExports.map((target) => `${target.name}:${target.status}`)
  },
  runtimeGate: {
    rows: runtimeRows,
    verificationMarkers: hasVerificationMarkers(),
    reviewClean
  }
};

const lines = [
  "# Delivery Audit",
  "",
  "This audit tracks the original full-scope request: user research, product design, UI/Pencil design, frontend, backend coordination, and launch validation.",
  "",
  "## Summary",
  "",
  table(
    ["Metric", "Value"],
    [
      ["Overall status", overallReady ? "ready" : "not ready"],
      ["Complete areas", `${completeCount}/${areas.length}`],
      ["Launch gate", "`npm run verify:launch`"],
      ["Primary blocker", auditJson.primaryBlocker],
      ["Machine-readable audit", "`docs/objective-completion-audit.json`"]
    ]
  ),
  "",
  "## Area Matrix",
  "",
  table(
    ["Area", "Status", "Evidence", "Blocker"],
    areas.map((area) => [area.area, status(area.ok), area.evidence, area.blocker || "-"])
  ),
  "",
  "## Requirement Matrix",
  "",
  table(
    ["Requirement", "Status", "Evidence", "Blocker"],
    requirements
  ),
  "",
  "## Pencil Gate Snapshot",
  "",
  table(
    ["Item", "Current state"],
    [
      ["Style approval", auditJson.pencilGate.styleApproval],
      ["Pencil source", auditJson.pencilGate.pencilSource],
      ["Manifest status", auditJson.pencilGate.manifestStatus],
      ["Pending exports", auditJson.pencilGate.pendingExports.length ? auditJson.pencilGate.pendingExports.join(", ") : "none"]
    ]
  ),
  "",
  "## Runtime Gate Snapshot",
  "",
  table(
    ["Item", "Current state"],
    [
      ["reports.jsonl", String(runtimeRows.reports)],
      ["events.jsonl", String(runtimeRows.events)],
      ["interviews.jsonl", String(runtimeRows.interviews)],
      ["verification markers", auditJson.runtimeGate.verificationMarkers ? "present" : "none"],
      ["runtime review clean", reviewClean ? "yes" : "no"]
    ]
  ),
  "",
  "## Required Next Actions",
  "",
  "1. Restore Pencil and create/open `designs/pencil-source/mouth-hard-diary.pen`.",
  "2. Use `designs/pencil-source/operator-pack.md` and `designs/pencil-source/handoff-packet.md` to import source images, build boards, confirm style, and export nodes.",
  "3. Update style approval after user confirmation, then run `npm run pencil:register-exports` and `npm run pencil:register-exports -- --yes`.",
  "4. Run `npm run verify:style-approval:final`, `npm run verify:assets:final`, `npm run verify:h5-asset-usage`, and `npm run verify:browser`.",
  "5. Only before real sampling, run `npm run sampling:prepare -- --yes` to clear runtime data.",
  "6. Run `npm run verify:launch`; only a full pass means the full request is complete.",
  ""
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
fs.writeFileSync(jsonOutputPath, `${JSON.stringify(auditJson, null, 2)}\n`, "utf8");
console.log(`wrote ${path.relative(root, outputPath)}`);
console.log(`wrote ${path.relative(root, jsonOutputPath)}`);
