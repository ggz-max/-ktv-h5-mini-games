const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const styleApprovalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const reportPath = path.join(root, "docs", "pencil-readiness.md");

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

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function detectPencilProcess() {
  if (process.platform !== "win32") {
    return { running: false, detail: "process check is Windows-only in this project" };
  }
  try {
    const output = execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      "Get-Process | Where-Object { $_.ProcessName -match 'Pencil|pencil' } | Select-Object -ExpandProperty ProcessName"
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 });
    const names = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return { running: names.length > 0, detail: names.length ? names.join(", ") : "not running" };
  } catch (error) {
    return { running: false, detail: "not running" };
  }
}

function readJsonSafe(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
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
  try {
    const script = [
      "$ErrorActionPreference='SilentlyContinue'",
      "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new()",
      "$OutputEncoding=[System.Text.UTF8Encoding]::new()",
      "$shell=New-Object -ComObject WScript.Shell",
      `$paths=@(${shortcutFiles.map((file) => `'${file.replace(/'/g, "''")}'`).join(",")})`,
      "$items=@()",
      "foreach($p in $paths){if(Test-Path -LiteralPath $p){$s=$shell.CreateShortcut($p);$items += [pscustomobject]@{Path=$p;TargetPath=$s.TargetPath;WorkingDirectory=$s.WorkingDirectory}}}",
      "$items | ConvertTo-Json -Depth 3"
    ].join(";");
    const output = execFileSync("powershell", ["-NoProfile", "-Command", script], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 8000
    }).trim();
    if (!output) return [];
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    return shortcutFiles.map((file) => ({ Path: file, TargetPath: "", WorkingDirectory: "" }));
  }
}

function inspectPencilHome(pencilHome) {
  const sessionPath = path.join(pencilHome, "session-desktop.json");
  const session = readJsonSafe(sessionPath, {});
  const mcpServerPath = path.join(pencilHome, "mcp", "visual_studio_code", "out", "mcp-server-windows-x64.exe");
  const documentsDir = path.join(pencilHome, "documents");
  const knownPenFiles = [];
  if (fs.existsSync(documentsDir)) {
    const stack = [documentsDir];
    while (stack.length) {
      const dir = stack.pop();
      fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const filePath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          stack.push(filePath);
          return;
        }
        if (/\.pen$/i.test(entry.name)) {
          knownPenFiles.push(filePath);
        }
      });
    }
  }
  return {
    sessionPath,
    sessionExists: fs.existsSync(sessionPath),
    sessionEmail: session.email || "",
    sessionLastOnlineAt: session.lastOnlineAt,
    mcpServerPath,
    mcpServerExists: fs.existsSync(mcpServerPath),
    knownPenFiles
  };
}

function buildReadiness() {
  const manifest = readJson(manifestPath, { images: [], exportTargets: [] });
  const approval = readJson(styleApprovalPath, {});
  const pencilFile = manifest.pencilFile || "designs/pencil-source/mouth-hard-diary.pen";
  const pencilHome = path.join(os.homedir(), ".pencil");
  const pencilHomeInspection = inspectPencilHome(pencilHome);
  const pencilProcess = detectPencilProcess();
  const shortcutTargets = findShortcutTargets();
  const shortcutExeCandidates = shortcutTargets.map((item) => item.TargetPath).filter(Boolean);
  const foundExe = [...new Set([...exeCandidates, ...shortcutExeCandidates])].filter((candidate) => fs.existsSync(candidate));
  const sourceImages = (manifest.images || []).map((image) => ({
    role: image.role || "unknown",
    file: `designs/pencil-source/${image.file || ""}`,
    board: image.board || "",
    exists: exists(`designs/pencil-source/${image.file || ""}`)
  }));
  const exportTargets = (manifest.exportTargets || []).map((target) => ({
    name: target.name || "",
    destination: target.destination || "",
    runtimeUsage: target.runtimeUsage || "required",
    status: target.status || "missing",
    exists: exists(target.destination || ""),
    final: target.status === "pencil_exported"
  }));
  const styleApproved = approval.status === "approved" && Boolean(approval.approvedBy) && Boolean(approval.approvedAt);
  const penExists = exists(pencilFile);
  const allSourcesReady = sourceImages.length > 0 && sourceImages.every((image) => image.exists);
  const requiredExportsFinal = exportTargets
    .filter((target) => target.runtimeUsage === "required")
    .every((target) => target.final && target.exists);
  const optionalExportsFinal = exportTargets
    .filter((target) => target.runtimeUsage !== "required")
    .every((target) => target.final && target.exists);

  const blockers = [
    foundExe.length ? "" : "Pencil executable not found in common install paths.",
    pencilProcess.running ? "" : "Pencil process is not running.",
    penExists ? "" : `Pencil source file missing: ${pencilFile}.`,
    styleApproved ? "" : `Style approval is not final: ${approval.status || "missing"}.`,
    requiredExportsFinal ? "" : "Required runtime exports are still temporary or missing.",
    optionalExportsFinal ? "" : "Optional/future export targets are not fully registered."
  ].filter(Boolean);

  return {
    generatedAt: new Date().toISOString(),
    ok: blockers.length === 0,
    manifest,
    approval,
    pencilFile,
    pencilHome,
    pencilHomeExists: fs.existsSync(pencilHome),
    pencilHomeInspection,
    pencilProcess,
    shortcutTargets,
    foundExe,
    sourceImages,
    exportTargets,
    allSourcesReady,
    styleApproved,
    penExists,
    requiredExportsFinal,
    optionalExportsFinal,
    blockers
  };
}

function check(ok, text) {
  return `| ${text} | ${ok ? "PASS" : "BLOCKED"} |`;
}

function buildMarkdown(state) {
  const pendingExports = state.exportTargets.filter((target) => !target.final || !target.exists);
  const sources = state.sourceImages
    .map((image) => `| ${image.role} | \`${image.file}\` | ${image.board || "-"} | ${image.exists ? "exists" : "missing"} |`)
    .join("\n");
  const exports = state.exportTargets
    .map((target) => `| ${target.name} | \`${target.destination}\` | ${target.runtimeUsage} | ${target.status} | ${target.exists ? "exists" : "missing"} |`)
    .join("\n");
  const exeLines = state.foundExe.length
    ? state.foundExe.map((candidate) => `- \`${candidate}\``).join("\n")
    : "- not found in common install paths";
  const shortcutLines = state.shortcutTargets.length
    ? state.shortcutTargets.map((item) => `- \`${item.Path}\` -> \`${item.TargetPath || "-"}\``).join("\n")
    : "- none";
  const knownPenLines = state.pencilHomeInspection.knownPenFiles.length
    ? state.pencilHomeInspection.knownPenFiles.map((file) => `- \`${file}\``).join("\n")
    : "- none";
  const blockers = state.blockers.length
    ? state.blockers.map((item) => `- ${item}`).join("\n")
    : "- None. Pencil asset chain is ready.";
  const nextActions = [
    "Run `npm run pencil:open` to confirm the resolved Pencil executable and target `.pen` path.",
    "Run `npm run pencil:open -- --yes`, then create/open `designs/pencil-source/mouth-hard-diary.pen` inside Pencil.",
    "Import all image2 source images from `designs/pencil-source/images/` into the Pencil boards listed in `designs/pencil-source/operator-pack.md`.",
    "Confirm the visual direction from Pencil boards, then update `designs/pencil-source/style-approval.json` through the approval draft flow.",
    "Export final slices from Pencil into `h5/assets/visuals/pencil-export/` and register them with `npm run pencil:register-exports -- --yes` only after review."
  ].map((item) => `- ${item}`).join("\n");

  return `# Pencil Readiness Report

Last generated: ${state.generatedAt}

This report tracks the user-required image pipeline: image2 source images -> Pencil .pen design -> style approval -> Pencil exports -> H5 runtime references.

## Summary

${check(state.pencilHomeExists, "Pencil home exists")}
${check(state.foundExe.length > 0, "Pencil executable found")}
${check(state.pencilProcess.running, "Pencil process running")}
${check(state.allSourcesReady, "image2 source images ready")}
${check(state.penExists, "Pencil .pen source file exists")}
${check(state.styleApproved, "style-approval.json is approved")}
${check(state.requiredExportsFinal, "required Pencil exports are final")}
${check(state.optionalExportsFinal, "optional Pencil exports are final")}

Overall: ${state.ok ? "READY" : "BLOCKED"}

## Pencil Environment

- Pencil home: \`${state.pencilHome}\` (${state.pencilHomeExists ? "exists" : "missing"})
- Pencil process: ${state.pencilProcess.detail}
- Pencil executable candidates:
${exeLines}
- Pencil shortcuts:
${shortcutLines}

## Local Pencil Home Inspection

- Session file: \`${state.pencilHomeInspection.sessionPath}\` (${state.pencilHomeInspection.sessionExists ? "exists" : "missing"})
- Session email: ${state.pencilHomeInspection.sessionEmail || "-"}
- Session lastOnlineAt: ${state.pencilHomeInspection.sessionLastOnlineAt ?? "-"}
- VS Code MCP server: \`${state.pencilHomeInspection.mcpServerPath}\` (${state.pencilHomeInspection.mcpServerExists ? "exists" : "missing"})
- MCP note: the VS Code MCP server is not the Pencil desktop app and cannot prove this project's \`.pen\` source exists.

Known local \`.pen\` files under Pencil home:

${knownPenLines}

These files are evidence of prior Pencil activity only. They do not replace \`designs/pencil-source/mouth-hard-diary.pen\`.

## Source And Export State

- Manifest: \`${rel(manifestPath)}\`
- Manifest status: ${state.manifest.status || "missing"}
- Pencil source file: \`${state.pencilFile}\` (${state.penExists ? "exists" : "missing"})
- Style approval: ${state.approval.status || "missing"} / approvedBy=${state.approval.approvedBy || "-"} / approvedAt=${state.approval.approvedAt || "-"}
- Pending exports: ${pendingExports.length ? pendingExports.map((item) => `${item.name}:${item.status}`).join(", ") : "none"}

### image2 Sources

| Role | File | Board | State |
| --- | --- | --- | --- |
${sources || "| - | - | - | missing |"}

### Pencil Export Targets

| Name | Destination | Runtime usage | Manifest status | File |
| --- | --- | --- | --- | --- |
${exports || "| - | - | - | missing | missing |"}

## Current Blockers

${blockers}

## Next Actions

${nextActions}
`;
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const state = buildReadiness();
  const markdown = buildMarkdown(state);
  if (checkOnly) {
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Missing report: ${rel(reportPath)}`);
    }
    const existing = fs.readFileSync(reportPath, "utf8");
    const normalize = (text) => text.replace(/Last generated: .+/, "Last generated: <time>");
    if (normalize(existing) !== normalize(markdown)) {
      throw new Error(`Stale report: run npm run pencil:readiness-report`);
    }
    return;
  }
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, markdown);
  console.log(rel(reportPath));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
