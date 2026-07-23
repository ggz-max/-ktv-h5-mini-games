const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const h5Dir = path.join(root, "h5");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const missing = [];
const problems = [];
const allowedExportRoot = "h5/assets/visuals/pencil-export/";
const requireFinalPencilExports = process.env.FINAL_PENCIL_EXPORTS === "1";
const pencilFilePath = path.join(root, manifest.pencilFile || "");

function pngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function checkPngSize(filePath, expectedWidth, expectedHeight, label) {
  if (!expectedWidth || !expectedHeight) return;
  const size = pngSize(filePath);
  if (!size) {
    problems.push(`Expected PNG but could not read dimensions: ${label}`);
    return;
  }
  if (size.width !== expectedWidth || size.height !== expectedHeight) {
    problems.push(`${label} expected ${expectedWidth}x${expectedHeight}, got ${size.width}x${size.height}`);
  }
}

function checkFileFingerprint(filePath, expectedByteSize, expectedSha256, label) {
  if (!expectedByteSize && !expectedSha256) return;
  const buffer = fs.readFileSync(filePath);
  if (expectedByteSize && buffer.length !== expectedByteSize) {
    problems.push(`${label} expected ${expectedByteSize} bytes, got ${buffer.length}`);
  }
  if (expectedSha256) {
    const actualSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    if (actualSha256 !== expectedSha256) {
      problems.push(`${label} expected sha256 ${expectedSha256}, got ${actualSha256}`);
    }
  }
}

manifest.images.forEach((image) => {
  const fullPath = path.join(root, "designs", "pencil-source", image.file);
  if (!fs.existsSync(fullPath)) {
    missing.push(fullPath);
    return;
  }
  checkPngSize(fullPath, image.width, image.height, image.file);
  checkFileFingerprint(fullPath, image.byteSize, image.sha256, image.file);
});

manifest.exportTargets.forEach((target) => {
  if (!target.destination || !target.destination.startsWith(allowedExportRoot)) {
    problems.push(`Export target must stay under ${allowedExportRoot}: ${target.name || target.destination}`);
  }
  if (requireFinalPencilExports && target.status !== "pencil_exported") {
    problems.push(`Final Pencil export required, but ${target.name} is ${target.status || "unknown"}`);
  }
  if (target.status === "pending") return;
  const fullPath = path.join(root, target.destination);
  if (!fs.existsSync(fullPath)) {
    missing.push(fullPath);
    return;
  }
  checkPngSize(fullPath, target.expectedWidth, target.expectedHeight, target.destination);
});

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

const h5TextFiles = listFiles(h5Dir).filter((file) => /\.(html|css|js)$/i.test(file));
h5TextFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("designs/pencil-source") || content.includes("source-") || content.includes("-image2")) {
    problems.push(`H5 must not reference image2 source assets directly: ${path.relative(root, file)}`);
  }
});

const exportDestinations = new Set(manifest.exportTargets.map((target) => target.destination));
const exportDir = path.join(root, allowedExportRoot);
if (fs.existsSync(exportDir)) {
  fs.readdirSync(exportDir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .forEach((name) => {
      const destination = `${allowedExportRoot}${name}`;
      if (!exportDestinations.has(destination)) {
        problems.push(`Runtime Pencil export is not declared in manifest: ${destination}`);
      }
    });
}

if (manifest.status !== "pending_pencil_import" && !fs.existsSync(pencilFilePath)) {
  problems.push(`Manifest status is ${manifest.status}, but pencil file is missing: ${manifest.pencilFile}`);
}

if (requireFinalPencilExports) {
  if (!manifest.pencilFile || !fs.existsSync(pencilFilePath)) {
    problems.push(`Final Pencil export required, but pencil source file is missing: ${manifest.pencilFile || "unset"}`);
  }
  if (manifest.status !== "pencil_exported") {
    problems.push(`Final Pencil export required, but manifest status is ${manifest.status || "unknown"}`);
  }
}

if (missing.length) {
  console.error("Missing asset files:");
  missing.forEach((file) => console.error(file));
  process.exit(1);
}

if (problems.length) {
  console.error("Asset workflow problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

const temporaryCount = manifest.exportTargets.filter((target) => target.status === "temporary_preview").length;
console.log(`asset verify ok: ${manifest.images.length} source images, ${manifest.exportTargets.length} export targets, h5 references guarded, temporary=${temporaryCount}`);
