const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const viteCli = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");
const distDir = path.join(rootDir, "dist");

fs.rmSync(distDir, { recursive: true, force: true });

const result = spawnSync(process.execPath, [viteCli, "build", "frontend", "--outDir", "../dist", "--emptyOutDir"], {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log("Built static app to dist/");
