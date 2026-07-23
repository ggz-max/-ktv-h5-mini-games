const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "docs", "preflight-report.md");
const mojibake = /[\u9362\u9422\u71b8\u59e3\u93c3\u30e8\u7ecb\u5a09\u9225\u9435\u52ea\u9359\u6220\u6d93\u9428\u6dc7\u6fc6\u7035\u714e\u935a\u55d8\u8930\u64b3\u93c2\u56e9\u93c1\u6fb6\u6d98\u93c8\u6ec3\ufffd]/;

execFileSync(process.execPath, [path.join(root, "tools", "generate-preflight-report.js")], {
  cwd: root,
  stdio: "pipe"
});

const content = fs.readFileSync(outputPath, "utf8");
const required = [
  "Preflight Report",
  "final preflight view before real sampling",
  "Current Mode",
  "Design Gates",
  "style approval",
  "Pencil source",
  "Pencil exports",
  "/designs/imagegen-review.html",
  "/designs/style-approval.json",
  "/designs/asset-index.md",
  "/designs/operator-pack.md",
  "/designs/handoff-packet.md",
  "Pencil Assets",
  "Runtime Data",
  "Sampling Materials",
  "launch rehearsal",
  "Next Commands",
  "Operator Notes",
  "npm run verify:launch",
  "npm run verify:assets:final",
  "npm run sampling:prepare -- --yes",
  "docs/launch-handoff.md",
  "experiments/sampling-safety-sop.md",
  "不要把 `temporary_preview` 当作最终视觉资产"
];

const missing = required.filter((snippet) => !content.includes(snippet));
if (missing.length) {
  console.error("Preflight report problems:");
  missing.forEach((snippet) => console.error(`Missing snippet: ${snippet}`));
  process.exit(1);
}

if (mojibake.test(content) || content.includes("鈧?") || /[?]{4,}/.test(content)) {
  console.error("Preflight report contains mojibake text");
  process.exit(1);
}

console.log("preflight report verify ok");
