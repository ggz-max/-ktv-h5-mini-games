import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const VISITOR_KEY = "skip-song-reflex-visitor";
const SESSION_KEY = "skip-song-reflex-session";
const urlParams = new URLSearchParams(window.location.search);

function createClientId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readClientId(storage, key, prefix) {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const next = createClientId(prefix);
    storage.setItem(key, next);
    return next;
  } catch {
    return createClientId(prefix);
  }
}

const analyticsContext = {
  visitorId: readClientId(window.localStorage, VISITOR_KEY, "uv"),
  sessionId: readClientId(window.sessionStorage, SESSION_KEY, "ss"),
  source: urlParams.get("source") || urlParams.get("utm_source") || "ktv_song_h5"
};

const ASSETS = {
  hero: "./assets/pencil/pQPyF.png",
  console: "./assets/pencil/EtBJI.png",
  poster: "./assets/pencil/yXObC.png",
  resultPanel: "./assets/pencil/R3VGhW.png",
  track: "./assets/pencil/XyWbW.png",
  hitZone: "./assets/pencil/XVtuA.png",
  cutButton: "./assets/pencil/TWG9B.png",
  grabButton: "./assets/pencil/qZ7D8.png",
  rescueButton: "./assets/pencil/j6wyE.png"
};

const TRACK_LEAD_MS = 2200;
const TRACK_TAIL_MS = 900;
const CARD_EDGE_OFFSET = 42;
const FEVER_DURATION_MS = 4200;
const FEVER_TRIGGER_COMBO = 5;

const state = {
  config: null,
  screen: "entry",
  levelIndex: 0,
  pendingLevelIndex: 0,
  running: false,
  startedAt: 0,
  activeEvents: [],
  handledEvents: new Set(),
  score: 0,
  combo: 0,
  maxCombo: 0,
  hitCount: 0,
  missCount: 0,
  slipCount: 0,
  coldValue: 0,
  feedback: "亮了再点，别乱切",
  lastHit: null,
  lastMiss: null,
  feverUntil: 0,
  feverCount: 0,
  lastGain: 0,
  lastDecoyByButton: {
    cut: null,
    grab: null,
    rescue: null
  },
  result: null,
  rafId: null
};

const app = document.querySelector("#app");

async function fetchJson(pathname, options) {
  const response = await fetch(`${API_BASE}${pathname}`, options);
  if (!response.ok) throw new Error(`${pathname} failed`);
  return response.json();
}

function analyticsPayload(payload = {}) {
  const level = state.config?.levels?.[state.pendingLevelIndex] || state.config?.levels?.[state.levelIndex] || {};
  return {
    visitorId: analyticsContext.visitorId,
    sessionId: analyticsContext.sessionId,
    source: analyticsContext.source,
    screen: state.screen,
    levelId: level.id,
    levelIndex: state.pendingLevelIndex,
    levelLabel: level.label,
    roomCode: state.config?.roomCode,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    referrer: document.referrer,
    ts: Date.now(),
    ...payload
  };
}

function track(type, payload = {}) {
  fetchJson("/api/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, payload: analyticsPayload(payload) })
  }).catch(() => {});
}

function statusBar() {
  return `<div class="status-bar"><span>23:18</span><span>5G ▰</span></div>`;
}

function renderEntry() {
  app.innerHTML = `
    <section class="screen">
      <div class="stage-light stage-light-cyan"></div>
      <div class="stage-light stage-light-pink"></div>
      ${statusBar()}
      <img class="hero-image" src="${ASSETS.hero}" alt="切歌别手滑入口主视觉" />
      <div class="hero-copy">
        <div class="eyebrow">A08 遥控器挑战</div>
        <h1 class="title title-compact">30 秒遥控器挑战</h1>
        <p class="subtitle">30 秒守住副歌，切错一首全场沉默。</p>
      </div>
      <button class="cta" data-action="level-map">选择一局开玩</button>
      <div class="hint-row">
        <span class="chip">简单</span>
        <span class="chip">困难</span>
        <span class="chip">随时换局</span>
      </div>
      <p class="notice">仅使用虚拟节奏事件，不播放版权音乐，也不录音评分。</p>
    </section>
  `;
}

function renderLevelMap() {
  const levels = state.config.levels;
  app.innerHTML = `
    <section class="screen level-screen">
      <div class="stage-light stage-light-cyan"></div>
      <div class="stage-light stage-light-pink"></div>
      ${statusBar()}
      <div class="level-head">
        <div>
          <div class="eyebrow">A08 直接开局</div>
          <h1 class="title title-compact">选一局，马上开始</h1>
        </div>
        <div class="star-total">${levels.length} 局</div>
      </div>
      <div class="quick-rules">
        <div class="quick-rules-head">
          <strong>怎么玩</strong>
          <span>读完就能上手，选局后直接开始</span>
        </div>
        ${quickRule("1", "看文字按键", "卡片写“按切 / 按抢 / 按救”，就点对应按钮。")}
        ${quickRule("2", "颜色是干扰", "上方也用粉黄蓝，但一定会和正确按钮错位。")}
        ${quickRule("3", "进黄框再点", "太早、太晚、点错都会涨冷场；连击会触发热麦加分。")}
      </div>
      <div class="level-map">
        ${levels.map((level, index) => levelCard(level, index)).join("")}
      </div>
    </section>
  `;
}

function quickRule(number, title, desc) {
  return `
    <div class="quick-rule">
      <span class="quick-rule-num">${number}</span>
      <span>
        <strong>${title}</strong>
        <small>${desc}</small>
      </span>
    </div>
  `;
}

function levelCard(level, index) {
  return `
    <button class="level-card difficulty-${level.badge}" data-level-index="${index}">
      <span class="level-node">${index + 1}</span>
      <span class="level-copy">
        <strong>${level.label}</strong>
        <small>${level.brief}</small>
        <em>${level.badge} · 点击即开 · ${Math.round(level.durationMs / 1000)} 秒</em>
      </span>
    </button>
  `;
}

function renderTutorial() {
  const level = state.config.levels[state.pendingLevelIndex] || getLevel();
  app.innerHTML = `
    <section class="screen">
      <div class="stage-light stage-light-cyan"></div>
      ${statusBar()}
      <div class="tutorial-card">
        <div class="eyebrow">${level.badge} · 第 ${state.pendingLevelIndex + 1} 关</div>
        <h2 class="title" style="font-size: 30px;">${level.label}</h2>
        <p class="subtitle">${level.brief}</p>
        ${rule("等到中间黄框", "卡片中心压到黄框时再按，太早太晚都算手滑")}
        ${rule("卡上写什么就按什么", "按切、按抢、按救，三个按钮不用猜")}
        ${rule("冷场值别爆", "点错、漏点会涨冷场值，满了就提前结束")}
      </div>
      <button class="cta" data-action="start">开始本关</button>
      <button class="secondary" data-action="level-map">换一关</button>
    </section>
  `;
}

function rule(title, desc) {
  return `
    <div class="rule">
      <span class="dot"></span>
      <span>
        <div class="rule-title">${title}</div>
        <div class="rule-desc">${desc}</div>
      </span>
    </div>
  `;
}

function getLevel() {
  return state.config.levels[state.levelIndex % state.config.levels.length];
}

function getEvent(eventId) {
  return state.config.events.find(event => event.id === eventId);
}

function startGame() {
  state.levelIndex = state.pendingLevelIndex;
  state.screen = "game";
  state.running = true;
  state.startedAt = performance.now();
  state.activeEvents = [];
  state.handledEvents = new Set();
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.hitCount = 0;
  state.missCount = 0;
  state.slipCount = 0;
  state.coldValue = 0;
  state.feedback = "亮了再点，别乱切";
  state.lastHit = null;
  state.lastMiss = null;
  state.feverUntil = 0;
  state.feverCount = 0;
  state.lastGain = 0;
  state.lastDecoyByButton = {
    cut: null,
    grab: null,
    rescue: null
  };
  state.result = null;
  track("reflex_game_start", { levelId: getLevel().id });
  renderGame();
  loop();
}

function renderGame() {
  app.innerHTML = `
    <section class="screen">
      <div class="stage-light stage-light-cyan"></div>
      <div class="stage-light stage-light-pink"></div>
      ${statusBar()}
      <div class="hud">
        <div class="hud-item" id="combo">连击 00</div>
        <div class="hud-item" id="accuracy">准确 100%</div>
        <div class="hud-item" id="slips">冷场 00%</div>
      </div>
      <div class="game-console">
        <img class="console-bg" src="${ASSETS.console}" alt="游戏控台" />
        <div class="cue" id="cue">副歌来了</div>
        <div class="feedback" id="feedback">亮了再点，别乱切</div>
        <div class="fever-pill" id="feverPill">热麦 x1.5</div>
        <div class="track" id="track">
          <img class="track-base" src="${ASSETS.track}" alt="" />
          <img class="hit-zone" src="${ASSETS.hitZone}" alt="" />
        </div>
        <div class="hit-burst" id="hitBurst"></div>
        <div class="score-pop" id="scorePop">+0</div>
        <div class="console-lower-mask"></div>
        <div class="action-hints" aria-hidden="true">
          <span class="action-hint"><strong>切</strong><small>切歌</small></span>
          <span class="action-hint"><strong>抢</strong><small>抢麦</small></span>
          <span class="action-hint"><strong>救</strong><small>救场</small></span>
        </div>
        <div class="time-labels"><span>TIME</span><span>END</span></div>
        <div class="timer" id="timer">30.0s</div>
        <div class="cold-meter"><div class="cold-fill" id="coldFill"></div></div>
      </div>
      <div class="actions">
        ${actionButton("cut", ASSETS.cutButton, "切")}
        ${actionButton("grab", ASSETS.grabButton, "抢")}
        ${actionButton("rescue", ASSETS.rescueButton, "救")}
      </div>
    </section>
  `;
}

function actionButton(button, image, label) {
  return `<button class="action-btn" data-button="${button}" aria-label="${label}"><img src="${image}" alt="" /></button>`;
}

function loop() {
  if (!state.running) return;
  const level = getLevel();
  const elapsed = performance.now() - state.startedAt;
  const trackEl = document.querySelector("#track");
  const duration = level.durationMs;
  const goodWindowMs = level.goodWindowMs || state.config.goodWindowMs;
  const trackLeadMs = level.trackLeadMs || TRACK_LEAD_MS;
  const coldMax = level.coldMax || state.config.coldMax;

  for (const item of level.timeline) {
    if (elapsed > item.atMs - trackLeadMs && elapsed < item.atMs + TRACK_TAIL_MS && !state.handledEvents.has(item.atMs)) {
      if (!state.activeEvents.some(event => event.atMs === item.atMs)) {
        const event = getEvent(item.eventId);
        state.activeEvents.push({ ...item, event, decoyColor: pickDecoyColor(event) });
      }
    }
  }

  if (trackEl) {
    const cards = state.activeEvents.map(item => {
      const x = getCardX(item, elapsed, trackEl);
      return `
        <div class="event-card event-decoy-${item.decoyColor}" data-expected-button="${item.event.button}" style="left:${x}px">
          <span>${item.event.label}</span>
          <strong>按${labelFor(item.event.button)}</strong>
        </div>
      `;
    }).join("");
    trackEl.querySelectorAll(".event-card").forEach(node => node.remove());
    trackEl.insertAdjacentHTML("beforeend", cards);
  }

  for (const item of [...state.activeEvents]) {
    if (elapsed > item.atMs + goodWindowMs && !state.handledEvents.has(item.atMs)) {
      miss(item, "副歌过了你在犹豫");
    }
  }

  updateHud(Math.max(0, (duration - elapsed) / 1000));

  if (elapsed >= duration || state.coldValue >= coldMax) {
    finishGame();
    return;
  }

  state.rafId = requestAnimationFrame(loop);
}

function getCardX(item, elapsed, trackEl) {
  const level = getLevel();
  const trackLeadMs = level.trackLeadMs || TRACK_LEAD_MS;
  const trackWidth = trackEl.clientWidth || 298;
  const hitX = trackWidth / 2;
  const startX = -CARD_EDGE_OFFSET;
  const endX = trackWidth + CARD_EDGE_OFFSET;

  if (elapsed <= item.atMs) {
    const progress = clamp((elapsed - (item.atMs - trackLeadMs)) / trackLeadMs, 0, 1);
    return startX + (hitX - startX) * progress;
  }

  const progress = clamp((elapsed - item.atMs) / TRACK_TAIL_MS, 0, 1);
  return hitX + (endX - hitX) * progress;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function comboMultiplier(combo = state.combo) {
  if (combo >= 12) return 1.6;
  if (combo >= 8) return 1.4;
  if (combo >= 4) return 1.2;
  return 1;
}

function isFeverActive(now = performance.now()) {
  return state.feverUntil > now;
}

function pressButton(button) {
  if (!state.running) return;
  const elapsed = performance.now() - state.startedAt;
  const candidates = state.activeEvents
    .filter(item => !state.handledEvents.has(item.atMs))
    .map(item => ({ item, delta: Math.abs(elapsed - item.atMs) }))
    .sort((a, b) => a.delta - b.delta);

  const candidate = candidates[0];
  const level = getLevel();
  const goodWindowMs = level.goodWindowMs || state.config.goodWindowMs;
  const coldMax = level.coldMax || state.config.coldMax;
  if (!candidate || candidate.delta > goodWindowMs) {
    state.slipCount += 1;
    state.combo = 0;
    state.coldValue = Math.min(coldMax, state.coldValue + (level.emptyTapPenalty || 8));
    state.feverUntil = 0;
    state.lastGain = 0;
    state.lastMiss = performance.now();
    state.feedback = "遥控器漂移，手滑了";
    track("reflex_event_miss", { reason: "empty_tap", button });
    return;
  }

  if (candidate.item.event.button !== button) {
    miss(candidate.item, `点错了，应该按${labelFor(candidate.item.event.button)}`);
    return;
  }

  const perfectWindowMs = level.perfectWindowMs || state.config.perfectWindowMs;
  const windowMs = candidate.delta <= perfectWindowMs ? "perfect" : "good";
  const nextCombo = state.combo + 1;
  const windowBonus = windowMs === "perfect" ? 1.25 : 1;
  const streakBonus = comboMultiplier(nextCombo);
  const now = performance.now();
  const feverBonus = isFeverActive(now) ? 1.5 : 1;
  const gain = Math.round(candidate.item.event.points * windowBonus * streakBonus * feverBonus + state.combo * 4);
  state.score += gain;
  state.combo = nextCombo;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.hitCount += 1;
  state.lastGain = gain;
  if (candidate.item.event.button === "rescue") {
    const recover = windowMs === "perfect" ? 10 : 6;
    state.coldValue = Math.max(0, state.coldValue - recover);
    state.feedback = `救回来了，冷场 -${recover}`;
  } else {
    state.feedback = windowMs === "perfect" ? `完美进点 +${gain}` : `稳住连击 +${gain}`;
  }
  if (state.combo % FEVER_TRIGGER_COMBO === 0) {
    state.feverUntil = now + FEVER_DURATION_MS;
    state.feverCount += 1;
    state.feedback = `热麦冲刺！${state.combo} 连 x1.5`;
  }
  state.lastHit = now;
  state.handledEvents.add(candidate.item.atMs);
  state.activeEvents = state.activeEvents.filter(item => item.atMs !== candidate.item.atMs);
  track("reflex_event_hit", {
    eventId: candidate.item.eventId,
    window: windowMs,
    button,
    gain,
    combo: state.combo,
    fever: feverBonus > 1
  });
}

function miss(item, reason) {
  if (state.handledEvents.has(item.atMs)) return;
  state.handledEvents.add(item.atMs);
  state.activeEvents = state.activeEvents.filter(event => event.atMs !== item.atMs);
  state.combo = 0;
  state.missCount += 1;
  state.slipCount += 1;
  state.feverUntil = 0;
  state.lastGain = 0;
  state.lastMiss = performance.now();
  const level = getLevel();
  const coldMax = level.coldMax || state.config.coldMax;
  const multiplier = level.missPenaltyMultiplier || 1;
  state.coldValue = Math.min(coldMax, state.coldValue + Math.round(item.event.missPenalty * multiplier));
  state.feedback = reason;
  track("reflex_event_miss", { eventId: item.eventId, reason });
}

function labelFor(button) {
  return button === "cut" ? "切" : button === "grab" ? "抢" : "救";
}

function pickDecoyColor(event) {
  const palettes = {
    cut: ["gold", "cyan"],
    grab: ["pink", "cyan"],
    rescue: ["gold", "pink"]
  };
  const options = palettes[event.button] || ["gold"];
  const last = state.lastDecoyByButton[event.button];
  let color = options[Math.floor(Math.random() * options.length)];
  if (options.length > 1 && color === last) {
    const alternates = options.filter(option => option !== last);
    color = alternates[Math.floor(Math.random() * alternates.length)];
  }
  state.lastDecoyByButton[event.button] = color;
  return color;
}

function updateHud(secondsLeft) {
  const attempts = state.hitCount + state.missCount;
  const accuracy = attempts ? Math.round((state.hitCount / attempts) * 100) : 100;
  const level = getLevel();
  const duration = level.durationMs;
  const coldMax = level.coldMax || state.config.coldMax;
  const elapsed = Math.max(0, duration - secondsLeft * 1000);
  const timeProgress = Math.max(0, Math.min(100, ((duration - elapsed) / duration) * 100));
  const coldPercent = Math.round((state.coldValue / coldMax) * 100);
  const comboEl = document.querySelector("#combo");
  const accuracyEl = document.querySelector("#accuracy");
  const slipsEl = document.querySelector("#slips");
  const feedbackEl = document.querySelector("#feedback");
  const coldFill = document.querySelector("#coldFill");
  const timerEl = document.querySelector("#timer");
  const cueEl = document.querySelector("#cue");
  const burstEl = document.querySelector("#hitBurst");
  const feverPill = document.querySelector("#feverPill");
  const scorePop = document.querySelector("#scorePop");
  const consoleEl = document.querySelector(".game-console");
  const now = performance.now();
  const feverActive = isFeverActive(now);
  const multiplier = comboMultiplier();
  if (comboEl) comboEl.textContent = `连击 ${String(state.combo).padStart(2, "0")} x${multiplier.toFixed(1)}`;
  if (accuracyEl) accuracyEl.textContent = `准确 ${accuracy}%`;
  if (slipsEl) slipsEl.textContent = `冷场 ${String(coldPercent).padStart(2, "0")}%`;
  if (feedbackEl) feedbackEl.textContent = state.feedback;
  if (coldFill) coldFill.style.width = `${timeProgress}%`;
  if (timerEl) timerEl.textContent = `${secondsLeft.toFixed(1)}s`;
  if (cueEl && state.activeEvents[0]) cueEl.textContent = state.activeEvents[0].event.label;
  if (burstEl) burstEl.classList.toggle("is-on", state.lastHit && now - state.lastHit < 180);
  if (scorePop) {
    scorePop.textContent = `+${state.lastGain}`;
    scorePop.classList.toggle("is-on", state.lastGain > 0 && state.lastHit && now - state.lastHit < 520);
  }
  if (feverPill) {
    feverPill.textContent = feverActive ? `热麦 ${Math.ceil((state.feverUntil - now) / 1000)}s x1.5` : `${FEVER_TRIGGER_COMBO} 连热麦`;
    feverPill.classList.toggle("is-on", feverActive);
  }
  if (consoleEl) {
    consoleEl.classList.toggle("is-fever", feverActive);
    consoleEl.classList.toggle("is-shake", state.lastMiss && now - state.lastMiss < 220);
  }
}

function finishGame() {
  state.running = false;
  if (state.rafId) cancelAnimationFrame(state.rafId);
  const attempts = state.hitCount + state.missCount;
  const accuracy = attempts ? Math.round((state.hitCount / attempts) * 100) : 100;
  const rating = ratingFor(state.score);
  const defeatPercent = estimateDefeatPercent(state.score, accuracy, state.maxCombo, state.slipCount);
  state.result = {
    levelId: getLevel().id,
    score: state.score,
    accuracy,
    maxCombo: state.maxCombo,
    slipCount: state.slipCount,
    coldValue: state.coldValue,
    feverCount: state.feverCount,
    defeatPercent,
    highlight: highlightFor(accuracy, state.maxCombo, state.slipCount, state.feverCount),
    rating
  };
  track("reflex_game_finish", state.result);
  fetchJson("/api/score", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(state.result)
  }).catch(() => {});
  state.screen = "result";
  renderResult();
}

function ratingFor(score) {
  return state.config.ratings.reduce((current, item) => {
    return score >= item.minScore ? item.label : current;
  }, state.config.ratings[0].label);
}

function estimateDefeatPercent(score, accuracy, maxCombo, slipCount) {
  return Math.max(18, Math.min(99, Math.round(42 + score / 38 + accuracy / 8 + maxCombo * 1.7 - slipCount * 5)));
}

function highlightFor(accuracy, maxCombo, slipCount, feverCount) {
  if (accuracy >= 95 && slipCount <= 1) return "零手滑遥控王";
  if (feverCount >= 2) return "热麦发动机";
  if (maxCombo >= 10) return "包厢节奏官";
  if (slipCount >= 5) return "遥控器待观察";
  return "副歌守门员";
}

function renderResult() {
  const result = state.result;
  const level = getLevel();
  app.innerHTML = `
    <section class="screen">
      <div class="stage-light stage-light-cyan"></div>
      <div class="stage-light stage-light-pink"></div>
      ${statusBar()}
      <div class="result-card">
        <img class="result-panel-image" src="${ASSETS.resultPanel}" alt="" />
        <div class="eyebrow">A08 ROUND REPORT</div>
        <h1 class="title result-title">${result.rating}</h1>
        <div class="result-badge">${result.highlight}</div>
        <p class="subtitle result-subtitle">${level.badge}局「${level.label}」 · 击败本包厢 ${result.defeatPercent}% 玩家</p>
        <div class="stat-list">
          ${stat("得分", result.score)}
          ${stat("最大连击", result.maxCombo)}
          ${stat("准确率", `${result.accuracy}%`)}
          ${stat("热麦次数", result.feverCount)}
          ${stat("冷场值", result.coldValue)}
        </div>
      </div>
      <button class="cta" data-action="level-map">换一局</button>
      <button class="secondary" data-action="retry">重玩本关</button>
      <button class="secondary" data-action="entry">返回选局</button>
      <button class="secondary" data-action="share">生成挑战图</button>
    </section>
  `;
}

function stat(label, value) {
  return `<div class="stat-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderShare() {
  const result = state.result || { score: 0, accuracy: 0, maxCombo: 0, slipCount: 0, coldValue: 0, rating: "遥控器不该交给你", highlight: "副歌守门员", defeatPercent: 18 };
  app.innerHTML = `
    <section class="screen">
      <div class="stage-light stage-light-cyan"></div>
      ${statusBar()}
      <div class="poster-preview">
        <img class="poster-image" src="${ASSETS.poster}" alt="挑战海报" />
      </div>
      <div class="result-card">
        <div class="eyebrow">挑战文案</div>
        <p class="subtitle">我 30 秒得了 ${result.score} 分，拿到「${result.highlight}」，击败本包厢 ${result.defeatPercent}% 玩家。遥控器给你，你能不手滑吗？</p>
      </div>
      <button class="cta" data-action="copy">复制发群文案</button>
      <button class="secondary" data-action="result">返回结果</button>
    </section>
  `;
}

function copyShareText() {
  const result = state.result || { score: 0, rating: "遥控器不该交给你", highlight: "副歌守门员", defeatPercent: 18 };
  const text = `我在切歌别手滑拿了 ${result.score} 分，称号「${result.highlight}」，击败本包厢 ${result.defeatPercent}% 玩家。遥控器给你，你能不手滑吗？`;
  navigator.clipboard?.writeText(text).catch(() => {});
  track("reflex_result_share_click", { score: result.score });
}

app.addEventListener("click", event => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const button = event.target.closest("[data-button]")?.dataset.button;
  const levelIndex = event.target.closest("[data-level-index]")?.dataset.levelIndex;
  if (button) pressButton(button);
  if (levelIndex !== undefined) {
    selectLevel(Number(levelIndex));
    return;
  }
  if (!action) return;
  if (action === "tutorial") {
    state.screen = "tutorial";
    track("reflex_entry_click");
    renderTutorial();
  }
  if (action === "level-map") {
    state.screen = "levels";
    renderLevelMap();
  }
  if (action === "entry") renderLevelMap();
  if (action === "start") startGame();
  if (action === "retry") {
    state.pendingLevelIndex = state.levelIndex;
    track("reflex_retry_click");
    startGame();
  }
  if (action === "share") {
    state.screen = "share";
    renderShare();
  }
  if (action === "copy") copyShareText();
  if (action === "result") renderResult();
});

async function boot() {
  try {
    state.config = await fetchJson("/api/config");
  } catch {
    const fallback = await fetch("./config/game-config.json");
    state.config = await fallback.json();
  }
  track("reflex_entry_view");
  renderLevelMap();
}

function selectLevel(index) {
  state.pendingLevelIndex = index;
  track("reflex_level_select", { levelId: state.config.levels[index].id, index });
  startGame();
}

boot();
