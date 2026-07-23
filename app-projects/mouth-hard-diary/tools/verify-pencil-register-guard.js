const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const before = fs.readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(before);
const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const finalReady = approval.status === "approved" &&
  Boolean(approval.approvedBy) &&
  Boolean(approval.approvedAt) &&
  Boolean(manifest.pencilFile && fs.existsSync(path.join(root, manifest.pencilFile))) &&
  (manifest.exportTargets || []).every((target) => target.status === "pencil_exported" && fs.existsSync(path.join(root, target.destination || "")));

let failedAsExpected = false;
let output = "";

try {
  execFileSync(process.execPath, [path.join(root, "tools", "register-pencil-exports.js")], {
    cwd: root,
    stdio: "pipe",
    timeout: 45000
  });
} catch (error) {
  failedAsExpected = true;
  output = `${error.stdout || ""}${error.stderr || ""}`;
}

const after = fs.readFileSync(manifestPath, "utf8");
const problems = [];

if (!finalReady && !failedAsExpected) {
  problems.push("register-pencil-exports should fail while style approval, .pen, or final exports are incomplete");
}
if (before !== after) {
  problems.push("register-pencil-exports modified the manifest without --yes or without complete final gates");
}
if (!finalReady) {
  [
    "Style approval must be approved",
    "Pencil source file is missing",
    "Pencil export file is missing",
    "Final style approval required"
  ].forEach((text) => {
    if (!output.includes(text)) problems.push(`guard output missing: ${text}`);
  });
}

if (problems.length) {
  console.error("Pencil register guard problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(finalReady
  ? "pencil register guard verify ok: final exports already registered"
  : "pencil register guard verify ok: incomplete exports cannot be registered");
