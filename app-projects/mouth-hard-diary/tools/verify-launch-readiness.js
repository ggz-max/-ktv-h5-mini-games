const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const runtimeDir = path.join(root, "server", "data", "runtime");
const reportsPath = path.join(runtimeDir, "reports.jsonl");
const eventsPath = path.join(runtimeDir, "events.jsonl");
const interviewsPath = path.join(runtimeDir, "interviews.jsonl");
const reviewPath = path.join(root, "docs", "runtime-review.md");

const checks = [];
const runtimeSnapshot = {
  reports: read(reportsPath),
  events: read(eventsPath),
  interviews: read(interviewsPath)
};

function addCheck(name, run) {
  try {
    run();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, message: error.message });
  }
}

function runNodeScript(script, env = {}) {
  execFileSync(process.execPath, [path.join(root, "tools", script)], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "pipe",
    timeout: 45000
  });
}

function collectNodeScript(script, env = {}) {
  try {
    runNodeScript(script, env);
    return null;
  } catch (error) {
    return error.message;
  }
}

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeRuntimeSnapshot(snapshot) {
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(reportsPath, snapshot.reports, "utf8");
  fs.writeFileSync(eventsPath, snapshot.events, "utf8");
  fs.writeFileSync(interviewsPath, snapshot.interviews, "utf8");
}

function jsonl(filePath) {
  return read(filePath)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function hasRuntimeRows() {
  return Boolean(read(reportsPath).trim() || read(eventsPath).trim() || read(interviewsPath).trim());
}

function hasVerificationData() {
  const reports = jsonl(reportsPath);
  const events = jsonl(eventsPath);
  const interviews = jsonl(interviewsPath);
  return reports.some((item) => item.source === "verify_data" || item.entryVariant === "verify_variant") ||
    events.some((item) => item.sessionId === "verify_data" || item.event === "verify_data_event") ||
    interviews.some((item) => item.segment === "verify_user" || item.source === "verify_data");
}

addCheck("core h5/backend smoke", () => runNodeScript("verify-h5.js"));
addCheck("documentation quality", () => runNodeScript("verify-doc-quality.js"));
addCheck("project text quality", () => runNodeScript("verify-project-text-quality.js"));
addCheck("content library", () => runNodeScript("verify-content.js"));
addCheck("copy safety", () => runNodeScript("verify-copy-safety.js"));
addCheck("privacy data boundary", () => runNodeScript("verify-privacy-data.js"));
addCheck("entry experiments", () => runNodeScript("verify-experiments.js"));
addCheck("sampling link pack", () => runNodeScript("verify-sampling-links.js"));
addCheck("sampling field cards", () => runNodeScript("verify-sampling-cards.js"));
addCheck("sampling card render", () => runNodeScript("browser-verify-sampling-cards.js"));
addCheck("field sampling playbook", () => runNodeScript("verify-field-sampling.js"));
addCheck("sampling safety SOP", () => runNodeScript("verify-sampling-safety.js"));
addCheck("launch handoff", () => runNodeScript("verify-launch-handoff.js"));
addCheck("launch rehearsal", () => runNodeScript("verify-launch-rehearsal-report.js"));
addCheck("preflight report", () => runNodeScript("verify-preflight-report.js"));
addCheck("delivery audit", () => runNodeScript("verify-delivery-audit.js"));
addCheck("founder brief", () => runNodeScript("verify-founder-brief.js"));
addCheck("runtime review accuracy", () => runNodeScript("verify-runtime-review.js"));
addCheck("document links", () => runNodeScript("verify-doc-links.js"));
addCheck("post-sampling backlog", () => runNodeScript("verify-product-backlog.js"));
addCheck("asset workflow guard", () => runNodeScript("verify-assets.js"));
addCheck("H5 Pencil asset usage", () => runNodeScript("verify-h5-asset-usage.js"));
addCheck("Pencil handoff docs", () => runNodeScript("verify-pencil-handoff.js"));
addCheck("Pencil operator pack", () => runNodeScript("verify-pencil-operator-pack.js"));
addCheck("Pencil import checklist", () => runNodeScript("verify-pencil-import-checklist.js"));
addCheck("Pencil finalization checklist", () => runNodeScript("verify-pencil-finalization-checklist.js"));
addCheck("Pencil readiness report", () => runNodeScript("verify-pencil-readiness-report.js"));
addCheck("Pencil open helper", () => runNodeScript("verify-pencil-open.js"));
addCheck("Pencil connection diagnostics", () => runNodeScript("verify-pencil-diagnostics-report.js"));
addCheck("Pencil handoff status", () => runNodeScript("verify-pencil-handoff-status.js"));
addCheck("Pencil source watcher", () => runNodeScript("verify-pencil-source-watch.js"));
addCheck("Pencil handoff packet", () => runNodeScript("verify-pencil-handoff-packet.js"));
addCheck("Pencil register guard", () => runNodeScript("verify-pencil-register-guard.js"));
addCheck("style approval record", () => runNodeScript("verify-style-approval.js"));
addCheck("style approval draft guard", () => runNodeScript("verify-style-approval-draft.js"));
addCheck("imagegen review render", () => runNodeScript("browser-verify-imagegen-review.js"));
addCheck("launch readiness API", () => runNodeScript("verify-launch-api.js"));
addCheck("final Pencil exports", () => {
  const problems = [
    collectNodeScript("verify-style-approval.js", { FINAL_STYLE_APPROVAL: "1" }),
    collectNodeScript("verify-assets.js", { FINAL_PENCIL_EXPORTS: "1" })
  ].filter(Boolean);
  if (problems.length) {
    throw new Error(problems.join("\n"));
  }
});

writeRuntimeSnapshot(runtimeSnapshot);
runNodeScript("generate-runtime-review.js");

addCheck("runtime data is empty", () => {
  if (hasRuntimeRows()) {
    throw new Error("runtime JSONL is not empty; run npm run sampling:prepare -- --yes before real launch");
  }
});
addCheck("runtime has no verification markers", () => {
  if (hasVerificationData()) {
    throw new Error("runtime JSONL contains verify_data markers; run npm run sampling:prepare -- --yes before real launch");
  }
});
addCheck("runtime review is clean", () => {
  if (!fs.existsSync(reviewPath)) {
    throw new Error("docs/runtime-review.md missing; run npm run review:runtime after clearing data");
  }
  const content = read(reviewPath);
  if (!content.includes("| \u542b\u6d4b\u8bd5\u6570\u636e | \u5426 |")) {
    throw new Error("runtime review still reports test data or is stale; run npm run sampling:prepare -- --yes before real launch");
  }
});

const failed = checks.filter((check) => !check.ok);
checks.forEach((check) => {
  if (check.ok) {
    console.log(`ok: ${check.name}`);
  } else {
    console.error(`fail: ${check.name}`);
    console.error(`  ${check.message}`);
  }
});

if (failed.length) {
  console.error(`launch readiness failed: ${failed.length}/${checks.length} checks failed`);
  process.exit(1);
}

console.log("launch readiness ok");
