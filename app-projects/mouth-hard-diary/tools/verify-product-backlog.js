const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "product", "post-sampling-backlog.md");
const runtimeDir = path.join(root, "server", "data", "runtime");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const mojibake = /[\u9362\u5a23\u68e3\u95c7\u943a\u9359\u7ec9\u5a34\u20ac\ufffd]/;

execFileSync(process.execPath, [path.join(root, "tools", "generate-product-backlog.js")], {
  cwd: root,
  stdio: "pipe"
});

const content = fs.readFileSync(outputPath, "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const pencilIncomplete = approval.status !== "approved" ||
  !manifest.pencilFile ||
  !fs.existsSync(path.join(root, manifest.pencilFile)) ||
  (manifest.exportTargets || []).some((target) => target.status !== "pencil_exported");
function jsonlCount(fileName) {
  const filePath = path.join(runtimeDir, fileName);
  if (!fs.existsSync(filePath)) return 0;
  const text = fs.readFileSync(filePath, "utf8").trim();
  return text ? text.split(/\r?\n/).length : 0;
}

const required = [
  "Post-Sampling Product Backlog",
  "Decision Context",
  "Backlog",
  "Product Bets",
  "First Build Sequence",
  "强化结果卡保存/分享价值",
  "App 假门：历史报告/发疯档案",
  "App 假门：精神状态日历",
  "App 假门：嘴硬人格图鉴",
  "更多发疯模板和风格包",
  "内容边界和冒犯反馈收敛",
  "分享回流入口和二维码海报",
  "轻留资/内测提醒承接",
  "Pencil remains the source of truth",
  "do not store raw user input"
];

if (pencilIncomplete) {
  required.push(
    "完成 Pencil 最终视觉链路",
    "style-approval 为 approved",
    "Pencil .pen 缺失",
    "视觉风格未确认"
  );
} else {
  required.push("Pencil pending exports | 0");
}

required.push(`sample | reports=${jsonlCount("reports.jsonl")}, events=${jsonlCount("events.jsonl")}, interviews=${jsonlCount("interviews.jsonl")}`);

const missing = required.filter((snippet) => !content.includes(snippet));
if (missing.length) {
  console.error("Product backlog problems:");
  missing.forEach((snippet) => console.error(`Missing snippet: ${snippet}`));
  process.exit(1);
}

if (mojibake.test(content)) {
  console.error("Product backlog contains mojibake text");
  process.exit(1);
}

if (pencilIncomplete && !/\| P0 \| design \| 完成 Pencil 最终视觉链路/.test(content)) {
  console.error("Product backlog does not reflect Pencil completion state clearly");
  process.exit(1);
}

console.log("product backlog verify ok");
