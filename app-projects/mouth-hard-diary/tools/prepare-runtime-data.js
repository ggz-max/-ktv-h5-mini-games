const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const runtimeDir = path.join(root, "server", "data", "runtime");
const backupRoot = path.join(root, "server", "data", "runtime-backups");
const files = ["reports.jsonl", "events.jsonl", "interviews.jsonl"];
const sqliteFiles = ["analytics.sqlite", "analytics.sqlite-wal", "analytics.sqlite-shm"];
const args = new Set(process.argv.slice(2));
const shouldClear = args.has("--clear");
const confirmed = args.has("--yes");

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "", "utf8");
}

function lineCount(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, "utf8").trim();
  return content ? content.split(/\r?\n/).length : 0;
}

if (shouldClear && !confirmed) {
  console.error("Refusing to clear runtime data without --yes.");
  console.error("Use: npm run runtime:clear -- --yes");
  process.exit(1);
}

const backupDir = path.join(backupRoot, stamp());
fs.mkdirSync(backupDir, { recursive: true });

const manifest = {
  backedUpAt: new Date().toISOString(),
  cleared: shouldClear,
  files: []
};

files.forEach((name) => {
  const sourcePath = path.join(runtimeDir, name);
  const backupPath = path.join(backupDir, name);
  ensureFile(sourcePath);
  fs.copyFileSync(sourcePath, backupPath);
  const beforeLines = lineCount(sourcePath);
  if (shouldClear) {
    fs.writeFileSync(sourcePath, "", "utf8");
  }
  manifest.files.push({
    name,
    backupPath,
    linesBefore: beforeLines,
    linesAfter: lineCount(sourcePath)
  });
});

sqliteFiles.forEach((name) => {
  const sourcePath = path.join(runtimeDir, name);
  const backupPath = path.join(backupDir, name);
  const exists = fs.existsSync(sourcePath);
  if (exists) {
    fs.copyFileSync(sourcePath, backupPath);
  }
  if (shouldClear && exists) {
    fs.rmSync(sourcePath, { force: true });
  }
  manifest.files.push({
    name,
    backupPath: exists ? backupPath : "",
    bytesBefore: exists ? fs.statSync(backupPath).size : 0,
    bytesAfter: fs.existsSync(sourcePath) ? fs.statSync(sourcePath).size : 0
  });
});

const manifestPath = path.join(backupDir, "manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

console.log(`runtime backup ok: ${backupDir}`);
if (shouldClear) {
  console.log("runtime data cleared");
} else {
  console.log("runtime data preserved");
}
