const fs = require("fs");
const path = require("path");
const { buildDecisionSummary } = require("../server/lib/decision-summary");

const root = path.resolve(__dirname, "..");
const runtimeDir = path.join(root, "server", "data", "runtime");
const reportsPath = path.join(runtimeDir, "reports.jsonl");
const eventsPath = path.join(runtimeDir, "events.jsonl");
const interviewsPath = path.join(runtimeDir, "interviews.jsonl");
const manifestPath = path.join(root, "designs", "pencil-source", "image-manifest.json");
const styleApprovalPath = path.join(root, "designs", "pencil-source", "style-approval.json");
const samplingLinksPath = path.join(root, "docs", "sampling-links.generated.json");
const outputPath = path.join(root, "docs", "founder-brief.md");

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      return { malformed: true, raw: line };
    }
  });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function rate(value, base) {
  return base > 0 ? Number((value / base).toFixed(4)) : 0;
}

function pct(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function topEntries(counts, limit = 4) {
  return Object.entries(counts || {}).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function buildFunnel(events, reports) {
  const eventCounts = countBy(events, (item) => item.event);
  const reportsCount = reports.length;
  return {
    eventCounts,
    homeViews: eventCounts.mh_home_view || 0,
    starts: eventCounts.mh_start_click || 0,
    submits: eventCounts.mh_text_submit || 0,
    generated: eventCounts.mh_generate_success || 0,
    saves: eventCounts.mh_save_click || 0,
    shares: eventCounts.mh_share_click || 0,
    appCtas: eventCounts.mh_app_cta_click || 0,
    leadIntents: eventCounts.mh_lead_intent_click || 0,
    regenerates: eventCounts.mh_regenerate_click || 0,
    saveRate: rate(eventCounts.mh_save_click || 0, reportsCount),
    shareRate: rate(eventCounts.mh_share_click || 0, reportsCount),
    appCtaRate: rate(eventCounts.mh_app_cta_click || 0, reportsCount),
    leadIntentRate: rate(eventCounts.mh_lead_intent_click || 0, reportsCount),
    regenerateRate: rate(eventCounts.mh_regenerate_click || 0, reportsCount)
  };
}

function buildVariantRows(events, reports) {
  const variants = {};
  events.forEach((item) => {
    const key = item.payload?.entryVariant || item.entryVariant || "unknown";
    variants[key] ||= { starts: 0, reports: 0, shares: 0, regenerates: 0 };
    if (item.event === "mh_start_click") variants[key].starts += 1;
    if (item.event === "mh_share_click") variants[key].shares += 1;
    if (item.event === "mh_regenerate_click") variants[key].regenerates += 1;
  });
  reports.forEach((item) => {
    const key = item.entryVariant || "unknown";
    variants[key] ||= { starts: 0, reports: 0, shares: 0, regenerates: 0 };
    variants[key].reports += 1;
  });
  return Object.entries(variants)
    .sort((a, b) => (b[1].starts + b[1].reports) - (a[1].starts + a[1].reports))
    .slice(0, 6)
    .map(([variant, stats]) => [
      variant,
      stats.starts,
      stats.reports,
      pct(rate(stats.shares, stats.reports)),
      pct(rate(stats.regenerates, stats.reports))
    ]);
}

function generate() {
  const reports = readJsonl(reportsPath);
  const events = readJsonl(eventsPath);
  const interviews = readJsonl(interviewsPath);
  const manifest = readJson(manifestPath, { exportTargets: [] });
  const styleApproval = readJson(styleApprovalPath, {});
  const samplingLinks = readJson(samplingLinksPath, { version: "missing", links: [] });
  const funnel = buildFunnel(events, reports);
  const appInterestSummary = countBy(events.filter((item) => item.event === "mh_app_interest_click"), (item) => item.payload?.interest);
  const leadSummary = countBy(events.filter((item) => item.event === "mh_lead_intent_click"), (item) => item.payload?.method);
  const feedbackSummary = countBy(events.filter((item) => item.event === "mh_report_feedback_click"), (item) => item.payload?.feedback);
  const decisionSummary = buildDecisionSummary({
    events,
    reports,
    interviews,
    summary: {
      eventCounts: funnel.eventCounts,
      funnelSummary: funnel,
      appInterestSummary,
      leadSummary,
      feedbackSummary
    }
  });
  const pendingExports = (manifest.exportTargets || []).filter((item) => item.status !== "pencil_exported");
  const styleApproved = styleApproval.status === "approved" && Boolean(styleApproval.approvedBy) && Boolean(styleApproval.approvedAt);
  const pencilSourceExists = Boolean(manifest.pencilFile && fs.existsSync(path.join(root, manifest.pencilFile)));

  const lines = [
    "# Founder Brief: Mouth Hard Diary",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Decision",
    "",
    table(["item", "value"], [
      ["verdict", `${decisionSummary.label} / ${decisionSummary.verdict}`],
      ["confidence", decisionSummary.confidence],
      ["sample", `reports=${reports.length}, events=${events.length}, interviews=${interviews.length}`],
      ["save/share/regenerate/appCta", `${pct(funnel.saveRate)} / ${pct(funnel.shareRate)} / ${pct(funnel.regenerateRate)} / ${pct(funnel.appCtaRate)}`],
      ["interest leader", decisionSummary.interestLeader.key ? `${decisionSummary.interestLeader.key} (${pct(decisionSummary.interestLeader.share)})` : "-"],
      ["launch mode", decisionSummary.hasVerificationData ? "internal_only" : "eligible_after_gates"]
    ]),
    "",
    "## User Thesis",
    "",
    "- Young users do not want a clinical mood tracker; they want a funny, saveable emotional translation.",
    "- The H5 should prove save/share/replay first. A standalone App only makes sense after history, calendar, persona atlas, or style demand appears in behavior and interviews.",
    "- KTV is one acquisition surface, not the product boundary. Social and shareback links are equally important in sampling.",
    "",
    "## Evidence",
    "",
    table(["signal", "value"], [
      ["reports", reports.length],
      ["events", events.length],
      ["interviews", interviews.length],
      ["share rate", pct(funnel.shareRate)],
      ["regenerate rate", pct(funnel.regenerateRate)],
      ["lead intent rate", pct(funnel.leadIntentRate)],
      ["accurate feedback", feedbackSummary.accurate || 0],
      ["uncomfortable feedback", feedbackSummary.uncomfortable || 0]
    ]),
    "",
    "## Entry Variants",
    "",
    table(["variant", "starts", "reports", "shareRate", "regenerateRate"], buildVariantRows(events, reports)),
    "",
    "## App Direction",
    "",
    table(["interest", "clicks"], topEntries(appInterestSummary)),
    "",
    table(["lead method", "clicks"], topEntries(leadSummary)),
    "",
    "## Sampling Plan",
    "",
    table(["item", "value"], [
      ["link pack", samplingLinks.version || "missing"],
      ["links", (samplingLinks.links || []).length],
      ["cohorts", [...new Set((samplingLinks.links || []).map((item) => item.cohortId))].join(", ") || "-"]
    ]),
    "",
    "## UI / Pencil Status",
    "",
    table(["gate", "status", "detail"], [
      ["style approval", styleApproved ? "ok" : "blocked", styleApproved ? `${styleApproval.approvedBy} @ ${styleApproval.approvedAt}` : `status=${styleApproval.status || "missing"}`],
      ["Pencil source", pencilSourceExists ? "ok" : "blocked", pencilSourceExists ? manifest.pencilFile : `missing: ${manifest.pencilFile || "unset"}`],
      ["Pencil exports", pendingExports.length ? "blocked" : "ok", pendingExports.length ? pendingExports.map((item) => `${item.name}:${item.status || "unknown"}`).join(", ") : "ready"]
    ]),
    "",
    table(["asset", "status", "destination"], (manifest.exportTargets || []).map((item) => [
      item.name,
      item.status,
      item.destination
    ])),
    "",
    (!styleApproved || !pencilSourceExists || pendingExports.length)
      ? `Pencil gate is not complete: style=${styleApproval.status || "missing"}, source=${pencilSourceExists ? "exists" : "missing"}, exports=${pendingExports.map((item) => `${item.name}:${item.status}`).join(", ") || "ready"}.`
      : "Pencil gate is complete.",
    "",
    "## Next Moves",
    "",
    ...decisionSummary.blockers.map((item) => `- Blocker: ${item}`),
    ...decisionSummary.nextActions.map((item) => `- Action: ${item}`),
    "- Action: Keep Pencil as the source of truth for UI images; do not treat temporary H5 preview files as launch assets.",
    "- Action: Use the sampling link pack for every real traffic source so source/campaign/channel remain comparable.",
    "- Action: Read product/post-sampling-backlog.md for the next build sequence after sampling.",
    ""
  ];

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
  return { outputPath, reports: reports.length, events: events.length, interviews: interviews.length };
}

const result = generate();
console.log(`founder brief ok: reports=${result.reports}, events=${result.events}, interviews=${result.interviews}`);
console.log(result.outputPath);
