const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sopPath = path.join(root, "experiments", "sampling-safety-sop.md");
const content = fs.readFileSync(sopPath, "utf8");
const mojibake = /[\u9362\u9422\u71b8\u59e3\u93c3\u30e8\u7ecb\u5a09\u9225\u9435\u52ea\u9359\u6220\u6d93\u9428\u6dc7\u6fc6\u7035\u714e\u935a\u55d8\u8930\u64b3\u93c2\u56e9\u93c1\u6fb6\u6d98\u93c8\u6ec3\ufffd]/;

const required = [
  "真实采样安全 SOP",
  "不是心理诊断或建议",
  "匿名采样",
  "不收真实手机号、微信或身份信息",
  "禁止记录",
  "用户输入框里的原始文本",
  "年龄和场景",
  "冒犯和不适处理",
  "危机或自伤表达",
  "可信的人",
  "当地紧急服务或专业热线",
  "只记录意向",
  "真实留资需要单独补隐私授权",
  "停止采样条件",
  "temporary_preview",
  "npm run verify:sampling-safety"
];

const missing = required.filter((snippet) => !content.includes(snippet));
if (missing.length) {
  console.error("Sampling safety SOP problems:");
  missing.forEach((snippet) => console.error(`Missing snippet: ${snippet}`));
  process.exit(1);
}

if (mojibake.test(content) || content.includes("鈧?") || /[?]{4,}/.test(content)) {
  console.error("Sampling safety SOP contains mojibake text");
  process.exit(1);
}

console.log("sampling safety SOP verify ok");
