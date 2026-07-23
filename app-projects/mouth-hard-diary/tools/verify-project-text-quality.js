const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const checkedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".ps1",
  ".txt"
]);
const skipPrefixes = [
  "node_modules/",
  ".git/",
  "server/data/runtime/",
  "h5/screenshots/",
  "designs/screenshots/",
  "docs/sampling-cards/screenshots/"
];
const mojibake = /[\u9362\u9422\u71b8\u59e3\u93c3\u30e8\u7ecb\u5a09\u9225\u9435\u52ea\u9359\u6220\u6d93\u9428\u6dc7\u6fc6\u7035\u714e\u935a\u55d8\u8930\u64b3\u93c2\u56e9\u93c1\u6fb6\u6d98\u93c8\u6ec3\ufffd]/;
const problems = [];

function shouldSkip(relativePath) {
  return skipPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const filePath = path.join(dir, entry.name);
    const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
    if (shouldSkip(relativePath)) return;
    if (entry.isDirectory()) {
      walk(filePath);
      return;
    }
    if (!checkedExtensions.has(path.extname(entry.name).toLowerCase())) return;
    const content = fs.readFileSync(filePath, "utf8");
    if (mojibake.test(content)) {
      problems.push(`${relativePath} contains mojibake text`);
    }
    if (/[?]{4,}/.test(content)) {
      problems.push(`${relativePath} contains suspicious question-mark replacement text`);
    }
  });
}

walk(root);

if (problems.length) {
  console.error("Project text quality problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log("project text quality verify ok");
