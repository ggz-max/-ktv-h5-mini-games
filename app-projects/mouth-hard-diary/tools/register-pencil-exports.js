const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const shouldWrite = process.argv.includes("--yes");
const problems = [];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function pngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function runVerifier(script, env = {}) {
  try {
    execFileSync(process.execPath, [path.join(root, "tools", script)], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: "pipe",
      timeout: 45000
    });
  } catch (error) {
    problems.push(error.message);
  }
}

const manifest = readJson(manifestPath);
const approval = readJson(approvalPath);
const pencilFilePath = path.join(root, manifest.pencilFile || "");

if (approval.status !== "approved") {
  problems.push(`Style approval must be approved before registering Pencil exports; current status=${approval.status || "missing"}`);
}
if (!approval.approvedBy) {
  problems.push("Style approval missing approvedBy");
}
if (!approval.approvedAt) {
  problems.push("Style approval missing approvedAt");
}
if (approval.approvedAt && Number.isNaN(Date.parse(approval.approvedAt))) {
  problems.push(`Style approval approvedAt must be ISO-like date, got ${approval.approvedAt}`);
}
if (!manifest.pencilFile || !fs.existsSync(pencilFilePath)) {
  problems.push(`Pencil source file is missing: ${manifest.pencilFile || "unset"}`);
}
if (!Array.isArray(manifest.exportTargets) || !manifest.exportTargets.length) {
  problems.push("Manifest exportTargets must be a non-empty array");
}

(manifest.exportTargets || []).forEach((target) => {
  const exportPath = path.join(root, target.destination || "");
  if (!target.destination || !target.destination.startsWith(manifest.runtimeExportRoot || "")) {
    problems.push(`Export target must stay under runtime root: ${target.destination || target.name}`);
    return;
  }
  if (!fs.existsSync(exportPath)) {
    problems.push(`Pencil export file is missing: ${target.destination}`);
    return;
  }
  const size = pngSize(exportPath);
  if (!size) {
    problems.push(`Pencil export must be PNG with readable dimensions: ${target.destination}`);
    return;
  }
  if (size.width !== target.expectedWidth || size.height !== target.expectedHeight) {
    problems.push(`${target.destination} expected ${target.expectedWidth}x${target.expectedHeight}, got ${size.width}x${size.height}`);
  }
});

runVerifier("verify-style-approval.js", { FINAL_STYLE_APPROVAL: "1" });

if (problems.length) {
  console.error("Cannot register Pencil exports:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

const nextManifest = {
  ...manifest,
  status: "pencil_exported",
  exportTargets: manifest.exportTargets.map((target) => ({
    ...target,
    status: "pencil_exported"
  }))
};

if (!shouldWrite) {
  console.log("pencil export registration dry-run ok");
  console.log("Run with --yes to update designs/pencil-source/image-manifest.json");
  process.exit(0);
}

fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");

runVerifier("verify-assets.js", { FINAL_PENCIL_EXPORTS: "1" });
if (problems.length) {
  console.error("Pencil exports were written but final verification failed:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log("pencil exports registered: manifest status=pencil_exported");
