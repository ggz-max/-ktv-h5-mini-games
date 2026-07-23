const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const reportPath = path.join(root, "docs", "pencil-connection-diagnostics.md");
const jsonPath = path.join(root, "docs", "pencil-connection-diagnostics.json");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function psJson(command, fallback) {
  if (process.platform !== "win32") return fallback;
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new()",
    "$OutputEncoding=[System.Text.UTF8Encoding]::new()",
    command
  ].join(";");
  try {
    const output = execFileSync("powershell", ["-NoProfile", "-Command", script], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10000
    }).trim();
    if (!output) return fallback;
    return JSON.parse(output);
  } catch (error) {
    return fallback;
  }
}

function detectProcesses() {
  const result = psJson(
    "Get-Process | Where-Object { $_.ProcessName -match 'Pencil|pencil' } | Select-Object ProcessName,Id,Path,MainWindowTitle,MainWindowHandle | ConvertTo-Json -Depth 3",
    []
  );
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

function inspectWindows() {
  const result = psJson(
    "Add-Type -AssemblyName UIAutomationClient;$items=@();$procs=Get-Process | Where-Object { $_.ProcessName -match 'Pencil|pencil' -and $_.MainWindowHandle -ne 0 };foreach($p in $procs){$childCount=0;$rootName='';$className='';$controlType='';$automationAvailable=$false;try{$e=[System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$p.MainWindowHandle);$c=$e.Current;$rootName=$c.Name;$className=$c.ClassName;$controlType=$c.ControlType.ProgrammaticName;$children=$e.FindAll([System.Windows.Automation.TreeScope]::Children,[System.Windows.Automation.Condition]::TrueCondition);$childCount=$children.Count;$automationAvailable=$true}catch{};$items += [pscustomobject]@{Pid=$p.Id;Title=$p.MainWindowTitle;Handle=$p.MainWindowHandle;RootName=$rootName;ClassName=$className;ControlType=$controlType;VisibleChildCount=$childCount;AutomationAvailable=$automationAvailable}};$items | ConvertTo-Json -Depth 4",
    []
  );
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

function inspectCommandLines() {
  const result = psJson(
    "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'Pencil' } | Select-Object ProcessId,CommandLine | ConvertTo-Json -Depth 3",
    []
  );
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

function inspectListeningPorts(processes) {
  if (!processes.length) return [];
  const ids = processes.map((process) => Number(process.Id || process.ProcessId)).filter(Boolean);
  if (!ids.length) return [];
  const idLiteral = ids.join(",");
  const result = psJson(
    `$ids=@(${idLiteral});Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ids -contains $_.OwningProcess } | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json -Depth 3`,
    []
  );
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

function findShortcutTargets() {
  if (process.platform !== "win32") return [];
  const shortcutRoots = [
    path.join(process.env.APPDATA || "", "Microsoft", "Windows", "Start Menu", "Programs"),
    path.join(process.env.ProgramData || "", "Microsoft", "Windows", "Start Menu", "Programs"),
    path.join(os.homedir(), "Desktop"),
    path.join(process.env.PUBLIC || "", "Desktop")
  ].filter(Boolean);
  const shortcutFiles = [];
  shortcutRoots.forEach((dir) => {
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
        if (/pencil.*\.lnk$/i.test(entry.name)) shortcutFiles.push(filePath);
      });
    }
  });
  if (!shortcutFiles.length) return [];
  const pathsLiteral = shortcutFiles.map((file) => `'${file.replace(/'/g, "''")}'`).join(",");
  const result = psJson(
    `$shell=New-Object -ComObject WScript.Shell;$paths=@(${pathsLiteral});$items=@();foreach($p in $paths){if(Test-Path -LiteralPath $p){$s=$shell.CreateShortcut($p);$items += [pscustomobject]@{Path=$p;TargetPath=$s.TargetPath}}};$items | ConvertTo-Json -Depth 3`,
    []
  );
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

function listPenFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(filePath);
        return;
      }
      if (/\.pen$/i.test(entry.name)) files.push(filePath);
    });
  }
  return files;
}

function buildState() {
  const manifest = readJson(manifestPath, { images: [], exportTargets: [] });
  const targetPen = path.join(root, manifest.pencilFile || "designs/pencil-source/mouth-hard-diary.pen");
  const pencilHome = path.join(os.homedir(), ".pencil");
  const sessionPath = path.join(pencilHome, "session-desktop.json");
  const mcpServerPath = path.join(pencilHome, "mcp", "visual_studio_code", "out", "mcp-server-windows-x64.exe");
  const knownPenFiles = listPenFiles(path.join(pencilHome, "documents"));
  const processes = detectProcesses();
  const windows = inspectWindows();
  const commandLines = inspectCommandLines();
  const listeningPorts = inspectListeningPorts(processes);
  const hasRemoteDebugging = commandLines.some((item) => /remote-debugging/i.test(item.CommandLine || ""));
  const electronVersions = [...new Set(commandLines
    .map((item) => {
      const match = String(item.CommandLine || "").match(/--annotation=_version=([^\s]+)/);
      return match ? match[1] : "";
    })
    .filter(Boolean))];
  const shortcuts = findShortcutTargets();
  const sourceImages = (manifest.images || []).map((image) => ({
    file: `designs/pencil-source/${image.file}`,
    exists: fs.existsSync(path.join(root, "designs", "pencil-source", image.file || "")),
    recommendedBoard: image.recommendedBoard || ""
  }));
  const exports = (manifest.exportTargets || []).map((target) => ({
    name: target.name || "",
    destination: target.destination || "",
    status: target.status || "",
    exists: fs.existsSync(path.join(root, target.destination || "")),
    sourceBoard: target.sourceBoard || "",
    expectedNodeName: target.expectedNodeName || ""
  }));

  return {
    generatedAt: new Date().toISOString(),
    projectRoot: root,
    targetPen,
    targetPenExists: fs.existsSync(targetPen),
    pencilHome,
    pencilHomeExists: fs.existsSync(pencilHome),
    sessionPath,
    sessionExists: fs.existsSync(sessionPath),
    mcpServerPath,
    mcpServerExists: fs.existsSync(mcpServerPath),
    processes,
    windows,
    automationConclusion: windows.some((window) => Number(window.VisibleChildCount || 0) > 10)
      ? "Window automation exposes rich controls; review manually before using automation."
      : "Pencil is running, but Windows UIAutomation only exposes the Electron shell, so scripted save/export is not safe.",
    commandLines,
    listeningPorts,
    hasRemoteDebugging,
    electronVersions,
    cdpConclusion: hasRemoteDebugging || listeningPorts.length
      ? "Potential debugging or listening endpoint detected; inspect manually before any automated control."
      : "No Pencil-owned listening port or remote-debugging flag was detected, so CDP automation is unavailable.",
    shortcuts,
    knownPenFiles,
    manifestStatus: manifest.status || "missing",
    sourceImages,
    exports,
    handoffConclusion: fs.existsSync(targetPen)
      ? "Project .pen exists; continue with Pencil board approval and export checks."
      : "Pencil is available locally, but the project .pen must still be created or saved inside Pencil."
  };
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function markdown(state) {
  const processRows = state.processes.length
    ? state.processes.map((process) => [process.ProcessName || "-", String(process.Id || "-"), process.Path || "-"])
    : [["-", "-", "not running"]];
  const windowRows = state.windows.length
    ? state.windows.map((window) => [
      String(window.Pid || "-"),
      window.Title || "-",
      String(window.Handle || "-"),
      window.ClassName || "-",
      window.ControlType || "-",
      String(window.VisibleChildCount ?? "-")
    ])
    : [["-", "-", "-", "-", "-", "0"]];
  const commandRows = state.commandLines.length
    ? state.commandLines.map((item) => [
      String(item.ProcessId || "-"),
      `\`${String(item.CommandLine || "-").replace(/\|/g, "\\|")}\``
    ])
    : [["-", "-"]];
  const portRows = state.listeningPorts.length
    ? state.listeningPorts.map((item) => [
      item.LocalAddress || "-",
      String(item.LocalPort || "-"),
      String(item.OwningProcess || "-")
    ])
    : [["-", "-", "none"]];
  const shortcutRows = state.shortcuts.length
    ? state.shortcuts.map((shortcut) => [shortcut.Path || "-", shortcut.TargetPath || "-"])
    : [["-", "none"]];
  const sourceRows = state.sourceImages.map((image) => [
    `\`${image.file}\``,
    image.recommendedBoard || "-",
    image.exists ? "exists" : "missing"
  ]);
  const exportRows = state.exports.map((target) => [
    target.name,
    target.sourceBoard || "-",
    target.expectedNodeName ? `\`${target.expectedNodeName}\`` : "-",
    `\`${target.destination}\``,
    target.status || "-",
    target.exists ? "exists" : "missing"
  ]);
  const knownPenRows = state.knownPenFiles.length
    ? state.knownPenFiles.map((file) => [`\`${file}\``])
    : [["none"]];

  return `# Pencil Connection Diagnostics

Last generated: ${state.generatedAt}

This report diagnoses the local Pencil desktop state for the required image pipeline. It does not create, parse, or edit \`.pen\` files.

## Summary

| Check | State |
| --- | --- |
| Pencil desktop process | ${state.processes.length ? "running" : "not running"} |
| Visible Pencil window | ${state.windows.length ? "yes" : "no"} |
| Pencil home | ${state.pencilHomeExists ? "exists" : "missing"} |
| Pencil VS Code MCP server file | ${state.mcpServerExists ? "exists" : "missing"} |
| CDP / listening endpoint | ${state.hasRemoteDebugging || state.listeningPorts.length ? "possible" : "not detected"} |
| Project target .pen | ${state.targetPenExists ? "exists" : "missing"} |
| Manifest status | ${state.manifestStatus} |

Conclusion: ${state.handoffConclusion}

Automation note: ${state.automationConclusion}

CDP note: ${state.cdpConclusion}

## Project Target

- Project root: \`${state.projectRoot}\`
- Target Pencil file: \`${state.targetPen}\`
- Target file exists: ${state.targetPenExists ? "yes" : "no"}

## Local Pencil Process

${table(["Process", "PID", "Path"], processRows)}

## Visible Pencil Window

${table(["PID", "Title", "Handle", "Class", "Control type", "Visible child count"], windowRows)}

## Debugging And Command Line

- Electron/Pencil versions from process metadata: ${state.electronVersions.length ? state.electronVersions.join(", ") : "-"}
- Remote debugging flag detected: ${state.hasRemoteDebugging ? "yes" : "no"}

${table(["PID", "Command line"], commandRows)}

Pencil-owned listening ports:

${table(["Address", "Port", "PID"], portRows)}

## Pencil Shortcuts

${table(["Shortcut", "Target"], shortcutRows)}

## Local Pencil Home

- Pencil home: \`${state.pencilHome}\` (${state.pencilHomeExists ? "exists" : "missing"})
- Session file: \`${state.sessionPath}\` (${state.sessionExists ? "exists" : "missing"})
- VS Code MCP server file: \`${state.mcpServerPath}\` (${state.mcpServerExists ? "exists" : "missing"})

Known local \`.pen\` files under Pencil home:

${table(["File"], knownPenRows)}

These are prior Pencil documents only. They do not replace the project target file.

## Import Sources

${table(["Source", "Recommended board", "File"], sourceRows)}

## Export Targets

${table(["Name", "Board", "Pencil node", "Runtime file", "Manifest status", "File"], exportRows)}

## Operator Acceptance

Before this project can leave the Pencil gate:

- Save the project source as \`designs/pencil-source/mouth-hard-diary.pen\` from inside Pencil.
- Import all source images listed above into Pencil.
- Build the boards and export nodes from \`designs/pencil-source/operator-pack.md\`.
- Confirm the style from Pencil boards before applying \`style-approval.json\`.
- Export runtime PNGs from Pencil into \`h5/assets/visuals/pencil-export/\`.
`;
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const state = buildState();
  const md = markdown(state);
  if (checkOnly) {
    if (!fs.existsSync(reportPath) || !fs.existsSync(jsonPath)) {
      throw new Error("Pencil diagnostics report is missing; run npm run pencil:diagnose");
    }
    const existing = fs.readFileSync(reportPath, "utf8");
    const normalize = (text) => text.replace(/Last generated: .+/, "Last generated: <time>");
    if (normalize(existing) !== normalize(md)) {
      throw new Error("Pencil diagnostics report is stale; run npm run pencil:diagnose");
    }
    return;
  }
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, md, "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(rel(reportPath));
  console.log(rel(jsonPath));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
