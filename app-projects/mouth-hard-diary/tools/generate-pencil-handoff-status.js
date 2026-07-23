const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const reportPath = path.join(root, "docs", "pencil-handoff-status.md");
const jsonPath = path.join(root, "docs", "pencil-handoff-status.json");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function pngSize(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function buildState() {
  const manifest = readJson(manifestPath, { images: [], exportTargets: [] });
  const approval = readJson(approvalPath, {});
  const pencilPath = path.join(root, manifest.pencilFile || "designs/pencil-source/mouth-hard-diary.pen");
  const pencilExists = fs.existsSync(pencilPath);
  const styleApproved = approval.status === "approved" && Boolean(approval.approvedBy) && Boolean(approval.approvedAt);
  const exportTargets = (manifest.exportTargets || []).map((target) => {
    const filePath = path.join(root, target.destination || "");
    const size = pngSize(filePath);
    const sizeOk = size && size.width === target.expectedWidth && size.height === target.expectedHeight;
    return {
      name: target.name || "",
      destination: target.destination || "",
      sourceBoard: target.sourceBoard || "",
      expectedNodeName: target.expectedNodeName || "",
      expectedWidth: target.expectedWidth || 0,
      expectedHeight: target.expectedHeight || 0,
      runtimeUsage: target.runtimeUsage || "required",
      manifestStatus: target.status || "",
      exists: fs.existsSync(filePath),
      actualWidth: size ? size.width : null,
      actualHeight: size ? size.height : null,
      sizeOk: Boolean(sizeOk),
      ready: Boolean(sizeOk && target.status === "pencil_exported")
    };
  });
  const requiredExportsReady = exportTargets
    .filter((target) => target.runtimeUsage === "required")
    .every((target) => target.exists && target.sizeOk && target.manifestStatus === "pencil_exported");
  const allExportsReady = exportTargets
    .every((target) => target.exists && target.sizeOk && target.manifestStatus === "pencil_exported");

  let nextAction = "Save the project source from Pencil to designs/pencil-source/mouth-hard-diary.pen.";
  if (pencilExists && !styleApproved) {
    nextAction = "Use the Pencil boards for visual review, then generate and apply the style approval draft.";
  } else if (pencilExists && styleApproved && !requiredExportsReady) {
    nextAction = "Export the required Pencil PNGs into h5/assets/visuals/pencil-export/ and run npm run pencil:register-exports.";
  } else if (pencilExists && styleApproved && requiredExportsReady && !allExportsReady) {
    nextAction = "Export or intentionally defer optional targets, then run final asset gates.";
  } else if (pencilExists && styleApproved && allExportsReady && manifest.status === "pencil_exported") {
    nextAction = "Pencil asset chain is ready; continue with runtime cleanup before launch.";
  }

  return {
    generatedAt: new Date().toISOString(),
    manifestStatus: manifest.status || "",
    pencilFile: manifest.pencilFile || "",
    pencilPath,
    pencilExists,
    styleStatus: approval.status || "",
    styleApproved,
    approvedBy: approval.approvedBy || "",
    approvedAt: approval.approvedAt || "",
    exportTargets,
    requiredExportsReady,
    allExportsReady,
    nextAction
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
  const exportRows = state.exportTargets.map((target) => [
    target.name,
    target.sourceBoard || "-",
    target.expectedNodeName ? `\`${target.expectedNodeName}\`` : "-",
    `\`${target.destination}\``,
    `${target.expectedWidth} x ${target.expectedHeight}`,
    target.exists ? `${target.actualWidth} x ${target.actualHeight}` : "missing",
    target.manifestStatus || "-",
    target.ready ? "ready" : "not ready"
  ]);

  return `# Pencil Handoff Status

Last generated: ${state.generatedAt}

This report is the live checkpoint after Pencil has been opened. It does not create, parse, or edit \`.pen\` files.

## Gate Summary

| Gate | State |
| --- | --- |
| Project .pen exists | ${state.pencilExists ? "yes" : "no"} |
| Style approved from Pencil boards | ${state.styleApproved ? "yes" : "no"} |
| Required Pencil exports ready | ${state.requiredExportsReady ? "yes" : "no"} |
| All declared Pencil exports ready | ${state.allExportsReady ? "yes" : "no"} |
| Manifest status | ${state.manifestStatus || "-"} |

Next action: ${state.nextAction}

## Project Source

- Manifest file: \`${rel(manifestPath)}\`
- Pencil source: \`${state.pencilFile}\`
- Absolute target: \`${state.pencilPath}\`
- Exists: ${state.pencilExists ? "yes" : "no"}

## Style Approval

- Status: ${state.styleStatus || "-"}
- Approved by: ${state.approvedBy || "-"}
- Approved at: ${state.approvedAt || "-"}

## Export Targets

${table(["Name", "Board", "Node", "Runtime file", "Expected", "Actual", "Manifest status", "Ready"], exportRows)}

## Command Ladder

1. While saving from Pencil, optionally keep \`npm run pencil:watch-source\` running in a terminal.
2. After saving the \`.pen\`: \`npm run pencil:handoff-status\`.
3. After Pencil-board style confirmation: \`npm run style:approval-draft -- --by=YOUR_NAME --notes=\"Confirmed from Pencil boards.\"\`.
4. Review and apply: \`npm run verify:style-approval-draft\`, then \`node tools/apply-style-approval-draft.js --yes\`.
5. After exporting PNGs from Pencil: \`npm run pencil:register-exports\`.
6. If dry-run is clean: \`npm run pencil:register-exports -- --yes\`.
7. Final asset checks: \`npm run verify:style-approval:final\` and \`npm run verify:assets:final\`.
`;
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const state = buildState();
  const md = markdown(state);
  if (checkOnly) {
    if (!fs.existsSync(reportPath) || !fs.existsSync(jsonPath)) {
      throw new Error("Pencil handoff status is missing; run npm run pencil:handoff-status");
    }
    const existing = fs.readFileSync(reportPath, "utf8");
    const normalize = (text) => text.replace(/Last generated: .+/, "Last generated: <time>");
    if (normalize(existing) !== normalize(md)) {
      throw new Error("Pencil handoff status is stale; run npm run pencil:handoff-status");
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
