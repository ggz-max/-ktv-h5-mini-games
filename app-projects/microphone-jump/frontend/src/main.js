import "./styles.css";

const MIC_ASSET = new URL("../assets/mic-mascot.svg", import.meta.url).href;
const GENERATED_UI = {
  concept: new URL("../assets/generated-ui/microphone-jump-ui-concept-gpt-image-2-v2.png", import.meta.url).href,
  pagesOverview: new URL("../assets/generated-ui/microphone-jump-ui-pages-overview-gpt-image-2.png", import.meta.url).href,
  gameStates: new URL("../assets/generated-ui/microphone-jump-ui-game-states-gpt-image-2.png", import.meta.url).href,
  resultSocial: new URL("../assets/generated-ui/microphone-jump-ui-result-social-gpt-image-2-v2.png", import.meta.url).href,
  iconSheet: new URL("../assets/generated-ui/microphone-jump-icon-asset-sheet-gpt-image-2.png", import.meta.url).href
};
const PLAY_SPRITES = {
  player: new URL("../assets/play-sprites/player-mic.png", import.meta.url).href,
  speaker: new URL("../assets/play-sprites/platform-speaker.png", import.meta.url).href,
  lyric: new URL("../assets/play-sprites/platform-lyric.png", import.meta.url).href,
  light: new URL("../assets/play-sprites/platform-light.png", import.meta.url).href,
  sofa: new URL("../assets/play-sprites/platform-sofa.png", import.meta.url).href
};

const CHARGE_MAX_MS = 1180;
const MIN_JUMP_DISTANCE = 42;
const JUMP_DISTANCE_RANGE = 250;
const PLATFORM_HEIGHT = 54;
const PLAYER_WIDTH = 92;
const PLAYER_HEIGHT = 100;
const BEST_KEY = "ktv_microphone_jump_best";

const PLATFORM_TYPES = [
  { id: "speaker", label: "音箱", className: "platform-speaker" },
  { id: "lyric", label: "歌词台", className: "platform-lyric" },
  { id: "light", label: "灯光台", className: "platform-light" },
  { id: "sofa", label: "沙发位", className: "platform-sofa" }
];

const LEADERBOARD = [
  { rank: 1, name: "麦霸小王子", score: 68 },
  { rank: 2, name: "唱跳小能手", score: 56 },
  { rank: 3, name: "K歌达人", score: 48 },
  { rank: 4, name: "音浪不停", score: 36 },
  { rank: 5, name: "麦上见真章", score: 32 }
];

const SKINS = [
  { name: "默认皮肤", status: "使用中", className: "skin-default" },
  { name: "金属麦克", status: "已解锁", className: "skin-gold" },
  { name: "炫彩音浪", status: "已解锁", className: "skin-rainbow" },
  { name: "星光麦王", status: "0/10", className: "skin-star" }
];

const DESIGN_BOARDS = [
  { title: "主玩法", subtitle: "首版视觉主参考", image: GENERATED_UI.concept },
  { title: "页面总览", subtitle: "开始/蓄力/跳跃/结算/分享/排行/每日挑战", image: GENERATED_UI.pagesOverview },
  { title: "游戏状态", subtitle: "准备/蓄力/跳跃/完美落点", image: GENERATED_UI.gameStates },
  { title: "结果社交", subtitle: "结算/分享/好友排行/每日挑战/皮肤", image: GENERATED_UI.resultSocial },
  { title: "图标资产", subtitle: "角色状态/平台/按钮/徽章/规则提示", image: GENERATED_UI.iconSheet }
];

const state = {
  screen: "game",
  phase: "ready",
  stage: { width: 360, height: 500 },
  seed: Date.now() % 2147483647,
  score: 0,
  jumpCount: 0,
  perfectCount: 0,
  best: Number(localStorage.getItem(BEST_KEY) || 0),
  previous: null,
  current: null,
  next: null,
  player: { x: 0, bottom: 0, rotation: -12, scaleY: 1 },
  power: 0,
  chargeStart: 0,
  rafId: null,
  roundStarted: false,
  message: "按住蓄力，松手跳到下一个台子",
  feedback: "ready",
  result: null
};

const app = document.querySelector("#app");

function random() {
  state.seed = (state.seed * 48271) % 2147483647;
  return state.seed / 2147483647;
}

function randomInt(min, max) {
  return Math.round(min + random() * (max - min));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeInOut(value) {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function platformCenter(platform) {
  return platform.x + platform.width / 2;
}

function platformSurface(platform) {
  return platform.bottom + PLATFORM_HEIGHT - 8;
}

function getStartBottom() {
  return Math.round(clamp(state.stage.height * 0.365, 292, 326));
}

function getStartLeft() {
  return Math.round(state.stage.width * 0.14);
}

function pickPlatformType(index) {
  return PLATFORM_TYPES[index % PLATFORM_TYPES.length];
}

function createNextPlatform(current) {
  const widthBase = Math.max(92, 122 - Math.min(state.jumpCount, 12) * 2);
  const width = randomInt(widthBase - 8, widthBase + 14);
  const minDistance = Math.round(clamp(state.stage.width * 0.3, 96, 120));
  const maxDistanceByEdge = Math.max(minDistance, state.stage.width - platformCenter(current) - width / 2 - 14);
  const maxDistance = Math.round(Math.min(168, state.stage.width * 0.44, maxDistanceByEdge));
  const distance = randomInt(minDistance, Math.max(minDistance, maxDistance));
  const center = platformCenter(current) + distance;
  const bottomLiftMin = Math.round(clamp(state.stage.height * 0.028, 20, 28));
  const bottomLiftMax = Math.round(clamp(state.stage.height * 0.084, 54, 72));
  const upperLimit = Math.round(clamp(state.stage.height * 0.48, 350, 410));
  const bottomMin = Math.min(current.bottom + bottomLiftMin, upperLimit - 18);
  const bottomMax = Math.min(Math.max(bottomMin + 18, current.bottom + bottomLiftMax), upperLimit);
  const bottom = randomInt(bottomMin, bottomMax);
  return {
    id: `p-${state.jumpCount + 1}-${Math.round(random() * 10000)}`,
    x: Math.round(center - width / 2),
    width,
    bottom,
    type: pickPlatformType(state.jumpCount + 1)
  };
}

function measureStage() {
  const stageEl = document.querySelector("[data-stage]");
  if (!stageEl) return;
  const rect = stageEl.getBoundingClientRect();
  state.stage.width = Math.max(300, Math.round(rect.width));
  state.stage.height = Math.max(430, Math.round(rect.height));
}

function initPlatforms() {
  const startWidth = 142;
  const startBottom = getStartBottom();
  state.current = {
    id: "p-start",
    x: getStartLeft(),
    width: startWidth,
    bottom: startBottom,
    type: pickPlatformType(0)
  };
  state.next = createNextPlatform(state.current);
  state.previous = null;
  state.player = {
    x: platformCenter(state.current),
    bottom: platformSurface(state.current),
    rotation: -4,
    scaleY: 1
  };
}

function resetRound() {
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.screen = "game";
  state.phase = "ready";
  state.score = 0;
  state.jumpCount = 0;
  state.perfectCount = 0;
  state.power = 0;
  state.chargeStart = 0;
  state.roundStarted = false;
  state.message = "按住蓄力，松手跳到下一个台子";
  state.feedback = "ready";
  state.result = null;
  initPlatforms();
  renderGame();
  requestAnimationFrame(() => {
    const previousWidth = state.stage.width;
    const previousHeight = state.stage.height;
    measureStage();
    if (Math.abs(previousWidth - state.stage.width) > 3 || Math.abs(previousHeight - state.stage.height) > 3) initPlatforms();
    syncGameDom({ renderPlatforms: true });
  });
}

function getTargetPower() {
  const distance = platformCenter(state.next) - platformCenter(state.current);
  return clamp((distance - MIN_JUMP_DISTANCE) / JUMP_DISTANCE_RANGE, 0, 1);
}

function getTargetWindow() {
  const target = getTargetPower();
  const width = clamp((state.next.width / JUMP_DISTANCE_RANGE) * 100, 10, 24);
  return {
    left: clamp(target * 100 - width / 2, 0, 100 - width),
    width
  };
}

function platformMarkup() {
  const platforms = [
    state.previous ? { ...state.previous, role: "previous" } : null,
    state.current ? { ...state.current, role: "current" } : null,
    state.next ? { ...state.next, role: "next" } : null
  ].filter(Boolean);

  return platforms.map(platform => {
    const role = platform.role;
    return `
      <div class="jump-platform ${platform.type.className}" data-platform="${role}" aria-label="${platform.type.label}" style="left:${platform.x}px; bottom:${platform.bottom}px; width:${platform.width}px;">
        <img class="platform-sprite platform-sprite-${platform.type.id}" src="${PLAY_SPRITES[platform.type.id]}" alt="" />
        <span class="platform-name">${platform.type.label}</span>
      </div>
    `;
  }).join("");
}

function renderGame() {
  app.innerHTML = `
    <section class="game-art-screen" data-screen="game">
      <section class="game-art-frame" data-stage data-phase="${state.phase}">
        <img class="game-art-image" src="${GENERATED_UI.concept}" alt="麦克风跳一跳高保真玩法界面" />
        <div class="art-play-layer" aria-hidden="true">
          <div class="landing-hint art-landing-hint" data-landing-hint></div>
          <div class="platform-layer art-platform-layer" data-platform-layer></div>
          <div class="player-shadow art-player-shadow" data-player-shadow></div>
          <img class="mic-player art-mic-player" data-player src="${PLAY_SPRITES.player}" alt="" />
        </div>
        <div class="art-live-hud" aria-live="polite">
          <span>本局 <strong data-score>${state.score}</strong></span>
          <span>最高 <strong data-best>${state.best}</strong></span>
        </div>
        <div class="art-live-stats">
          <span>连跳 <strong data-jump-count>${state.jumpCount}</strong></span>
          <span>完美 <strong data-perfect-count>${state.perfectCount}</strong></span>
          <span data-phase-text>准备</span>
        </div>
        <div class="art-live-message" data-message>${state.message}</div>
        <div class="art-live-power" aria-label="蓄力条">
          <span class="art-target-window" data-target-window></span>
          <span class="art-power-fill" data-power-fill></span>
        </div>
        <button class="art-hold-button" data-hold-button type="button">按住蓄力，开始第一跳</button>
        <div class="art-rule-row">
          <span>短了会掉麦</span>
          <span>过了也下麦</span>
          <span>踩中间加分</span>
        </div>
      </section>
    </section>
  `;
  syncGameDom({ renderPlatforms: true });
}

function syncGameDom(options = {}) {
  const { renderPlatforms = false } = options;
  const stageEl = document.querySelector("[data-stage]");
  const platformLayer = document.querySelector("[data-platform-layer]");
  const playerEl = document.querySelector("[data-player]");
  const playerShadow = document.querySelector("[data-player-shadow]");
  const powerFill = document.querySelector("[data-power-fill]");
  const targetWindow = document.querySelector("[data-target-window]");
  const landingHint = document.querySelector("[data-landing-hint]");
  const messageEl = document.querySelector("[data-message]");
  const holdButton = document.querySelector("[data-hold-button]");
  const phaseText = document.querySelector("[data-phase-text]");

  if (renderPlatforms && platformLayer) platformLayer.innerHTML = platformMarkup();
  if (stageEl) {
    stageEl.dataset.phase = state.phase;
    stageEl.dataset.feedback = state.feedback;
  }
  if (playerEl) {
    playerEl.style.left = `${state.player.x - PLAYER_WIDTH / 2}px`;
    playerEl.style.bottom = `${state.player.bottom}px`;
    playerEl.style.transform = `rotate(${state.player.rotation}deg) scaleY(${state.player.scaleY})`;
  }
  if (playerShadow) {
    const shadowScale = clamp(1.28 - Math.max(0, state.player.bottom - platformSurface(state.current)) / 220, 0.46, 1.05);
    playerShadow.style.left = `${state.player.x - 30}px`;
    playerShadow.style.bottom = `${Math.max(24, state.player.bottom - 10)}px`;
    playerShadow.style.transform = `scale(${shadowScale})`;
    playerShadow.style.opacity = String(clamp(shadowScale, 0.18, 0.66));
  }
  if (powerFill) powerFill.style.width = `${Math.round(state.power * 100)}%`;
  if (targetWindow) {
    const target = getTargetWindow();
    targetWindow.style.left = `${target.left}%`;
    targetWindow.style.width = `${target.width}%`;
  }
  if (landingHint && state.next) {
    landingHint.style.left = `${state.next.x}px`;
    landingHint.style.bottom = `${state.next.bottom + PLATFORM_HEIGHT + 8}px`;
    landingHint.style.width = `${state.next.width}px`;
  }
  if (messageEl) {
    messageEl.textContent = state.message;
    messageEl.dataset.feedback = state.feedback;
  }
  if (holdButton) {
    holdButton.disabled = state.phase === "jumping" || state.phase === "scrolling";
    if (state.phase === "charging") {
      holdButton.textContent = `松手跳 ${Math.round(state.power * 100)}%`;
    } else if (state.phase === "jumping") {
      holdButton.textContent = "飞行中";
    } else {
      holdButton.textContent = state.roundStarted ? "按住蓄力" : "按住蓄力，开始第一跳";
    }
  }
  if (phaseText) {
    const text = state.phase === "charging" ? "蓄力中" : state.phase === "jumping" ? "飞行中" : "准备";
    phaseText.textContent = text;
  }

  const scoreEl = document.querySelector("[data-score]");
  const bestEl = document.querySelector("[data-best]");
  const jumpEl = document.querySelector("[data-jump-count]");
  const perfectEl = document.querySelector("[data-perfect-count]");
  if (scoreEl) scoreEl.textContent = state.score;
  if (bestEl) bestEl.textContent = Math.max(state.best, state.score);
  if (jumpEl) jumpEl.textContent = state.jumpCount;
  if (perfectEl) perfectEl.textContent = state.perfectCount;
}

function startCharge(event) {
  if (state.screen !== "game" || state.phase !== "ready") return;
  event?.preventDefault();
  state.roundStarted = true;
  state.phase = "charging";
  state.chargeStart = performance.now();
  state.power = 0;
  state.feedback = "charging";
  state.message = "蓄力中，接近亮区就松手";
  animateCharge();
}

function animateCharge() {
  if (state.phase !== "charging") return;
  const elapsed = performance.now() - state.chargeStart;
  state.power = clamp(elapsed / CHARGE_MAX_MS, 0, 1);
  const squash = 1 - state.power * 0.13;
  state.player.scaleY = squash;
  syncGameDom({ renderPlatforms: false });
  state.rafId = requestAnimationFrame(animateCharge);
}

function releaseCharge(event) {
  if (state.phase !== "charging") return;
  event?.preventDefault();
  if (state.rafId) cancelAnimationFrame(state.rafId);
  const elapsed = performance.now() - state.chargeStart;
  const power = clamp(elapsed / CHARGE_MAX_MS, 0, 1);
  state.power = power;
  jumpWithPower(power);
}

function jumpWithPower(power, forcedDistance) {
  state.phase = "jumping";
  state.feedback = "jumping";
  state.message = "飞起来了";
  state.player.scaleY = 1;
  syncGameDom({ renderPlatforms: false });

  const distance = typeof forcedDistance === "number" ? forcedDistance : MIN_JUMP_DISTANCE + power * JUMP_DISTANCE_RANGE;
  const fromX = state.player.x;
  const fromBottom = state.player.bottom;
  const finalX = fromX + distance;
  const targetBottom = platformSurface(state.next);
  const duration = 420 + power * 250;
  const arc = 76 + power * 92 + Math.abs(targetBottom - fromBottom) * 0.35;
  const startedAt = performance.now();

  function step(now) {
    const progress = clamp((now - startedAt) / duration, 0, 1);
    const eased = easeInOut(progress);
    state.player.x = fromX + distance * eased;
    state.player.bottom = fromBottom + (targetBottom - fromBottom) * eased + Math.sin(Math.PI * progress) * arc;
    state.player.rotation = -4 + eased * (420 + power * 300);
    syncGameDom({ renderPlatforms: false });
    if (progress < 1) {
      state.rafId = requestAnimationFrame(step);
    } else {
      settleLanding(finalX);
    }
  }

  state.rafId = requestAnimationFrame(step);
}

function settleLanding(finalX) {
  const next = state.next;
  const landingLeft = next.x + 5;
  const landingRight = next.x + next.width - 5;
  const hit = finalX >= landingLeft && finalX <= landingRight;

  if (!hit) {
    const short = finalX < landingLeft;
    state.phase = "failed";
    state.feedback = "danger";
    state.message = short ? "短了半拍，麦掉到台下了" : "冲过头了，全场看着你";
    state.player.bottom = 22;
    state.player.rotation += short ? -35 : 42;
    state.power = 0;
    syncGameDom({ renderPlatforms: false });
    setTimeout(finishRound, 520);
    return;
  }

  const error = Math.abs(finalX - platformCenter(next));
  const perfect = error <= Math.max(8, next.width * 0.14);
  const gain = perfect ? 3 + Math.floor(state.jumpCount / 4) : 1 + Math.floor(state.jumpCount / 6);
  state.score += gain;
  state.jumpCount += 1;
  state.perfectCount += perfect ? 1 : 0;
  state.phase = "ready";
  state.feedback = perfect ? "perfect" : "good";
  state.message = perfect ? `踩中间了 +${gain}` : `落稳了 +${gain}`;
  state.power = 0;

  animateStageAdvance({ landed: { ...next }, perfect });
}

function animateStageAdvance({ landed, perfect }) {
  const desiredLeft = getStartLeft();
  const desiredBottom = getStartBottom();
  const shiftX = landed.x - desiredLeft;
  const shiftY = landed.bottom - desiredBottom;
  const finalCurrent = {
    ...landed,
    x: landed.x - shiftX,
    bottom: landed.bottom - shiftY
  };
  const finalNext = createNextPlatform(finalCurrent);
  const previousStart = { ...state.current };
  const currentStart = { ...landed };
  const nextStart = {
    ...finalNext,
    x: finalNext.x + shiftX,
    bottom: finalNext.bottom + shiftY
  };
  const playerStart = {
    x: platformCenter(currentStart),
    bottom: platformSurface(currentStart)
  };
  const playerEnd = {
    x: platformCenter(finalCurrent),
    bottom: platformSurface(finalCurrent)
  };
  const startedAt = performance.now();
  const duration = 420;

  state.phase = "scrolling";
  state.previous = previousStart;
  state.current = currentStart;
  state.next = nextStart;
  state.player.rotation = perfect ? -4 : 3;
  syncGameDom({ renderPlatforms: true });

  function step(now) {
    const progress = clamp((now - startedAt) / duration, 0, 1);
    const eased = easeInOut(progress);
    state.previous = {
      ...previousStart,
      x: previousStart.x - shiftX * eased,
      bottom: previousStart.bottom - shiftY * eased
    };
    state.current = {
      ...currentStart,
      x: currentStart.x - shiftX * eased,
      bottom: currentStart.bottom - shiftY * eased
    };
    state.next = {
      ...nextStart,
      x: nextStart.x - shiftX * eased,
      bottom: nextStart.bottom - shiftY * eased
    };
    state.player.x = playerStart.x + (playerEnd.x - playerStart.x) * eased;
    state.player.bottom = playerStart.bottom + (playerEnd.bottom - playerStart.bottom) * eased;
    syncGameDom({ renderPlatforms: true });
    if (progress < 1) {
      state.rafId = requestAnimationFrame(step);
      return;
    }
    state.previous = null;
    state.current = finalCurrent;
    state.next = finalNext;
    state.player.x = playerEnd.x;
    state.player.bottom = playerEnd.bottom;
    state.phase = "ready";
    syncGameDom({ renderPlatforms: true });
  }

  state.rafId = requestAnimationFrame(step);
}

function finishRound() {
  const best = Math.max(state.best, state.score);
  state.best = best;
  localStorage.setItem(BEST_KEY, String(best));
  const defeatPercent = clamp(Math.round(28 + state.score * 5.4 + state.perfectCount * 4.8), 18, 99);
  state.result = {
    score: state.score,
    jumpCount: state.jumpCount,
    perfectCount: state.perfectCount,
    best: state.best,
    defeatPercent,
    title: titleForResult(state.score, state.jumpCount, state.perfectCount)
  };
  state.screen = "result";
  renderResult();
}

function titleForResult(score, jumps, perfects) {
  if (jumps >= 18 && perfects >= 8) return "包厢弹跳麦王";
  if (jumps >= 12) return "稳如主唱";
  if (score >= 16) return "音箱边缘大师";
  if (jumps >= 5) return "还能再跳两首";
  return "刚热嗓就下麦";
}

function renderResult() {
  const result = state.result || {
    score: 0,
    jumpCount: 0,
    perfectCount: 0,
    best: state.best,
    defeatPercent: 18,
    title: "刚热嗓就下麦"
  };
  app.innerHTML = `
    <section class="screen result-screen rich-screen" data-screen="result">
      ${pageHeader("ROUND REPORT", result.title, `<span>最高 <strong>${result.best}</strong></span>`)}

      <section class="result-panel result-panel-rich">
        <div class="result-crown">NEW</div>
        <div class="result-score">${result.score}</div>
        <p>连续跳过 ${result.jumpCount} 个台子，完美落点 ${result.perfectCount} 次，击败本包厢 ${result.defeatPercent}% 玩家。</p>
        <div class="result-grid">
          ${stat("连跳", result.jumpCount)}
          ${stat("完美", result.perfectCount)}
          ${stat("击败", `${result.defeatPercent}%`)}
        </div>
      </section>

      <div class="result-action-grid">
        <button class="primary-button" data-action="retry">再跳一局</button>
        <button class="plain-button" data-action="share">生成挑战文案</button>
        <button class="plain-button" data-action="daily">今日挑战</button>
      </div>
    </section>
  `;
}

function stat(label, value) {
  return `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`;
}

function pageHeader(eyebrow, title, right = "") {
  return `
    <header class="game-header page-header">
      <div class="brand-lockup">
        <button class="back-button" data-action="result" aria-label="返回">‹</button>
        <div>
          <div class="eyebrow">${eyebrow}</div>
          <h1>${title}</h1>
        </div>
      </div>
      <div class="score-stack page-score">${right}</div>
    </header>
  `;
}

function renderShare() {
  const result = state.result || {
    score: 0,
    jumpCount: 0,
    perfectCount: 0,
    best: state.best,
    defeatPercent: 18,
    title: "刚热嗓就下麦"
  };
  app.innerHTML = `
    <section class="screen share-screen rich-screen" data-screen="share">
      ${pageHeader("挑战分享", "麦克风跳一跳")}
      <section class="share-poster">
        <div class="poster-kicker">麦克风跳一跳</div>
        <h1>${result.title}</h1>
        <img src="${MIC_ASSET}" alt="" />
        <div class="poster-score">${result.score}</div>
        <p>连跳 ${result.jumpCount} 个台子，击败本包厢 ${result.defeatPercent}% 玩家。</p>
      </section>
      <section class="share-copy">
        <div class="eyebrow">挑战文案</div>
        <p data-share-text>我在麦克风跳一跳拿了 ${result.score} 分，称号「${result.title}」，击败本包厢 ${result.defeatPercent}% 玩家。下一个把麦给你，你敢跳吗？</p>
      </section>
      <div class="share-actions">
        <button class="share-action" data-action="copy"><span class="icon-copy"></span>复制文案</button>
        <button class="share-action" data-action="save"><span class="icon-save"></span>保存海报</button>
        <button class="share-action" data-action="friend"><span class="icon-friend"></span>发给好友</button>
        <button class="share-action" data-action="room"><span class="icon-room"></span>包厢群</button>
      </div>
      <button class="plain-button" data-action="result">返回结果</button>
    </section>
  `;
}

function copyShareText() {
  const text = document.querySelector("[data-share-text]")?.textContent || "";
  navigator.clipboard?.writeText(text).catch(() => {});
  const button = document.querySelector("[data-action='copy']");
  if (button) button.textContent = "已复制";
}

function renderLeaderboard() {
  const currentScore = state.result?.score ?? state.score;
  app.innerHTML = `
    <section class="screen board-screen rich-screen" data-screen="leaderboard">
      ${pageHeader("好友排行", "谁更会跳", `<span>我的 <strong>${currentScore}</strong></span>`)}
      <section class="board-panel">
        <div class="tabs">
          <span class="is-active">好友榜</span>
          <span>本包厢</span>
        </div>
        <div class="leader-list">
          ${LEADERBOARD.map(item => leaderRow(item)).join("")}
          ${leaderRow({ rank: "我", name: "我自己", score: currentScore, self: true })}
        </div>
      </section>
      <button class="primary-button" data-action="share">挑战好友</button>
      <button class="plain-button" data-action="result">返回结果</button>
    </section>
  `;
}

function leaderRow(item) {
  return `
    <div class="leader-row ${item.self ? "is-self" : ""}">
      <span class="leader-rank">${item.rank}</span>
      <span class="leader-avatar"></span>
      <span class="leader-name">${item.name}</span>
      <strong>${item.score}</strong>
    </div>
  `;
}

function renderDaily() {
  app.innerHTML = `
    <section class="screen daily-screen rich-screen" data-screen="daily">
      ${pageHeader("每日挑战", "霓虹派对", `<span>音符 <strong>1280</strong></span>`)}
      <section class="daily-hero">
        <div>
          <div class="eyebrow">今日舞台</div>
          <h2>完美落点 10 次</h2>
          <p>最高得分：${state.best}</p>
        </div>
        <img src="${MIC_ASSET}" alt="" />
      </section>
      <section class="reward-panel">
        <div class="reward-card">
          <span class="reward-icon"></span>
          <strong>通关奖励</strong>
          <small>音符 x200</small>
        </div>
        <div class="reward-card">
          <span class="reward-star"></span>
          <strong>首次奖励</strong>
          <small>星星 x1</small>
        </div>
      </section>
      <section class="skin-panel">
        <h2>皮肤</h2>
        <div class="skin-grid">
          ${SKINS.map(skin => `
            <button class="skin-card ${skin.className}">
              <span class="skin-mic"></span>
              <strong>${skin.name}</strong>
              <small>${skin.status}</small>
            </button>
          `).join("")}
        </div>
      </section>
      <button class="primary-button" data-action="retry">开始挑战</button>
      <button class="plain-button" data-action="result">返回结果</button>
    </section>
  `;
}

function renderAssets() {
  app.innerHTML = `
    <section class="screen assets-screen rich-screen" data-screen="assets">
      ${pageHeader("视觉资产", "页面和图标")}
      <section class="asset-board-list">
        ${DESIGN_BOARDS.map(board => `
          <article class="asset-board-card">
            <img src="${board.image}" alt="${board.title}" />
            <div>
              <strong>${board.title}</strong>
              <small>${board.subtitle}</small>
            </div>
          </article>
        `).join("")}
      </section>
      <button class="plain-button" data-action="result">返回结果</button>
    </section>
  `;
}

app.addEventListener("pointerdown", event => {
  if (!event.target.closest("[data-hold-button]")) return;
  startCharge(event);
});

app.addEventListener("pointerup", releaseCharge);
app.addEventListener("pointercancel", releaseCharge);
app.addEventListener("contextmenu", event => {
  if (event.target.closest("[data-hold-button]")) event.preventDefault();
});

app.addEventListener("click", event => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "retry") resetRound();
  if (action === "share") renderShare();
  if (action === "result") renderResult();
  if (action === "leaderboard") renderLeaderboard();
  if (action === "daily") renderDaily();
  if (action === "assets") renderAssets();
  if (action === "copy") copyShareText();
  if (action === "save" || action === "friend" || action === "room") {
    const button = event.target.closest("[data-action]");
    if (button) button.textContent = "已加入";
  }
});

window.addEventListener("keydown", event => {
  if (event.code === "Space" && state.phase === "ready") startCharge(event);
});

window.addEventListener("keyup", event => {
  if (event.code === "Space") releaseCharge(event);
});

window.addEventListener("resize", () => {
  if (state.screen !== "game") return;
  measureStage();
  syncGameDom({ renderPlatforms: true });
});

if (import.meta.env.DEV) {
  window.__microphoneJumpDebug = {
    getPhase: () => state.phase,
    getScore: () => state.score,
    getJumpCount: () => state.jumpCount,
    getChargeMsForNext: () => Math.round(getTargetPower() * CHARGE_MAX_MS),
    getState: () => ({
      phase: state.phase,
      score: state.score,
      jumpCount: state.jumpCount,
      targetPower: getTargetPower(),
      previous: state.previous,
      current: state.current,
      next: state.next
    })
  };
}

resetRound();
