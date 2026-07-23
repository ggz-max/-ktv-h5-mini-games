const { spawn } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const viteCli = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");

const children = [
  spawn(process.execPath, ["backend/server.js"], {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, PORT: process.env.PORT || "4308" }
  }),
  spawn(process.execPath, [viteCli, "frontend", "--host", "127.0.0.1", "--port", "5308", "--clearScreen=false"], {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, VITE_API_BASE: process.env.VITE_API_BASE || "http://127.0.0.1:4308" }
  })
];

function shutdown(signal) {
  for (const child of children) child.kill(signal);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const child of children) {
  child.on("exit", code => {
    if (code && code !== 0) {
      shutdown("SIGTERM");
    }
  });
}
