async function loadSummary() {
  const response = await fetch("/api/v1/admin/runtime-summary");
  if (!response.ok) throw new Error("summary_failed");
  return response.json();
}

async function loadExport() {
  const response = await fetch("/api/v1/admin/runtime-export?limit=5000");
  if (!response.ok) throw new Error("export_failed");
  return response.json();
}

async function loadLaunchReadiness() {
  const response = await fetch("/api/v1/admin/launch-readiness");
  if (!response.ok) throw new Error("launch_failed");
  return response.json();
}

async function loadPencilAssets() {
  const response = await fetch("/api/v1/admin/pencil-assets");
  if (!response.ok) throw new Error("pencil_assets_failed");
  return response.json();
}

async function loadDeliveryAudit() {
  const response = await fetch("/api/v1/admin/delivery-audit");
  if (!response.ok) throw new Error("delivery_audit_failed");
  return response.json();
}

async function loadSamplingLinks() {
  const response = await fetch("/api/v1/admin/sampling-links");
  if (!response.ok) throw new Error("sampling_links_failed");
  return response.json();
}

async function submitInterview(payload) {
  const response = await fetch("/api/v1/admin/interviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("interview_failed");
  return response.json();
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildCsvBundle(payload) {
  return {
    exportedAt: payload.exportedAt,
    eventCountsCsv: payload.tables?.eventCounts || "",
    funnelSummaryCsv: payload.tables?.funnelSummary || "",
    uvSummaryCsv: payload.tables?.uvSummary || "",
    uvByEventCsv: payload.tables?.uvByEvent || "",
    uvBySourceCsv: payload.tables?.uvBySource || "",
    variantSummaryCsv: payload.tables?.variantSummary || "",
    sourceSummaryCsv: payload.tables?.sourceSummary || "",
    appInterestSummaryCsv: payload.tables?.appInterestSummary || "",
    leadSummaryCsv: payload.tables?.leadSummary || "",
    feedbackSummaryCsv: payload.tables?.feedbackSummary || "",
    resultInteractionSummaryCsv: payload.tables?.resultInteractionSummary || "",
    interviewsCsv: payload.tables?.interviews || "",
    samplingLinksCsv: payload.tables?.samplingLinks || ""
  };
}

function renderStats(summary) {
  document.querySelector('[data-stat="uv"]').textContent = summary.uvSummary?.totalUv || 0;
  document.querySelector('[data-stat="reports"]').textContent = summary.reports;
  document.querySelector('[data-stat="events"]').textContent = summary.events;
  document.querySelector('[data-stat="eventTypes"]').textContent = Object.keys(summary.eventCounts || {}).length;
}

function renderLaunchReadiness(readiness) {
  const status = document.querySelector("[data-launch-status]");
  const list = document.querySelector('[data-list="launch-checks"]');
  const actions = document.querySelector('[data-list="launch-actions"]');
  status.textContent = readiness.ok ? "可正式采样" : "仅可内部联调";
  status.classList.toggle("is-ready", Boolean(readiness.ok));
  status.classList.toggle("is-blocked", !readiness.ok);

  const failed = (readiness.checks || []).filter((check) => !check.ok);
  const actionItems = readiness.ok
    ? [
        "使用采样链接包投放真实用户，不要手改 URL 参数。",
        "现场用投放卡片和现场采样手册执行访谈。",
        "当晚运行 review:runtime 和 brief:founder 生成复盘。"
      ]
    : [
        failed.some((check) => check.key === "style_approved")
          ? "先打开视觉确认页，确认风格后更新 style-approval.json。"
          : "",
        failed.some((check) => check.key === "pencil_source_file")
          ? "恢复 Pencil，创建或打开本项目 .pen 源文件。"
          : "",
        failed.some((check) => check.key === "final_pencil_exports")
          ? "从 Pencil 导出最终切图，并更新 manifest 导出状态。"
          : "",
        failed.some((check) => check.key === "runtime_empty" || /runtime/.test(check.label || ""))
          ? "正式采样前执行 npm run sampling:prepare -- --yes，备份并清空 runtime。"
          : "",
        failed.some((check) => check.key === "runtime_review_clean" || /复盘|review/.test(check.label || ""))
          ? "清库后重新生成 runtime review，确认不含测试数据。"
          : "",
        "完整步骤见 docs/launch-handoff.md。"
      ].filter(Boolean);

  actions.innerHTML = `
    <article class="launch-action-card">
      <strong>${readiness.ok ? "下一步：开始真实采样" : "下一步：补齐上线前门禁"}</strong>
      ${actionItems.map((item) => `<p>${item}</p>`).join("")}
      <div class="launch-links">
        <a href="./../docs/preflight-report.md" target="_blank" rel="noreferrer">每日 preflight</a>
        <a href="./../docs/launch-rehearsal.md" target="_blank" rel="noreferrer">上线预演</a>
        <a href="./../docs/delivery-audit.md" target="_blank" rel="noreferrer">交付审计</a>
        <a href="./../docs/objective-completion-audit.json" target="_blank" rel="noreferrer">目标审计 JSON</a>
        <a href="./../docs/launch-handoff.md" target="_blank" rel="noreferrer">Launch handoff</a>
        <a href="./../docs/sampling-links.md" target="_blank" rel="noreferrer">采样链接包</a>
        <a href="./../docs/sampling-cards/index.html" target="_blank" rel="noreferrer">投放卡片</a>
        <a href="./../experiments/field-sampling-playbook.md" target="_blank" rel="noreferrer">现场手册</a>
        <a href="./../experiments/sampling-safety-sop.md" target="_blank" rel="noreferrer">安全 SOP</a>
        <a href="./../designs/imagegen-review.html" target="_blank" rel="noreferrer">视觉确认页</a>
        <a href="./../designs/style-approval.json" target="_blank" rel="noreferrer">确认记录</a>
        <a href="./../designs/style-approval-apply-guide.md" target="_blank" rel="noreferrer">确认草稿指南</a>
        <a href="./../designs/asset-index.md" target="_blank" rel="noreferrer">资产索引</a>
        <a href="./../designs/pencil-import-checklist.csv" target="_blank" rel="noreferrer">Pencil 导入 CSV</a>
        <a href="./../designs/pencil-import-checklist.json" target="_blank" rel="noreferrer">Pencil 导入 JSON</a>
        <a href="./../designs/pencil-board-spec.md" target="_blank" rel="noreferrer">Pencil board spec</a>
        <a href="./../designs/operator-pack.md" target="_blank" rel="noreferrer">Pencil 操作包</a>
        <a href="./../designs/finalization-checklist.md" target="_blank" rel="noreferrer">最终确认清单</a>
        <a href="./../designs/handoff-packet.md" target="_blank" rel="noreferrer">Pencil 交接包</a>
        <a href="./../docs/pencil-readiness.md" target="_blank" rel="noreferrer">Pencil readiness</a>
      </div>
    </article>
  `;

  list.innerHTML = (readiness.checks || []).map((check) => `
    <article class="launch-check ${check.ok ? "is-ok" : "is-fail"}">
      <strong>${check.ok ? "OK" : "FAIL"}</strong>
      <span>${check.label}</span>
      <small>${check.detail || ""}</small>
    </article>
  `).join("");
}

function renderDeliveryAudit(payload) {
  const status = document.querySelector("[data-delivery-status]");
  const list = document.querySelector('[data-list="delivery-audit"]');
  status.textContent = payload.ok ? "完整目标已满足" : `${payload.complete || 0}/${payload.total || 0} 项已满足`;
  status.classList.toggle("is-ready", Boolean(payload.ok));
  status.classList.toggle("is-blocked", !payload.ok);

  list.innerHTML = (payload.checks || []).map((check) => `
    <article class="delivery-card ${check.ok ? "is-ok" : "is-fail"}">
      <strong>${check.ok ? "OK" : "BLOCKED"}</strong>
      <span>${check.label}</span>
      <small>${check.evidence || ""}</small>
      ${check.blocker ? `<p>${check.blocker}</p>` : ""}
    </article>
  `).join("");
}

function renderPencilAssets(payload) {
  const status = document.querySelector("[data-pencil-status]");
  const summary = document.querySelector('[data-list="pencil-summary"]');
  const assets = document.querySelector('[data-list="pencil-assets"]');
  status.textContent = payload.ok ? "Pencil 资产已就绪" : "等待 Pencil 导入与导出";
  status.classList.toggle("is-ready", Boolean(payload.ok));
  status.classList.toggle("is-blocked", !payload.ok);

  const blockers = payload.blockers || [];
  const actions = payload.nextActions || [];
  summary.innerHTML = `
    <article class="pencil-summary-card">
      <strong>${payload.styleApproval?.directionName || "视觉方向待确认"}</strong>
      <p>manifest：${payload.manifest?.status || "missing"} / source：${payload.manifest?.source || "-"}</p>
      <p>style：${payload.styleApproval?.status || "missing"} / .pen：${payload.pencilSource?.exists ? "exists" : "missing"}</p>
      <p>draft：${payload.styleApproval?.draftFile || "-"}</p>
      <p>exports：${(payload.exportTargets || []).filter((item) => item.final).length}/${(payload.exportTargets || []).length} final</p>
    </article>
    <article class="pencil-summary-card">
      <strong>${blockers.length ? "当前阻塞" : "无阻塞"}</strong>
      ${(blockers.length ? blockers : ["Pencil 资产链路满足最终门禁。"]).map((item) => `<p>${item}</p>`).join("")}
    </article>
    <article class="pencil-summary-card">
      <strong>下一步动作</strong>
      ${(actions.length ? actions : ["Run npm run verify:assets:final before launch."]).map((item) => `<p>${item}</p>`).join("")}
      <p><a href="./../designs/style-approval-apply-guide.md" target="_blank" rel="noreferrer">打开确认草稿指南</a></p>
      <p><a href="./../designs/pencil-import-checklist.csv" target="_blank" rel="noreferrer">打开 Pencil 导入 CSV</a></p>
      <p><a href="./../designs/pencil-import-checklist.json" target="_blank" rel="noreferrer">打开 Pencil 导入 JSON</a></p>
      <p><a href="./../designs/pencil-board-spec.md" target="_blank" rel="noreferrer">打开 Pencil board spec</a></p>
      <p><a href="./../designs/finalization-checklist.md" target="_blank" rel="noreferrer">打开最终确认清单</a></p>
      <p><a href="./../designs/handoff-packet.md" target="_blank" rel="noreferrer">打开 Pencil 交接包</a></p>
      <p><a href="./../docs/pencil-readiness.md" target="_blank" rel="noreferrer">打开 Pencil readiness 报告</a></p>
    </article>
  `;

  const sourceRows = (payload.sourceImages || []).map((item) => `
    <article class="pencil-asset-card ${item.exists ? "is-ok" : "is-fail"}">
      <strong>${item.role}</strong>
      <span>${item.file}</span>
      <small>${item.board || "-"} / ${item.width}x${item.height} / ${item.exists ? "exists" : "missing"}</small>
    </article>
  `).join("");
  const exportRows = (payload.exportTargets || []).map((item) => `
    <article class="pencil-asset-card ${item.final && item.exists ? "is-ok" : "is-fail"}">
      <strong>${item.name}</strong>
      <span>${item.destination}</span>
      <small>${item.sourceBoard || "-"} / ${item.expectedNodeName || "-"} / ${item.status} / ${item.exists ? "file exists" : "file missing"}</small>
    </article>
  `).join("");

  assets.innerHTML = `
    <div>
      <h3>Image2 Source</h3>
      <div class="pencil-asset-grid">${sourceRows || '<p class="empty">No source images.</p>'}</div>
    </div>
    <div>
      <h3>Pencil Exports</h3>
      <div class="pencil-asset-grid">${exportRows || '<p class="empty">No export targets.</p>'}</div>
    </div>
  `;
}

function renderDecisionSummary(summary) {
  const decision = summary.decisionSummary || {};
  const label = document.querySelector("[data-decision-label]");
  const list = document.querySelector('[data-list="decision-summary"]');
  const metrics = decision.metrics || {};
  const sample = decision.sample || {};
  const interest = decision.interestLeader || {};

  label.textContent = `${decision.label || "暂无判断"} / ${decision.confidence || "low"}`;
  label.classList.toggle("is-blocked", ["internal_only", "pause"].includes(decision.verdict));

  list.innerHTML = [
    {
      title: "关键指标",
      lines: [
        `报告 ${sample.reports || 0} / 事件 ${sample.events || 0} / 访谈 ${sample.interviews || 0}`,
        `保存 ${formatRate(metrics.saveRate)} / 分享 ${formatRate(metrics.shareRate)} / 再生成 ${formatRate(metrics.regenerateRate)}`,
        `App CTA ${formatRate(metrics.appCtaRate)} / 留资 ${formatRate(metrics.leadIntentRate)}`,
        `命中 ${formatRate(decision.feedbackRates?.accurate)} / 不适 ${formatRate(decision.feedbackRates?.uncomfortable)}`
      ]
    },
    {
      title: "方向信号",
      lines: [
        interest.key ? `App 兴趣第一名：${interest.key}（${formatRate(interest.share)}）` : "App 兴趣第一名：暂无",
        `访谈信号：保存 ${decision.interviewSignals?.wantsSave || 0} / 日历 ${decision.interviewSignals?.wantsDaily || 0} / 风格 ${decision.interviewSignals?.wantsStyle || 0}`
      ]
    },
    {
      title: "判断理由",
      lines: decision.reasons || []
    },
    {
      title: "下一步",
      lines: [...(decision.blockers || []), ...(decision.nextActions || [])]
    }
  ].map((card) => `
    <article class="decision-card">
      <strong>${card.title}</strong>
      ${(card.lines.length ? card.lines : ["暂无"]).map((line) => `<p>${line}</p>`).join("")}
    </article>
  `).join("");
}

function renderSamplingLinks(payload) {
  const meta = document.querySelector("[data-sampling-meta]");
  const list = document.querySelector('[data-list="sampling-links"]');
  const links = payload.links || [];
  meta.textContent = `${payload.version || "unknown"} / ${links.length} links / ${payload.baseUrl || ""}`;

  if (!links.length) {
    list.innerHTML = '<p class="empty">No sampling links generated.</p>';
    return;
  }

  list.innerHTML = links.map((link) => `
    <article class="sampling-card">
      <div>
        <strong>${link.cohortLabel || link.cohortId}</strong>
        <span>${link.variant} / ${link.source} / ${link.campaign} / ${link.channel}</span>
      </div>
      <p>${link.note || ""}</p>
      <code>${link.url}</code>
      <div class="sampling-actions">
        <a href="${link.url}" target="_blank" rel="noreferrer">打开</a>
        <button type="button" data-copy-url="${link.url}">复制</button>
        <small>目标/天 ${link.dailyTarget || 0}</small>
      </div>
    </article>
  `).join("");
}

function renderEvents(summary) {
  const list = document.querySelector('[data-list="events"]');
  const entries = Object.entries(summary.eventCounts || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, count]) => count));

  if (!entries.length) {
    list.innerHTML = '<p class="empty">还没有事件。</p>';
    return;
  }

  list.innerHTML = entries.map(([event, count]) => `
    <div class="event-row">
      <div>
        <strong>${event}</strong>
        <div class="bar" style="--width:${Math.round(count / max * 100)}%"><b></b></div>
      </div>
      <span class="count">${count}</span>
    </div>
  `).join("");
}

function formatRate(value) {
  return `${Math.round((value || 0) * 1000) / 10}%`;
}

function renderFunnel(summary) {
  const list = document.querySelector('[data-list="funnel"]');
  const funnel = summary.funnelSummary || {};
  const rows = [
    { label: "访问首页", value: funnel.homeViews || 0, rate: "100%" },
    { label: "点击开始", value: funnel.starts || 0, rate: formatRate(funnel.startRate) },
    { label: "提交输入", value: funnel.textSubmits || 0, rate: formatRate(funnel.submitRate) },
    { label: "生成成功", value: funnel.generateSuccesses || 0, rate: formatRate(funnel.generateRate) },
    { label: "报告落盘", value: funnel.reports || 0, rate: formatRate(funnel.reportRate) },
    { label: "保存图片", value: funnel.saves || 0, rate: `${formatRate(funnel.saveRate)} / 报告` },
    { label: "复制文案", value: funnel.copies || 0, rate: `${formatRate(funnel.copyRate)} / 报告` },
    { label: "继续拆解", value: funnel.rituals || 0, rate: `${formatRate(funnel.ritualRate)} / 报告` },
    { label: "一键改写", value: funnel.remixes || 0, rate: `${formatRate(funnel.remixRate)} / 报告` },
    { label: "复制改写", value: funnel.remixCopies || 0, rate: `${formatRate(funnel.remixCopyRate)} / 报告` },
    { label: "收藏档案", value: funnel.collections || 0, rate: `${formatRate(funnel.collectionRate)} / 报告` },
    { label: "清空档案", value: funnel.archiveClears || 0, rate: `${formatRate(funnel.archiveClearRate)} / 报告` },
    { label: "App 承接", value: funnel.appCtas || 0, rate: `${formatRate(funnel.appCtaRate)} / 报告` },
    { label: "留资意向", value: funnel.leadIntents || 0, rate: `${formatRate(funnel.leadIntentRate)} / 报告` },
    { label: "再生成", value: funnel.regenerates || 0, rate: `${formatRate(funnel.regenerateRate)} / 报告` }
  ];
  const max = Math.max(1, ...rows.map((row) => row.value));

  list.innerHTML = rows.map((row) => `
    <div class="funnel-row">
      <span>${row.label}</span>
      <div class="bar" style="--width:${Math.round(row.value / max * 100)}%"><b></b></div>
      <strong>${row.value}</strong>
      <em>${row.rate}</em>
    </div>
  `).join("");
}

function renderVariants(summary) {
  const list = document.querySelector('[data-list="variants"]');
  const entries = Object.entries(summary.variantSummary || {}).sort((a, b) => {
    return (b[1].starts + b[1].reports) - (a[1].starts + a[1].reports);
  });

  if (!entries.length) {
    list.innerHTML = '<p class="empty">还没有入口实验数据。</p>';
    return;
  }

  list.innerHTML = entries.map(([variant, stats]) => `
    <article class="variant-card">
      <strong>${variant}</strong>
      <dl>
        <dt>事件</dt><dd>${stats.events || 0}</dd>
        <dt>开始</dt><dd>${stats.starts || 0}</dd>
        <dt>报告</dt><dd>${stats.reports || 0}</dd>
        <dt>报告率</dt><dd>${formatRate(stats.reportRate)}</dd>
        <dt>保存</dt><dd>${stats.saves || 0}</dd>
        <dt>分享</dt><dd>${stats.shares || 0}</dd>
        <dt>分享率</dt><dd>${formatRate(stats.shareRate)}</dd>
        <dt>App CTA</dt><dd>${stats.appCtas || 0}</dd>
        <dt>再生成</dt><dd>${stats.regenerates || 0}</dd>
        <dt>再生成率</dt><dd>${formatRate(stats.regenerateRate)}</dd>
        <dt>继续拆解</dt><dd>${stats.rituals || 0}</dd>
        <dt>改写/收藏</dt><dd>${stats.remixes || 0} / ${stats.collections || 0}</dd>
      </dl>
    </article>
  `).join("");
}

function renderSources(summary) {
  const list = document.querySelector('[data-list="sources"]');
  const entries = Object.entries(summary.sourceSummary || {}).sort((a, b) => {
    return (b[1].starts + b[1].reports) - (a[1].starts + a[1].reports);
  });

  if (!entries.length) {
    list.innerHTML = '<p class="empty">还没有来源数据。</p>';
    return;
  }

  list.innerHTML = entries.map(([source, stats]) => `
    <article class="variant-card">
      <strong>${source}</strong>
      <dl>
        <dt>事件</dt><dd>${stats.events || 0}</dd>
        <dt>开始</dt><dd>${stats.starts || 0}</dd>
        <dt>报告</dt><dd>${stats.reports || 0}</dd>
        <dt>报告率</dt><dd>${formatRate(stats.reportRate)}</dd>
        <dt>分享</dt><dd>${stats.shares || 0}</dd>
        <dt>分享率</dt><dd>${formatRate(stats.shareRate)}</dd>
        <dt>留资</dt><dd>${stats.leadIntents || 0}</dd>
        <dt>留资率</dt><dd>${formatRate(stats.leadIntentRate)}</dd>
        <dt>继续拆解</dt><dd>${stats.rituals || 0}</dd>
        <dt>改写/收藏</dt><dd>${stats.remixes || 0} / ${stats.collections || 0}</dd>
      </dl>
    </article>
  `).join("");
}

function renderAppInterests(summary) {
  const list = document.querySelector('[data-list="app-interests"]');
  const entries = Object.entries(summary.appInterestSummary || {}).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    list.innerHTML = '<p class="empty">还没有 App 兴趣点击。</p>';
    return;
  }

  list.innerHTML = entries.map(([interest, count]) => `
    <article class="variant-card">
      <strong>${interest}</strong>
      <dl>
        <dt>点击</dt><dd>${count}</dd>
      </dl>
    </article>
  `).join("");
}

function renderLeads(summary) {
  const list = document.querySelector('[data-list="leads"]');
  const entries = Object.entries(summary.leadSummary || {}).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    list.innerHTML = '<p class="empty">还没有留资意向。</p>';
    return;
  }

  list.innerHTML = entries.map(([method, count]) => `
    <article class="variant-card">
      <strong>${method}</strong>
      <dl>
        <dt>点击</dt><dd>${count}</dd>
      </dl>
    </article>
  `).join("");
}

function renderFeedback(summary) {
  const list = document.querySelector('[data-list="feedback"]');
  const entries = Object.entries(summary.feedbackSummary || {}).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    list.innerHTML = '<p class="empty">还没有内容反馈。</p>';
    return;
  }

  list.innerHTML = entries.map(([feedback, count]) => `
    <article class="variant-card">
      <strong>${feedback}</strong>
      <dl>
        <dt>点击</dt><dd>${count}</dd>
      </dl>
    </article>
  `).join("");
}

function renderResultInteractions(summary) {
  const list = document.querySelector('[data-list="result-interactions"]');
  const interaction = summary.resultInteractionSummary || {};
  const entries = [
    ...Object.entries(interaction.rituals || {}).map(([name, count]) => ({ label: `拆解：${name}`, count })),
    ...Object.entries(interaction.remixes || {}).map(([name, count]) => ({ label: `改写：${name}`, count })),
    { label: "复制改写", count: interaction.remixCopies || 0 },
    { label: "收藏档案", count: interaction.collections || 0 },
    { label: "清空档案", count: interaction.archiveClears || 0 }
  ].filter((item) => item.count > 0).sort((a, b) => b.count - a.count);

  if (!entries.length) {
    list.innerHTML = '<p class="empty">还没有结果页互动。</p>';
    return;
  }

  list.innerHTML = entries.map((item) => `
    <article class="variant-card">
      <strong>${item.label}</strong>
      <dl>
        <dt>次数</dt><dd>${item.count}</dd>
      </dl>
    </article>
  `).join("");
}

function renderInterviews(summary) {
  const list = document.querySelector('[data-list="interviews"]');
  const interviews = [...(summary.latestInterviews || [])].reverse();

  if (!interviews.length) {
    list.innerHTML = '<p class="empty">还没有访谈记录。</p>';
    return;
  }

  list.innerHTML = interviews.map((item) => `
    <article class="report-card">
      <strong>${item.segment || "unknown"}</strong>
      <p>${item.bestLine || "未记录命中句"}</p>
      <div class="meta">
        保存：${item.saveReason || "-"} · App：${item.appWish || "-"} · 顾虑：${item.concern || "-"} · ${item.createdAt || ""}
      </div>
    </article>
  `).join("");
}

function renderReports(summary) {
  const list = document.querySelector('[data-list="reports"]');
  const reports = [...(summary.latestReports || [])].reverse();

  if (!reports.length) {
    list.innerHTML = '<p class="empty">还没有报告。</p>';
    return;
  }

  list.innerHTML = reports.map((report) => `
    <article class="report-card">
      <strong>${report.title || "未命名报告"}</strong>
      <p>${report.quote || ""}</p>
      <div class="meta">
        ${report.entryVariant || "unknown"} · ${report.scene || "unknown"} · ${report.style || "unknown"} · ${report.source || "unknown"} · ${report.campaign || "unknown"} · ${report.createdAt || ""}
      </div>
    </article>
  `).join("");
}

async function refresh() {
  try {
    const [summary, readiness, deliveryAudit, pencilAssets, samplingLinks] = await Promise.all([
      loadSummary(),
      loadLaunchReadiness(),
      loadDeliveryAudit(),
      loadPencilAssets(),
      loadSamplingLinks()
    ]);
    renderStats(summary);
    renderLaunchReadiness(readiness);
    renderDeliveryAudit(deliveryAudit);
    renderPencilAssets(pencilAssets);
    renderDecisionSummary(summary);
    renderSamplingLinks(samplingLinks);
    renderEvents(summary);
    renderFunnel(summary);
    renderVariants(summary);
    renderSources(summary);
    renderAppInterests(summary);
    renderLeads(summary);
    renderFeedback(summary);
    renderResultInteractions(summary);
    renderInterviews(summary);
    renderReports(summary);
  } catch (error) {
    document.querySelector('[data-list="events"]').innerHTML = '<p class="empty">数据加载失败。</p>';
    document.querySelector("[data-launch-status]").textContent = "投放状态加载失败";
  }
}

async function exportRuntimeData() {
  const status = document.querySelector("[data-export-status]");
  status.textContent = "导出中...";
  try {
    const payload = await loadExport();
    const stamp = payload.exportedAt.replace(/[:.]/g, "-");
    downloadJson(`mouth-hard-runtime-${stamp}.json`, payload);
    status.textContent = `已导出 ${payload.reports.length} 条报告 / ${payload.events.length} 条事件`;
  } catch (error) {
    status.textContent = "导出失败";
  }
}

async function exportRuntimeTables() {
  const status = document.querySelector("[data-export-status]");
  status.textContent = "导出表格中...";
  try {
    const payload = await loadExport();
    const stamp = payload.exportedAt.replace(/[:.]/g, "-");
    downloadJson(`mouth-hard-runtime-tables-${stamp}.json`, buildCsvBundle(payload));
    status.textContent = "已导出事件/入口/来源/互动/兴趣/留资/反馈/访谈/投放链接表格";
  } catch (error) {
    status.textContent = "导出失败";
  }
}

document.querySelector('[data-form="interview"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  const status = document.querySelector("[data-export-status]");
  status.textContent = "记录访谈中...";
  try {
    await submitInterview(payload);
    form.reset();
    status.textContent = "访谈已记录";
    refresh();
  } catch (error) {
    status.textContent = "访谈记录失败";
  }
});

document.querySelector('[data-action="refresh"]').addEventListener("click", refresh);
document.querySelector('[data-action="export"]').addEventListener("click", exportRuntimeData);
document.querySelector('[data-action="export-csv"]').addEventListener("click", exportRuntimeTables);
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy-url]");
  if (!button) return;
  const status = document.querySelector("[data-export-status]");
  try {
    await navigator.clipboard.writeText(button.dataset.copyUrl);
    status.textContent = "投放链接已复制";
  } catch (error) {
    status.textContent = button.dataset.copyUrl;
  }
});

refresh();
