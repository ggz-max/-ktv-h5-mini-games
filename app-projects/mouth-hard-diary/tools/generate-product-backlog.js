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
const outputPath = path.join(root, "product", "post-sampling-backlog.md");

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

function topKey(counts) {
  return Object.entries(counts || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function buildFunnel(events, reports) {
  const eventCounts = countBy(events, (item) => item.event);
  return {
    eventCounts,
    reports: reports.length,
    saves: eventCounts.mh_save_click || 0,
    shares: eventCounts.mh_share_click || 0,
    appCtas: eventCounts.mh_app_cta_click || 0,
    leadIntents: eventCounts.mh_lead_intent_click || 0,
    regenerates: eventCounts.mh_regenerate_click || 0,
    saveRate: rate(eventCounts.mh_save_click || 0, reports.length),
    shareRate: rate(eventCounts.mh_share_click || 0, reports.length),
    appCtaRate: rate(eventCounts.mh_app_cta_click || 0, reports.length),
    leadIntentRate: rate(eventCounts.mh_lead_intent_click || 0, reports.length),
    regenerateRate: rate(eventCounts.mh_regenerate_click || 0, reports.length)
  };
}

function evidenceFor(item, context) {
  const { funnel, appInterestSummary, feedbackSummary, interviewSignals, pendingExports, styleApproved, styleApproval, pencilSourceExists, manifest } = context;
  const appLeader = topKey(appInterestSummary);
  const evidence = [];

  if (item.id === "pencil_visual_gate") {
    evidence.push(styleApproved ? "视觉风格已确认" : `视觉风格未确认：${styleApproval.status || "missing"}`);
    evidence.push(pencilSourceExists ? "Pencil .pen 已存在" : `Pencil .pen 缺失：${manifest.pencilFile || "unset"}`);
    evidence.push(pendingExports.length ? `${pendingExports.length} 个 Pencil 导出仍未完成` : "Pencil 导出已完成");
  }
  if (item.id === "report_card_polish") {
    evidence.push(`保存率 ${pct(funnel.saveRate)}，分享率 ${pct(funnel.shareRate)}`);
  }
  if (item.id === "history_archive") {
    evidence.push(`App 兴趣第一名：${appLeader || "暂无"}`);
    evidence.push(`访谈保存信号：${interviewSignals.wantsSave}`);
  }
  if (item.id === "state_calendar") {
    evidence.push(`访谈日历/复访信号：${interviewSignals.wantsDaily}`);
    evidence.push(`二次生成率 ${pct(funnel.regenerateRate)}`);
  }
  if (item.id === "persona_atlas") {
    evidence.push(`人格/风格访谈信号：${interviewSignals.wantsStyle}`);
    evidence.push(`App 兴趣第一名：${appLeader || "暂无"}`);
  }
  if (item.id === "style_templates") {
    evidence.push(`二次生成率 ${pct(funnel.regenerateRate)}`);
    evidence.push(`风格访谈信号：${interviewSignals.wantsStyle}`);
  }
  if (item.id === "content_safety_tuning") {
    const totalFeedback = Object.values(feedbackSummary || {}).reduce((acc, count) => acc + count, 0);
    evidence.push(`冒犯反馈 ${feedbackSummary.uncomfortable || 0}/${totalFeedback}`);
    evidence.push(`访谈尴尬/冒犯信号：${interviewSignals.concernAwkward}`);
  }
  if (item.id === "lead_capture_light") {
    evidence.push(`留资意向率 ${pct(funnel.leadIntentRate)}`);
  }
  if (item.id === "shareback_loop") {
    evidence.push(`分享率 ${pct(funnel.shareRate)}`);
  }

  return evidence.filter(Boolean).join("；");
}

function priorityFor(item, context) {
  const { funnel, appInterestSummary, interviewSignals, pendingExports, styleApproved, pencilSourceExists } = context;
  const appLeader = topKey(appInterestSummary);

  if (item.id === "pencil_visual_gate") return (!styleApproved || !pencilSourceExists || pendingExports.length) ? "P0" : "Done";
  if (item.id === "content_safety_tuning" && interviewSignals.concernAwkward > 0) return "P0";
  if (item.id === "report_card_polish" && (funnel.saveRate < 0.2 || funnel.shareRate < 0.12)) return "P1";
  if (item.id === "history_archive" && (appLeader === "archive" || interviewSignals.wantsSave > 0)) return "P1";
  if (item.id === "state_calendar" && (appLeader === "calendar" || interviewSignals.wantsDaily > 0)) return "P1";
  if (item.id === "persona_atlas" && (appLeader === "persona_atlas" || interviewSignals.wantsStyle > 0)) return "P1";
  if (item.id === "style_templates" && (appLeader === "style_templates" || funnel.regenerateRate >= 0.1)) return "P1";
  if (item.id === "shareback_loop" && funnel.shareRate >= 0.08) return "P1";
  if (item.id === "lead_capture_light" && funnel.appCtaRate >= 0.05) return "P2";
  return "P2";
}

function generate() {
  const reports = readJsonl(reportsPath);
  const events = readJsonl(eventsPath);
  const interviews = readJsonl(interviewsPath);
  const manifest = readJson(manifestPath, { exportTargets: [] });
  const styleApproval = readJson(styleApprovalPath, {});
  const funnel = buildFunnel(events, reports);
  const appInterestSummary = countBy(events.filter((item) => item.event === "mh_app_interest_click"), (item) => item.payload?.interest);
  const feedbackSummary = countBy(events.filter((item) => item.event === "mh_report_feedback_click"), (item) => item.payload?.feedback);
  const decisionSummary = buildDecisionSummary({
    events,
    reports,
    interviews,
    summary: {
      eventCounts: funnel.eventCounts,
      funnelSummary: funnel,
      appInterestSummary,
      feedbackSummary
    }
  });
  const pendingExports = (manifest.exportTargets || []).filter((item) => item.status !== "pencil_exported");
  const styleApproved = styleApproval.status === "approved" && Boolean(styleApproval.approvedBy) && Boolean(styleApproval.approvedAt);
  const pencilSourceExists = Boolean(manifest.pencilFile && fs.existsSync(path.join(root, manifest.pencilFile)));
  const context = {
    funnel,
    appInterestSummary,
    feedbackSummary,
    interviewSignals: decisionSummary.interviewSignals,
    pendingExports,
    styleApproved,
    styleApproval,
    pencilSourceExists,
    manifest
  };

  const items = [
    {
      id: "pencil_visual_gate",
      title: "完成 Pencil 最终视觉链路",
      type: "design",
      hypothesis: "最终视觉资产会直接影响保存、分享和信任感；临时图不能作为真实投放结论。",
      acceptance: "style-approval 为 approved，.pen 源文件存在，所有 exportTargets 为 pencil_exported，H5 只引用 Pencil 导出图，verify:assets:final 通过。"
    },
    {
      id: "report_card_polish",
      title: "强化结果卡保存/分享价值",
      type: "h5",
      hypothesis: "如果报告卡更像可发群聊的内容，保存率和分享率会先提升。",
      acceptance: "移动端结果页无溢出；分享海报信息层级清晰；保存率目标 >=20%，分享率目标 >=12%。"
    },
    {
      id: "history_archive",
      title: "App 假门：历史报告/发疯档案",
      type: "app",
      hypothesis: "如果用户想回看，独立 App 才有长期承接理由。",
      acceptance: "App 兴趣 archive 排名第一或访谈明确提到保存历史；下一版做历史列表原型。"
    },
    {
      id: "state_calendar",
      title: "App 假门：精神状态日历",
      type: "app",
      hypothesis: "如果用户愿意每天测，日历是复访抓手。",
      acceptance: "二次生成率 >=25% 或访谈出现每日、日历、复访诉求。"
    },
    {
      id: "persona_atlas",
      title: "App 假门：嘴硬人格图鉴",
      type: "app",
      hypothesis: "人格收集和称号图鉴能把一次生成变成长期收集。",
      acceptance: "persona_atlas 兴趣领先，或访谈出现人格、称号、收集诉求。"
    },
    {
      id: "style_templates",
      title: "更多发疯模板和风格包",
      type: "content",
      hypothesis: "用户愿意再生成时，风格包会提升复玩和分享。",
      acceptance: "二次生成率 >=10%，且风格/模板访谈信号为正。"
    },
    {
      id: "content_safety_tuning",
      title: "内容边界和冒犯反馈收敛",
      type: "safety",
      hypothesis: "情绪释放产品必须嘴硬但不伤人，否则分享意愿会下降。",
      acceptance: "uncomfortable 反馈占比 <10%；高风险输入继续走温和兜底。"
    },
    {
      id: "shareback_loop",
      title: "分享回流入口和二维码海报",
      type: "growth",
      hypothesis: "如果分享链路能带回新用户，H5 可先作为传播产品跑起来。",
      acceptance: "shareback source 有独立报告样本，分享率 >=12%，回流链接进入采样链接包。"
    },
    {
      id: "lead_capture_light",
      title: "轻留资/内测提醒承接",
      type: "growth",
      hypothesis: "用户愿意被提醒，说明 App 或小程序承接可以继续测。",
      acceptance: "微信/手机号提醒意向率 >=2%，且继续不收真实联系方式直到合规方案就绪。"
    }
  ].map((item) => ({
    ...item,
    priority: priorityFor(item, context),
    evidence: evidenceFor(item, context)
  }));

  const priorityOrder = { P0: 0, P1: 1, P2: 2, Done: 3 };
  const sorted = items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const lines = [
    "# Post-Sampling Product Backlog",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Decision Context",
    "",
    table(["item", "value"], [
      ["verdict", `${decisionSummary.label} / ${decisionSummary.verdict}`],
      ["confidence", decisionSummary.confidence],
      ["sample", `reports=${reports.length}, events=${events.length}, interviews=${interviews.length}`],
      ["save/share/regenerate/appCta", `${pct(funnel.saveRate)} / ${pct(funnel.shareRate)} / ${pct(funnel.regenerateRate)} / ${pct(funnel.appCtaRate)}`],
      ["has verification data", decisionSummary.hasVerificationData ? "yes" : "no"],
      ["style approval", styleApproved ? "approved" : (styleApproval.status || "missing")],
      ["Pencil source file", pencilSourceExists ? "exists" : "missing"],
      ["Pencil pending exports", pendingExports.length]
    ]),
    "",
    "## Backlog",
    "",
    table(["priority", "type", "item", "evidence", "acceptance"], sorted.map((item) => [
      item.priority,
      item.type,
      item.title,
      item.evidence || "-",
      item.acceptance
    ])),
    "",
    "## Product Bets",
    "",
    "- H5 must prove save/share/replay before an App is justified.",
    "- App work should start from the strongest observed intent: archive, calendar, persona atlas, or style templates.",
    "- Pencil remains the source of truth for UI images; temporary H5 preview assets are not launch assets.",
    "- Privacy boundary stays strict: do not store raw user input or real contact details in this MVP.",
    "",
    "## First Build Sequence",
    "",
    ...sorted.slice(0, 5).map((item, index) => `${index + 1}. ${item.priority} ${item.title} - ${item.hypothesis}`),
    ""
  ];

  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
  return { outputPath, items: sorted.length, p0: sorted.filter((item) => item.priority === "P0").length };
}

const result = generate();
console.log(`product backlog ok: items=${result.items}, p0=${result.p0}`);
console.log(result.outputPath);
