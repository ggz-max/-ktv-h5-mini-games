const http = require("http");
const fs = require("fs");
const path = require("path");
const { buildDecisionSummary } = require("./lib/decision-summary");
const { createAnalyticsStore } = require("./analytics");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "h5");
const documentRoots = {
  "/docs/": path.join(root, "docs"),
  "/experiments/": path.join(root, "experiments"),
  "/designs/": path.join(root, "designs")
};
const contentPath = path.join(__dirname, "data", "report-content.json");
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const experimentsPath = path.join(__dirname, "data", "experiments.json");
const experiments = JSON.parse(fs.readFileSync(experimentsPath, "utf8"));
const assetManifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const styleApprovalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const runtimeReviewPath = path.join(root, "docs", "runtime-review.md");
const samplingLinksPath = path.join(root, "docs", "sampling-links.generated.json");
const runtimeDir = path.join(__dirname, "data", "runtime");
const reportsLogPath = path.join(runtimeDir, "reports.jsonl");
const eventsLogPath = path.join(runtimeDir, "events.jsonl");
const interviewsLogPath = path.join(runtimeDir, "interviews.jsonl");
const port = Number(process.env.PORT || 4327);
const host = process.env.HOST || "127.0.0.1";

fs.mkdirSync(runtimeDir, { recursive: true });
const analytics = createAnalyticsStore({ dataDir: runtimeDir, legacyEventsPath: eventsLogPath });

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function appendJsonl(filePath, payload) {
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function readJsonl(filePath, limit = 50) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      return { malformed: true, raw: line };
    }
  });
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function readJsonFile(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { malformed: true, error: error.message };
  }
}

function resolveDocumentFile(pathname) {
  const aliases = {
    "/designs/style-approval.json": path.join(root, "designs", "pencil-source", "style-approval.json"),
    "/designs/style-approval-draft.json": path.join(root, "designs", "pencil-source", "style-approval.approved-draft.json"),
    "/designs/style-approval-apply-guide.md": path.join(root, "designs", "pencil-source", "style-approval-apply-guide.md"),
    "/designs/asset-index.md": path.join(root, "designs", "pencil-source", "asset-index.md"),
    "/designs/pencil-import-checklist.csv": path.join(root, "designs", "pencil-source", "pencil-import-checklist.csv"),
    "/designs/pencil-import-checklist.json": path.join(root, "designs", "pencil-source", "pencil-import-checklist.json"),
    "/designs/operator-pack.md": path.join(root, "designs", "pencil-source", "operator-pack.md"),
    "/designs/pencil-board-spec.md": path.join(root, "designs", "pencil-source", "pencil-board-spec.md"),
    "/designs/finalization-checklist.md": path.join(root, "designs", "pencil-source", "finalization-checklist.md"),
    "/designs/handoff-packet.md": path.join(root, "designs", "pencil-source", "handoff-packet.md")
  };
  if (aliases[pathname]) {
    return { filePath: aliases[pathname] };
  }
  const match = Object.entries(documentRoots).find(([prefix]) => pathname.startsWith(prefix));
  if (!match) return null;
  const [prefix, baseDir] = match;
  const relativePath = decodeURIComponent(pathname.slice(prefix.length));
  const filePath = path.normalize(path.join(baseDir, relativePath));
  if (!filePath.startsWith(baseDir) || !/\.(md|html|json|png)$/i.test(filePath)) {
    return { forbidden: true };
  }
  if (prefix === "/designs/" && /\.pen$/i.test(filePath)) {
    return { forbidden: true };
  }
  return { filePath };
}

function lineCount(filePath) {
  const content = readText(filePath).trim();
  return content ? content.split(/\r?\n/).length : 0;
}

function readSamplingLinksSnapshot() {
  if (!fs.existsSync(samplingLinksPath)) {
    return {
      ok: false,
      error: "sampling_links_missing",
      links: []
    };
  }
  return {
    ok: true,
    ...JSON.parse(fs.readFileSync(samplingLinksPath, "utf8"))
  };
}

function buildLaunchReadiness() {
  const reports = readJsonl(reportsLogPath, 5000);
  const events = readJsonl(eventsLogPath, 5000);
  const interviews = readJsonl(interviewsLogPath, 5000);
  const pencilAssets = buildPencilAssetStatus();
  const { styleApproval, pencilSource, pendingExports } = pencilAssets;
  const hasVerificationData = reports.some((item) => item.source === "verify_data" || item.entryVariant === "verify_variant") ||
    events.some((item) => item.sessionId === "verify_data" || item.event === "verify_data_event") ||
    interviews.some((item) => item.segment === "verify_user" || item.source === "verify_data");
  const review = readText(runtimeReviewPath);
  const reviewClean = review.includes("| \u542b\u6d4b\u8bd5\u6570\u636e | \u5426 |");
  const checks = [
    {
      key: "style_approved",
      label: "\u89c6\u89c9\u98ce\u683c\u5df2\u786e\u8ba4",
      ok: styleApproval.approved,
      detail: styleApproval.approved ? `${styleApproval.approvedBy} @ ${styleApproval.approvedAt}` : `status=${styleApproval.status || "missing"}`
    },
    {
      key: "pencil_source_file",
      label: "Pencil .pen \u6e90\u6587\u4ef6\u5b58\u5728",
      ok: pencilSource.exists,
      detail: pencilSource.exists ? pencilSource.file : `missing: ${pencilSource.file || "unset"}`
    },
    {
      key: "final_pencil_exports",
      label: "\u6700\u7ec8 Pencil \u5bfc\u51fa\u5207\u56fe",
      ok: pendingExports.length === 0,
      detail: pendingExports.length ? pendingExports.map((item) => `${item.name}:${item.status}`).join(", ") : "ready"
    },
    {
      key: "runtime_empty",
      label: "runtime \u6570\u636e\u5df2\u6e05\u7a7a",
      ok: reports.length === 0 && events.length === 0 && interviews.length === 0,
      detail: `reports=${reports.length}, events=${events.length}, interviews=${interviews.length}`
    },
    {
      key: "no_verification_data",
      label: "\u65e0\u672c\u5730\u9a8c\u8bc1\u6807\u8bb0",
      ok: !hasVerificationData,
      detail: hasVerificationData ? "found verify_data markers" : "clean"
    },
    {
      key: "runtime_review_clean",
      label: "\u590d\u76d8\u6587\u6863\u4e0d\u542b\u6d4b\u8bd5\u6570\u636e",
      ok: reviewClean,
      detail: fs.existsSync(runtimeReviewPath) ? (reviewClean ? "clean" : "stale_or_test_data") : "missing"
    }
  ];

  return {
    ok: checks.every((item) => item.ok),
    mode: checks.every((item) => item.ok) ? "ready_for_real_sampling" : "internal_only",
    checkedAt: new Date().toISOString(),
    runtimeLines: {
      reports: lineCount(reportsLogPath),
      events: lineCount(eventsLogPath),
      interviews: lineCount(interviewsLogPath)
    },
    pendingExports,
    styleApproval: {
      status: styleApproval.status || "missing",
      approvedBy: styleApproval.approvedBy || "",
      approvedAt: styleApproval.approvedAt || ""
    },
    pencilSource: {
      file: pencilSource.file || "",
      exists: pencilSource.exists
    },
    checks
  };
}

function buildPencilAssetStatus() {
  const manifest = readJsonFile(assetManifestPath, { images: [], exportTargets: [] });
  const approval = readJsonFile(styleApprovalPath, {});
  const importChecklistCsv = "designs/pencil-source/pencil-import-checklist.csv";
  const importChecklistJson = "designs/pencil-source/pencil-import-checklist.json";
  const pencilFile = manifest.pencilFile || "designs/pencil-source/mouth-hard-diary.pen";
  const pencilFilePath = path.join(root, pencilFile);
  const sourceImages = (manifest.images || []).map((image) => {
    const file = path.join("designs", "pencil-source", image.file || "");
    const absolutePath = path.join(root, file);
    return {
      file,
      role: image.role || "unknown",
      board: image.recommendedBoard || "",
      priority: image.priority || "",
      exists: fs.existsSync(absolutePath),
      width: image.width || 0,
      height: image.height || 0,
      sha256: image.sha256 || ""
    };
  });
  const exportTargets = (manifest.exportTargets || []).map((target) => {
    const absolutePath = path.join(root, target.destination || "");
    const exists = Boolean(target.destination && fs.existsSync(absolutePath));
    const final = target.status === "pencil_exported";
    return {
      name: target.name || "",
      destination: target.destination || "",
      sourceBoard: target.sourceBoard || "",
      expectedNodeName: target.expectedNodeName || "",
      expectedWidth: target.expectedWidth || 0,
      expectedHeight: target.expectedHeight || 0,
      status: target.status || "unknown",
      exists,
      final,
      mustReplaceFromPencil: Boolean(target.mustReplaceFromPencil)
    };
  });
  const pendingExports = exportTargets
    .filter((target) => !target.final)
    .map((target) => ({
      name: target.name,
      status: target.status || "unknown",
      exists: target.exists
    }));
  const styleApproved = approval.status === "approved" && Boolean(approval.approvedBy) && Boolean(approval.approvedAt);
  const sourceImagesReady = sourceImages.length > 0 && sourceImages.every((image) => image.exists);
  const pencilSourceExists = fs.existsSync(pencilFilePath);
  const finalExportsReady = exportTargets.length > 0 && exportTargets.every((target) => target.final && target.exists);
  const blockers = [
    !sourceImagesReady ? "image2 source images missing from designs/pencil-source/images" : "",
    !styleApproved ? "style approval is still pending" : "",
    !pencilSourceExists ? `Pencil source file missing: ${pencilFile}` : "",
    !finalExportsReady ? "final Pencil exports are not registered and complete" : ""
  ].filter(Boolean);
  const nextActions = [
    styleApproved ? "" : "Open designs/imagegen-review.html, generate a style approval draft, and apply it only after Pencil-board confirmation.",
    pencilSourceExists ? "" : "Create/open designs/pencil-source/mouth-hard-diary.pen in Pencil and import the image2 source board.",
    finalExportsReady ? "" : "Export hero-report-collage.png, share-poster-bg.png, and report-stickers.png from Pencil into h5/assets/visuals/pencil-export/.",
    finalExportsReady ? "" : "Open designs/finalization-checklist.md, then run npm run pencil:register-exports and npm run pencil:register-exports -- --yes after all final checks pass."
  ].filter(Boolean);

  return {
    ok: blockers.length === 0,
    mode: blockers.length === 0 ? "pencil_assets_ready" : "pending_pencil_handoff",
    checkedAt: new Date().toISOString(),
    readinessReport: "docs/pencil-readiness.md",
    manifest: {
      status: manifest.status || "missing",
      source: manifest.source || "",
      pencilFile,
      runtimeExportRoot: manifest.runtimeExportRoot || ""
    },
    styleApproval: {
      status: approval.status || "missing",
      approved: styleApproved,
      approvedBy: approval.approvedBy || "",
      approvedAt: approval.approvedAt || "",
      reviewPage: approval.reviewPage || "",
      directionName: approval.directionName || "",
      draftFile: "designs/pencil-source/style-approval.approved-draft.json",
      applyGuide: "designs/pencil-source/style-approval-apply-guide.md",
      handoffPacket: "designs/pencil-source/handoff-packet.md"
    },
    importChecklist: {
      csv: importChecklistCsv,
      json: importChecklistJson,
      csvExists: fs.existsSync(path.join(root, importChecklistCsv)),
      jsonExists: fs.existsSync(path.join(root, importChecklistJson))
    },
    pencilSource: {
      file: pencilFile,
      exists: pencilSourceExists
    },
    sourceImages,
    exportTargets,
    pendingExports,
    blockers,
    nextActions
  };
}

function buildDeliveryAuditStatus() {
  const pencilAssets = buildPencilAssetStatus();
  const runtimeRows = {
    reports: lineCount(reportsLogPath),
    events: lineCount(eventsLogPath),
    interviews: lineCount(interviewsLogPath)
  };
  const runtimeClean = runtimeRows.reports === 0 && runtimeRows.events === 0 && runtimeRows.interviews === 0;
  const reviewClean = readText(runtimeReviewPath).includes("| \u542b\u6d4b\u8bd5\u6570\u636e | \u5426 |");
  const h5AssetUsage = readText(path.join(root, "docs", "h5-asset-usage.md"));
  const manifest = readJsonFile(assetManifestPath, { images: [], exportTargets: [] });
  const sourceImagesReady = (pencilAssets.sourceImages || []).length > 0 && pencilAssets.sourceImages.every((image) => image.exists);
  const requiredExportsReferenced = (manifest.exportTargets || [])
    .filter((target) => (target.runtimeUsage || "required") === "required")
    .every((target) => h5AssetUsage.includes(target.name || "") && !h5AssetUsage.includes(`| ${target.name} | \`${target.destination}\` | required | - |`));
  const finalExportsReady = pencilAssets.pendingExports.length === 0 && pencilAssets.manifest.status === "pencil_exported";
  const checks = [
    {
      key: "user_research",
      label: "\u7528\u6237\u753b\u50cf\u4e0e\u673a\u4f1a\u5224\u65ad",
      ok: fs.existsSync(path.join(root, "research", "user-research.md")),
      evidence: "research/user-research.md"
    },
    {
      key: "market_research",
      label: "\u5e02\u573a\u5f62\u6001\u4e0e\u7ade\u54c1\u542f\u53d1",
      ok: fs.existsSync(path.join(root, "research", "market-patterns.md")),
      evidence: "research/market-patterns.md"
    },
    {
      key: "product_design",
      label: "MVP \u4ea7\u54c1\u8bbe\u8ba1",
      ok: fs.existsSync(path.join(root, "product", "mvp-prd.md")) && fs.existsSync(path.join(root, "product", "content-system.md")),
      evidence: "product/mvp-prd.md, product/content-system.md"
    },
    {
      key: "image2_sources",
      label: "image2 \u6e90\u56fe\u5df2\u751f\u6210",
      ok: sourceImagesReady,
      evidence: "designs/pencil-source/images/"
    },
    {
      key: "pencil_pen",
      label: "Pencil .pen \u5185\u6c89\u6dc0 UI \u8bbe\u8ba1",
      ok: pencilAssets.pencilSource.exists,
      evidence: pencilAssets.pencilSource.file,
      blocker: pencilAssets.pencilSource.exists ? "" : `missing ${pencilAssets.pencilSource.file}`
    },
    {
      key: "style_approval",
      label: "\u4f60/\u6211\u786e\u8ba4 Pencil \u89c6\u89c9\u98ce\u683c",
      ok: pencilAssets.styleApproval.approved,
      evidence: "designs/pencil-source/style-approval.json",
      blocker: pencilAssets.styleApproval.approved ? "" : `status=${pencilAssets.styleApproval.status}`
    },
    {
      key: "pencil_exports",
      label: "\u4ece Pencil \u5bfc\u51fa\u5207\u56fe",
      ok: finalExportsReady,
      evidence: "designs/pencil-source/image-manifest.json",
      blocker: finalExportsReady ? "" : pencilAssets.pendingExports.map((item) => `${item.name}:${item.status}`).join(", ")
    },
    {
      key: "h5_asset_usage",
      label: "H5 \u5f15\u7528 Pencil \u5bfc\u51fa\u56fe",
      ok: requiredExportsReferenced,
      evidence: "docs/h5-asset-usage.md"
    },
    {
      key: "frontend_h5",
      label: "\u524d\u7aef H5 \u4e3b\u6d41\u7a0b",
      ok: fs.existsSync(path.join(root, "h5", "index.html")) && fs.existsSync(path.join(root, "h5", "app.js")),
      evidence: "h5/index.html, h5/app.js"
    },
    {
      key: "backend_admin",
      label: "\u540e\u7aef\u63a5\u53e3\u4e0e\u6570\u636e\u770b\u677f",
      ok: fs.existsSync(path.join(root, "server", "index.js")) && fs.existsSync(path.join(root, "h5", "admin.html")),
      evidence: "server/index.js, h5/admin.html"
    },
    {
      key: "privacy_sampling",
      label: "\u9690\u79c1\u8fb9\u754c\u4e0e\u91c7\u6837 SOP",
      ok: fs.existsSync(path.join(root, "tools", "verify-privacy-data.js")) && fs.existsSync(path.join(root, "experiments", "sampling-safety-sop.md")),
      evidence: "tools/verify-privacy-data.js, experiments/sampling-safety-sop.md"
    },
    {
      key: "launch_gate",
      label: "launch \u524d\u603b\u95e8\u7981",
      ok: pencilAssets.ok && runtimeClean && reviewClean,
      evidence: "npm run verify:launch",
      blocker: pencilAssets.ok && runtimeClean && reviewClean ? "" : "final Pencil gate and runtime cleanup remain"
    }
  ];
  return {
    ok: checks.every((check) => check.ok),
    checkedAt: new Date().toISOString(),
    complete: checks.filter((check) => check.ok).length,
    total: checks.length,
    runtimeRows,
    checks
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 64) {
        reject(new Error("body_too_large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function pick(list, seed) {
  return list[Math.abs(seed) % list.length];
}

function hash(value) {
  return String(value || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function createReport(payload) {
  const text = String(payload.text || "").slice(0, 80);
  const scene = payload.scene || "tired";
  const style = payload.style || "decent_breakdown";
  const sceneContent = content.scenes[scene] || content.scenes.tired;
  const styleContent = content.styles[style] || content.styles.decent_breakdown;
  const risky = content.riskWords.some((word) => text.includes(word));

  if (risky) {
    const crisisReport = {
      reportId: `rpt_${Date.now()}`,
      riskLevel: "crisis",
      title: content.crisis.title,
      quote: content.crisis.quote,
      bullets: content.crisis.bullets,
      advice: content.crisis.advice,
      energy: { sanity: 12, mouthHard: 0, needSleep: 100 }
    };
    appendJsonl(reportsLogPath, {
      ...crisisReport,
      scene,
      style,
      source: payload.source || "unknown",
      campaign: payload.campaign || "unknown",
      channel: payload.channel || "unknown",
      storeId: payload.storeId || "unknown",
      roomId: payload.roomId || "unknown",
      configVersion: payload.configVersion || "unknown",
      experimentVersion: payload.experimentVersion || "unknown",
      entryVariant: payload.entryVariant || "unknown",
      hasText: Boolean(text),
      createdAt: new Date().toISOString()
    });
    return crisisReport;
  }

  const seed = hash(`${scene}:${style}:${text}:${Date.now()}`);
  const mouthHard = 68 + (seed % 29);
  const sanity = 24 + (seed % 52);
  const needSleep = 55 + (seed % 41);

  const report = {
    reportId: `rpt_${Date.now()}`,
    riskLevel: "normal",
    contentVersion: content.version,
    title: pick(sceneContent.titles, seed),
    quote: pick(styleContent.quotes, seed + 3),
    bullets: sceneContent.bullets,
    advice: pick(content.advice, seed + 7),
    energy: { sanity, mouthHard, needSleep }
  };
  appendJsonl(reportsLogPath, {
    ...report,
    scene,
    style,
    source: payload.source || "unknown",
    campaign: payload.campaign || "unknown",
    channel: payload.channel || "unknown",
    storeId: payload.storeId || "unknown",
    roomId: payload.roomId || "unknown",
    configVersion: payload.configVersion || "unknown",
    experimentVersion: payload.experimentVersion || "unknown",
    entryVariant: payload.entryVariant || "unknown",
    hasText: Boolean(text),
    inputLength: text.length,
    createdAt: new Date().toISOString()
  });
  return report;
}

function buildRuntimeSummary(events, reports, interviews = []) {
  const rate = (value, base) => base > 0 ? Number((value / base).toFixed(4)) : 0;
  const eventCounts = events.reduce((acc, item) => {
    acc[item.event || "unknown"] = (acc[item.event || "unknown"] || 0) + 1;
    return acc;
  }, {});
  const variantSummary = {};
  const sourceSummary = {};
  const appInterestSummary = {};
  const leadSummary = {};
  const feedbackSummary = {};
  const resultInteractionSummary = {
    rituals: {},
    remixes: {},
    remixCopies: 0,
    collections: 0,
    archiveClears: 0
  };
  events.forEach((item) => {
    const variant = (item.payload && item.payload.entryVariant) || item.entryVariant || "unknown";
    if (!variantSummary[variant]) {
      variantSummary[variant] = { events: 0, reports: 0, starts: 0, saves: 0, shares: 0, appCtas: 0, leadIntents: 0, regenerates: 0, rituals: 0, remixes: 0, collections: 0 };
    }
    variantSummary[variant].events += 1;
    if (item.event === "mh_start_click") variantSummary[variant].starts += 1;
    if (item.event === "mh_save_click") variantSummary[variant].saves += 1;
    if (item.event === "mh_share_click") variantSummary[variant].shares += 1;
    if (item.event === "mh_app_cta_click") variantSummary[variant].appCtas += 1;
    if (item.event === "mh_lead_intent_click") variantSummary[variant].leadIntents += 1;
    if (item.event === "mh_regenerate_click") variantSummary[variant].regenerates += 1;
    if (item.event === "mh_result_ritual_click") variantSummary[variant].rituals += 1;
    if (item.event === "mh_result_remix_click") variantSummary[variant].remixes += 1;
    if (item.event === "mh_report_collect_click") variantSummary[variant].collections += 1;

    const source = (item.payload && item.payload.source) || item.source || "unknown";
    if (!sourceSummary[source]) {
      sourceSummary[source] = { events: 0, reports: 0, starts: 0, saves: 0, shares: 0, appCtas: 0, leadIntents: 0, regenerates: 0, rituals: 0, remixes: 0, collections: 0 };
    }
    sourceSummary[source].events += 1;
    if (item.event === "mh_start_click") sourceSummary[source].starts += 1;
    if (item.event === "mh_save_click") sourceSummary[source].saves += 1;
    if (item.event === "mh_share_click") sourceSummary[source].shares += 1;
    if (item.event === "mh_app_cta_click") sourceSummary[source].appCtas += 1;
    if (item.event === "mh_lead_intent_click") sourceSummary[source].leadIntents += 1;
    if (item.event === "mh_regenerate_click") sourceSummary[source].regenerates += 1;
    if (item.event === "mh_result_ritual_click") sourceSummary[source].rituals += 1;
    if (item.event === "mh_result_remix_click") sourceSummary[source].remixes += 1;
    if (item.event === "mh_report_collect_click") sourceSummary[source].collections += 1;

    if (item.event === "mh_app_interest_click") {
      const interest = (item.payload && item.payload.interest) || "unknown";
      appInterestSummary[interest] = (appInterestSummary[interest] || 0) + 1;
    }
    if (item.event === "mh_lead_intent_click") {
      const method = (item.payload && item.payload.method) || "unknown";
      leadSummary[method] = (leadSummary[method] || 0) + 1;
    }
    if (item.event === "mh_report_feedback_click") {
      const feedback = (item.payload && item.payload.feedback) || "unknown";
      feedbackSummary[feedback] = (feedbackSummary[feedback] || 0) + 1;
    }
    if (item.event === "mh_result_ritual_click") {
      const ritual = (item.payload && item.payload.ritual) || "unknown";
      resultInteractionSummary.rituals[ritual] = (resultInteractionSummary.rituals[ritual] || 0) + 1;
    }
    if (item.event === "mh_result_remix_click") {
      const remix = (item.payload && item.payload.remix) || "unknown";
      resultInteractionSummary.remixes[remix] = (resultInteractionSummary.remixes[remix] || 0) + 1;
    }
    if (item.event === "mh_result_remix_copy") {
      resultInteractionSummary.remixCopies += 1;
    }
    if (item.event === "mh_report_collect_click") {
      resultInteractionSummary.collections += 1;
    }
    if (item.event === "mh_archive_clear_click") {
      resultInteractionSummary.archiveClears += 1;
    }
  });
  reports.forEach((item) => {
    const variant = item.entryVariant || "unknown";
    if (!variantSummary[variant]) {
      variantSummary[variant] = { events: 0, reports: 0, starts: 0, saves: 0, shares: 0, appCtas: 0, leadIntents: 0, regenerates: 0, rituals: 0, remixes: 0, collections: 0 };
    }
    variantSummary[variant].reports += 1;
    const source = item.source || "unknown";
    if (!sourceSummary[source]) {
      sourceSummary[source] = { events: 0, reports: 0, starts: 0, saves: 0, shares: 0, appCtas: 0, leadIntents: 0, regenerates: 0, rituals: 0, remixes: 0, collections: 0 };
    }
    sourceSummary[source].reports += 1;
  });
  Object.values(variantSummary).forEach((stats) => {
    stats.reportRate = rate(stats.reports, stats.starts);
    stats.saveRate = rate(stats.saves, stats.reports);
    stats.shareRate = rate(stats.shares, stats.reports);
    stats.appCtaRate = rate(stats.appCtas, stats.reports);
    stats.leadIntentRate = rate(stats.leadIntents, stats.reports);
    stats.regenerateRate = rate(stats.regenerates, stats.reports);
    stats.ritualRate = rate(stats.rituals, stats.reports);
    stats.remixRate = rate(stats.remixes, stats.reports);
    stats.collectionRate = rate(stats.collections, stats.reports);
  });
  Object.values(sourceSummary).forEach((stats) => {
    stats.reportRate = rate(stats.reports, stats.starts);
    stats.saveRate = rate(stats.saves, stats.reports);
    stats.shareRate = rate(stats.shares, stats.reports);
    stats.appCtaRate = rate(stats.appCtas, stats.reports);
    stats.leadIntentRate = rate(stats.leadIntents, stats.reports);
    stats.regenerateRate = rate(stats.regenerates, stats.reports);
    stats.ritualRate = rate(stats.rituals, stats.reports);
    stats.remixRate = rate(stats.remixes, stats.reports);
    stats.collectionRate = rate(stats.collections, stats.reports);
  });
  const homeViews = eventCounts.mh_home_view || 0;
  const starts = eventCounts.mh_start_click || 0;
  const textSubmits = eventCounts.mh_text_submit || 0;
  const generateSuccesses = eventCounts.mh_generate_success || 0;
  const saves = eventCounts.mh_save_click || 0;
  const shares = eventCounts.mh_share_click || 0;
  const copies = eventCounts.mh_copy_click || 0;
  const appCtas = eventCounts.mh_app_cta_click || 0;
  const leadIntents = eventCounts.mh_lead_intent_click || 0;
  const regenerates = eventCounts.mh_regenerate_click || 0;
  const rituals = eventCounts.mh_result_ritual_click || 0;
  const remixes = eventCounts.mh_result_remix_click || 0;
  const remixCopies = eventCounts.mh_result_remix_copy || 0;
  const collections = eventCounts.mh_report_collect_click || 0;
  const archiveClears = eventCounts.mh_archive_clear_click || 0;
  const funnelSummary = {
    homeViews,
    starts,
    textSubmits,
    generateSuccesses,
    reports: reports.length,
    saves,
    shares,
    copies,
    appCtas,
    leadIntents,
    regenerates,
    rituals,
    remixes,
    remixCopies,
    collections,
    archiveClears,
    startRate: rate(starts, homeViews),
    submitRate: rate(textSubmits, starts),
    generateRate: rate(generateSuccesses, textSubmits),
    reportRate: rate(reports.length, starts),
    saveRate: rate(saves, reports.length),
    shareRate: rate(shares, reports.length),
    copyRate: rate(copies, reports.length),
    appCtaRate: rate(appCtas, reports.length),
    leadIntentRate: rate(leadIntents, reports.length),
    regenerateRate: rate(regenerates, reports.length),
    ritualRate: rate(rituals, reports.length),
    remixRate: rate(remixes, reports.length),
    remixCopyRate: rate(remixCopies, reports.length),
    collectionRate: rate(collections, reports.length),
    archiveClearRate: rate(archiveClears, reports.length)
  };

  const summary = {
    ok: true,
    reports: reports.length,
    events: events.length,
    uvSummary: analytics.summary(),
    eventCounts,
    funnelSummary,
    variantSummary,
    sourceSummary,
    appInterestSummary,
    leadSummary,
    feedbackSummary,
    resultInteractionSummary,
    latestInterviews: interviews.slice(-10),
    latestReports: reports.slice(-10)
  };
  summary.hasVerificationData = buildDecisionSummary({ events, reports, interviews, summary }).hasVerificationData;
  summary.decisionSummary = buildDecisionSummary({ events, reports, interviews, summary });
  return summary;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
}

function buildRuntimeTables(summary, samplingLinks = { links: [] }) {
  const eventRows = Object.entries(summary.eventCounts || {})
    .sort((a, b) => b[1] - a[1])
    .map(([event, count]) => ({ event, count }));

  const variantRows = Object.entries(summary.variantSummary || {})
    .sort((a, b) => (b[1].starts + b[1].reports) - (a[1].starts + a[1].reports))
    .map(([variant, stats]) => ({
      variant,
      events: stats.events || 0,
      starts: stats.starts || 0,
      reports: stats.reports || 0,
      saves: stats.saves || 0,
      shares: stats.shares || 0,
      appCtas: stats.appCtas || 0,
      leadIntents: stats.leadIntents || 0,
      regenerates: stats.regenerates || 0,
      rituals: stats.rituals || 0,
      remixes: stats.remixes || 0,
      collections: stats.collections || 0,
      reportRate: stats.reportRate || 0,
      saveRate: stats.saveRate || 0,
      shareRate: stats.shareRate || 0,
      appCtaRate: stats.appCtaRate || 0,
      leadIntentRate: stats.leadIntentRate || 0,
      regenerateRate: stats.regenerateRate || 0,
      ritualRate: stats.ritualRate || 0,
      remixRate: stats.remixRate || 0,
      collectionRate: stats.collectionRate || 0
    }));

  const sourceRows = Object.entries(summary.sourceSummary || {})
    .sort((a, b) => (b[1].starts + b[1].reports) - (a[1].starts + a[1].reports))
    .map(([source, stats]) => ({
      source,
      events: stats.events || 0,
      starts: stats.starts || 0,
      reports: stats.reports || 0,
      saves: stats.saves || 0,
      shares: stats.shares || 0,
      appCtas: stats.appCtas || 0,
      leadIntents: stats.leadIntents || 0,
      regenerates: stats.regenerates || 0,
      rituals: stats.rituals || 0,
      remixes: stats.remixes || 0,
      collections: stats.collections || 0,
      reportRate: stats.reportRate || 0,
      saveRate: stats.saveRate || 0,
      shareRate: stats.shareRate || 0,
      appCtaRate: stats.appCtaRate || 0,
      leadIntentRate: stats.leadIntentRate || 0,
      regenerateRate: stats.regenerateRate || 0,
      ritualRate: stats.ritualRate || 0,
      remixRate: stats.remixRate || 0,
      collectionRate: stats.collectionRate || 0
    }));
  const appInterestRows = Object.entries(summary.appInterestSummary || {})
    .sort((a, b) => b[1] - a[1])
    .map(([interest, count]) => ({ interest, count }));
  const leadRows = Object.entries(summary.leadSummary || {})
    .sort((a, b) => b[1] - a[1])
    .map(([method, count]) => ({ method, count }));
  const feedbackRows = Object.entries(summary.feedbackSummary || {})
    .sort((a, b) => b[1] - a[1])
    .map(([feedback, count]) => ({ feedback, count }));
  const interaction = summary.resultInteractionSummary || {};
  const resultInteractionRows = [
    ...Object.entries(interaction.rituals || {}).map(([name, count]) => ({ type: "ritual", name, count })),
    ...Object.entries(interaction.remixes || {}).map(([name, count]) => ({ type: "remix", name, count })),
    { type: "remix_copy", name: "copy", count: interaction.remixCopies || 0 },
    { type: "collection", name: "collect", count: interaction.collections || 0 },
    { type: "archive_clear", name: "clear", count: interaction.archiveClears || 0 }
  ].filter((row) => row.count > 0);
  const interviewRows = (summary.latestInterviews || []).map((item) => ({
    createdAt: item.createdAt || "",
    segment: item.segment || "",
    bestLine: item.bestLine || "",
    saveReason: item.saveReason || "",
    appWish: item.appWish || "",
    concern: item.concern || ""
  }));
  const samplingLinkRows = (samplingLinks.links || []).map((item) => ({
    cohortId: item.cohortId || "",
    cohortLabel: item.cohortLabel || "",
    variant: item.variant || "",
    source: item.source || "",
    campaign: item.campaign || "",
    channel: item.channel || "",
    storeId: item.storeId || "",
    roomId: item.roomId || "",
    dailyTarget: item.dailyTarget || 0,
    url: item.url || "",
    note: item.note || ""
  }));
  const funnel = summary.funnelSummary || {};
  const funnelRows = [
    { step: "home_view", count: funnel.homeViews || 0, rateFromPrevious: "", rateFromReports: "" },
    { step: "start_click", count: funnel.starts || 0, rateFromPrevious: funnel.startRate || 0, rateFromReports: "" },
    { step: "text_submit", count: funnel.textSubmits || 0, rateFromPrevious: funnel.submitRate || 0, rateFromReports: "" },
    { step: "generate_success", count: funnel.generateSuccesses || 0, rateFromPrevious: funnel.generateRate || 0, rateFromReports: "" },
    { step: "report_logged", count: funnel.reports || 0, rateFromPrevious: funnel.reportRate || 0, rateFromReports: "" },
    { step: "save_click", count: funnel.saves || 0, rateFromPrevious: "", rateFromReports: funnel.saveRate || 0 },
    { step: "share_click", count: funnel.shares || 0, rateFromPrevious: "", rateFromReports: funnel.shareRate || 0 },
    { step: "copy_click", count: funnel.copies || 0, rateFromPrevious: "", rateFromReports: funnel.copyRate || 0 },
    { step: "result_ritual_click", count: funnel.rituals || 0, rateFromPrevious: "", rateFromReports: funnel.ritualRate || 0 },
    { step: "result_remix_click", count: funnel.remixes || 0, rateFromPrevious: "", rateFromReports: funnel.remixRate || 0 },
    { step: "result_remix_copy", count: funnel.remixCopies || 0, rateFromPrevious: "", rateFromReports: funnel.remixCopyRate || 0 },
    { step: "report_collect_click", count: funnel.collections || 0, rateFromPrevious: "", rateFromReports: funnel.collectionRate || 0 },
    { step: "archive_clear_click", count: funnel.archiveClears || 0, rateFromPrevious: "", rateFromReports: funnel.archiveClearRate || 0 },
    { step: "app_cta_click", count: funnel.appCtas || 0, rateFromPrevious: "", rateFromReports: funnel.appCtaRate || 0 },
    { step: "lead_intent_click", count: funnel.leadIntents || 0, rateFromPrevious: "", rateFromReports: funnel.leadIntentRate || 0 },
    { step: "regenerate_click", count: funnel.regenerates || 0, rateFromPrevious: "", rateFromReports: funnel.regenerateRate || 0 }
  ];
  const uv = summary.uvSummary || {};
  const uvFunnel = uv.funnelUv || {};
  const uvRows = [
    { metric: "total_uv", uv: uv.totalUv || 0, events: uv.totalEvents || 0, rate: "" },
    { metric: "today_uv", uv: uv.todayUv || 0, events: "", rate: "" },
    { metric: "home_uv", uv: uvFunnel.home || 0, events: "", rate: "" },
    { metric: "start_uv", uv: uvFunnel.start || 0, events: "", rate: uvFunnel.startRate || 0 },
    { metric: "submit_uv", uv: uvFunnel.submit || 0, events: "", rate: uvFunnel.submitRate || 0 },
    { metric: "success_uv", uv: uvFunnel.success || 0, events: "", rate: uvFunnel.successRate || 0 },
    { metric: "share_uv", uv: uvFunnel.share || 0, events: "", rate: uvFunnel.shareRate || 0 },
    { metric: "save_uv", uv: uvFunnel.save || 0, events: "", rate: uvFunnel.saveRate || 0 }
  ];

  return {
    eventCounts: toCsv(["event", "count"], eventRows),
    funnelSummary: toCsv(["step", "count", "rateFromPrevious", "rateFromReports"], funnelRows),
    uvSummary: toCsv(["metric", "uv", "events", "rate"], uvRows),
    uvByEvent: toCsv(["event", "uv", "events"], uv.eventUv || []),
    uvBySource: toCsv(["source", "uv", "events"], uv.sourceUv || []),
    variantSummary: toCsv(["variant", "events", "starts", "reports", "saves", "shares", "appCtas", "leadIntents", "regenerates", "rituals", "remixes", "collections", "reportRate", "saveRate", "shareRate", "appCtaRate", "leadIntentRate", "regenerateRate", "ritualRate", "remixRate", "collectionRate"], variantRows),
    sourceSummary: toCsv(["source", "events", "starts", "reports", "saves", "shares", "appCtas", "leadIntents", "regenerates", "rituals", "remixes", "collections", "reportRate", "saveRate", "shareRate", "appCtaRate", "leadIntentRate", "regenerateRate", "ritualRate", "remixRate", "collectionRate"], sourceRows),
    appInterestSummary: toCsv(["interest", "count"], appInterestRows),
    leadSummary: toCsv(["method", "count"], leadRows),
    feedbackSummary: toCsv(["feedback", "count"], feedbackRows),
    resultInteractionSummary: toCsv(["type", "name", "count"], resultInteractionRows),
    interviews: toCsv(["createdAt", "segment", "bestLine", "saveReason", "appWish", "concern"], interviewRows),
    samplingLinks: toCsv(["cohortId", "cohortLabel", "variant", "source", "campaign", "channel", "storeId", "roomId", "dailyTarget", "url", "note"], samplingLinkRows)
  };
}

function createInterview(payload) {
  const interview = {
    interviewId: `int_${Date.now()}`,
    segment: String(payload.segment || "unknown").slice(0, 32),
    bestLine: String(payload.bestLine || "").slice(0, 120),
    saveReason: String(payload.saveReason || "").slice(0, 160),
    appWish: String(payload.appWish || "").slice(0, 160),
    concern: String(payload.concern || "").slice(0, 160),
    source: String(payload.source || "admin_manual").slice(0, 40),
    createdAt: new Date().toISOString()
  };
  appendJsonl(interviewsLogPath, interview);
  return interview;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, app: "mouth-hard-diary" });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/mouth-hard/config") {
      const requestedVariant = url.searchParams.get("variant");
      const variants = experiments.entryCopy.variants;
      const selectedVariant = variants[requestedVariant] ? requestedVariant : experiments.entryCopy.default;
      return sendJson(res, 200, {
        version: content.version,
        experimentVersion: experiments.version,
        entryVariant: selectedVariant,
        entryCopy: variants[selectedVariant],
        scenes: Object.entries(content.scenes).map(([key, scene]) => ({
          key,
          label: scene.label
        })),
        styles: Object.entries(content.styles).map(([key, style]) => ({
          key,
          label: style.label,
          description: style.description || ""
        }))
      });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/admin/runtime-summary") {
      const events = readJsonl(eventsLogPath, 500);
      const reports = readJsonl(reportsLogPath, 500);
      const interviews = readJsonl(interviewsLogPath, 500);
      return sendJson(res, 200, buildRuntimeSummary(events, reports, interviews));
    }

    if (req.method === "GET" && url.pathname === "/api/v1/admin/runtime-export") {
      const limit = Math.max(1, Math.min(5000, Number(url.searchParams.get("limit") || 1000)));
      const events = readJsonl(eventsLogPath, limit);
      const reports = readJsonl(reportsLogPath, limit);
      const interviews = readJsonl(interviewsLogPath, limit);
      const summary = buildRuntimeSummary(events, reports, interviews);
      const samplingLinks = readSamplingLinksSnapshot();
      return sendJson(res, 200, {
        ok: true,
        exportedAt: new Date().toISOString(),
        limit,
        summary,
        samplingLinks,
        tables: buildRuntimeTables(summary, samplingLinks),
        reports,
        events,
        interviews
      });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/admin/launch-readiness") {
      return sendJson(res, 200, buildLaunchReadiness());
    }

    if (req.method === "GET" && url.pathname === "/api/v1/admin/pencil-assets") {
      return sendJson(res, 200, buildPencilAssetStatus());
    }

    if (req.method === "GET" && url.pathname === "/api/v1/admin/delivery-audit") {
      return sendJson(res, 200, buildDeliveryAuditStatus());
    }

    if (req.method === "GET" && url.pathname === "/api/v1/admin/sampling-links") {
      const snapshot = readSamplingLinksSnapshot();
      return sendJson(res, snapshot.ok ? 200 : 404, snapshot);
    }

    if (req.method === "POST" && url.pathname === "/api/v1/mouth-hard/reports") {
      const body = await readBody(req);
      return sendJson(res, 200, createReport(body));
    }

    if (req.method === "POST" && url.pathname === "/api/v1/events") {
      const body = await readBody(req);
      const event = {
        ...body,
        receivedAt: new Date().toISOString()
      };
      appendJsonl(eventsLogPath, event);
      analytics.recordEvent(event);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/admin/interviews") {
      const body = await readBody(req);
      return sendJson(res, 200, { ok: true, interview: createInterview(body) });
    }

    if (req.method === "GET") {
      const documentFile = resolveDocumentFile(url.pathname);
      if (documentFile?.forbidden) {
        res.writeHead(403);
        return res.end("Forbidden");
      }
      if (documentFile?.filePath) {
        return fs.readFile(documentFile.filePath, (error, data) => {
          if (error) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            return res.end("Not found");
          }
          res.writeHead(200, {
            "Content-Type": mime[path.extname(documentFile.filePath)] || "application/octet-stream",
            "Cache-Control": "no-store"
          });
          res.end(data);
        });
      }
    }

    const safePath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = path.normalize(path.join(publicDir, safePath));
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Not found");
      }
      res.writeHead(200, {
        "Content-Type": mime[path.extname(filePath)] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      res.end(data);
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`Mouth Hard Diary H5 running at http://${host}:${port}`);
});
