const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "docs", "launch-rehearsal.md");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const samplingLinksPath = path.join(root, "docs", "sampling-links.generated.json");
const runtimeDir = path.join(root, "server", "data", "runtime");

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
        return { malformed: true };
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

function hasVerificationMarkers(rows) {
  return rows.some((item) =>
    item.source === "verify_data" ||
    item.entryVariant === "verify_variant" ||
    item.sessionId === "verify_data" ||
    item.event === "verify_data_event" ||
    item.segment === "verify_user"
  );
}

const manifest = readJson(manifestPath, { images: [], exportTargets: [] });
const approval = readJson(approvalPath, {});
const samplingLinks = readJson(samplingLinksPath, { links: [], version: "missing" });
const reports = readJsonl(path.join(runtimeDir, "reports.jsonl"));
const events = readJsonl(path.join(runtimeDir, "events.jsonl"));
const interviews = readJsonl(path.join(runtimeDir, "interviews.jsonl"));
const runtimeRows = [...reports, ...events, ...interviews];
const pendingExports = (manifest.exportTargets || []).filter((target) => target.status !== "pencil_exported");
const pencilFileExists = Boolean(manifest.pencilFile && fs.existsSync(path.join(root, manifest.pencilFile)));
const styleApproved = approval.status === "approved" && approval.approvedBy && approval.approvedAt;
const runtimeClean = runtimeRows.length === 0 && !hasVerificationMarkers(runtimeRows);

const rehearsalReady = !styleApproved || !pencilFileExists || pendingExports.length > 0
  ? "internal rehearsal only"
  : runtimeClean
    ? "ready for launch verification"
    : "visuals ready, runtime cleanup required";

const rows = [
  ["Research", "ready", "User profile, market patterns, and content safety docs exist."],
  ["Product", "ready", "MVP PRD, content system, entry experiments, and post-sampling backlog exist."],
  ["Frontend", "ready for internal rehearsal", "H5 flow and admin dashboard have smoke/browser checks."],
  ["Backend", "ready for internal rehearsal", "Local APIs, JSONL runtime logging, exports, and launch APIs are implemented."],
  ["Sampling materials", "ready for internal rehearsal", `${samplingLinks.links.length} links, printable cards, field playbook, and safety SOP.`],
  ["Pencil source", pencilFileExists ? "ready" : "blocked", pencilFileExists ? manifest.pencilFile : "project .pen file is missing"],
  ["Style approval", styleApproved ? "ready" : "blocked", styleApproved ? `${approval.approvedBy} @ ${approval.approvedAt}` : `status=${approval.status || "missing"}`],
  ["Pencil exports", pendingExports.length ? "blocked" : "ready", pendingExports.length ? pendingExports.map((target) => `${target.name}:${target.status}`).join(", ") : "all exports registered"],
  ["Runtime data", runtimeClean ? "clean" : "blocked for real sampling", `${runtimeRows.length} rows; verification markers=${hasVerificationMarkers(runtimeRows) ? "yes" : "no"}`]
];

const lines = [
  "# Launch Rehearsal Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "This report is for founder/operator rehearsal before formal sampling. It is allowed to be green while launch is still blocked, because Pencil final exports and runtime cleanup are intentionally separate gates.",
  "",
  "## Mode",
  "",
  table(["Item", "Value"], [
    ["Current mode", rehearsalReady],
    ["Launch gate", "`npm run verify:launch`"],
    ["Pencil readiness", "`powershell -ExecutionPolicy Bypass -File tools\\check-pencil-readiness.ps1`"],
    ["Final asset gate", "`npm run verify:assets:final`"]
  ]),
  "",
  "## Chain Status",
  "",
  table(["Area", "State", "Evidence"], rows),
  "",
  "## Pencil Handoff",
  "",
  table(["Artifact", "Path"], [
    ["Board spec", "`designs/pencil-source/pencil-board-spec.md`"],
    ["Operator pack", "`designs/pencil-source/operator-pack.md`"],
    ["Finalization checklist", "`designs/pencil-source/finalization-checklist.md`"],
    ["Handoff packet", "`designs/pencil-source/handoff-packet.md`"],
    ["Style approval", "`designs/pencil-source/style-approval.json`"],
    ["Runtime export root", "`h5/assets/visuals/pencil-export/`"]
  ]),
  "",
  "## Rehearsal Script",
  "",
  "1. Open `http://127.0.0.1:4327` and complete the H5 flow once with non-sensitive test text.",
  "2. Open `http://127.0.0.1:4327/admin.html` and confirm launch status, delivery audit, events, reports, and sampling links render.",
  "3. Open `designs/imagegen-review.html` and compare the source images against `designs/pencil-source/pencil-board-spec.md`.",
  "4. Do not ask the user to approve final style until the same direction exists inside `mouth-hard-diary.pen`.",
  "5. Do not treat sampling-card traffic as real launch data until `npm run verify:launch` passes.",
  "",
  "## Stop Conditions",
  "",
  "- Stop before real users if any required Pencil export is still `temporary_preview` or `pending`.",
  "- Stop before real users if `designs/pencil-source/mouth-hard-diary.pen` is missing.",
  "- Stop before real users if `style-approval.json` is not approved from Pencil boards.",
  "- Stop before real users if runtime JSONL still has local verification data.",
  "- Stop before collecting contact details; current MVP records only anonymous intent.",
  "",
  "## Commands",
  "",
  "```bash",
  "npm run verify",
  "npm run verify:browser",
  "npm run verify:admin",
  "npm run verify:launch-api",
  "npm run verify:pencil-handoff",
  "npm run verify:style-approval",
  "npm run verify:launch",
  "```",
  ""
];

fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`launch rehearsal report ok: ${outputPath}`);
