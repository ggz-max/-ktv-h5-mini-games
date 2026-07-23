const IS_FILE_URL = window.location.protocol === "file:";
const IS_VITE_PREVIEW = ["127.0.0.1:5308", "localhost:5308"].includes(window.location.host);
const API_BASE = window.KTV_API_BASE || (IS_FILE_URL || IS_VITE_PREVIEW ? "http://127.0.0.1:4308" : window.location.origin);
const urlParams = new URLSearchParams(window.location.search);
const SESSION_KEY = "ktv-room-cleanup-session";

function createClientId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = createClientId();
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return createClientId();
  }
}

const fallbackConfig = {
  gameId: "ktv-room-cleanup",
  title: "包厢大扫除",
  roundSeconds: 90,
  traySlots: 7,
  matchCount: 3,
  rescueSeconds: 15,
  roomCode: "A08",
  levels: [
    {
      id: "opening",
      no: 1,
      chapter: "开台热身",
      difficulty: "easy",
      badge: "新手",
      kicker: "#01 开台快收",
      shortTitle: "开台",
      title: "先把桌面露出来",
      description: "75 秒清掉 15 件包厢小物，先熟悉点亮、归位和爆槽。",
      roundSeconds: 75,
      itemTypes: 5,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 36,
      lockY: 34,
      undoTools: 1,
      clearTools: 1,
      hint: "先点亮着的物件，3 个相同自动归位"
    },
    {
      id: "fruit",
      no: 2,
      chapter: "开台热身",
      difficulty: "easy",
      badge: "教学",
      kicker: "#02 果盘归位",
      shortTitle: "果盘",
      title: "先把果盘清出来",
      description: "80 秒清掉 18 件物件，开始练习同类优先和槽位预留。",
      roundSeconds: 80,
      itemTypes: 6,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 40,
      lockY: 38,
      undoTools: 1,
      clearTools: 1,
      hint: "别把 7 格都塞成不同物件，先凑快成组的"
    },
    {
      id: "remote",
      no: 3,
      chapter: "开台热身",
      difficulty: "normal",
      badge: "普通",
      kicker: "#03 遥控器失踪",
      shortTitle: "遥控",
      title: "遥控器又不见了",
      description: "85 秒清掉 21 件物件，叠层开始挡住下方目标。",
      roundSeconds: 85,
      itemTypes: 7,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 44,
      lockY: 42,
      undoTools: 1,
      clearTools: 1,
      hint: "先打开下层入口，再收同类"
    },
    {
      id: "chorus",
      no: 4,
      chapter: "开台热身",
      difficulty: "normal",
      badge: "进阶",
      kicker: "#02 副歌加压",
      shortTitle: "副歌",
      title: "槽位开始紧张",
      description: "90 秒清掉 24 件物件，第一次接近封场压力。",
      roundSeconds: 90,
      itemTypes: 8,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 50,
      lockY: 48,
      undoTools: 1,
      clearTools: 1,
      hint: "先找能凑三件的物品，槽位会明显紧起来"
    },
    {
      id: "mic-relay",
      no: 5,
      chapter: "高压乱桌",
      difficulty: "normal",
      badge: "进阶",
      kicker: "#05 麦霸接力",
      shortTitle: "麦霸",
      title: "麦克风全在抢位",
      description: "85 秒清掉 24 件物件，可点目标变少，优先救出同类。",
      roundSeconds: 85,
      itemTypes: 8,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 52,
      lockY: 50,
      undoTools: 1,
      clearTools: 1,
      hint: "别急着点零散物件，先做一组麦克风或遥控器"
    },
    {
      id: "snack-mountain",
      no: 6,
      chapter: "高压乱桌",
      difficulty: "hard",
      badge: "困难",
      kicker: "#06 零食山",
      shortTitle: "零食山",
      title: "零食把槽位堵住了",
      description: "90 秒清掉 27 件物件，桌面更满，失误会很快爆槽。",
      roundSeconds: 90,
      itemTypes: 9,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 54,
      lockY: 50,
      undoTools: 1,
      clearTools: 1,
      hint: "先把高层小物清掉，别让零食盘单独占格"
    },
    {
      id: "cable-tangle",
      no: 7,
      chapter: "高压乱桌",
      difficulty: "hard",
      badge: "困难",
      kicker: "#07 线缆缠桌",
      shortTitle: "线缆",
      title: "充电线缠住桌角",
      description: "85 秒清掉 27 件物件，撤回还在，但清槽机会减少。",
      roundSeconds: 85,
      itemTypes: 9,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 50,
      lockY: 48,
      undoTools: 1,
      clearTools: 0,
      hint: "这一关没有清槽，槽位预留比速度更重要"
    },
    {
      id: "birthday",
      no: 8,
      chapter: "高压乱桌",
      difficulty: "boss",
      badge: "封场",
      kicker: "#08 生日局",
      shortTitle: "生日局",
      title: "生日局桌面爆满",
      description: "95 秒清掉 30 件物件，第一轮封场考验。",
      roundSeconds: 95,
      itemTypes: 10,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 56,
      lockY: 52,
      undoTools: 1,
      clearTools: 1,
      hint: "封场局先救出下层入口，别被亮着的诱惑带跑"
    },
    {
      id: "midnight",
      no: 9,
      chapter: "终局返场",
      difficulty: "hard",
      badge: "高压",
      kicker: "#09 夜宵返场",
      shortTitle: "夜宵",
      title: "夜宵又加了一桌",
      description: "80 秒清掉 27 件物件，时间更紧，适合快速复玩。",
      roundSeconds: 80,
      itemTypes: 9,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 54,
      lockY: 52,
      undoTools: 1,
      clearTools: 0,
      hint: "时间很紧，先消能立刻成组的"
    },
    {
      id: "skip-chaos",
      no: 10,
      chapter: "终局返场",
      difficulty: "hard",
      badge: "高压",
      kicker: "#10 切歌乱流",
      shortTitle: "切歌",
      title: "切歌键散了一桌",
      description: "90 秒清掉 30 件物件，重叠和数量同时上来。",
      roundSeconds: 90,
      itemTypes: 10,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 58,
      lockY: 54,
      undoTools: 1,
      clearTools: 1,
      hint: "困难关可以更早用救场，不要等到满槽"
    },
    {
      id: "one-more",
      no: 11,
      chapter: "终局返场",
      difficulty: "super",
      badge: "超难",
      kicker: "#11 差一件",
      shortTitle: "差一件",
      title: "永远差一件归位",
      description: "85 秒清掉 30 件物件，撤回关闭，只给一次清槽机会。",
      roundSeconds: 85,
      itemTypes: 10,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 60,
      lockY: 56,
      undoTools: 0,
      clearTools: 1,
      hint: "超难关要把清槽留给最后两格"
    },
    {
      id: "final-clean",
      no: 12,
      chapter: "终局返场",
      difficulty: "boss",
      badge: "终场",
      kicker: "#12 最后一桌",
      shortTitle: "封场",
      title: "最后一桌封场",
      description: "90 秒清掉 30 件物件，卡槽只有 7 格，适合同局挑战。",
      roundSeconds: 90,
      itemTypes: 10,
      repeats: 3,
      traySlots: 7,
      matchCount: 3,
      lockX: 62,
      lockY: 58,
      undoTools: 1,
      clearTools: 1,
      hint: "最后一桌先稳住槽位，别被亮着的散件骗走"
    }
  ],
  items: [
    { id: "microphone", label: "麦克风", asset: "./assets/pencil/microphone.jpg" },
    { id: "remote", label: "遥控器", asset: "./assets/pencil/remote.jpg" },
    { id: "dice", label: "骰子", asset: "./assets/pencil/dice.jpg" },
    { id: "cup", label: "饮料杯", asset: "./assets/pencil/cup.jpg" },
    { id: "snack", label: "零食盘", asset: "./assets/pencil/snack.jpg" },
    { id: "tissue", label: "纸巾盒", asset: "./assets/pencil/tissue.jpg" },
    { id: "glow-stick", label: "荧光棒", asset: "./assets/pencil/glow-stick.jpg" },
    { id: "song-card", label: "歌单卡", asset: "./assets/pencil/song-card.jpg" },
    { id: "charging-cable", label: "充电线", asset: "./assets/pencil/charging-cable.jpg" },
    { id: "skip-button", label: "切歌键", asset: "./assets/pencil/skip-button.jpg" }
  ]
};

const BOARD_POSITIONS = [
  [18, 18], [100, 16], [182, 18], [244, 42],
  [58, 64], [140, 62], [222, 64],
  [18, 110], [100, 108], [182, 110], [244, 134],
  [58, 156], [140, 154], [222, 156],
  [18, 202], [100, 200], [182, 202], [244, 226],
  [58, 248], [140, 246], [222, 248],
  [18, 294], [100, 292], [182, 294]
];

const state = {
  config: fallbackConfig,
  screen: "entry",
  currentLevelIndex: Math.max(0, Number(urlParams.get("level") || 1) - 1),
  board: [],
  tray: [],
  history: [],
  cleaned: 0,
  moves: 0,
  matches: 0,
  combo: 0,
  bestCombo: 0,
  score: 0,
  secondsLeft: 90,
  tools: { undo: 1, clear: 1 },
  timerId: null,
  seed: urlParams.get("seed") || "",
  challengeSeed: urlParams.get("seed") || "",
  challengerScore: Number(urlParams.get("score") || 0),
  sessionId: readSessionId(),
  source: urlParams.get("source") || urlParams.get("utm_source") || "ktv_song_h5",
  homeViewTracked: false,
  message: "",
  messageTone: "info",
  lastResult: null,
  isPreparing: false
};

const app = document.querySelector("#app");
const imagePreloadCache = new Map();

async function loadConfig() {
  if (IS_FILE_URL) {
    state.config = normalizeConfig(fallbackConfig);
    state.currentLevelIndex = clampLevelIndex(state.currentLevelIndex);
    state.secondsLeft = activeLevel().roundSeconds;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/config`);
    if (!response.ok) throw new Error("config request failed");
    state.config = normalizeConfig(await response.json());
  } catch {
    const response = await fetch("./config/game-config.json").catch(() => null);
    state.config = response?.ok ? normalizeConfig(await response.json()) : normalizeConfig(fallbackConfig);
  }
  state.currentLevelIndex = clampLevelIndex(state.currentLevelIndex);
  state.secondsLeft = activeLevel().roundSeconds;
  preloadConfiguredAssets();
}

function normalizeConfig(config) {
  const merged = { ...fallbackConfig, ...config };
  const items = (config.items || fallbackConfig.items).map(item => ({
    ...item,
    asset: item.asset?.startsWith("/") ? `.${item.asset}` : item.asset
  }));
  const levels = normalizeLevels(config.levels || fallbackConfig.levels, merged);
  return { ...merged, items, levels };
}

function normalizeLevels(levels, config) {
  return levels.map((level, index) => ({
    id: level.id || `level-${index + 1}`,
    no: level.no || index + 1,
    chapter: level.chapter || "包厢闯关",
    difficulty: level.difficulty || "normal",
    badge: level.badge || "普通",
    kicker: level.kicker || `#${String(index + 1).padStart(2, "0")} 清理局`,
    shortTitle: level.shortTitle || level.title || `第 ${index + 1} 关`,
    title: level.title || "包厢清理局",
    description: level.description || "清掉桌面物件，3 个相同自动归位。",
    roundSeconds: Number(level.roundSeconds || config.roundSeconds || fallbackConfig.roundSeconds),
    itemTypes: Number(level.itemTypes || 8),
    repeats: Number(level.repeats || config.matchCount || fallbackConfig.matchCount),
    traySlots: Number(level.traySlots || config.traySlots || fallbackConfig.traySlots),
    matchCount: Number(level.matchCount || config.matchCount || fallbackConfig.matchCount),
    rescueSeconds: Number(level.rescueSeconds || config.rescueSeconds || fallbackConfig.rescueSeconds),
    roomCode: level.roomCode || config.roomCode || fallbackConfig.roomCode,
    lockX: Number(level.lockX || 46),
    lockY: Number(level.lockY || 44),
    undoTools: Number.isFinite(Number(level.undoTools)) ? Number(level.undoTools) : 1,
    clearTools: Number.isFinite(Number(level.clearTools)) ? Number(level.clearTools) : 1,
    hint: level.hint || "点亮的物件可收起，3 个相同自动归位"
  }));
}

function clampLevelIndex(index) {
  const levels = state.config.levels || fallbackConfig.levels;
  return Math.max(0, Math.min(levels.length - 1, Number.isFinite(index) ? index : 0));
}

function activeLevel() {
  return state.config.levels[clampLevelIndex(state.currentLevelIndex)];
}

function levelPieces(level = activeLevel()) {
  return level.itemTypes * level.repeats;
}

function analyticsPayload(payload = {}) {
  const level = activeLevel();
  return {
    sessionId: state.sessionId,
    source: state.source,
    screen: state.screen,
    levelNo: level.no,
    levelTitle: level.shortTitle,
    roomCode: level.roomCode,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    ts: Date.now(),
    ...payload
  };
}

function track(type, payload = {}) {
  if (IS_FILE_URL) return;
  fetch(`${API_BASE}/api/event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, payload: analyticsPayload(payload) })
  }).catch(() => {});
}

function trackHomeView() {
  if (state.homeViewTracked || state.screen !== "entry") return;
  state.homeViewTracked = true;
  track("cleanup_home_view", { selectedLevelNo: activeLevel().no });
}

function asset(name) {
  return `./assets/pencil/${name}`;
}

function preloadImage(src) {
  if (!src) return Promise.resolve();
  const absoluteSrc = new URL(src, window.location.href).href;
  if (!imagePreloadCache.has(absoluteSrc)) {
    imagePreloadCache.set(absoluteSrc, new Promise(resolve => {
      const image = new Image();
      const done = () => resolve();
      image.onload = () => {
        if (image.decode) {
          image.decode().then(done).catch(done);
          return;
        }
        done();
      };
      image.onerror = done;
      image.src = absoluteSrc;
    }));
  }
  return imagePreloadCache.get(absoluteSrc);
}

function preloadConfiguredAssets() {
  const sources = [
    asset("messy-room.jpg"),
    asset("board-bg.jpg"),
    ...state.config.items.map(item => item.asset)
  ];
  sources.forEach(source => preloadImage(source));
}

function preloadRoundAssets(board) {
  const sources = new Set([asset("board-bg.jpg"), ...board.map(piece => piece.asset)]);
  return Promise.all([...sources].map(source => preloadImage(source)));
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFrom(seed) {
  let value = hashSeed(seed || "A08");
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, seed) {
  const random = randomFrom(seed);
  return values
    .map(value => ({ value, sort: random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(entry => entry.value);
}

function createSeed(level = activeLevel()) {
  return `${level.roomCode}-${level.id}-${Date.now().toString(36)}-${Math.floor(Math.random() * 9999)}`;
}

function buildBoard(seed, level = activeLevel()) {
  const itemPool = state.config.items.slice(0, level.itemTypes);
  const pieces = [];
  let index = 0;

  for (let repeat = 0; repeat < level.repeats; repeat += 1) {
    for (const item of itemPool) {
      pieces.push({
        uid: `${item.id}-${repeat}-${index}`,
        itemId: item.id,
        label: item.label,
        asset: item.asset,
        cleared: false
      });
      index += 1;
    }
  }

  const random = randomFrom(`${seed}-shape`);
  return shuffle(pieces, seed).map((piece, idx) => {
    const position = BOARD_POSITIONS[idx % BOARD_POSITIONS.length];
    return {
      ...piece,
      x: position[0],
      y: position[1],
      z: idx,
      rotate: Math.round((random() - 0.5) * 12),
      scale: 0.9 + random() * 0.14
    };
  });
}

async function startRound(options = {}) {
  if (state.isPreparing) return;
  clearInterval(state.timerId);
  if (Number.isInteger(options.levelIndex)) {
    state.currentLevelIndex = clampLevelIndex(options.levelIndex);
  }

  const level = activeLevel();
  const seed = options.sameSeed && state.seed ? state.seed : (state.challengeSeed || createSeed(level));
  const board = buildBoard(seed, level);
  state.isPreparing = true;
  if (state.screen === "entry") render();
  await preloadRoundAssets(board);
  state.isPreparing = false;
  state.screen = "game";
  state.seed = seed;
  state.challengeSeed = "";
  state.board = board;
  state.tray = [];
  state.history = [];
  state.cleaned = 0;
  state.moves = 0;
  state.matches = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.score = 0;
  state.secondsLeft = level.roundSeconds;
  state.tools = { undo: level.undoTools, clear: level.clearTools };
  state.lastResult = null;
  setMessage(level.hint, "info");
  state.timerId = setInterval(tick, 1000);
  track("cleanup_game_start", { roomCode: level.roomCode, seed, level: level.no });
  render();
}

function startFromEntry() {
  const level = activeLevel();
  track("cleanup_start_click", {
    selectedLevelNo: level.no,
    selectedLevelTitle: level.shortTitle,
    challengeSeed: Boolean(state.seed)
  });
  startRound({ sameSeed: Boolean(state.seed) });
}

function startNextLevel() {
  const nextIndex = clampLevelIndex(state.currentLevelIndex + 1);
  startRound({ levelIndex: nextIndex });
}

function goHome() {
  clearInterval(state.timerId);
  state.screen = "entry";
  state.isPreparing = false;
  state.tray = [];
  state.history = [];
  state.board = [];
  state.lastResult = null;
  state.seed = "";
  state.challengeSeed = "";
  state.challengerScore = 0;
  state.secondsLeft = activeLevel().roundSeconds;
  state.message = "";
  render();
}

function tick() {
  state.secondsLeft -= 1;
  if (state.secondsLeft <= 0) {
    endRound("fail", "timeout");
    return;
  }
  render();
}

function snapshot() {
  return {
    cleared: state.board.map(piece => [piece.uid, piece.cleared]),
    tray: state.tray.map(piece => piece.uid),
    cleaned: state.cleaned,
    moves: state.moves,
    matches: state.matches,
    combo: state.combo,
    bestCombo: state.bestCombo,
    score: state.score
  };
}

function restore(snapshotValue) {
  const clearedMap = new Map(snapshotValue.cleared);
  state.board.forEach(piece => {
    piece.cleared = Boolean(clearedMap.get(piece.uid));
  });
  const byUid = new Map(state.board.map(piece => [piece.uid, piece]));
  state.tray = snapshotValue.tray.map(uid => byUid.get(uid)).filter(Boolean);
  state.cleaned = snapshotValue.cleaned;
  state.moves = snapshotValue.moves;
  state.matches = snapshotValue.matches;
  state.combo = snapshotValue.combo;
  state.bestCombo = snapshotValue.bestCombo;
  state.score = snapshotValue.score;
}

function canPick(piece) {
  if (piece.cleared) return false;
  const level = activeLevel();
  return !state.board.some(other => {
    if (other.cleared || other.uid === piece.uid) return false;
    const overlaps = Math.abs(other.x - piece.x) < level.lockX && Math.abs(other.y - piece.y) < level.lockY;
    return overlaps && other.z > piece.z;
  });
}

function pickPiece(uid) {
  const piece = state.board.find(item => item.uid === uid);
  if (!piece) return;
  if (!canPick(piece)) {
    setMessage("这个还被上面的物件压住，先清旁边亮着的", "warn");
    render();
    return;
  }

  state.history.push(snapshot());
  piece.cleared = true;
  state.tray.push(piece);
  state.moves += 1;

  const level = activeLevel();
  const same = state.tray.filter(item => item.itemId === piece.itemId);
  if (same.length >= level.matchCount) {
    const clearUids = new Set(same.slice(0, level.matchCount).map(item => item.uid));
    state.tray = state.tray.filter(item => !clearUids.has(item.uid));
    state.cleaned += level.matchCount;
    state.matches += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.score += 100 + state.combo * 30 + state.secondsLeft;
    setMessage(`${piece.label} x${level.matchCount} 归位，连消 ${state.combo}`, "success");
  } else {
    state.combo = 0;
    state.score += 5;
    const need = level.matchCount - same.length;
    setMessage(`${piece.label} 已进槽，还差 ${need} 个归位`, need === 1 ? "warn" : "info");
  }

  if (state.board.every(item => item.cleared)) {
    endRound("win", "clean");
    return;
  }

  if (state.tray.length >= level.traySlots) {
    endRound("fail", "slot_full");
    return;
  }

  render();
}

function useTool(tool) {
  if (!state.tools[tool]) return;

  if (tool === "undo") {
    const previous = state.history.pop();
    if (!previous) {
      setMessage("还没有可以撤回的一步", "warn");
      render();
      return;
    }
    restore(previous);
    state.tools.undo -= 1;
    resumeGame("已撤回上一步，槽位救回来了");
    return;
  }

  if (tool === "clear") {
    const counts = state.tray.reduce((map, item) => {
      const current = map.get(item.itemId) || { item, count: 0 };
      current.count += 1;
      map.set(item.itemId, current);
      return map;
    }, new Map());
    const target = [...counts.values()].sort((a, b) => b.count - a.count)[0];
    if (!target) {
      setMessage("清理槽里还没有可清的一组", "warn");
      render();
      return;
    }
    state.tray = state.tray.filter(item => item.itemId !== target.item.itemId);
    state.tools.clear -= 1;
    state.combo = 0;
    resumeGame(`${target.item.label} x${target.count} 已从槽里清掉`);
  }
}

function resumeGame(message) {
  if (state.screen === "fail") {
    state.screen = "game";
    const level = activeLevel();
    state.secondsLeft = Math.min(level.roundSeconds, Math.max(12, state.secondsLeft + level.rescueSeconds));
    clearInterval(state.timerId);
    state.timerId = setInterval(tick, 1000);
  }
  setMessage(message, "success");
  render();
}

function endRound(outcome, reason) {
  clearInterval(state.timerId);
  const level = activeLevel();
  const total = state.board.length || levelPieces(level);
  const clearedPieces = state.board.filter(item => item.cleared).length;
  const progress = outcome === "win" ? 100 : Math.round((clearedPieces / total) * 100);
  const trayPressure = Math.round((state.tray.length / level.traySlots) * 100);
  const finalScore = state.score + (outcome === "win" ? 500 + state.secondsLeft * 6 : progress * 3);

  state.lastResult = {
    outcome,
    reason,
    levelNo: level.no,
    levelTitle: level.shortTitle,
    roomCode: level.roomCode,
    progress,
    trayPressure,
    cleaned: clearedPieces,
    total,
    secondsLeft: state.secondsLeft,
    score: finalScore,
    grade: resultGrade(outcome, progress, finalScore),
    stuck: stuckItems(),
    comment: resultComment(outcome, reason, progress)
  };
  state.screen = outcome === "win" ? "win" : "fail";
  track("cleanup_game_end", state.lastResult);
  submitScore(finalScore, outcome);
  render();
}

function submitScore(score, outcome) {
  if (IS_FILE_URL) return;
  const level = activeLevel();
  fetch(`${API_BASE}/api/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      roomCode: level.roomCode,
      level: level.no,
      score,
      outcome,
      secondsLeft: state.secondsLeft,
      moves: state.moves
    })
  }).catch(() => {});
}

function setMessage(message, tone = "info") {
  state.message = message;
  state.messageTone = tone;
}

function stuckItems() {
  if (!state.tray.length) {
    const remaining = state.board.filter(item => !item.cleared).slice(0, 2);
    return remaining.map(item => item.label).join(" / ") || "没有明显卡点";
  }
  const counts = state.tray.reduce((map, item) => {
    map.set(item.label, (map.get(item.label) || 0) + 1);
    return map;
  }, new Map());
  return [...counts.entries()].map(([label, count]) => `${label} x${count}`).join(" / ");
}

function resultGrade(outcome, progress, score) {
  if (outcome === "win" && score >= 1500) return "包厢救星";
  if (outcome === "win") return "清场大师";
  if (progress >= 85) return "差点封神";
  if (progress >= 60) return "轻度失控";
  return "彻底摆烂";
}

function resultComment(outcome, reason, progress) {
  if (outcome === "win") return "桌面终于能见人，下一关可以加压了。";
  if (reason === "timeout") return "歌都切完了，桌面还没救完。";
  if (progress >= 80) return "就差最后几件，撤回一步真能救。";
  return "清理槽爆了，包厢选择继续摆烂。";
}

function challengeUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", state.seed);
  url.searchParams.set("score", String(state.lastResult?.score || 0));
  url.searchParams.set("level", String(activeLevel().no));
  return url.toString();
}

async function copyChallenge() {
  const result = state.lastResult;
  const text = `${result.roomCode} 包厢大扫除第 ${result.levelNo} 关挑战：我拿了 ${result.score} 分，你来救这桌 ${challengeUrl()}`;
  try {
    await navigator.clipboard.writeText(text);
    setMessage("挑战口令已复制，发群里刚好", "success");
  } catch {
    setMessage("复制失败，可以长按地址栏分享本局", "warn");
  }
  render();
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function render() {
  app.innerHTML = `
    <main class="phone">
      ${state.screen === "entry" ? entryTemplate() : ""}
      ${state.screen === "game" ? gameTemplate() : ""}
      ${state.screen === "fail" ? failTemplate() : ""}
      ${state.screen === "win" ? winTemplate() : ""}
      ${state.screen === "share" ? shareTemplate() : ""}
    </main>
  `;

  app.querySelector("[data-action='start']")?.addEventListener("click", startFromEntry);
  app.querySelector("[data-action='restart']")?.addEventListener("click", () => startRound({ levelIndex: state.currentLevelIndex }));
  app.querySelector("[data-action='next-level']")?.addEventListener("click", startNextLevel);
  app.querySelector("[data-action='retry-same']")?.addEventListener("click", () => startRound({ sameSeed: true }));
  app.querySelector("[data-action='home']")?.addEventListener("click", goHome);
  app.querySelector("[data-action='share']")?.addEventListener("click", () => {
    state.screen = "share";
    track("cleanup_share_click", state.lastResult || {});
    render();
  });
  app.querySelector("[data-action='copy']")?.addEventListener("click", copyChallenge);
  app.querySelector("[data-action='back-result']")?.addEventListener("click", () => {
    state.screen = state.lastResult?.outcome === "win" ? "win" : "fail";
    render();
  });
  app.querySelectorAll("[data-level]").forEach(button => {
    button.addEventListener("click", () => {
      state.currentLevelIndex = clampLevelIndex(Number(button.dataset.level));
      state.seed = "";
      state.challengeSeed = "";
      state.challengerScore = 0;
      state.secondsLeft = activeLevel().roundSeconds;
      render();
    });
  });
  app.querySelectorAll("[data-tool]").forEach(button => {
    button.addEventListener("click", () => useTool(button.dataset.tool));
  });
  app.querySelectorAll("[data-piece]").forEach(button => {
    button.addEventListener("click", () => pickPiece(button.dataset.piece));
  });
  trackHomeView();
  keepSelectedLevelVisible();
}

function keepSelectedLevelVisible() {
  if (state.screen !== "entry") return;
  const selected = app.querySelector(".level-card.selected");
  selected?.scrollIntoView({ block: "nearest", inline: "center" });
}

function entryTemplate() {
  const level = activeLevel();
  const chapterSummary = [...new Set(state.config.levels.map(item => item.chapter))].join(" / ");
  const challenge = state.seed ? `
    <div class="challenge-ribbon">
      <span>朋友同局挑战</span>
      <strong>${state.challengerScore ? `${state.challengerScore} 分等你超过` : `第 ${level.no} 关桌面已载入`}</strong>
    </div>
  ` : "";
  return `
    <section class="screen entry-screen">
      <p class="eyebrow">${level.kicker}</p>
      <h1>${level.title}</h1>
      <p class="subcopy">${level.description}</p>
      ${challenge}
      <img class="hero-scene" src="${asset("messy-room.jpg")}" alt="KTV 包厢乱桌" />
      <div class="chapter-strip">
        <span>${chapterSummary}</span>
        <strong>${state.config.levels.length} 关</strong>
      </div>
      <div class="level-list" aria-label="选择关卡">
        ${state.config.levels.map(levelCardTemplate).join("")}
      </div>
      <div class="rule-strip" aria-label="玩法规则">
        <span>${level.roundSeconds} 秒</span>
        <span>${levelPieces(level)} 件物品</span>
        <span>${level.traySlots} 格爆槽</span>
      </div>
      <button class="primary" data-action="start" ${state.isPreparing ? "disabled" : ""}>${state.isPreparing ? "整理中..." : `开始第 ${level.no} 关`}</button>
    </section>
  `;
}

function levelCardTemplate(level, index) {
  const selected = index === clampLevelIndex(state.currentLevelIndex);
  const badgeClass = levelBadgeClass(level);
  return `
    <button class="level-card difficulty-${level.difficulty} ${selected ? "selected" : ""}" type="button" data-level="${index}" aria-pressed="${selected}">
      <span>${String(level.no).padStart(2, "0")}</span>
      <small${badgeClass ? ` class="${badgeClass}"` : ""}>${level.badge}</small>
      <strong>${level.shortTitle}</strong>
      <em>${levelPieces(level)} 件 / ${level.roundSeconds}s</em>
    </button>
  `;
}

function levelBadgeClass(level) {
  if (level.badge === "高压") {
    return "badge-pressure";
  }
  if (level.badge === "终场") {
    return "badge-final";
  }
  return "";
}

function gameTemplate() {
  const level = activeLevel();
  const visible = state.board.filter(piece => !piece.cleared);
  const available = visible.filter(canPick).length;
  const progress = Math.round((state.board.filter(piece => piece.cleared).length / state.board.length) * 100);
  return `
    <section class="screen game-screen">
      <header class="game-hud">
        <button class="hud-home" type="button" data-action="home" aria-label="返回首页">首页</button>
        <span>第 ${level.no} 关 · ${level.roomCode} ${level.shortTitle}</span>
        <strong>${formatTime(state.secondsLeft)}</strong>
      </header>
      <div class="round-stats">
        <div><b>${progress}%</b><span>清理进度</span></div>
        <div><b>${state.score}</b><span>分数</span></div>
        <div><b>${state.bestCombo || state.combo}</b><span>最高连消</span></div>
      </div>
      <div class="message ${state.messageTone}" role="status">${state.message}</div>
      <div class="board" aria-label="清理棋盘">
        <img class="board-bg" src="${asset("board-bg.jpg")}" alt="" />
        <div class="available-count">可收起 ${available} 件</div>
        ${visible.map(pieceTemplate).join("")}
      </div>
      <div class="tool-row" aria-label="救场工具">
        <button type="button" data-tool="undo" ${state.tools.undo ? "" : "disabled"}>撤回一步 <b>${state.tools.undo}</b></button>
        <button type="button" data-tool="clear" ${state.tools.clear ? "" : "disabled"}>清一组 <b>${state.tools.clear}</b></button>
      </div>
      <div class="tray-wrap">
        <div class="tray-meta">
          <span>清理槽 ${state.tray.length}/${level.traySlots}</span>
          <strong>${state.tray.length >= 5 ? "高压" : "安全"}</strong>
        </div>
        <div class="tray" aria-label="临时收纳槽">
          ${Array.from({ length: level.traySlots }).map((_, index) => traySlotTemplate(index)).join("")}
        </div>
      </div>
    </section>
  `;
}

function pieceTemplate(piece) {
  const available = canPick(piece);
  return `
    <button
      class="piece ${available ? "available" : "locked"}"
      style="--x:${piece.x}px;--y:${piece.y}px;--z:${piece.z};--r:${piece.rotate}deg;--s:${piece.scale}"
      data-piece="${piece.uid}"
      aria-label="${available ? "收起" : "被压住"}${piece.label}"
      ${available ? "" : "aria-disabled=\"true\""}
    >
      <img src="${piece.asset}" alt="" />
    </button>
  `;
}

function traySlotTemplate(index) {
  const item = state.tray[index];
  return `
    <div class="tray-slot ${item ? "filled" : ""}">
      ${item ? `<img src="${item.asset}" alt="${item.label}" />` : ""}
    </div>
  `;
}

function failTemplate() {
  const result = state.lastResult || { progress: 82, stuck: "麦克风 x1 / 遥控器 x2", grade: "差点封神", comment: "就差最后几件。" };
  return `
    <section class="screen result-screen">
      <img class="result-scene muted" src="${asset("board-bg.jpg")}" alt="未完成的包厢棋盘" />
      <p class="danger-label">第 ${result.levelNo || activeLevel().no} 关失败了</p>
      <h1>差一点就能救回来</h1>
      <div class="result-panel">
        <div><span>清理进度</span><strong>${result.progress}%</strong></div>
        <div><span>卡住物件</span><strong>${result.stuck}</strong></div>
        <div><span>包厢评级</span><strong>${result.grade}</strong></div>
        <div><span>系统吐槽</span><strong>${result.comment}</strong></div>
      </div>
      <div class="result-actions">
        <button class="secondary" data-tool="undo" ${state.tools.undo && state.history.length ? "" : "disabled"}>撤回一步救场</button>
        <button class="ghost" data-tool="clear" ${state.tools.clear && state.tray.length ? "" : "disabled"}>清掉槽里一组</button>
        <button class="primary" data-action="retry-same">同局再来</button>
        <button class="ghost" data-action="share">生成战报</button>
        <button class="ghost full-row" data-action="home">返回首页</button>
      </div>
    </section>
  `;
}

function winTemplate() {
  const level = activeLevel();
  const result = state.lastResult || { secondsLeft: 78, cleaned: 24, score: 1200, grade: "清场大师", progress: 100 };
  const nextLevel = state.config.levels[state.currentLevelIndex + 1];
  const compare = state.challengerScore ? `<p class="compare-copy">已超过朋友 ${Math.max(0, result.score - state.challengerScore)} 分</p>` : "";
  return `
    <section class="screen result-screen">
      <img class="result-scene" src="${asset("messy-room.jpg")}" alt="恢复整洁的包厢桌面" />
      <p class="clean-label">第 ${level.no} 关完成</p>
      <h1>${nextLevel ? `解锁 ${nextLevel.shortTitle}` : "包厢恢复可见状态"}</h1>
      <div class="grade-card">
        <span>${result.grade}</span>
        <strong>${result.score} 分</strong>
        ${compare}
      </div>
      <div class="stat-row">
        <div><strong>${formatTime(result.secondsLeft)}</strong><span>剩余</span></div>
        <div><strong>${state.matches}</strong><span>归位组</span></div>
        <div><strong>${state.bestCombo}</strong><span>最高连消</span></div>
      </div>
      <button class="primary" data-action="${nextLevel ? "next-level" : "restart"}">${nextLevel ? `继续第 ${nextLevel.no} 关` : "重打封场战"}</button>
      <button class="ghost" data-action="share">生成同局挑战</button>
      <button class="ghost" data-action="home">返回首页</button>
    </section>
  `;
}

function shareTemplate() {
  const result = state.lastResult || { progress: 82, outcome: "fail", score: 0, grade: "差点封神", stuck: "麦克风 x1", levelNo: activeLevel().no, roomCode: activeLevel().roomCode };
  const title = result.outcome === "win" ? "包厢清理完成" : "包厢清理失败";
  return `
    <section class="screen share-screen">
      <div class="poster">
        <img src="${asset("messy-room.jpg")}" alt="包厢战报封面" />
        <h1>包厢大扫除</h1>
        <h2>${result.roomCode} 第 ${result.levelNo} 关 ${title}</h2>
        <div class="score-card">
          <strong>${result.progress}%</strong>
          <span>${result.grade} · ${result.score} 分</span>
        </div>
        <p class="poster-copy">我卡在「${result.stuck}」，同一桌面已经给你锁好。</p>
        <button class="primary" data-action="copy">复制同局挑战</button>
      </div>
      <button class="ghost" data-action="retry-same">自己再打一次</button>
      <button class="ghost" data-action="back-result">返回结果</button>
      <button class="ghost" data-action="home">返回首页</button>
    </section>
  `;
}

loadConfig().then(render);
