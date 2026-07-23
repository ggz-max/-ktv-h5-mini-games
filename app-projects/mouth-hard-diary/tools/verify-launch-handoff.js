const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const handoffPath = path.join(root, "docs", "launch-handoff.md");
const content = fs.readFileSync(handoffPath, "utf8");

const mojibake = /[\u9362\u5a23\u68e3\u95c7\u943a\u9359\u7ec9\u5a34\u20ac\ufffd]/;

const required = [
  "Launch Handoff",
  "当前只能内部联调",
  "Pencil `.pen`",
  "h5/assets/visuals/pencil-export/",
  "npm run verify:launch",
  "npm run verify:assets:final",
  "/api/v1/admin/pencil-assets",
  "Pencil 资产工作台",
  "designs/pencil-source/handoff-packet.md",
  "npm run sampling:prepare -- --yes",
  "npm run review:runtime",
  "npm run brief:founder",
  "不收真实手机号、微信或身份信息",
  "不要手动读取或编辑 `.pen` 文件",
  "temporary_preview",
  "当前阻塞"
];

const missing = required.filter((snippet) => !content.includes(snippet));
if (missing.length) {
  console.error("Launch handoff problems:");
  missing.forEach((snippet) => console.error(`Missing snippet: ${snippet}`));
  process.exit(1);
}

if (mojibake.test(content)) {
  console.error("Launch handoff contains mojibake text");
  process.exit(1);
}

console.log("launch handoff verify ok");
