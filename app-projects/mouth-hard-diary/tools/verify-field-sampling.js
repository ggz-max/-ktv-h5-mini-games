const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const playbookPath = path.join(root, "experiments", "field-sampling-playbook.md");
const content = fs.readFileSync(playbookPath, "utf8");

const requiredSnippets = [
  "真实用户现场采样手册",
  "Pencil `.pen`",
  "npm run verify:launch",
  "匿名点击、生成结果和反馈",
  "不收真实手机号、微信或身份信息",
  "不是心理诊断",
  "原始输入不要复制进复盘文档",
  "哪一句最像你",
  "它最不该做什么",
  "http://127.0.0.1:4327/admin.html",
  "npm run review:runtime",
  "npm run brief:founder",
  "继续采样",
  "进入 MVP 深做",
  "只做传播 H5",
  "暂停方向"
];

const missing = requiredSnippets.filter((snippet) => !content.includes(snippet));

if (missing.length) {
  console.error("Field sampling playbook problems:");
  missing.forEach((snippet) => console.error(`Missing snippet: ${snippet}`));
  process.exit(1);
}

console.log("field sampling playbook verify ok");
