const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const distDir = path.join(rootDir, "dist");

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(path.join(frontendDir, "index.html"), path.join(distDir, "index.html"));
copyDir(path.join(frontendDir, "src"), path.join(distDir, "src"));
copyDir(path.join(frontendDir, "public"), distDir);

console.log(`Static build written to ${distDir}`);
