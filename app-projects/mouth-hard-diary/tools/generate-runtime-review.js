const fs = require("fs");
const path = require("path");
const { buildDecisionSummary } = require("../server/lib/decision-summary");

const root = path.resolve(__dirname, "..");
const runtimeDir = path.join(root, "server", "data", "runtime");
const reportsPath = path.join(runtimeDir, "reports.jsonl");
const eventsPath = path.join(runtimeDir, "events.jsonl");
const interviewsPath = path.join(runtimeDir, "interviews.jsonl");
const outputPath = path.join(root, "docs", "runtime-review.md");
const samplingLinksPath = path.join(root, "docs", "sampling-links.generated.json");

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return { malformed: true, raw: line };
      }
    });
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function pct(value, base) {
  if (!base) return "0.0%";
  return `${(value / base * 100).toFixed(1)}%`;
}

function cappedPct(value, base) {
  if (!base) return "0.0%";
  return `${(Math.min(value / base, 1) * 100).toFixed(1)}%`;
}

function topRows(counts, limit = 6) {
  return Object.entries(counts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function readSamplingLinks() {
  if (!fs.existsSync(samplingLinksPath)) {
    return { version: "missing", baseUrl: "", links: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(samplingLinksPath, "utf8"));
  } catch (error) {
    return { version: "malformed", baseUrl: "", links: [] };
  }
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function buildVariantStats(events, reports) {
  const stats = {};
  events.forEach((item) => {
    const variant = item.payload?.entryVariant || item.entryVariant || "unknown";
    stats[variant] ||= { events: 0, starts: 0, reports: 0, saves: 0, shares: 0, appCtas: 0, regenerates: 0 };
    stats[variant].events += 1;
    if (item.event === "mh_start_click") stats[variant].starts += 1;
    if (item.event === "mh_save_click") stats[variant].saves += 1;
    if (item.event === "mh_share_click") stats[variant].shares += 1;
    if (item.event === "mh_app_cta_click") stats[variant].appCtas += 1;
    if (item.event === "mh_regenerate_click") stats[variant].regenerates += 1;
  });
  reports.forEach((item) => {
    const variant = item.entryVariant || "unknown";
    stats[variant] ||= { events: 0, starts: 0, reports: 0, saves: 0, shares: 0, appCtas: 0, regenerates: 0 };
    stats[variant].reports += 1;
  });
  return stats;
}

function buildSourceStats(events, reports) {
  const stats = {};
  events.forEach((item) => {
    const source = item.payload?.source || item.source || "unknown";
    stats[source] ||= { events: 0, starts: 0, reports: 0, shares: 0, leadIntents: 0, regenerates: 0 };
    stats[source].events += 1;
    if (item.event === "mh_start_click") stats[source].starts += 1;
    if (item.event === "mh_share_click") stats[source].shares += 1;
    if (item.event === "mh_lead_intent_click") stats[source].leadIntents += 1;
    if (item.event === "mh_regenerate_click") stats[source].regenerates += 1;
  });
  reports.forEach((item) => {
    const source = item.source || "unknown";
    stats[source] ||= { events: 0, starts: 0, reports: 0, shares: 0, leadIntents: 0, regenerates: 0 };
    stats[source].reports += 1;
  });
  return stats;
}

function hasVerificationData(events, reports, interviews) {
  return reports.some((item) => item.source === "verify_data" || item.entryVariant === "verify_variant") ||
    events.some((item) => item.sessionId === "verify_data" || item.event === "verify_data_event") ||
    interviews.some((item) => item.segment === "verify_user" || item.source === "verify_data");
}

function buildRecommendations({ hasTestData, hasMismatchedFunnel, homeViews, starts, submits, reports, saves, appCtas, leadIntents, totalFeedback, uncomfortableFeedback }) {
  const recommendations = [];
  if (hasTestData || hasMismatchedFunnel) {
    recommendations.push("当前样本包含本地验证或种子数据，漏斗率只适合检查链路，不适合作真实转化判断；正式复盘前应清空或隔离测试 JSONL。");
  }
  if (!hasTestData && homeViews && starts / homeViews < 0.1) {
    recommendations.push("入口点击率偏低：优先改首屏标题、CTA 和投放入口文案。");
  }
  if (!hasTestData && starts && submits / starts < 0.5) {
    recommendations.push("开始后提交率偏低：降低输入成本，提供更多一键样例或默认破事。");
  }
  if (!hasTestData && reports.length && saves / reports.length < 0.2) {
    recommendations.push("保存率偏低：优先加强结果卡视觉、标题冲击和海报可发性。");
  }
  if (!hasTestData && reports.length && appCtas / reports.length < 0.05) {
    recommendations.push("App 承接偏弱：先测试“保存历史 / 人格图鉴 / 月度报告”等不同承接文案。");
  }
  if (!hasTestData && reports.length && leadIntents / reports.length < 0.02) {
    recommendations.push("留资意向偏弱：先降低承诺感，用“上线提醒 / 内测名额”替代下载或登录表达。");
  }
  if (!hasTestData && totalFeedback && uncomfortableFeedback / totalFeedback > 0.15) {
    recommendations.push("内容冒犯反馈偏高：收敛阴阳怪气强度，优先复查标题池和分享文案。");
  }
  if (!recommendations.length) {
    recommendations.push("核心指标暂无明显短板：下一步扩大样本并观察真实分享与复访。");
  }
  return recommendations;
}

function buildReview() {
  const reports = readJsonl(reportsPath);
  const events = readJsonl(eventsPath);
  const interviews = readJsonl(interviewsPath);
  const samplingLinks = readSamplingLinks();
  const eventCounts = countBy(events, (item) => item.event);
  const sceneCounts = countBy(reports, (item) => item.scene);
  const styleCounts = countBy(reports, (item) => item.style);
  const variantStats = buildVariantStats(events, reports);
  const sourceStats = buildSourceStats(events, reports);
  const appInterestCounts = countBy(events.filter((item) => item.event === "mh_app_interest_click"), (item) => item.payload?.interest || "unknown");
  const leadCounts = countBy(events.filter((item) => item.event === "mh_lead_intent_click"), (item) => item.payload?.method || "unknown");
  const feedbackCounts = countBy(events.filter((item) => item.event === "mh_report_feedback_click"), (item) => item.payload?.feedback || "unknown");
  const decisionSummary = buildDecisionSummary({
    events,
    reports,
    interviews,
    summary: {
      eventCounts,
      appInterestSummary: appInterestCounts,
      leadSummary: leadCounts,
      feedbackSummary: feedbackCounts
    }
  });

  const homeViews = eventCounts.mh_home_view || 0;
  const starts = eventCounts.mh_start_click || 0;
  const submits = eventCounts.mh_text_submit || 0;
  const generated = eventCounts.mh_generate_success || 0;
  const saves = eventCounts.mh_save_click || 0;
  const shares = eventCounts.mh_share_click || 0;
  const copies = eventCounts.mh_copy_click || 0;
  const appCtas = eventCounts.mh_app_cta_click || 0;
  const leadIntents = eventCounts.mh_lead_intent_click || 0;
  const regenerates = eventCounts.mh_regenerate_click || 0;
  const uncomfortableFeedback = feedbackCounts.uncomfortable || 0;
  const totalFeedback = Object.values(feedbackCounts).reduce((acc, count) => acc + count, 0);
  const hasTestData = hasVerificationData(events, reports, interviews);
  const hasMismatchedFunnel = (homeViews && starts > homeViews) || (starts && reports.length > starts);
  const recommendations = buildRecommendations({
    hasTestData,
    hasMismatchedFunnel,
    homeViews,
    starts,
    submits,
    reports,
    saves,
    appCtas,
    leadIntents,
    totalFeedback,
    uncomfortableFeedback
  });

  const lines = [
    "# 嘴硬日记 MVP 日复盘",
    "",
    `生成时间：${new Date().toISOString()}`,
    "",
    "## 概览",
    "",
    table(["指标", "数值"], [
      ["报告生成", reports.length],
      ["事件记录", events.length],
      ["访谈记录", interviews.length],
      ["首页曝光", homeViews],
      ["点击开始", starts],
      ["提交输入", submits],
      ["生成成功", generated],
      ["保存图片", saves],
      ["分享点击", shares],
      ["复制文案", copies],
      ["App 承接", appCtas],
      ["留资意向", leadIntents],
      ["二次生成", regenerates],
      ["含测试数据", hasTestData ? "是" : "否"]
    ]),
    hasTestData || hasMismatchedFunnel ? "\n> 注意：当前 JSONL 含本地验证或种子数据，漏斗率已做展示裁剪；真实投放复盘前建议隔离测试数据。\n" : "",
    "",
    "## 决策摘要",
    "",
    table(["项目", "结果"], [
      ["判断", `${decisionSummary.label} (${decisionSummary.verdict})`],
      ["置信度", decisionSummary.confidence],
      ["样本", `reports=${decisionSummary.sample.reports}, events=${decisionSummary.sample.events}, interviews=${decisionSummary.sample.interviews}`],
      ["保存/分享/二次生成/App CTA", `${pct(decisionSummary.metrics.saveRate, 1)} / ${pct(decisionSummary.metrics.shareRate, 1)} / ${pct(decisionSummary.metrics.regenerateRate, 1)} / ${pct(decisionSummary.metrics.appCtaRate, 1)}`],
      ["App 兴趣第一名", decisionSummary.interestLeader.key ? `${decisionSummary.interestLeader.key} (${pct(decisionSummary.interestLeader.share, 1)})` : "-"],
      ["访谈信号", `保存=${decisionSummary.interviewSignals.wantsSave}, 日历=${decisionSummary.interviewSignals.wantsDaily}, 风格=${decisionSummary.interviewSignals.wantsStyle}`]
    ]),
    "",
    ...decisionSummary.reasons.map((item) => `- ${item}`),
    ...decisionSummary.blockers.map((item) => `- 阻塞：${item}`),
    ...decisionSummary.nextActions.map((item) => `- 下一步：${item}`),
    "",
    "## 转化漏斗",
    "",
    table(["阶段", "数量", "转化率"], [
      ["首页 -> 开始", starts, cappedPct(starts, homeViews)],
      ["开始 -> 提交", submits, pct(submits, starts)],
      ["提交 -> 生成成功", generated, pct(generated, submits)],
      ["开始 -> 报告落盘", reports.length, cappedPct(reports.length, starts)],
      ["报告 -> 保存", saves, pct(saves, reports.length)],
      ["报告 -> 分享", shares, pct(shares, reports.length)],
      ["报告 -> 复制", copies, pct(copies, reports.length)],
      ["报告 -> App CTA", appCtas, pct(appCtas, reports.length)],
      ["报告 -> 留资意向", leadIntents, pct(leadIntents, reports.length)],
      ["报告 -> 二次生成", regenerates, pct(regenerates, reports.length)]
    ]),
    "",
    "## 入口实验",
    "",
    table(["variant", "事件", "开始", "报告", "报告率", "分享", "分享率", "再生成率", "App CTA"], Object.entries(variantStats)
      .sort((a, b) => (b[1].starts + b[1].reports) - (a[1].starts + a[1].reports))
      .map(([variant, stats]) => [
        variant,
        stats.events,
        stats.starts,
        stats.reports,
        cappedPct(stats.reports, stats.starts),
        stats.shares,
        pct(stats.shares, stats.reports),
        pct(stats.regenerates, stats.reports),
        stats.appCtas
      ])),
    "",
    "## 来源表现",
    "",
    table(["source", "事件", "开始", "报告", "报告率", "分享率", "留资率"], Object.entries(sourceStats)
      .sort((a, b) => (b[1].starts + b[1].reports) - (a[1].starts + a[1].reports))
      .map(([source, stats]) => [
        source,
        stats.events,
        stats.starts,
        stats.reports,
        cappedPct(stats.reports, stats.starts),
        pct(stats.shares, stats.reports),
        pct(stats.leadIntents, stats.reports)
      ])),
    "",
    "## Sampling Link Pack",
    "",
    table(["item", "value"], [
      ["version", samplingLinks.version || "unknown"],
      ["baseUrl", samplingLinks.baseUrl || "-"],
      ["links", (samplingLinks.links || []).length]
    ]),
    "",
    table(["cohort", "variant", "source", "campaign", "channel", "target", "url"], (samplingLinks.links || []).map((item) => [
      item.cohortId || "-",
      item.variant || "-",
      item.source || "-",
      item.campaign || "-",
      item.channel || "-",
      item.dailyTarget || 0,
      item.url || "-"
    ])),
    "",
    "## App 功能兴趣",
    "",
    table(["interest", "点击数"], topRows(appInterestCounts)),
    "",
    "## 留资意向",
    "",
    table(["method", "点击数"], topRows(leadCounts)),
    "",
    "## 内容反馈",
    "",
    table(["feedback", "点击数"], topRows(feedbackCounts)),
    "",
    "## 访谈摘要",
    "",
    table(["segment", "最像的句子", "保存原因", "App 期待", "顾虑"], interviews.slice(-8).reverse().map((item) => [
      item.segment || "unknown",
      item.bestLine || "-",
      item.saveReason || "-",
      item.appWish || "-",
      item.concern || "-"
    ])),
    "",
    "## 内容表现",
    "",
    "### Top 场景",
    "",
    table(["scene", "报告数"], topRows(sceneCounts)),
    "",
    "### Top 风格",
    "",
    table(["style", "报告数"], topRows(styleCounts)),
    "",
    "## 下一步建议",
    "",
    ...recommendations.map((item) => `- ${item}`),
    ""
  ];

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
  return { outputPath, reports: reports.length, events: events.length, interviews: interviews.length };
}

const result = buildReview();
console.log(`runtime review ok: reports=${result.reports}, events=${result.events}, interviews=${result.interviews}`);
console.log(result.outputPath);
