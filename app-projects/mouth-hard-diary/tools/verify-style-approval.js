const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const approvalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const requireFinalApproval = process.env.FINAL_PENCIL_EXPORTS === "1" || process.env.FINAL_STYLE_APPROVAL === "1";
const mojibake = /[\u9362\u9422\u71b8\u59e3\u93c3\u30e8\u7ecb\u5a09\u9225\u9435\u52ea\u9359\u6220\u6d93\u9428\u6dc7\u6fc6\u7035\u714e\u935a\u55d8\u8930\u64b3\u93c2\u56e9\u93c1\u6fb6\u6d98\u93c8\u6ec3\ufffd]/;
const problems = [];

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing ${label}: ${path.relative(root, filePath)}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const manifest = readJson(manifestPath, "image manifest");
const approval = readJson(approvalPath, "style approval");

function requireField(value, label) {
  if (!value) problems.push(`Missing ${label}`);
}

function requireReadableText(value, label) {
  if (!value) {
    problems.push(`Missing ${label}`);
    return;
  }
  if (mojibake.test(String(value)) || String(value).includes("鈧?") || /[?]{4,}/.test(String(value))) {
    problems.push(`${label} contains mojibake text`);
  }
}

if (manifest && approval) {
  requireField(approval.project, "approval.project");
  requireField(approval.status, "approval.status");
  requireField(approval.reviewPage, "approval.reviewPage");
  requireField(approval.pencilFile, "approval.pencilFile");
  requireReadableText(approval.directionName, "approval.directionName");
  requireReadableText(approval.decisionSummary, "approval.decisionSummary");

  if (approval.project !== manifest.project) {
    problems.push(`Approval project ${approval.project} does not match manifest project ${manifest.project}`);
  }
  if (approval.pencilFile !== manifest.pencilFile) {
    problems.push(`Approval pencil file ${approval.pencilFile} does not match manifest ${manifest.pencilFile}`);
  }
  if (!fs.existsSync(path.join(root, approval.reviewPage || ""))) {
    problems.push(`Approval review page is missing: ${approval.reviewPage}`);
  }
  if (!Array.isArray(approval.confirmationQuestions) || approval.confirmationQuestions.length < 5) {
    problems.push("Approval must include at least five confirmation questions");
  }
  (approval.confirmationQuestions || []).forEach((question, index) => {
    requireReadableText(question, `approval.confirmationQuestions[${index}]`);
  });
  [
    "深夜便利贴 + 霓虹批注",
    "首页底板",
    "整体是否太暗",
    "发疯感是否足够",
    "结果卡是否值得保存或分享"
  ].forEach((snippet) => {
    const serializedApproval = JSON.stringify(approval);
    if (!serializedApproval.includes(snippet)) {
      problems.push(`Approval missing readable style snippet: ${snippet}`);
    }
  });
  if (!Array.isArray(approval.selectedSources) || approval.selectedSources.length < 1) {
    problems.push("Approval selectedSources must be a non-empty array");
  }

  const manifestSources = new Map((manifest.images || []).map((image) => [image.file, image]));
  const seenSources = new Set();
  (approval.selectedSources || []).forEach((source) => {
    requireField(source.file, "selected source file");
    requireField(source.role, `selected source role for ${source.file}`);
    requireField(source.sha256, `selected source sha256 for ${source.file}`);
    requireField(source.decision, `selected source decision for ${source.file}`);
    seenSources.add(source.file);

    const manifestSource = manifestSources.get(source.file);
    if (!manifestSource) {
      problems.push(`Approval references source not in manifest: ${source.file}`);
      return;
    }
    if (source.role !== manifestSource.role) {
      problems.push(`Approval role mismatch for ${source.file}: ${source.role} vs ${manifestSource.role}`);
    }
    if (source.sha256 !== manifestSource.sha256) {
      problems.push(`Approval sha256 mismatch for ${source.file}: ${source.sha256} vs ${manifestSource.sha256}`);
    }
    if (!["use", "reserve", "reject"].includes(source.decision)) {
      problems.push(`Approval decision must be use, reserve, or reject for ${source.file}`);
    }
  });

  (manifest.images || []).forEach((image) => {
    if (!seenSources.has(image.file)) {
      problems.push(`Approval is missing manifest source: ${image.file}`);
    }
  });

  if (requireFinalApproval) {
    if (approval.status !== "approved") {
      problems.push(`Final style approval required, but status is ${approval.status || "unknown"}`);
    }
    requireField(approval.approvedBy, "approval.approvedBy");
    requireField(approval.approvedAt, "approval.approvedAt");
    if (approval.approvedAt && Number.isNaN(Date.parse(approval.approvedAt))) {
      problems.push(`approval.approvedAt must be ISO-like date, got ${approval.approvedAt}`);
    }
    const usableCount = (approval.selectedSources || []).filter((source) => source.decision === "use").length;
    if (usableCount < 4) {
      problems.push(`Final approval should select at least four usable sources, got ${usableCount}`);
    }
  }
}

if (problems.length) {
  console.error("Style approval problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`style approval verify ok: ${approval.selectedSources.length} sources, status=${approval.status}`);
