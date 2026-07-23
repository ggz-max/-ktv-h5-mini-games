const fs = require("fs");
const path = require("path");
const { buildDecisionSummary } = require("../server/lib/decision-summary");

const root = path.resolve(__dirname, "..");
const files = [
  "README.md",
  "research/user-research.md",
  "research/market-patterns.md",
  "product/mvp-prd.md",
  "product/content-system.md",
  "product/post-sampling-backlog.md",
  "backend/api-and-data-plan.md",
  "server/data/experiments.json",
  "server/data/report-content.json",
  "h5/index.html",
  "h5/admin.html",
  "h5/app.js",
  "designs/pencil-handoff.md",
  "designs/imagegen-review.html",
  "designs/pencil-source/asset-index.md",
  "designs/pencil-source/operator-pack.md",
  "designs/pencil-source/finalization-checklist.md",
  "designs/pencil-source/handoff-packet.md",
  "designs/pencil-source/pencil-import-checklist.csv",
  "designs/pencil-source/pencil-import-checklist.json",
  "designs/pencil-source/pencil-board-spec.md",
  "designs/pencil-source/style-approval.json",
  "designs/pencil-source/style-approval.approved-draft.json",
  "designs/pencil-source/style-approval-apply-guide.md",
  "designs/pencil-recovery-runbook.md",
  "experiments/validation-plan.md",
  "experiments/pilot-runbook.md",
  "experiments/field-sampling-playbook.md",
  "experiments/sampling-safety-sop.md",
  "docs/build-status.md",
  "docs/delivery-audit.md",
  "docs/founder-brief.md",
  "docs/launch-handoff.md",
  "docs/launch-rehearsal.md",
  "docs/objective-completion-audit.json",
  "docs/preflight-report.md",
  "docs/h5-asset-usage.md",
  "docs/pencil-readiness.md",
  "docs/pencil-connection-diagnostics.md",
  "docs/pencil-connection-diagnostics.json",
  "docs/pencil-handoff-status.md",
  "docs/pencil-handoff-status.json",
  "docs/sampling-links.md",
  "docs/runtime-review.md",
  "tools/generate-founder-brief.js",
  "tools/generate-delivery-audit.js",
  "tools/verify-delivery-audit.js",
  "tools/verify-project-text-quality.js",
  "tools/verify-founder-brief.js",
  "tools/generate-product-backlog.js",
  "tools/verify-product-backlog.js",
  "tools/generate-preflight-report.js",
  "tools/verify-preflight-report.js",
  "tools/generate-launch-rehearsal-report.js",
  "tools/verify-launch-rehearsal-report.js",
  "tools/generate-runtime-review.js",
  "tools/verify-runtime-review.js",
  "tools/verify-sampling-safety.js",
  "tools/generate-pencil-operator-pack.js",
  "tools/verify-pencil-operator-pack.js",
  "tools/generate-pencil-import-checklist.js",
  "tools/verify-pencil-import-checklist.js",
  "tools/generate-pencil-finalization-checklist.js",
  "tools/verify-pencil-finalization-checklist.js",
  "tools/generate-pencil-readiness-report.js",
  "tools/open-pencil.js",
  "tools/verify-pencil-open.js",
  "tools/generate-pencil-diagnostics-report.js",
  "tools/verify-pencil-diagnostics-report.js",
  "tools/generate-pencil-handoff-status.js",
  "tools/verify-pencil-handoff-status.js",
  "tools/watch-pencil-source.js",
  "tools/verify-pencil-source-watch.js",
  "tools/verify-pencil-readiness-report.js",
  "tools/generate-pencil-handoff-packet.js",
  "tools/verify-pencil-handoff-packet.js",
  "tools/generate-style-approval-draft.js",
  "tools/apply-style-approval-draft.js",
  "tools/verify-style-approval-draft.js",
  "tools/register-pencil-exports.js",
  "tools/verify-pencil-register-guard.js",
  "tools/verify-h5-asset-usage.js",
  "tools/verify-style-approval.js",
  "tools/browser-verify-imagegen-review.js",
  "tools/browser-verify-admin.js",
  "tools/verify-launch-api.js",
  "tools/verify-launch-readiness.js",
  "tools/verify-launch-handoff.js",
  "server/index.js",
  "server/lib/decision-summary.js"
];

const mojibakePatterns = [
  "\u9362",
  "\u9422\u71b8",
  "\u59e3\u5fd4",
  "\u93c3\u30e8",
  "\u7ecb\u5a09",
  "\u9225",
  "\u20ac?",
  "\ufffd",
  "\u9435\u52ea",
  "\u9362\u7a7a",
  "\u9359\u6220",
  "\u6d93\u20ac",
  "\u9428\u30e8",
  "\u6dc7\u6fc6",
  "\u7035\u714e",
  "\u935a\u55d8",
  "\u8930\u64b3",
  "\u93c2\u56e9",
  "\u93c2\u30e7",
  "\u93c1\u64b3",
  "\u6fb6\u6d98",
  "\u93c3\u64b3",
  "\u9359\u70d8",
  "\u93c8\u6ec3"
];

const requiredDecisionSnippets = [
  "\u4ec5\u53ef\u5185\u90e8\u8054\u8c03",
  "\u5f53\u524d runtime \u542b\u672c\u5730\u9a8c\u8bc1\u6216\u79cd\u5b50\u6570\u636e",
  "\u6b63\u5f0f\u91c7\u6837\u524d\u6267\u884c runtime \u5907\u4efd\u4e0e\u6e05\u7a7a"
];

const problems = [];

files.forEach((relativePath) => {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing file: ${relativePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, "utf8");
  mojibakePatterns.forEach((pattern) => {
    if (content.includes(pattern)) {
      problems.push(`${relativePath} contains mojibake pattern: ${pattern}`);
    }
  });
  if (/[?]{4,}/.test(content)) {
    problems.push(`${relativePath} contains suspicious question-mark replacement text`);
  }
});

const decision = buildDecisionSummary({
  events: [{ event: "verify_data_event", sessionId: "verify_data" }],
  reports: [{ source: "verify_data", entryVariant: "verify_variant" }],
  interviews: [
    {
      segment: "verify_user",
      saveReason: "\u60f3\u4fdd\u5b58\u5386\u53f2",
      appWish: "\u60f3\u8981\u72b6\u6001\u65e5\u5386"
    }
  ]
});

const serializedDecision = JSON.stringify(decision);
requiredDecisionSnippets.forEach((snippet) => {
  if (!serializedDecision.includes(snippet)) {
    problems.push(`decision summary missing readable text: ${snippet}`);
  }
});

if (problems.length) {
  console.error("Documentation quality problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log("documentation quality verify ok");
