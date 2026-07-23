const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mh-sampling-prepare-"));

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  fs.readdirSync(source, { withFileTypes: true }).forEach((entry) => {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(sourcePath, targetPath);
    else fs.copyFileSync(sourcePath, targetPath);
  });
}

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

try {
  copyDir(root, tempRoot);
  const runtimeDir = path.join(tempRoot, "server", "data", "runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(path.join(runtimeDir, "reports.jsonl"), '{"source":"verify_data","entryVariant":"verify_variant"}\n', "utf8");
  fs.writeFileSync(path.join(runtimeDir, "events.jsonl"), '{"event":"verify_data_event","sessionId":"verify_data"}\n', "utf8");
  fs.writeFileSync(path.join(runtimeDir, "interviews.jsonl"), '{"segment":"verify_user"}\n', "utf8");

  execFileSync(process.execPath, [path.join(tempRoot, "tools", "prepare-real-sampling.js"), "--yes"], {
    cwd: tempRoot,
    stdio: "pipe"
  });

  ["reports.jsonl", "events.jsonl", "interviews.jsonl"].forEach((name) => {
    if (read(path.join(runtimeDir, name)).trim()) {
      throw new Error(`${name} was not cleared`);
    }
  });

  const backupRoot = path.join(tempRoot, "server", "data", "runtime-backups");
  const backupDirs = fs.readdirSync(backupRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  if (!backupDirs.length) throw new Error("backup directory missing");

  const review = read(path.join(tempRoot, "docs", "runtime-review.md"));
  if (!review.includes("| 含测试数据 | 否 |")) {
    throw new Error("clean runtime review was not generated");
  }

  console.log("sampling prepare verify ok");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
