import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appProjectsDir = path.join(rootDir, "app-projects");

const entries = await readdir(appProjectsDir, { withFileTypes: true });
const projects = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

for (const projectDirName of projects) {
  const packageJsonPath = path.join(appProjectsDir, projectDirName, "package.json");

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
    const scripts = Object.keys(packageJson.scripts ?? {});

    console.log(`${projectDirName}${packageJson.name ? ` (${packageJson.name})` : ""}`);
    console.log(`  scripts: ${scripts.length > 0 ? scripts.join(", ") : "none"}`);
  } catch {
    console.log(projectDirName);
    console.log("  scripts: none");
  }
}
