const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const viteCli = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");
const distDir = path.join(rootDir, "dist");

function copyDirectory(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return;
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(source, target);
    } else {
      fs.copyFileSync(source, target);
    }
  }
}

fs.rmSync(distDir, { recursive: true, force: true });

const result = spawnSync(process.execPath, [viteCli, "build", "frontend", "--outDir", "../dist", "--emptyOutDir"], {
  cwd: rootDir,
  stdio: "inherit",
  env: { ...process.env, VITE_API_BASE: process.env.VITE_API_BASE || "" }
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

fs.mkdirSync(path.join(distDir, "config"), { recursive: true });
fs.copyFileSync(path.join(rootDir, "shared", "game-config.json"), path.join(distDir, "config", "game-config.json"));
copyDirectory(path.join(rootDir, "frontend", "assets"), path.join(distDir, "assets"));

console.log("Built static app to dist/");
