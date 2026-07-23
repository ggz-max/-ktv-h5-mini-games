import { readdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appProjectsDir = path.join(rootDir, "app-projects");
const [projectSelector, scriptName, ...scriptArgs] = process.argv.slice(2);

if (!projectSelector || !scriptName) {
  console.error("Usage: npm run project -- <project-dir-or-package-name> <script> [args...]");
  console.error("Example: npm run project -- ktv-room-cleanup dev");
  process.exit(1);
}

const project = await findProject(projectSelector);

if (!project) {
  console.error(`Project not found: ${projectSelector}`);
  process.exit(1);
}

if (!project.packageJson.scripts?.[scriptName]) {
  const available = Object.keys(project.packageJson.scripts ?? {});
  console.error(`Script "${scriptName}" not found in ${project.dirName}.`);
  console.error(`Available scripts: ${available.length > 0 ? available.join(", ") : "none"}`);
  process.exit(1);
}

const npmBin = process.platform === "win32" ? "cmd.exe" : "npm";
const npmArgs = ["run", scriptName];

if (scriptArgs.length > 0) {
  npmArgs.push("--", ...scriptArgs);
}

const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm", ...npmArgs] : npmArgs;

const child = spawn(npmBin, args, {
  cwd: project.dirPath,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

async function findProject(selector) {
  const entries = await readdir(appProjectsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dirPath = path.join(appProjectsDir, entry.name);
    const packageJsonPath = path.join(dirPath, "package.json");

    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

      if (entry.name === selector || packageJson.name === selector) {
        return {
          dirName: entry.name,
          dirPath,
          packageJson,
        };
      }
    } catch {
      if (entry.name === selector) {
        console.error(`${entry.name} does not have a package.json, so there is no npm script to run.`);
        process.exit(1);
      }
    }
  }

  return null;
}
