const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "docs", "launch-rehearsal.md");
const mojibake = /[\u9362\u9422\u71b8\u59e3\u93c3\u30e8\u7ecb\u5a09\u9225\u9435\u52ea\u9359\u6220\u6d93\u9428\u6dc7\u6fc6\u7035\u714e\u935a\u55d8\u8930\u64b3\u93c2\u56e9\u93c1\u6fb6\u6d98\u93c8\u6ec3\ufffd]/;

execFileSync(process.execPath, [path.join(root, "tools", "generate-launch-rehearsal-report.js")], {
  cwd: root,
  stdio: "pipe"
});

const content = fs.readFileSync(outputPath, "utf8");
const required = [
  "Launch Rehearsal Report",
  "founder/operator rehearsal",
  "## Mode",
  "## Chain Status",
  "Research",
  "Product",
  "Frontend",
  "Backend",
  "Sampling materials",
  "Pencil source",
  "Style approval",
  "Pencil exports",
  "Runtime data",
  "## Pencil Handoff",
  "designs/pencil-source/pencil-board-spec.md",
  "designs/pencil-source/operator-pack.md",
  "designs/pencil-source/style-approval.json",
  "## Rehearsal Script",
  "Do not ask the user to approve final style until the same direction exists inside `mouth-hard-diary.pen`.",
  "## Stop Conditions",
  "temporary_preview",
  "npm run verify:launch"
];

const missing = required.filter((snippet) => !content.includes(snippet));
if (missing.length) {
  console.error("Launch rehearsal report problems:");
  missing.forEach((snippet) => console.error(`Missing snippet: ${snippet}`));
  process.exit(1);
}

if (mojibake.test(content) || content.includes("鈧?") || /[?]{4,}/.test(content)) {
  console.error("Launch rehearsal report contains mojibake text");
  process.exit(1);
}

console.log("launch rehearsal report verify ok");
