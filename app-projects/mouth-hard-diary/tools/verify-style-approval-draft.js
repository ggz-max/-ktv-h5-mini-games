const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const draftPath = path.join(root, "designs", "pencil-source", "style-approval.approved-draft.json");
const guidePath = path.join(root, "designs", "pencil-source", "style-approval-apply-guide.md");
const mojibake = /[\u9362\u9422\u71b8\u59e3\u93c3\u30e8\u7ecb\u5a09\u9225\u9435\u52ea\u9359\u6220\u6d93\u9428\u6dc7\u6fc6\u7035\u714e\u935a\u55d8\u8930\u64b3\u93c2\u56e9\u93c1\u6fb6\u6d98\u93c8\u6ec3\ufffd]/;
const problems = [];

execFileSync(process.execPath, [path.join(root, "tools", "generate-style-approval-draft.js")], {
  cwd: root,
  stdio: "pipe"
});

const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));
const guide = fs.readFileSync(guidePath, "utf8");

function requireText(text, label) {
  if (!guide.includes(text)) problems.push(`approval guide missing ${label}: ${text}`);
}

function requireReadable(value, label) {
  const text = String(value || "");
  if (!text) problems.push(`missing readable value: ${label}`);
  if (mojibake.test(text) || text.includes("鈧?") || /[?]{4,}/.test(text)) {
    problems.push(`${label} contains mojibake text`);
  }
}

["project", "reviewPage", "pencilFile", "directionName", "decisionSummary"].forEach((field) => {
  if (draft[field] !== approval[field]) problems.push(`draft changed protected field: ${field}`);
});
if (JSON.stringify(draft.confirmationQuestions) !== JSON.stringify(approval.confirmationQuestions)) {
  problems.push("draft changed confirmationQuestions");
}
if (JSON.stringify(draft.selectedSources) !== JSON.stringify(approval.selectedSources)) {
  problems.push("draft changed selectedSources");
}
requireReadable(draft.directionName, "draft.directionName");
requireReadable(draft.decisionSummary, "draft.decisionSummary");
(draft.confirmationQuestions || []).forEach((question, index) => {
  requireReadable(question, `draft.confirmationQuestions[${index}]`);
});
if (draft.status !== "approved") problems.push("draft status must be approved");
if (!draft.approvedBy) problems.push("draft missing approvedBy placeholder");
if (!draft.approvedAt || Number.isNaN(Date.parse(draft.approvedAt))) problems.push("draft approvedAt must be ISO-like");
if (!draft.approvalNotes) problems.push("draft missing approvalNotes");

[
  "# Style Approval Apply Guide",
  "style-approval.approved-draft.json",
  "Changed Fields",
  "Required Review",
  "node tools/apply-style-approval-draft.js --yes",
  "npm run verify:style-approval:final",
  "Confirm the Pencil boards exist"
].forEach((text) => requireText(text, "required text"));

if (problems.length) {
  console.error("Style approval draft problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log("style approval draft verify ok");
