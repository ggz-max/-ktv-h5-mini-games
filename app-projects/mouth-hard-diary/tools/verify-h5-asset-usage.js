const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const outputPath = path.join(root, "docs", "h5-asset-usage.md");
const h5Dir = path.join(root, "h5");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const problems = [];

function listFiles(dir, collected = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(fullPath, collected);
      return;
    }
    collected.push(fullPath);
  });
  return collected;
}

function normalizeForH5(destination) {
  return destination.replace(/^h5\//, "./").replace(/\\/g, "/");
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

const h5TextFiles = listFiles(h5Dir).filter((file) => /\.(html|css|js)$/i.test(file));
const fileContents = h5TextFiles.map((file) => ({
  file,
  relative: path.relative(root, file).replace(/\\/g, "/"),
  content: fs.readFileSync(file, "utf8")
}));
const combined = fileContents.map((item) => item.content).join("\n");

(manifest.images || []).forEach((image) => {
  const sourceName = path.basename(image.file || "");
  if (sourceName && combined.includes(sourceName)) {
    problems.push(`H5 references source image directly: ${sourceName}`);
  }
  if (combined.includes("designs/pencil-source") || combined.includes("-image2")) {
    problems.push("H5 contains forbidden source asset marker: designs/pencil-source or -image2");
  }
});

const usageRows = (manifest.exportTargets || []).map((target) => {
  const expectedReference = normalizeForH5(target.destination || "");
  const references = fileContents
    .filter((item) => item.content.includes(expectedReference))
    .map((item) => item.relative);
  const runtimeUsage = target.runtimeUsage || "required";
  if (runtimeUsage === "required" && references.length === 0) {
    problems.push(`Required Pencil export is not referenced by H5: ${target.destination}`);
  }
  if (!target.destination || !target.destination.startsWith(manifest.runtimeExportRoot || "")) {
    problems.push(`Export target must stay under runtime export root: ${target.destination || target.name}`);
  }
  return [
    target.name || "",
    `\`${target.destination || ""}\``,
    runtimeUsage,
    references.length ? references.map((file) => `\`${file}\``).join(", ") : "-",
    target.status || "unknown"
  ];
});

const lines = [
  "# H5 Asset Usage",
  "",
  "This report proves which Pencil runtime exports are referenced by the H5 surface. It is generated from `image-manifest.json` plus the H5 HTML/CSS/JS files.",
  "",
  "## Runtime Export Usage",
  "",
  table(["Export", "Destination", "Runtime usage", "H5 references", "Manifest status"], usageRows),
  "",
  "## Guardrails",
  "",
  "- H5 must not reference `designs/pencil-source/`.",
  "- H5 must not reference `source-*-image2.png`.",
  "- Required runtime exports must be referenced from `h5/assets/visuals/pencil-export/`.",
  "- Optional future exports may be declared before the UI uses them.",
  ""
];

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

if (problems.length) {
  console.error("H5 asset usage problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`h5 asset usage verify ok: ${usageRows.length} exports`);
console.log(path.relative(root, outputPath));
