const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const args = process.argv.slice(2);
const shouldOpen = args.includes("--yes");

const exeCandidates = [
  path.join(process.env.LOCALAPPDATA || "", "Programs", "Pencil", "Pencil.exe"),
  path.join(process.env.LOCALAPPDATA || "", "Programs", "pencil", "Pencil.exe"),
  path.join(process.env.ProgramFiles || "", "Pencil", "Pencil.exe"),
  path.join(process.env.ProgramFiles || "", "Pencil", "pencil.exe"),
  path.join(process.env["ProgramFiles(x86)"] || "", "Pencil", "Pencil.exe"),
  "D:\\我的\\Pencil\\Pencil.exe"
].filter(Boolean);

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findShortcutTargets() {
  if (process.platform !== "win32") return [];
  const shortcutDirs = [
    path.join(process.env.APPDATA || "", "Microsoft", "Windows", "Start Menu", "Programs"),
    path.join(process.env.ProgramData || "", "Microsoft", "Windows", "Start Menu", "Programs"),
    path.join(os.homedir(), "Desktop"),
    path.join(process.env.PUBLIC || "", "Desktop")
  ].filter(Boolean);
  const shortcutFiles = [];
  shortcutDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;
    const stack = [dir];
    while (stack.length) {
      const current = stack.pop();
      fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
        const filePath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(filePath);
          return;
        }
        if (/pencil.*\.lnk$/i.test(entry.name)) {
          shortcutFiles.push(filePath);
        }
      });
    }
  });
  if (!shortcutFiles.length) return [];

  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new()",
    "$OutputEncoding=[System.Text.UTF8Encoding]::new()",
    "$shell=New-Object -ComObject WScript.Shell",
    `$paths=@(${shortcutFiles.map((file) => `'${file.replace(/'/g, "''")}'`).join(",")})`,
    "$items=@()",
    "foreach($p in $paths){if(Test-Path -LiteralPath $p){$s=$shell.CreateShortcut($p);$items += [pscustomobject]@{Path=$p;TargetPath=$s.TargetPath}}}",
    "$items | ConvertTo-Json -Depth 3"
  ].join(";");
  try {
    const output = execFileSync("powershell", ["-NoProfile", "-Command", script], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 8000
    }).trim();
    if (!output) return [];
    const parsed = JSON.parse(output);
    return (Array.isArray(parsed) ? parsed : [parsed]).map((item) => item.TargetPath).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function detectPencilProcess() {
  if (process.platform !== "win32") return "process check is Windows-only";
  try {
    const output = execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      "Get-Process | Where-Object { $_.ProcessName -match 'Pencil|pencil' } | Select-Object -ExpandProperty ProcessName"
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 });
    const names = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return names.length ? `running: ${names.join(", ")}` : "not running";
  } catch (error) {
    return "not running";
  }
}

const manifest = readJson(manifestPath, {});
const pencilFile = path.join(root, manifest.pencilFile || "designs/pencil-source/mouth-hard-diary.pen");
const foundExe = [...new Set([...exeCandidates, ...findShortcutTargets()])]
  .filter((candidate) => fs.existsSync(candidate));

console.log(`Project: ${root}`);
console.log(`Target Pencil file: ${pencilFile}`);
console.log(`Target .pen exists: ${fs.existsSync(pencilFile)}`);
console.log(`Pencil process: ${detectPencilProcess()}`);

if (!foundExe.length) {
  console.error("Pencil executable not found. Run npm run pencil:readiness-report for diagnostics.");
  process.exit(1);
}

const pencilExe = foundExe[0];
console.log(`Pencil executable: ${pencilExe}`);
console.log("This script will not create, parse, or edit the .pen file.");

if (!shouldOpen) {
  console.log("Dry run only. Run `npm run pencil:open -- --yes` to open Pencil.");
  process.exit(0);
}

const child = spawn(pencilExe, [], {
  cwd: path.dirname(pencilExe),
  detached: true,
  stdio: "ignore"
});
child.unref();

console.log("Pencil launch requested. In Pencil, create or open the target .pen path printed above.");
