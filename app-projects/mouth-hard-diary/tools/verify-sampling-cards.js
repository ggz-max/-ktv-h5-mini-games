const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const generatedJsonPath = path.join(root, "docs", "sampling-links.generated.json");
const cardsDir = path.join(root, "docs", "sampling-cards");
const indexPath = path.join(cardsDir, "index.html");
const mojibake = /[\u9362\u9422\u71b8\u59e3\u93c3\u30e8\u7ecb\u5a09\u9225\u9435\u52ea\u9359\u6220\u6d93\u9428\u6dc7\u6fc6\u7035\u714e\u935a\u55d8\u8930\u64b3\u93c2\u56e9\u93c1\u6fb6\u6d98\u93c8\u6ec3\ufffd]/;

function fileSafe(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hasMojibake(content) {
  return mojibake.test(content) || content.includes("鈧?") || /[?]{4,}/.test(content);
}

const payload = JSON.parse(read(generatedJsonPath));
const index = read(indexPath);
const problems = [];

if (hasMojibake(index)) {
  problems.push("Sampling card index contains mojibake text");
}

(payload.links || []).forEach((link, indexNumber) => {
  const fileName = `${String(indexNumber + 1).padStart(2, "0")}-${fileSafe(link.cohortId)}-${fileSafe(link.variant)}.html`;
  const filePath = path.join(cardsDir, fileName);

  if (!fs.existsSync(filePath)) {
    problems.push(`Missing sampling card: ${fileName}`);
    return;
  }

  const html = read(filePath);
  if (hasMojibake(html)) {
    problems.push(`${fileName} contains mojibake text`);
  }

  [
    link.cohortLabel,
    link.variantLabel,
    `source: ${link.source}`,
    `campaign: ${link.campaign}`,
    `channel: ${link.channel}`,
    "匿名采样",
    "不收真实手机号、微信或身份信息"
  ].forEach((snippet) => {
    if (!html.includes(snippet)) {
      problems.push(`${fileName} missing snippet: ${snippet}`);
    }
  });

  if (!html.includes(link.url) && !html.includes(escapeHtml(link.url))) {
    problems.push(`${fileName} missing URL: ${link.url}`);
  }

  if (!index.includes(fileName) || (!index.includes(link.url) && !index.includes(escapeHtml(link.url)))) {
    problems.push(`Index missing card or URL: ${fileName}`);
  }
});

const htmlFiles = fs.readdirSync(cardsDir).filter((name) => name.endsWith(".html") && name !== "index.html");
if (htmlFiles.length !== payload.links.length) {
  problems.push(`Sampling card count mismatch: ${htmlFiles.length} !== ${payload.links.length}`);
}

if (!index.includes("真实采样投放卡片") || !index.includes("场景") || !index.includes("入口")) {
  problems.push("Sampling card index missing readable Chinese headings");
}

if (problems.length) {
  console.error("Sampling card problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`sampling cards verify ok: ${htmlFiles.length} cards`);
