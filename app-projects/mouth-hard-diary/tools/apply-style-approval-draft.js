const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const draftPath = path.join(root, "designs", "pencil-source", "style-approval.approved-draft.json");
const shouldWrite = process.argv.includes("--yes");
const problems = [];

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing ${label}: ${path.relative(root, filePath)}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function runVerifier(env = {}) {
  try {
    execFileSync(process.execPath, [path.join(root, "tools", "verify-style-approval.js")], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: "pipe",
      timeout: 45000
    });
  } catch (error) {
    problems.push(error.message);
  }
}

const current = readJson(approvalPath, "style approval");
const draft = readJson(draftPath, "style approval draft");

if (current && draft) {
  ["project", "reviewPage", "pencilFile", "directionName", "decisionSummary"].forEach((field) => {
    if (draft[field] !== current[field]) {
      problems.push(`Draft must not change ${field}`);
    }
  });
  if (JSON.stringify(draft.confirmationQuestions) !== JSON.stringify(current.confirmationQuestions)) {
    problems.push("Draft must not change confirmationQuestions");
  }
  if (JSON.stringify(draft.selectedSources) !== JSON.stringify(current.selectedSources)) {
    problems.push("Draft must not change selectedSources");
  }
  if (draft.status !== "approved") {
    problems.push(`Draft status must be approved, got ${draft.status || "missing"}`);
  }
  if (!draft.approvedBy || draft.approvedBy === "PENDING_USER") {
    problems.push("Draft approvedBy must name the real approver");
  }
  if (!draft.approvedAt || Number.isNaN(Date.parse(draft.approvedAt))) {
    problems.push(`Draft approvedAt must be ISO-like date, got ${draft.approvedAt || "missing"}`);
  }
  if (!draft.approvalNotes || /pending/i.test(draft.approvalNotes)) {
    problems.push("Draft approvalNotes must describe the actual confirmed Pencil-board decision");
  }
}

if (problems.length) {
  console.error("Cannot apply style approval draft:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

if (!shouldWrite) {
  console.log("style approval draft dry-run ok");
  console.log("Run with --yes to update designs/pencil-source/style-approval.json");
  process.exit(0);
}

fs.writeFileSync(approvalPath, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
runVerifier({ FINAL_STYLE_APPROVAL: "1" });

if (problems.length) {
  console.error("Style approval draft was written but final verification failed:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log("style approval draft applied: status=approved");
