const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const args = process.argv.slice(2);

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : fallback;
}

const timeoutMs = Math.max(1000, Number(readArg("timeout", "600000")) || 600000);
const intervalMs = Math.max(250, Number(readArg("interval", "2000")) || 2000);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const target = path.join(root, manifest.pencilFile || "designs/pencil-source/mouth-hard-diary.pen");
const startedAt = Date.now();

function refreshHandoffStatus() {
  execFileSync(process.execPath, [path.join(root, "tools", "generate-pencil-handoff-status.js")], {
    cwd: root,
    stdio: "inherit",
    timeout: 15000
  });
}

console.log(`Watching for Pencil source: ${target}`);
console.log(`Timeout: ${timeoutMs}ms; interval: ${intervalMs}ms`);
console.log("This watcher does not create, parse, or edit .pen files.");

function check() {
  if (fs.existsSync(target)) {
    const stat = fs.statSync(target);
    console.log(`Pencil source detected: ${target}`);
    console.log(`Size: ${stat.size} bytes`);
    console.log(`Modified: ${stat.mtime.toISOString()}`);
    refreshHandoffStatus();
    process.exit(0);
  }

  if (Date.now() - startedAt >= timeoutMs) {
    console.log(`Timed out waiting for Pencil source: ${target}`);
    console.log("Save the file in Pencil, then run npm run pencil:handoff-status.");
    process.exit(2);
  }

  setTimeout(check, intervalMs);
}

check();
