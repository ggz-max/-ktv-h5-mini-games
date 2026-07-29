const state = {
  scene: "work_pressure",
  style: "decent_breakdown",
  configVersion: null,
  experimentVersion: null,
  entryVariant: null,
  acquisition: null,
  report: null,
  activeRemix: "group_chat",
  collectedReports: []
};

const screens = Array.from(document.querySelectorAll(".screen"));
const toast = document.querySelector(".toast");

function track(event, payload = {}) {
  fetch("/api/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      visitorId: getVisitorId(),
      payload: {
        visitorId: getVisitorId(),
        entryVariant: state.entryVariant,
        experimentVersion: state.experimentVersion,
        configVersion: state.configVersion,
        ...(state.acquisition || {}),
        ...payload
      },
      sessionId: getSessionId(),
      timestamp: Date.now()
    })
  }).catch(() => {});
}

function getAcquisition() {
  const key = "mh_acquisition";
  const params = new URLSearchParams(window.location.search);
  const defaults = {
    source: "h5_mvp",
    campaign: "default",
    channel: "direct",
    storeId: "",
    roomId: ""
  };
  const current = {
    source: params.get("source") || params.get("utm_source") || "",
    campaign: params.get("campaign") || params.get("utm_campaign") || "",
    channel: params.get("channel") || params.get("utm_medium") || "",
    storeId: params.get("storeId") || params.get("store_id") || "",
    roomId: params.get("roomId") || params.get("room_id") || ""
  };
  const hasCurrent = Object.values(current).some(Boolean);
  if (hasCurrent) {
    const merged = { ...defaults, ...current };
    sessionStorage.setItem(key, JSON.stringify(merged));
    return merged;
  }
  try {
    return { ...defaults, ...JSON.parse(sessionStorage.getItem(key) || "{}") };
  } catch (error) {
    return defaults;
  }
}

function getEntryVariant() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("variant");
  if (requested) {
    sessionStorage.setItem("mh_entry_variant", requested);
    return requested;
  }
  const stored = sessionStorage.getItem("mh_entry_variant");
  if (stored) return stored;
  const pool = ["report", "persona", "translator"];
  const selected = pool[Math.floor(Math.random() * pool.length)];
  sessionStorage.setItem("mh_entry_variant", selected);
  return selected;
}

function getSessionId() {
  const key = "mh_session_id";
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, value);
  }
  return value;
}

function getVisitorId() {
  const key = "mh_visitor_id";
  let value = "";
  try {
    value = localStorage.getItem(key);
    if (!value) {
      value = `uv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key, value);
    }
  } catch (error) {
    value = sessionStorage.getItem(key);
    if (!value) {
      value = `uv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(key, value);
    }
  }
  return value;
}

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === name);
  });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function buildShareText() {
  if (!state.report) return "";
  return `${state.report.title}：${state.report.quote}`;
}

function hash(value) {
  return Array.from(String(value)).reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
}

function seededIndex(seed, list) {
  if (!list.length) return 0;
  return Math.abs(hash(seed)) % list.length;
}

function reportSeed(extra = "") {
  return `${state.report?.reportId || "demo"}:${state.report?.title || ""}:${state.scene}:${state.style}:${extra}`;
}

function getRitualText(kind) {
  if (!state.report) return "";
  const pools = {
    comfort: [
      "今晚只做一件事：洗个热水澡，把手机放远一点。你不是要重启人生，你只是需要先重启身体。",
      "把今天最烦的一句话写下来，然后补一句：这不代表我整个人都失败。写完就收工。",
      "找一个不用解释的人发一个表情包。不是求救，是给自己开一条小缝。"
    ],
    roast: [
      `本日状态：${state.report.title}。看起来能沟通，实际上内心已经把会议纪要烧了。`,
      `我现在很好，好到理智电量只剩 ${state.report.energy.sanity}%，但嘴硬指数还能维持体面营业。`,
      "别问，问就是没事。再问就是我正在用最后的礼貌保护这个世界。"
    ],
    truth: [
      "潜台词：我不是不在乎，我是怕一认真就显得自己输太多。",
      "潜台词：我嘴上说算了，心里其实还在等一个合理解释。",
      "潜台词：我需要被看见，但不想把自己说得太可怜。"
    ],
    tomorrow: [
      "明天计划：先完成一个最小任务，再决定要不要继续当成熟大人。",
      "明天计划：把难事拆成 20 分钟，不要一醒来就审判整个人生。",
      "明天计划：先吃饭、再回复、最后复盘。顺序错了会直接发疯。"
    ]
  };
  const pool = pools[kind] || pools.comfort;
  return pool[seededIndex(reportSeed(kind), pool)];
}

function getRemixText(kind = state.activeRemix) {
  if (!state.report) return "";
  const energy = state.report.energy || { sanity: 0, mouthHard: 0, needSleep: 0 };
  const remix = {
    group_chat: [
      `${state.report.title}上线：${state.report.quote} 理智电量 ${energy.sanity}%，但还能礼貌发疯。`,
      `今日报告说我${state.report.title}。本人声明：没事，只是精神系统正在低电量运行。`,
      `嘴硬指数 ${energy.mouthHard}%。我不是崩了，我只是把崩溃做成了静音版。`
    ],
    moments: [
      `今日精神状态：${state.report.title}。\n${state.report.quote}\n先不解释了，解释会显得我很需要被理解。`,
      `给今天一个标题：${state.report.title}。\n看似风平浪静，实则内心已经开了三轮临时会议。`,
      `${state.report.title}。\n不求被懂，但求今晚别再突然想通一些没用的人生道理。`
    ],
    diary: [
      `今天的我被系统评为“${state.report.title}”。${state.report.quote} 我决定先不解决人生，只解决今晚怎么睡。`,
      `记录一下：理智 ${energy.sanity}%，嘴硬 ${energy.mouthHard}%，需要睡觉 ${energy.needSleep}%。结论：先活过今天。`,
      `今天没有大事发生，但我依旧像经历了一场内部发布会。${state.report.advice}`
    ]
  };
  const pool = remix[kind] || remix.group_chat;
  return pool[seededIndex(reportSeed(kind), pool)];
}

function renderRemix(kind = state.activeRemix) {
  state.activeRemix = kind;
  document.querySelectorAll("[data-remix]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.remix === kind);
  });
  const output = document.querySelector("[data-remix-output]");
  if (output) output.textContent = getRemixText(kind);
}

function updateCollectionPanel() {
  const title = document.querySelector("[data-collection-title]");
  const note = document.querySelector("[data-collection-note]");
  if (!title || !note) return;
  const count = state.collectedReports.length;
  if (!count) {
    title.textContent = "未收藏";
    note.textContent = "点一下收藏，看看你更像哪种发疯类型。";
    return;
  }
  title.textContent = `已收藏 ${count} 份`;
  const latest = state.collectedReports[count - 1];
  note.textContent = `最近一份：${latest.title}`;
}

function formatShortDate(value) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function renderArchive() {
  const count = state.collectedReports.length;
  const countNode = document.querySelector("[data-archive-count]");
  const noteNode = document.querySelector("[data-archive-note]");
  const mouthHardNode = document.querySelector('[data-archive-stat="mouthHard"]');
  const needSleepNode = document.querySelector('[data-archive-stat="needSleep"]');
  const latestNode = document.querySelector('[data-archive-stat="latest"]');
  const list = document.querySelector("[data-archive-list]");
  if (!countNode || !noteNode || !mouthHardNode || !needSleepNode || !latestNode || !list) return;

  countNode.textContent = String(count);
  if (!count) {
    noteNode.textContent = "还没有收藏报告";
    mouthHardNode.textContent = "-";
    needSleepNode.textContent = "-";
    latestNode.textContent = "-";
    list.innerHTML = '<article><strong>暂无档案</strong><p>先生成一份报告，再点“加入今日档案”。</p></article>';
    return;
  }

  const latest = state.collectedReports[count - 1];
  const maxMouthHard = Math.max(...state.collectedReports.map((item) => item.energy?.mouthHard || 0));
  const maxNeedSleep = Math.max(...state.collectedReports.map((item) => item.energy?.needSleep || 0));
  noteNode.textContent = `最近收藏：${formatShortDate(latest.createdAt)}`;
  mouthHardNode.textContent = `${maxMouthHard}%`;
  needSleepNode.textContent = `${maxNeedSleep}%`;
  latestNode.textContent = latest.title || "未命名";

  list.innerHTML = [...state.collectedReports].reverse().slice(0, 6).map((item) => {
    const energy = item.energy || {};
    return `
      <article>
        <strong>${item.title || "未命名报告"}</strong>
        <p>理智 ${energy.sanity || 0}% / 嘴硬 ${energy.mouthHard || 0}% / 需要睡觉 ${energy.needSleep || 0}%</p>
        <small>${formatShortDate(item.createdAt)}</small>
      </article>
    `;
  }).join("");
}

function loadCollection() {
  try {
    state.collectedReports = JSON.parse(localStorage.getItem("mh_report_collection") || "[]");
  } catch (error) {
    state.collectedReports = [];
  }
  updateCollectionPanel();
  renderArchive();
}

function saveCollection() {
  localStorage.setItem("mh_report_collection", JSON.stringify(state.collectedReports.slice(-20)));
  updateCollectionPanel();
  renderArchive();
}

function selectInGroup(button) {
  const group = button.closest("[data-field]");
  group.querySelectorAll("button").forEach((item) => item.classList.remove("is-selected"));
  button.classList.add("is-selected");
  state[group.dataset.field] = button.dataset.value;
  track(`mh_${group.dataset.field}_select`, { value: button.dataset.value });
}

function renderConfig(config) {
  state.configVersion = config.version;
  state.experimentVersion = config.experimentVersion;
  state.entryVariant = config.entryVariant;
  if (config.entryCopy) {
    Object.entries(config.entryCopy).forEach(([key, value]) => {
      const node = document.querySelector(`[data-entry="${key}"]`);
      if (node) node.textContent = value;
    });
  }
  const sceneGroup = document.querySelector('[data-field="scene"]');
  const styleGroup = document.querySelector('[data-field="style"]');

  sceneGroup.innerHTML = "";
  config.scenes.forEach((scene, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${index === 0 ? " is-selected" : ""}`;
    button.dataset.value = scene.key;
    button.textContent = scene.label;
    sceneGroup.appendChild(button);
    if (index === 0) state.scene = scene.key;
  });

  styleGroup.innerHTML = "";
  config.styles.forEach((style, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `style-card${index === 0 ? " is-selected" : ""}`;
    button.dataset.value = style.key;
    button.innerHTML = `<strong>${style.label}</strong><span>${style.description}</span>`;
    styleGroup.appendChild(button);
    if (index === 0) state.style = style.key;
  });
}

function fallbackConfig() {
  renderConfig({
    version: "fallback",
    scenes: [
      { key: "work_pressure", label: "上班/上学受气" },
      { key: "heartbreak", label: "失恋/暧昧失败" },
      { key: "friendship", label: "朋友关系内耗" },
      { key: "midnight_emo", label: "深夜 emo" },
      { key: "future_anxiety", label: "未来焦虑" },
      { key: "nostalgia", label: "怀旧突然袭击" },
      { key: "money", label: "钱包状态异常" },
      { key: "tired", label: "什么都没发生但累" }
    ],
    styles: [
      { key: "decent_breakdown", label: "体面崩溃", description: "看起来没事，其实已静音爆炸" },
      { key: "worker_madness", label: "打工人发疯", description: "把忍耐力写进日报" },
      { key: "heartbreak", label: "失恋嘴硬", description: "副歌一响，立刻装忙" },
      { key: "sarcastic", label: "阴阳怪气", description: "很大度，但已经记账" },
      { key: "clear_shutdown", label: "人间清醒装死", description: "懂很多，但今天不参与" },
      { key: "abstract", label: "抽象乱码", description: "脑子到了，门没开" },
      { key: "gentle", label: "温柔自救", description: "不硬撑，也不审判" }
    ]
  });
}
async function loadConfig() {
  state.acquisition = getAcquisition();
  try {
    const response = await fetch(`/api/v1/mouth-hard/config?variant=${encodeURIComponent(getEntryVariant())}`);
    if (!response.ok) throw new Error("config_failed");
    renderConfig(await response.json());
  } catch (error) {
    fallbackConfig();
  }
}

async function generateReport(text) {
  showScreen("loading");
  track("mh_text_submit", { hasText: Boolean(text) });

  const response = await fetch("/api/v1/mouth-hard/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scene: state.scene,
      style: state.style,
      text,
      source: state.acquisition?.source || "h5_mvp",
      configVersion: state.configVersion,
      experimentVersion: state.experimentVersion,
      entryVariant: state.entryVariant,
      campaign: state.acquisition?.campaign || "default",
      channel: state.acquisition?.channel || "direct",
      storeId: state.acquisition?.storeId || "",
      roomId: state.acquisition?.roomId || ""
    })
  });

  if (!response.ok) {
    throw new Error("generate_failed");
  }
  return response.json();
}

function renderReport(report) {
  state.report = report;
  state.activeRemix = "group_chat";
  document.querySelector('[data-report="date"]').textContent = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());
  document.querySelector('[data-report="title"]').textContent = report.title;
  document.querySelector('[data-report="quote"]').textContent = report.quote;
  document.querySelector('[data-report="advice"]').textContent = report.advice;

  const bullets = document.querySelector('[data-report="bullets"]');
  bullets.innerHTML = "";
  report.bullets.forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    bullets.appendChild(item);
  });

  ["sanity", "mouthHard", "needSleep"].forEach((key) => {
    const value = report.energy[key];
    document.querySelector(`[data-report="${key}"]`).textContent = `${value}%`;
    document.querySelector(`[data-bar="${key}"]`).style.width = `${value}%`;
  });

  track("mh_generate_success", {
    reportId: report.reportId,
    riskLevel: report.riskLevel
  });
  const ritualResult = document.querySelector("[data-ritual-result]");
  if (ritualResult) {
    ritualResult.hidden = true;
    ritualResult.textContent = "";
  }
  renderRemix("group_chat");
  updateCollectionPanel();
  showScreen("result");
}

function demoReport() {
  return {
    reportId: "demo",
    riskLevel: "normal",
    title: "嘴硬型脆皮人类",
    quote: "你不是没事，你只是把崩溃调成了静音模式。",
    bullets: [
      "表面：还能回消息，甚至会发表情包。",
      "真实：心里已经开了三次临时会议。",
      "嘴硬：没关系，我只是暂时不想做人。"
    ],
    advice: "先别复盘人生，先喝口水。",
    energy: { sanity: 36, mouthHard: 91, needSleep: 84 }
  };
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.closest("[data-field]")) {
    selectInGroup(button);
    return;
  }

  const action = button.dataset.action;
  if (action === "start") {
    track("mh_start_click", { entryVariant: state.entryVariant });
    showScreen("input");
  }
  if (action === "demo") {
    track("mh_demo_click", { entryVariant: state.entryVariant });
    renderReport(demoReport());
  }
  if (action === "back") {
    showScreen("home");
  }
  if (action === "restart") {
    track("mh_regenerate_click", {
      reportId: state.report?.reportId,
      fromScreen: button.closest("[data-screen]")?.dataset.screen || "unknown"
    });
    showScreen("input");
  }
  if (action === "save") {
    track("mh_save_click", { reportId: state.report?.reportId });
    downloadSharePoster();
  }
  if (action === "copy") {
    const text = buildShareText();
    navigator.clipboard?.writeText(text).then(
      () => showToast("嘴硬文案已复制"),
      () => showToast("复制失败，可以手动截图")
    );
    track("mh_copy_click", { reportId: state.report?.reportId });
  }
  if (action === "ritual") {
    if (!state.report) {
      showToast("先生成一份报告");
      return;
    }
    const kind = button.dataset.ritual || "comfort";
    const result = document.querySelector("[data-ritual-result]");
    if (result) {
      result.textContent = getRitualText(kind);
      result.hidden = false;
    }
    track("mh_result_ritual_click", {
      reportId: state.report.reportId,
      ritual: kind
    });
  }
  if (action === "remix") {
    const kind = button.dataset.remix || "group_chat";
    renderRemix(kind);
    track("mh_result_remix_click", {
      reportId: state.report?.reportId,
      remix: kind
    });
  }
  if (action === "copy-remix") {
    const text = getRemixText();
    navigator.clipboard?.writeText(text).then(
      () => showToast("这版文案已复制"),
      () => showToast("复制失败，可以长按手动复制")
    );
    track("mh_result_remix_copy", {
      reportId: state.report?.reportId,
      remix: state.activeRemix
    });
  }
  if (action === "collect") {
    if (!state.report) {
      showToast("先生成一份报告");
      return;
    }
    const record = {
      reportId: state.report.reportId,
      title: state.report.title,
      createdAt: new Date().toISOString(),
      energy: state.report.energy
    };
    state.collectedReports = state.collectedReports
      .filter((item) => item.reportId !== record.reportId)
      .concat(record)
      .slice(-20);
    saveCollection();
    showToast("已加入今日档案");
    track("mh_report_collect_click", {
      reportId: state.report.reportId,
      collectionSize: state.collectedReports.length
    });
  }
  if (action === "app") {
    track("mh_app_cta_click", { reportId: state.report?.reportId });
    renderArchive();
    showScreen("app");
  }
  if (action === "archive-back") {
    showScreen(state.report ? "result" : "home");
  }
  if (action === "archive-clear") {
    state.collectedReports = [];
    saveCollection();
    showToast("本地档案已清空");
    track("mh_archive_clear_click", {
      reportId: state.report?.reportId
    });
  }
  if (action === "interest") {
    track("mh_app_interest_click", {
      reportId: state.report?.reportId,
      interest: button.dataset.interest
    });
    showToast("已记录，先替你偷偷排进愿望单");
  }
  if (action === "lead") {
    const method = button.dataset.leadMethod || "unknown";
    track("mh_lead_intent_click", {
      reportId: state.report?.reportId,
      method
    });
    showToast(method === "skip" ? "好，先继续用 H5 玩" : "已记录提醒意向，暂不收真实信息");
  }
});

document.querySelector(".input-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = event.currentTarget.querySelector("textarea").value.trim();
  try {
    const report = await generateReport(text);
    window.setTimeout(() => renderReport(report), 650);
  } catch (error) {
    track("mh_generate_fail", { message: error.message });
    showToast("生成失败，先用样例顶一下");
    renderReport(demoReport());
  }
});

loadCollection();
loadConfig().then(() => track("mh_home_view", { configVersion: state.configVersion }));

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const chars = Array.from(text);
  let line = "";
  let lines = [];
  chars.forEach((char) => {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`;
  }
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawBar(ctx, label, value, x, y, width) {
  ctx.fillStyle = "#1e1a22";
  ctx.font = "700 24px Arial, sans-serif";
  ctx.fillText(label, x, y);
  ctx.fillText(`${value}%`, x + width - 56, y);
  roundedRect(ctx, x, y + 18, width, 18, 9);
  ctx.fillStyle = "rgba(30, 26, 34, 0.14)";
  ctx.fill();
  roundedRect(ctx, x, y + 18, Math.max(18, width * value / 100), 18, 9);
  ctx.fillStyle = "#b7ff5a";
  ctx.fill();
  ctx.strokeStyle = "#1e1a22";
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y + 18, width, 18, 9);
  ctx.stroke();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function downloadSharePoster() {
  if (!state.report) {
    showToast("先生成一份报告");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d");
  const report = state.report;

  try {
    const bg = await loadImage("./assets/visuals/pencil-export/share-poster-bg.png");
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  } catch (error) {
    ctx.fillStyle = "#17151f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    roundedRect(ctx, 76, 92, 928, 1188, 26);
    ctx.fillStyle = "#fff2d8";
    ctx.fill();
  }

  ctx.save();
  ctx.translate(112, 132);
  ctx.rotate(-0.045);
  roundedRect(ctx, 0, 0, 226, 62, 10);
  ctx.fillStyle = "#ff5c9a";
  ctx.fill();
  ctx.strokeStyle = "#1e1a22";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 26px Arial, sans-serif";
  ctx.fillText("今日称号", 42, 40);
  ctx.restore();

  ctx.fillStyle = "rgba(30, 26, 34, 0.62)";
  ctx.font = "800 26px Arial, sans-serif";
  ctx.fillText(new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date()), 112, 250);

  ctx.fillStyle = "#1e1a22";
  ctx.font = "900 64px Arial, sans-serif";
  wrapText(ctx, report.title, 112, 330, 820, 74, 2);

  ctx.font = "900 42px Arial, sans-serif";
  const quoteEnd = wrapText(ctx, report.quote, 112, 500, 820, 58, 3);

  drawBar(ctx, "理智电量", report.energy.sanity, 112, quoteEnd + 62, 820);
  drawBar(ctx, "嘴硬指数", report.energy.mouthHard, 112, quoteEnd + 142, 820);
  drawBar(ctx, "需要睡觉", report.energy.needSleep, 112, quoteEnd + 222, 820);

  let bulletY = quoteEnd + 340;
  ctx.font = "700 30px Arial, sans-serif";
  report.bullets.forEach((bullet) => {
    roundedRect(ctx, 112, bulletY - 40, 820, 76, 14);
    ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
    ctx.fill();
    ctx.strokeStyle = "rgba(30, 26, 34, 0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1e1a22";
    wrapText(ctx, bullet, 140, bulletY + 8, 764, 36, 1);
    bulletY += 96;
  });

  roundedRect(ctx, 112, 1090, 820, 96, 16);
  ctx.fillStyle = "#1e1a22";
  ctx.fill();
  ctx.fillStyle = "#fff2d8";
  ctx.font = "800 30px Arial, sans-serif";
  wrapText(ctx, report.advice, 144, 1150, 760, 38, 1);

  ctx.fillStyle = "#b7ff5a";
  ctx.font = "900 32px Arial, sans-serif";
  ctx.fillText("嘴硬日记", 112, 1348);
  ctx.fillStyle = "#a8a0b5";
  ctx.font = "700 24px Arial, sans-serif";
  ctx.fillText("把今天的破事翻译成精神状态报告", 112, 1386);

  const link = document.createElement("a");
  link.download = `mouth-hard-report-${report.reportId || Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  showToast("报告图已生成下载");
}

