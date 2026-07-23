function rate(value, base) {
  return base > 0 ? Number((value / base).toFixed(4)) : 0;
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function totalCount(counts) {
  return Object.values(counts || {}).reduce((acc, count) => acc + Number(count || 0), 0);
}

function topShare(counts) {
  const total = totalCount(counts);
  const [key = "", count = 0] = Object.entries(counts || {}).sort((a, b) => b[1] - a[1])[0] || [];
  return {
    key,
    count,
    total,
    share: rate(count, total)
  };
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function buildInterviewSignals(interviews) {
  return interviews.reduce((acc, item) => {
    const text = [
      item.bestLine,
      item.saveReason,
      item.appWish,
      item.concern
    ].filter(Boolean).join(" ");

    if (includesAny(text, ["保存", "历史", "回头看", "留着", "档案"])) acc.wantsSave += 1;
    if (includesAny(text, ["每天", "日历", "复访", "记录", "状态"])) acc.wantsDaily += 1;
    if (includesAny(text, ["风格", "模板", "换", "不同", "人格", "称号"])) acc.wantsStyle += 1;
    if (includesAny(text, ["尴尬", "冒犯", "营销", "不准", "无聊", "没意思"])) acc.concernAwkward += 1;
    return acc;
  }, {
    wantsSave: 0,
    wantsDaily: 0,
    wantsStyle: 0,
    concernAwkward: 0
  });
}

function hasVerificationMarkers(events, reports, interviews) {
  return reports.some((item) => item.source === "verify_data" || item.entryVariant === "verify_variant") ||
    events.some((item) => item.sessionId === "verify_data" || item.event === "verify_data_event") ||
    interviews.some((item) => item.segment === "verify_user" || item.source === "verify_data");
}

function buildDecisionSummary({ events = [], reports = [], interviews = [], summary = {} }) {
  const eventCounts = summary.eventCounts || countBy(events, (item) => item.event);
  const funnel = summary.funnelSummary || {};
  const appInterestSummary = summary.appInterestSummary || countBy(
    events.filter((item) => item.event === "mh_app_interest_click"),
    (item) => item.payload && item.payload.interest
  );
  const leadSummary = summary.leadSummary || countBy(
    events.filter((item) => item.event === "mh_lead_intent_click"),
    (item) => item.payload && item.payload.method
  );
  const feedbackSummary = summary.feedbackSummary || countBy(
    events.filter((item) => item.event === "mh_report_feedback_click"),
    (item) => item.payload && item.payload.feedback
  );

  const metrics = {
    startRate: funnel.startRate || rate(eventCounts.mh_start_click || 0, eventCounts.mh_home_view || 0),
    submitRate: funnel.submitRate || rate(eventCounts.mh_text_submit || 0, eventCounts.mh_start_click || 0),
    generateRate: funnel.generateRate || rate(eventCounts.mh_generate_success || 0, eventCounts.mh_text_submit || 0),
    saveRate: funnel.saveRate || rate(eventCounts.mh_save_click || 0, reports.length),
    shareRate: funnel.shareRate || rate(eventCounts.mh_share_click || 0, reports.length),
    copyRate: funnel.copyRate || rate(eventCounts.mh_copy_click || 0, reports.length),
    appCtaRate: funnel.appCtaRate || rate(eventCounts.mh_app_cta_click || 0, reports.length),
    leadIntentRate: funnel.leadIntentRate || rate(eventCounts.mh_lead_intent_click || 0, reports.length),
    regenerateRate: funnel.regenerateRate || rate(eventCounts.mh_regenerate_click || 0, reports.length)
  };
  const feedbackTotal = totalCount(feedbackSummary);
  const feedbackRates = {
    accurate: rate(feedbackSummary.accurate || 0, feedbackTotal),
    off: rate(feedbackSummary.off || 0, feedbackTotal),
    uncomfortable: rate(feedbackSummary.uncomfortable || 0, feedbackTotal)
  };
  const interestLeader = topShare(appInterestSummary);
  const leadTotal = totalCount(leadSummary);
  const interviewSignals = buildInterviewSignals(interviews);
  const hasVerificationData = hasVerificationMarkers(events, reports, interviews);
  const hasMismatchedFunnel = Boolean(
    (eventCounts.mh_home_view && (eventCounts.mh_start_click || 0) > eventCounts.mh_home_view) ||
    (eventCounts.mh_start_click && reports.length > eventCounts.mh_start_click)
  );
  const sample = {
    reports: reports.length,
    events: events.length,
    interviews: interviews.length,
    feedbacks: feedbackTotal,
    appInterestClicks: interestLeader.total,
    leadIntents: leadTotal,
    regenerates: eventCounts.mh_regenerate_click || 0
  };

  const reasons = [];
  const blockers = [];
  const nextActions = [];
  let verdict = "iterate";
  let label = "继续小步迭代";
  let confidence = "medium";

  if (hasVerificationData || hasMismatchedFunnel) {
    verdict = "internal_only";
    label = "仅可内部联调";
    confidence = "high";
    blockers.push("当前 runtime 含本地验证或种子数据，不能用于真实转化判断。");
    nextActions.push("正式采样前执行 runtime 备份与清空，并重新生成干净复盘。");
  } else if (sample.reports < 30 || sample.events < 50 || sample.interviews < 3) {
    verdict = "collect_more";
    label = "继续采样";
    confidence = "low";
    blockers.push("真实样本不足，先不要过早判断 App 方向。");
    nextActions.push("补到至少 30 份报告、50 条事件、3 条访谈后再看趋势。");
  } else if (feedbackRates.uncomfortable > 0.2 || (metrics.saveRate < 0.08 && metrics.shareRate < 0.05 && metrics.appCtaRate < 0.02)) {
    verdict = "pause";
    label = "暂停方向";
    confidence = "medium";
    blockers.push("内容冒犯，或保存、分享、App 承接均低，当前方向缺少继续投入信号。");
    nextActions.push("回炉内容语气和结果价值，先用新文案小样本复测。");
  } else if (
    (metrics.saveRate >= 0.2 || metrics.shareRate >= 0.12) &&
    metrics.appCtaRate >= 0.05 &&
    metrics.regenerateRate >= 0.1 &&
    interestLeader.share >= 0.4 &&
    (interviewSignals.wantsSave + interviewSignals.wantsDaily + interviewSignals.wantsStyle) > 0
  ) {
    verdict = "mvp_deepen";
    label = "进入 MVP 深做";
    confidence = sample.interviews >= 8 ? "high" : "medium";
    reasons.push("保存、分享或 App CTA 达到阈值，且 App 兴趣出现明确第一名。");
    nextActions.push("围绕第一名兴趣做 App 承接原型，并继续访谈验证使用频次。");
  } else if ((metrics.startRate >= 0.1 || metrics.shareRate >= 0.12) && metrics.appCtaRate < 0.05) {
    verdict = "marketing_h5";
    label = "先做传播型 H5";
    confidence = "medium";
    reasons.push("入口或分享尚可，但 App 承接意愿还弱。");
    nextActions.push("强化结果卡和分享链路，把独立 App 延后到复访信号出现后。");
  } else {
    reasons.push("核心指标暂未明显过线，也没有强烈负向信号。");
    nextActions.push("优先迭代首屏承诺、结果卡命中感和 App CTA 文案，再进行一轮采样。");
  }

  if (metrics.saveRate >= 0.2) reasons.push("保存率达到 MVP 深做成功阈值。");
  if (metrics.shareRate >= 0.12) reasons.push("分享率达到传播阈值。");
  if (metrics.appCtaRate >= 0.05) reasons.push("App CTA 达到承接阈值。");
  if (metrics.regenerateRate >= 0.25) reasons.push("二次生成率达到复玩阈值。");
  if (feedbackRates.accurate >= 0.4) reasons.push("内容命中反馈达到成功阈值。");
  if (feedbackRates.uncomfortable >= 0.1) blockers.push("不适或冒犯反馈偏高，需要收敛内容边界。");
  if (interestLeader.key && interestLeader.share >= 0.4) reasons.push(`App 兴趣第一名是 ${interestLeader.key}，占兴趣点击 ${Math.round(interestLeader.share * 100)}%。`);
  if (interviewSignals.wantsSave || interviewSignals.wantsDaily || interviewSignals.wantsStyle) {
    reasons.push("访谈中出现保存历史、日历复访或换风格诉求。");
  }
  if (!reasons.length) reasons.push("暂无足够正向信号。");
  if (!nextActions.length) nextActions.push("继续采样并补充访谈原因，不只看点击数。");

  return {
    verdict,
    label,
    confidence,
    hasVerificationData,
    hasMismatchedFunnel,
    sample,
    metrics,
    feedbackRates,
    interestLeader,
    interviewSignals,
    reasons,
    blockers,
    nextActions
  };
}

module.exports = {
  buildDecisionSummary
};
