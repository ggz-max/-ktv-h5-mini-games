const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const runtimeDir = path.join(root, "server", "data", "runtime");
const reportsPath = path.join(runtimeDir, "reports.jsonl");
const eventsPath = path.join(runtimeDir, "events.jsonl");
const interviewsPath = path.join(runtimeDir, "interviews.jsonl");
const backupRoot = path.join(root, "server", "data", "runtime-backups");

function content(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

const beforeReports = content(reportsPath);
const beforeEvents = content(eventsPath);
const beforeInterviews = content(interviewsPath);

execFileSync(process.execPath, [path.join(root, "tools", "prepare-runtime-data.js")], {
  cwd: root,
  stdio: "pipe"
});

if (content(reportsPath) !== beforeReports || content(eventsPath) !== beforeEvents || content(interviewsPath) !== beforeInterviews) {
  throw new Error("runtime backup changed active runtime data");
}

const backups = fs.readdirSync(backupRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(backupRoot, entry.name))
  .sort();

const latest = backups[backups.length - 1];
if (!latest) throw new Error("runtime backup directory was not created");
if (!fs.existsSync(path.join(latest, "manifest.json"))) {
  throw new Error("runtime backup manifest missing");
}

const manifest = JSON.parse(fs.readFileSync(path.join(latest, "manifest.json"), "utf8"));
if (manifest.cleared) {
  throw new Error("verify backup should not clear runtime data");
}
if (!manifest.files.some((item) => item.name === "interviews.jsonl")) {
  throw new Error("runtime backup missing interviews.jsonl");
}

console.log("runtime prepare verify ok");
