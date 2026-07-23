const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reviewPath = path.join(root, "docs", "runtime-review.md");
const runtimeDir = path.join(root, "server", "data", "runtime");
const reportsPath = path.join(runtimeDir, "reports.jsonl");
const eventsPath = path.join(runtimeDir, "events.jsonl");
const interviewsPath = path.join(runtimeDir, "interviews.jsonl");
const mojibake = /[\u9362\u5a23\u68e3\u95c7\u943a\u9359\u7ec9\u5a34\u20ac\ufffd]/;

function jsonlCount(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .length;
}

execFileSync(process.execPath, [path.join(root, "tools", "generate-runtime-review.js")], {
  cwd: root,
  stdio: "pipe"
});

if (!fs.existsSync(reviewPath)) {
  throw new Error("runtime review was not generated");
}

const content = fs.readFileSync(reviewPath, "utf8");
const expectedCounts = [
  ["报告生成", jsonlCount(reportsPath)],
  ["事件记录", jsonlCount(eventsPath)],
  ["访谈记录", jsonlCount(interviewsPath)]
];

[
  "# 嘴硬日记 MVP 日复盘",
  "## 概览",
  "## 决策摘要",
  "分享点击",
  "二次生成",
  "## 转化漏斗",
  "## 入口实验",
  "## 来源表现",
  "## Sampling Link Pack",
  "room_qr",
  "seed_group",
  "## App 功能兴趣",
  "## 留资意向",
  "## 内容反馈",
  "## 访谈摘要",
  "## 内容表现",
  "## 下一步建议"
].forEach((section) => {
  if (!content.includes(section)) {
    throw new Error(`runtime review missing section: ${section}`);
  }
});

expectedCounts.forEach(([label, count]) => {
  const row = `| ${label} | ${count} |`;
  if (!content.includes(row)) {
    throw new Error(`runtime review has stale ${label} count; expected row: ${row}`);
  }
});

const sampleLine = `reports=${expectedCounts[0][1]}, events=${expectedCounts[1][1]}, interviews=${expectedCounts[2][1]}`;
if (!content.includes(sampleLine)) {
  throw new Error(`runtime review decision sample is stale; expected: ${sampleLine}`);
}

if (mojibake.test(content)) {
  throw new Error("runtime review contains mojibake text");
}

console.log("runtime review verify ok");
