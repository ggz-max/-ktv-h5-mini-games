const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const draftPath = path.join(root, "designs", "pencil-source", "style-approval.approved-draft.json");
const guidePath = path.join(root, "designs", "pencil-source", "style-approval-apply-guide.md");

const args = process.argv.slice(2);

function readArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : fallback;
}

const approvedBy = readArg("by", "PENDING_USER");
const approvalNotes = readArg("notes", "Pending final user confirmation from Pencil boards.");
const approvedAt = readArg("at", new Date().toISOString());

const current = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const draft = {
  ...current,
  status: "approved",
  approvedBy,
  approvedAt,
  approvalNotes
};

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

const changedRows = [
  ["status", current.status || "", draft.status],
  ["approvedBy", current.approvedBy || "", draft.approvedBy],
  ["approvedAt", current.approvedAt || "", draft.approvedAt],
  ["approvalNotes", current.approvalNotes || "", draft.approvalNotes]
];

const lines = [
  "# Style Approval Apply Guide",
  "",
  "This guide is generated as a review aid. It does not approve the style by itself; approval only becomes real after `style-approval.json` is updated and final style verification passes.",
  "",
  "## Draft File",
  "",
  "`designs/pencil-source/style-approval.approved-draft.json`",
  "",
  "## Changed Fields",
  "",
  table(["Field", "Current", "Draft"], changedRows),
  "",
  "## Required Review",
  "",
  "- Confirm the Pencil boards exist in `designs/pencil-source/mouth-hard-diary.pen`.",
  "- Confirm the user accepted the direction from Pencil boards, not only the loose image2 review page.",
  "- Confirm the selected source decisions still match `image-manifest.json`.",
  "- Apply the draft only after these checks pass.",
  "",
  "## Apply Command",
  "",
  "```bash",
  "node tools/apply-style-approval-draft.js --yes",
  "npm run verify:style-approval:final",
  "```",
  ""
];

fs.writeFileSync(draftPath, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
fs.writeFileSync(guidePath, `${lines.join("\n")}\n`, "utf8");
console.log(`wrote ${path.relative(root, draftPath)}`);
console.log(`wrote ${path.relative(root, guidePath)}`);
