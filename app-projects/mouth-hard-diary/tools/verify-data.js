const fs = require("fs");
const path = require("path");
const http = require("http");

const root = path.resolve(__dirname, "..");
const reportsPath = path.join(root, "server", "data", "runtime", "reports.jsonl");
const eventsPath = path.join(root, "server", "data", "runtime", "events.jsonl");
const interviewsPath = path.join(root, "server", "data", "runtime", "interviews.jsonl");

function request(method, requestPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: "127.0.0.1",
      port: Number(process.env.PORT || 4327),
      path: requestPath,
      method,
      headers: payload ? {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      } : {}
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  const report = await request("POST", "/api/v1/mouth-hard/reports", {
    scene: "friendship",
    style: "sarcastic",
    text: "群聊有点尴尬",
    source: "verify_data",
    campaign: "source_summary_probe",
    channel: "local_verify",
    storeId: "store_001",
    roomId: "room_009",
    entryVariant: "verify_variant",
    experimentVersion: "verify_experiment",
    configVersion: "verify_config"
  });
  const reportJson = JSON.parse(report.data);
  if (report.status !== 200 || !reportJson.reportId) {
    throw new Error("report generation failed");
  }

  const event = await request("POST", "/api/v1/events", {
    event: "verify_data_event",
    reportId: reportJson.reportId,
    payload: {
      source: "verify_data",
      campaign: "source_summary_probe",
      channel: "local_verify",
      storeId: "store_001",
      roomId: "room_009",
      entryVariant: "verify_variant",
      experimentVersion: "verify_experiment",
      configVersion: "verify_config"
    },
    sessionId: "verify_data",
    timestamp: Date.now()
  });
  if (event.status !== 200) {
    throw new Error("event write failed");
  }

  const interest = await request("POST", "/api/v1/events", {
    event: "mh_app_interest_click",
    reportId: reportJson.reportId,
    payload: {
      source: "verify_data",
      interest: "archive",
      entryVariant: "verify_variant",
      experimentVersion: "verify_experiment",
      configVersion: "verify_config"
    },
    sessionId: "verify_data",
    timestamp: Date.now()
  });
  if (interest.status !== 200) {
    throw new Error("interest event write failed");
  }

  const lead = await request("POST", "/api/v1/events", {
    event: "mh_lead_intent_click",
    reportId: reportJson.reportId,
    payload: {
      source: "verify_data",
      method: "wechat",
      entryVariant: "verify_variant",
      experimentVersion: "verify_experiment",
      configVersion: "verify_config"
    },
    sessionId: "verify_data",
    timestamp: Date.now()
  });
  if (lead.status !== 200) {
    throw new Error("lead event write failed");
  }

  const feedback = await request("POST", "/api/v1/events", {
    event: "mh_report_feedback_click",
    reportId: reportJson.reportId,
    payload: {
      source: "verify_data",
      feedback: "accurate",
      entryVariant: "verify_variant",
      experimentVersion: "verify_experiment",
      configVersion: "verify_config"
    },
    sessionId: "verify_data",
    timestamp: Date.now()
  });
  if (feedback.status !== 200) {
    throw new Error("feedback event write failed");
  }

  const share = await request("POST", "/api/v1/events", {
    event: "mh_share_click",
    reportId: reportJson.reportId,
    payload: {
      source: "verify_data",
      method: "clipboard_fallback",
      entryVariant: "verify_variant",
      experimentVersion: "verify_experiment",
      configVersion: "verify_config"
    },
    sessionId: "verify_data",
    timestamp: Date.now()
  });
  if (share.status !== 200) {
    throw new Error("share event write failed");
  }

  const regenerate = await request("POST", "/api/v1/events", {
    event: "mh_regenerate_click",
    reportId: reportJson.reportId,
    payload: {
      source: "verify_data",
      fromScreen: "result",
      entryVariant: "verify_variant",
      experimentVersion: "verify_experiment",
      configVersion: "verify_config"
    },
    sessionId: "verify_data",
    timestamp: Date.now()
  });
  if (regenerate.status !== 200) {
    throw new Error("regenerate event write failed");
  }

  const interview = await request("POST", "/api/v1/admin/interviews", {
    segment: "verify_user",
    bestLine: "太像我了",
    saveReason: "想回头看今天的状态",
    appWish: "想要精神状态日历",
    concern: "不要太像营销号"
  });
  const interviewJson = JSON.parse(interview.data);
  if (interview.status !== 200 || !interviewJson.ok || !interviewJson.interview?.interviewId) {
    throw new Error("interview write failed");
  }

  const summary = await request("GET", "/api/v1/admin/runtime-summary");
  const summaryJson = JSON.parse(summary.data);
  if (summary.status !== 200 || !summaryJson.ok || summaryJson.reports < 1 || summaryJson.events < 1) {
    throw new Error(`summary failed: ${summary.data}`);
  }
  if (!summaryJson.variantSummary || !summaryJson.variantSummary.verify_variant) {
    throw new Error("variant summary missing verify_variant");
  }
  if (!summaryJson.sourceSummary || !summaryJson.sourceSummary.verify_data) {
    throw new Error("source summary missing verify_data");
  }
  if (summaryJson.sourceSummary.verify_data.reports < 1 || summaryJson.sourceSummary.verify_data.events < 1) {
    throw new Error("source summary did not count verify_data report and event");
  }
  if (typeof summaryJson.variantSummary.verify_variant.shareRate !== "number" || typeof summaryJson.variantSummary.verify_variant.regenerateRate !== "number") {
    throw new Error("variant summary missing conversion rates");
  }
  if (typeof summaryJson.sourceSummary.verify_data.shareRate !== "number" || typeof summaryJson.sourceSummary.verify_data.leadIntentRate !== "number") {
    throw new Error("source summary missing conversion rates");
  }
  if (!summaryJson.funnelSummary || typeof summaryJson.funnelSummary.reports !== "number") {
    throw new Error("summary missing funnel summary");
  }
  if (!summaryJson.appInterestSummary || !summaryJson.appInterestSummary.archive) {
    throw new Error("summary missing app interest archive");
  }
  if (!summaryJson.leadSummary || !summaryJson.leadSummary.wechat) {
    throw new Error("summary missing lead wechat");
  }
  if (!summaryJson.funnelSummary || !summaryJson.funnelSummary.leadIntents) {
    throw new Error("summary missing lead funnel metric");
  }
  if (!summaryJson.feedbackSummary || !summaryJson.feedbackSummary.accurate) {
    throw new Error("summary missing feedback accurate");
  }
  if (!summaryJson.funnelSummary || !summaryJson.funnelSummary.regenerates) {
    throw new Error("summary missing regenerate funnel metric");
  }
  if (!summaryJson.funnelSummary || !summaryJson.funnelSummary.shares) {
    throw new Error("summary missing share funnel metric");
  }
  if (!Array.isArray(summaryJson.latestInterviews) || !summaryJson.latestInterviews.some((item) => item.segment === "verify_user")) {
    throw new Error("summary missing interview");
  }
  if (!summaryJson.decisionSummary || summaryJson.decisionSummary.verdict !== "internal_only") {
    throw new Error("summary missing internal-only decision for verify data");
  }

  const exported = await request("GET", "/api/v1/admin/runtime-export?limit=5000");
  const exportJson = JSON.parse(exported.data);
  if (exported.status !== 200 || !exportJson.ok || !exportJson.exportedAt) {
    throw new Error(`runtime export failed: ${exported.data}`);
  }
  if (!Array.isArray(exportJson.reports) || !Array.isArray(exportJson.events) || !Array.isArray(exportJson.interviews)) {
    throw new Error("runtime export missing report/event/interview arrays");
  }
  if (!exportJson.reports.some((item) => item.reportId === reportJson.reportId)) {
    throw new Error("runtime export missing generated report");
  }
  if (!exportJson.summary || !exportJson.summary.sourceSummary || !exportJson.summary.sourceSummary.verify_data) {
    throw new Error("runtime export missing source summary");
  }
  if (!exportJson.samplingLinks || !Array.isArray(exportJson.samplingLinks.links) || exportJson.samplingLinks.links.length < 8) {
    throw new Error("runtime export missing sampling link snapshot");
  }
  if (!exportJson.summary.decisionSummary || !exportJson.summary.decisionSummary.hasVerificationData) {
    throw new Error("runtime export missing decision summary");
  }
  if (!exportJson.tables || !exportJson.tables.eventCounts || !exportJson.tables.variantSummary || !exportJson.tables.sourceSummary) {
    throw new Error("runtime export missing csv tables");
  }
  if (!exportJson.tables.funnelSummary || !exportJson.tables.funnelSummary.includes("generate_success")) {
    throw new Error("runtime export missing funnel csv");
  }
  if (!exportJson.tables.funnelSummary.includes("regenerate_click")) {
    throw new Error("runtime export missing regenerate funnel csv");
  }
  if (!exportJson.tables.funnelSummary.includes("share_click")) {
    throw new Error("runtime export missing share funnel csv");
  }
  if (!exportJson.tables.appInterestSummary || !exportJson.tables.appInterestSummary.includes("archive")) {
    throw new Error("runtime export missing app interest csv");
  }
  if (!exportJson.tables.leadSummary || !exportJson.tables.leadSummary.includes("wechat")) {
    throw new Error("runtime export missing lead csv");
  }
  if (!exportJson.tables.feedbackSummary || !exportJson.tables.feedbackSummary.includes("accurate")) {
    throw new Error("runtime export missing feedback csv");
  }
  if (!exportJson.tables.interviews || !exportJson.tables.interviews.includes("verify_user")) {
    throw new Error("runtime export missing interviews csv");
  }
  if (!exportJson.tables.samplingLinks || !exportJson.tables.samplingLinks.includes("room_qr") || !exportJson.tables.samplingLinks.includes("seed_group")) {
    throw new Error("runtime export missing sampling links csv");
  }
  if (!exportJson.tables.sourceSummary.includes("verify_data")) {
    throw new Error("runtime export source csv missing verify_data");
  }
  if (!exportJson.tables.variantSummary.includes("shareRate") || !exportJson.tables.variantSummary.includes("regenerateRate")) {
    throw new Error("runtime export variant csv missing conversion rates");
  }
  if (!exportJson.tables.sourceSummary.includes("shareRate") || !exportJson.tables.sourceSummary.includes("leadIntentRate")) {
    throw new Error("runtime export source csv missing conversion rates");
  }

  if (!fs.existsSync(reportsPath) || !fs.readFileSync(reportsPath, "utf8").includes(reportJson.reportId)) {
    throw new Error("reports jsonl missing generated report");
  }
  if (!fs.existsSync(eventsPath) || !fs.readFileSync(eventsPath, "utf8").includes("verify_data_event")) {
    throw new Error("events jsonl missing generated event");
  }
  if (!fs.existsSync(interviewsPath) || !fs.readFileSync(interviewsPath, "utf8").includes("verify_user")) {
    throw new Error("interviews jsonl missing generated interview");
  }

  console.log(`data verify ok: reports=${summaryJson.reports}, events=${summaryJson.events}, source=verify_data`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
