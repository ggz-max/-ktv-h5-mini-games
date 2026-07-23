const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4327);
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const styleApprovalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const reviewPath = path.join(root, "docs", "runtime-review.md");
const runtimeDir = path.join(root, "server", "data", "runtime");
const reportsPath = path.join(runtimeDir, "reports.jsonl");
const eventsPath = path.join(runtimeDir, "events.jsonl");
const interviewsPath = path.join(runtimeDir, "interviews.jsonl");

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function readJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath) {
  return readText(filePath)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function lineCount(filePath) {
  const content = readText(filePath).trim();
  return content ? content.split(/\r?\n/).length : 0;
}

function request(requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: requestPath,
      method: "GET"
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function ensureServer() {
  try {
    const health = await request("/health");
    if (health.status === 200) return null;
  } catch (error) {}

  const child = spawn(process.execPath, [path.join(root, "server", "index.js")], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore"
  });
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const health = await request("/health");
      if (health.status === 200) return child;
    } catch (error) {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  child.kill();
  throw new Error("server did not become healthy for launch api verification");
}

function expectedState() {
  const manifest = readJson(manifestPath, { exportTargets: [] });
  const styleApproval = readJson(styleApprovalPath, {});
  const reports = readJsonl(reportsPath);
  const events = readJsonl(eventsPath);
  const interviews = readJsonl(interviewsPath);
  const pencilSourceExists = Boolean(manifest.pencilFile && fs.existsSync(path.join(root, manifest.pencilFile)));
  const styleApproved = styleApproval.status === "approved" && Boolean(styleApproval.approvedBy) && Boolean(styleApproval.approvedAt);
  const pendingExports = (manifest.exportTargets || [])
    .filter((target) => target.status !== "pencil_exported")
    .map((target) => ({
      name: target.name,
      status: target.status || "unknown",
      exists: Boolean(target.destination && fs.existsSync(path.join(root, target.destination)))
    }));
  const hasVerificationData = reports.some((item) => item.source === "verify_data" || item.entryVariant === "verify_variant") ||
    events.some((item) => item.sessionId === "verify_data" || item.event === "verify_data_event") ||
    interviews.some((item) => item.segment === "verify_user" || item.source === "verify_data");
  const review = readText(reviewPath);
  const reviewClean = review.includes("| \u542b\u6d4b\u8bd5\u6570\u636e | \u5426 |");
  const checks = {
    style_approved: styleApproved,
    pencil_source_file: pencilSourceExists,
    final_pencil_exports: pendingExports.length === 0,
    runtime_empty: reports.length === 0 && events.length === 0 && interviews.length === 0,
    no_verification_data: !hasVerificationData,
    runtime_review_clean: reviewClean
  };

  return {
    checks,
    ok: Object.values(checks).every(Boolean),
    mode: Object.values(checks).every(Boolean) ? "ready_for_real_sampling" : "internal_only",
    pendingExports,
    styleApproval: {
      status: styleApproval.status || "missing",
      approvedBy: styleApproval.approvedBy || "",
      approvedAt: styleApproval.approvedAt || ""
    },
    pencilSource: {
      file: manifest.pencilFile || "",
      exists: pencilSourceExists
    },
    runtimeLines: {
      reports: lineCount(reportsPath),
      events: lineCount(eventsPath),
      interviews: lineCount(interviewsPath)
    },
    pencilAssets: {
      sourceImageCount: (manifest.images || []).length,
      exportTargetCount: (manifest.exportTargets || []).length,
      ok: styleApproved && pencilSourceExists && pendingExports.length === 0,
      blockers: [
        styleApproved ? "" : "style approval is still pending",
        pencilSourceExists ? "" : `Pencil source file missing: ${manifest.pencilFile || "designs/pencil-source/mouth-hard-diary.pen"}`,
        pendingExports.length ? "final Pencil exports are not registered and complete" : ""
      ].filter(Boolean)
    }
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

(async () => {
  const child = await ensureServer();
  const problems = [];

  try {
    const response = await request("/api/v1/admin/launch-readiness");
    if (response.status !== 200) {
      throw new Error(`launch readiness API returned ${response.status}`);
    }

    const actual = JSON.parse(response.data);
    const expected = expectedState();
    const checksByKey = Object.fromEntries((actual.checks || []).map((check) => [check.key, check]));
    const requiredKeys = Object.keys(expected.checks);

    requiredKeys.forEach((key) => {
      if (!checksByKey[key]) {
        problems.push(`missing launch check: ${key}`);
        return;
      }
      if (checksByKey[key].ok !== expected.checks[key]) {
        problems.push(`launch check ${key} ok=${checksByKey[key].ok}, expected ${expected.checks[key]}`);
      }
      if (!checksByKey[key].label || typeof checksByKey[key].detail !== "string") {
        problems.push(`launch check ${key} is missing label/detail`);
      }
    });

    if (actual.ok !== expected.ok) problems.push(`api ok=${actual.ok}, expected ${expected.ok}`);
    if (actual.mode !== expected.mode) problems.push(`api mode=${actual.mode}, expected ${expected.mode}`);
    if (!actual.checkedAt || Number.isNaN(Date.parse(actual.checkedAt))) problems.push("checkedAt is not an ISO timestamp");
    if (!sameJson(actual.pendingExports, expected.pendingExports)) problems.push("pendingExports do not match manifest");
    if (!sameJson(actual.styleApproval, expected.styleApproval)) problems.push("styleApproval does not match approval file");
    if (!sameJson(actual.pencilSource, expected.pencilSource)) problems.push("pencilSource does not match manifest/file state");
    if (!sameJson(actual.runtimeLines, expected.runtimeLines)) problems.push("runtimeLines do not match runtime JSONL files");
    if ((actual.checks || []).length < requiredKeys.length) problems.push("launch readiness returned too few checks");

    const pencilResponse = await request("/api/v1/admin/pencil-assets");
    if (pencilResponse.status !== 200) {
      problems.push(`pencil assets API returned ${pencilResponse.status}`);
    } else {
      const pencil = JSON.parse(pencilResponse.data);
      if (pencil.ok !== expected.pencilAssets.ok) problems.push(`pencil assets ok=${pencil.ok}, expected ${expected.pencilAssets.ok}`);
      if (pencil.mode !== (expected.pencilAssets.ok ? "pencil_assets_ready" : "pending_pencil_handoff")) problems.push(`pencil assets mode mismatch: ${pencil.mode}`);
      if (!pencil.checkedAt || Number.isNaN(Date.parse(pencil.checkedAt))) problems.push("pencil assets checkedAt is not an ISO timestamp");
      if ((pencil.sourceImages || []).length !== expected.pencilAssets.sourceImageCount) problems.push("pencil assets source image count does not match manifest");
      if ((pencil.exportTargets || []).length !== expected.pencilAssets.exportTargetCount) problems.push("pencil assets export target count does not match manifest");
      if (!pencil.importChecklist || !pencil.importChecklist.csvExists || !pencil.importChecklist.jsonExists) {
        problems.push("pencil assets API should expose existing import checklist CSV/JSON");
      }
      if (!sameJson((pencil.pendingExports || []).map((item) => ({ name: item.name, status: item.status, exists: item.exists })), expected.pendingExports)) {
        problems.push("pencil assets pendingExports do not match manifest");
      }
      expected.pencilAssets.blockers.forEach((blocker) => {
        if (!(pencil.blockers || []).includes(blocker)) {
          problems.push(`pencil assets missing blocker: ${blocker}`);
        }
      });
      if (!(pencil.nextActions || []).length && !pencil.ok) problems.push("pencil assets missing next actions while blocked");
      if (!pencil.styleApproval || pencil.styleApproval.status !== expected.styleApproval.status) problems.push("pencil assets style approval status mismatch");
      if (!pencil.pencilSource || pencil.pencilSource.exists !== expected.pencilSource.exists) problems.push("pencil assets source file status mismatch");
    }

    const deliveryResponse = await request("/api/v1/admin/delivery-audit");
    if (deliveryResponse.status !== 200) {
      problems.push(`delivery audit API returned ${deliveryResponse.status}`);
    } else {
      const delivery = JSON.parse(deliveryResponse.data);
      const deliveryChecks = Object.fromEntries((delivery.checks || []).map((check) => [check.key, check]));
      [
        "user_research",
        "market_research",
        "product_design",
        "image2_sources",
        "pencil_pen",
        "style_approval",
        "pencil_exports",
        "h5_asset_usage",
        "frontend_h5",
        "backend_admin",
        "privacy_sampling",
        "launch_gate"
      ].forEach((key) => {
        if (!deliveryChecks[key]) problems.push(`delivery audit missing check: ${key}`);
      });
      if (delivery.total !== 12 || (delivery.checks || []).length !== 12) problems.push("delivery audit should expose 12 requirement checks");
      if (delivery.ok !== false) problems.push("delivery audit should be blocked while Pencil/runtime gates are incomplete");
      if (delivery.complete < 8) problems.push(`delivery audit complete count too low: ${delivery.complete}`);
      if (deliveryChecks.pencil_pen?.ok !== expected.pencilSource.exists) problems.push("delivery pencil pen status mismatch");
      if (deliveryChecks.style_approval?.ok !== (expected.styleApproval.status === "approved")) problems.push("delivery style approval status mismatch");
      if (deliveryChecks.pencil_exports?.ok !== (expected.pendingExports.length === 0)) problems.push("delivery pencil exports status mismatch");
      if (!deliveryChecks.h5_asset_usage?.ok) problems.push("delivery H5 asset usage should be complete");
      if (!delivery.runtimeRows || !sameJson(delivery.runtimeRows, expected.runtimeLines)) problems.push("delivery runtime rows mismatch");
    }

    if (problems.length) {
      console.error("Launch readiness API problems:");
      problems.forEach((problem) => console.error(problem));
      process.exit(1);
    }

    console.log(`launch api verify ok: mode=${actual.mode}, checks=${actual.checks.length}`);
  } finally {
    if (child) {
      child.kill();
      await new Promise((resolve) => {
        child.once("exit", resolve);
        setTimeout(resolve, 800);
      });
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
