$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$PencilHome = Join-Path $env:USERPROFILE ".pencil"
$Manifest = Join-Path $ProjectRoot "designs\pencil-source\image-manifest.json"

Write-Host "Project: $ProjectRoot"
Write-Host "Pencil home exists: $(Test-Path -LiteralPath $PencilHome)"

$SessionFile = Join-Path $PencilHome "session-desktop.json"
Write-Host "Pencil session file exists: $(Test-Path -LiteralPath $SessionFile)"
if (Test-Path -LiteralPath $SessionFile) {
  $session = Get-Content -LiteralPath $SessionFile -Encoding UTF8 | ConvertFrom-Json
  Write-Host "Pencil session lastOnlineAt: $($session.lastOnlineAt)"
}

$McpServer = Join-Path $PencilHome "mcp\visual_studio_code\out\mcp-server-windows-x64.exe"
Write-Host "Pencil VS Code MCP server exists: $(Test-Path -LiteralPath $McpServer)"

$processes = Get-Process | Where-Object { $_.ProcessName -match "Pencil|pencil" }
if ($processes) {
  Write-Host "Pencil process: running"
  $processes | Select-Object ProcessName,Id,Path | Format-Table
} else {
  Write-Host "Pencil process: not running"
}

$exeCandidates = @(
  "$env:LOCALAPPDATA\Programs\Pencil\Pencil.exe",
  "$env:LOCALAPPDATA\Programs\pencil\Pencil.exe",
  "$env:ProgramFiles\Pencil\Pencil.exe",
  "$env:ProgramFiles\Pencil\pencil.exe",
  "$env:ProgramFiles(x86)\Pencil\Pencil.exe",
  "D:\我的\Pencil\Pencil.exe"
)

$shortcutRoots = @(
  "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
  "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
  "$env:USERPROFILE\Desktop",
  "$env:PUBLIC\Desktop"
)
$shortcutTargets = @()
$shell = New-Object -ComObject WScript.Shell
foreach ($root in $shortcutRoots) {
  if (!(Test-Path -LiteralPath $root)) { continue }
  $links = Get-ChildItem -LiteralPath $root -Recurse -Filter "*Pencil*.lnk" -ErrorAction SilentlyContinue
  foreach ($link in $links) {
    $shortcut = $shell.CreateShortcut($link.FullName)
    Write-Host "Pencil shortcut: $($link.FullName) -> $($shortcut.TargetPath)"
    if ($shortcut.TargetPath) {
      $shortcutTargets += $shortcut.TargetPath
    }
  }
}

$foundExe = @($exeCandidates + $shortcutTargets) | Select-Object -Unique | Where-Object { Test-Path -LiteralPath $_ }
if ($foundExe) {
  Write-Host "Pencil executable candidates:"
  $foundExe | ForEach-Object { Write-Host " - $_" }
} else {
  Write-Host "Pencil executable: not found in common install paths"
}

$knownPenFiles = Get-ChildItem -LiteralPath (Join-Path $PencilHome "documents") -Recurse -Filter "*.pen" -ErrorAction SilentlyContinue
if ($knownPenFiles) {
  Write-Host "Known local .pen files under Pencil home:"
  $knownPenFiles | ForEach-Object { Write-Host " - $($_.FullName)" }
} else {
  Write-Host "Known local .pen files under Pencil home: none"
}

if (!(Test-Path -LiteralPath $Manifest)) {
  throw "Missing manifest: $Manifest"
}

$data = Get-Content -LiteralPath $Manifest -Encoding UTF8 | ConvertFrom-Json
$missing = @()

foreach ($image in $data.images) {
  $path = Join-Path (Join-Path $ProjectRoot "designs\pencil-source") $image.file
  if (!(Test-Path -LiteralPath $path)) {
    $missing += $path
  }
}

foreach ($target in $data.exportTargets) {
  if ($target.status -eq "pending") { continue }
  $path = Join-Path $ProjectRoot $target.destination
  if (!(Test-Path -LiteralPath $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Host "Missing assets:"
  $missing | ForEach-Object { Write-Host " - $_" }
  exit 1
}

Write-Host "Asset manifest: ok"
