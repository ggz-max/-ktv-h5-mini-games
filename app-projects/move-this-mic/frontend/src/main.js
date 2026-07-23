import "./styles.css";

const ITEM_ASSETS = {
  mic: "/assets/image2/items/mic.webp",
  cable: "/assets/image2/items/cable.webp",
  remote: "/assets/image2/items/remote.webp",
  cup: "/assets/image2/items/cup.webp",
  snack: "/assets/image2/items/snack.webp",
  ticket: "/assets/image2/items/ticket.webp",
  glow: "/assets/image2/items/glow.webp",
  phone: "/assets/image2/items/phone.webp",
  dice: "/assets/image2/items/dice.webp",
  coaster: "/assets/image2/items/coaster.webp",
  shaker: "/assets/image2/items/shaker.webp",
  bucket: "/assets/image2/items/bucket.webp",
  knot: "/assets/image2/items/knot.webp"
};

Object.values(ITEM_ASSETS).forEach(source => {
  const image = new Image();
  image.decoding = "async";
  image.src = source;
});

const CHAPTERS = [
  { eyebrow: "第一章", title: "先看谁压谁", range: [0, 2] },
  { eyebrow: "第二章", title: "捷径不一定稳", range: [3, 5] },
  { eyebrow: "第三章", title: "高压终场", range: [6, 8] }
];

const LEVELS = [
  {
    chapter: 0,
    title: "先救第一支",
    target: "练习麦",
    rule: "基础压层",
    subtitle: "先看清谁真正压住麦，不必清空整桌。",
    boardHint: "只有一条救麦路线",
    assist: "full",
    timeLimit: 32,
    parMoves: 3,
    items: [
      { id: "ticket", name: "点歌小票", kind: "ticket", decoy: true, blockers: [], x: 64, y: 10, w: 22, h: 10, z: 10 },
      { id: "glow", name: "荧光棒", kind: "glow", decoy: true, blockers: [], x: 10, y: 18, w: 38, h: 8, z: 9 },
      { id: "remote", name: "遥控器", kind: "remote", blockers: [], priority: 1, x: 49, y: 31, w: 39, h: 13, z: 9 },
      { id: "snack", name: "零食盘", kind: "snack", decoy: true, blockers: ["glow"], x: 7, y: 40, w: 31, h: 19, z: 8 },
      { id: "cable", name: "压麦线", kind: "cable", blockers: ["remote"], priority: 2, x: 15, y: 67, w: 70, h: 15, z: 6 },
      { id: "mic", name: "练习麦", kind: "mic", goal: true, paths: [["cable"]], x: 29, y: 57, w: 50, h: 16, z: 4 }
    ]
  },
  {
    chapter: 0,
    title: "左右都能走",
    target: "主麦",
    rule: "双路线",
    subtitle: "左边稳，右边快；先找最短的那条路。",
    boardHint: "安全路线 / 冒险路线",
    assist: "count",
    timeLimit: 30,
    parMoves: 3,
    moveLimit: 5,
    routeSwitchPressure: 14,
    items: [
      { id: "ticket", name: "点歌小票", kind: "ticket", decoy: true, blockers: [], x: 61, y: 8, w: 22, h: 10, z: 10 },
      { id: "glow", name: "荧光棒", kind: "glow", route: "safe", blockers: [], priority: 5, x: 13, y: 17, w: 38, h: 8, z: 9 },
      { id: "snack", name: "零食盘", kind: "snack", route: "safe", blockers: ["glow"], priority: 6, x: 6, y: 38, w: 33, h: 19, z: 8 },
      { id: "cup", name: "半杯酒", kind: "cup", route: "fast", risk: true, blockers: [], priority: 1, x: 71, y: 49, w: 18, h: 24, z: 9 },
      { id: "cable-safe", name: "左侧线", kind: "cable", route: "safe", blockers: ["snack"], priority: 7, x: 9, y: 65, w: 48, h: 15, z: 6 },
      { id: "cable-fast", name: "杯下线", kind: "cable", route: "fast", blockers: ["cup"], priority: 2, x: 49, y: 67, w: 42, h: 14, z: 6 },
      { id: "mic", name: "主麦", kind: "mic", goal: true, paths: [["cable-safe"], ["cable-fast"]], x: 29, y: 57, w: 49, h: 16, z: 4 }
    ]
  },
  {
    chapter: 0,
    title: "别被空位骗了",
    target: "副麦",
    rule: "绕路物件",
    subtitle: "能动不等于挡路，乱清桌面会丢掉三星。",
    boardHint: "可动物件里藏着绕路项",
    assist: "count",
    timeLimit: 30,
    parMoves: 4,
    moveLimit: 6,
    routeSwitchPressure: 14,
    items: [
      { id: "dice", name: "骰子", kind: "dice", decoy: true, blockers: [], x: 10, y: 13, w: 18, h: 17, z: 10 },
      { id: "coaster", name: "杯垫", kind: "coaster", decoy: true, blockers: [], x: 69, y: 16, w: 20, h: 15, z: 9 },
      { id: "phone", name: "手机", kind: "phone", route: "safe", blockers: [], priority: 1, x: 29, y: 22, w: 25, h: 20, z: 9 },
      { id: "remote", name: "切歌器", kind: "remote", route: "fast", blockers: [], priority: 5, x: 57, y: 37, w: 34, h: 12, z: 8 },
      { id: "cup", name: "满杯", kind: "cup", route: "fast", risk: true, blockers: ["remote"], priority: 6, x: 68, y: 53, w: 19, h: 24, z: 9 },
      { id: "knot-safe", name: "松线结", kind: "knot", route: "safe", blockers: ["phone"], priority: 2, x: 15, y: 50, w: 31, h: 22, z: 7 },
      { id: "cable-safe", name: "长麦线", kind: "cable", route: "safe", blockers: ["knot-safe"], priority: 3, x: 11, y: 68, w: 53, h: 14, z: 6 },
      { id: "cable-fast", name: "杯下线", kind: "cable", route: "fast", blockers: ["cup"], priority: 7, x: 52, y: 67, w: 38, h: 14, z: 6 },
      { id: "mic", name: "副麦", kind: "mic", goal: true, paths: [["cable-safe"], ["cable-fast"]], x: 31, y: 58, w: 49, h: 16, z: 4 }
    ]
  },
  {
    chapter: 1,
    title: "手别只会点",
    target: "返场麦",
    rule: "手势入门",
    subtitle: "按住手机断电，左右划开线结，再沿着长线捋到底。",
    boardHint: "长按 · 往返 · 捋线",
    assist: "none",
    timeLimit: 24,
    parMoves: 4,
    moveLimit: 5,
    startingPressure: 16,
    pressureRate: 0.35,
    wrongPressure: 26,
    wrongTimePenalty: 5,
    items: [
      { id: "dice", name: "骰子", kind: "dice", decoy: true, blockers: [], x: 11, y: 13, w: 18, h: 17, z: 10 },
      { id: "phone", name: "发烫手机", kind: "phone", interaction: "hold", holdMs: 800, blockers: [], priority: 1, x: 28, y: 23, w: 25, h: 20, z: 9 },
      { id: "coaster", name: "杯垫", kind: "coaster", decoy: true, blockers: [], x: 70, y: 17, w: 20, h: 15, z: 9 },
      { id: "remote", name: "遥控器", kind: "remote", decoy: true, blockers: ["coaster"], x: 57, y: 38, w: 34, h: 12, z: 8 },
      { id: "knot", name: "粗线结", kind: "knot", interaction: "scrub", gestureCount: 4, blockers: ["phone"], priority: 2, x: 19, y: 49, w: 31, h: 23, z: 7 },
      { id: "cable", name: "长麦线", kind: "cable", interaction: "trace", blockers: ["knot"], priority: 3, x: 13, y: 69, w: 68, h: 14, z: 6 },
      { id: "mic", name: "返场麦", kind: "mic", goal: true, paths: [["cable"]], x: 31, y: 58, w: 49, h: 16, z: 4 }
    ]
  },
  {
    chapter: 1,
    title: "卡点还是倒水",
    target: "副歌麦",
    rule: "时间奖励",
    subtitle: "加时路线要卡准亮点，再把冰桶拖到排水位停住倒空。",
    boardHint: "卡点加时 / 停留倾倒 / 安全搬运",
    assist: "none",
    timeLimit: 22,
    parMoves: 4,
    moveLimit: 5,
    startingPressure: 18,
    pressureRate: 0.45,
    routeSwitchPressure: 18,
    wrongPressure: 28,
    wrongTimePenalty: 5,
    items: [
      { id: "ticket", name: "点歌小票", kind: "ticket", decoy: true, blockers: [], x: 61, y: 8, w: 22, h: 10, z: 10 },
      { id: "glow", name: "节拍棒", kind: "glow", interaction: "rhythm", rhythmPeriod: 1500, route: "bonus", bonusTime: 4, blockers: [], priority: 1, x: 13, y: 17, w: 38, h: 8, z: 9 },
      { id: "bucket", name: "冰桶", kind: "bucket", interaction: "pour", holdMs: 700, route: "bonus", blockers: ["glow"], priority: 2, x: 8, y: 36, w: 27, h: 25, z: 8 },
      { id: "remote", name: "遥控器", kind: "remote", interaction: "hold", holdMs: 750, route: "fast", blockers: [], priority: 6, x: 51, y: 28, w: 37, h: 13, z: 9 },
      { id: "cup", name: "满杯", kind: "cup", interaction: "carry", risk: true, gateX: 56, gateY: 69, gateW: 18, gateH: 11, route: "fast", blockers: ["remote"], priority: 7, x: 71, y: 52, w: 18, h: 24, z: 8 },
      { id: "cable-safe", name: "亮色线", kind: "cable", interaction: "trace", route: "bonus", blockers: ["bucket"], priority: 3, x: 9, y: 65, w: 48, h: 15, z: 6 },
      { id: "cable-fast", name: "杯底线", kind: "cable", interaction: "trace", route: "fast", blockers: ["cup"], priority: 8, x: 49, y: 67, w: 42, h: 14, z: 6 },
      { id: "mic", name: "副歌麦", kind: "mic", goal: true, paths: [["cable-safe"], ["cable-fast"]], x: 29, y: 57, w: 49, h: 16, z: 4 }
    ]
  },
  {
    chapter: 1,
    title: "先把线稳住",
    target: "合唱麦",
    rule: "泄压路线",
    subtitle: "擦热防滑垫能泄压；冒险路线要稳端杯、长按切歌器。",
    boardHint: "往返擦拭 / 穿门搬运 / 长按断电",
    assist: "none",
    timeLimit: 23,
    parMoves: 4,
    moveLimit: 5,
    routeSwitchPressure: 20,
    startingPressure: 36,
    pressureRate: 0.6,
    wrongPressure: 30,
    wrongTimePenalty: 5,
    items: [
      { id: "coaster", name: "防滑垫", kind: "coaster", interaction: "scrub", gestureCount: 3, route: "safe", pressureRelief: 18, blockers: [], priority: 5, x: 68, y: 17, w: 20, h: 15, z: 10 },
      { id: "phone", name: "手机", kind: "phone", route: "safe", blockers: ["coaster"], priority: 6, x: 30, y: 22, w: 25, h: 20, z: 9 },
      { id: "dice", name: "骰子", kind: "dice", decoy: true, blockers: [], x: 10, y: 14, w: 18, h: 17, z: 9 },
      { id: "cup", name: "气泡饮", kind: "cup", interaction: "carry", risk: true, gateX: 30, gateY: 68, gateW: 18, gateH: 11, route: "fast", blockers: [], priority: 1, x: 15, y: 39, w: 19, h: 24, z: 9 },
      { id: "remote", name: "切歌器", kind: "remote", interaction: "hold", holdMs: 800, route: "fast", blockers: ["cup"], priority: 2, x: 54, y: 38, w: 36, h: 12, z: 8 },
      { id: "knot", name: "松线结", kind: "knot", interaction: "scrub", gestureCount: 3, route: "safe", blockers: ["phone"], priority: 7, x: 37, y: 51, w: 27, h: 21, z: 7 },
      { id: "cable-safe", name: "稳妥线", kind: "cable", interaction: "trace", route: "safe", blockers: ["knot"], priority: 8, x: 34, y: 68, w: 54, h: 14, z: 6 },
      { id: "cable-fast", name: "高压线", kind: "cable", interaction: "trace", route: "fast", blockers: ["remote"], priority: 3, x: 8, y: 68, w: 51, h: 14, z: 6 },
      { id: "mic", name: "合唱麦", kind: "mic", goal: true, paths: [["cable-safe"], ["cable-fast"]], x: 29, y: 58, w: 50, h: 16, z: 4 }
    ]
  },
  {
    chapter: 2,
    title: "高压二选一",
    target: "领唱麦",
    rule: "高压捷径",
    subtitle: "短路要稳端杯、按住遥控器；长路要划结、顺着线捋到底。",
    boardHint: "两条路线，两套手势",
    assist: "none",
    timeLimit: 20,
    parMoves: 4,
    moveLimit: 5,
    startingPressure: 34,
    pressureRate: 0.9,
    routeSwitchPressure: 22,
    wrongPressure: 32,
    wrongTimePenalty: 6,
    items: [
      { id: "phone", name: "手机", kind: "phone", route: "safe", blockers: [], priority: 6, x: 28, y: 22, w: 25, h: 20, z: 10 },
      { id: "ticket", name: "点歌小票", kind: "ticket", decoy: true, blockers: [], x: 63, y: 9, w: 22, h: 10, z: 10 },
      { id: "cup", name: "满杯", kind: "cup", interaction: "carry", risk: true, gateX: 53, gateY: 69, gateW: 18, gateH: 11, route: "fast", pressure: 18, blockers: [], priority: 1, x: 68, y: 48, w: 19, h: 24, z: 9 },
      { id: "remote", name: "遥控器", kind: "remote", interaction: "hold", holdMs: 850, route: "fast", blockers: ["cup"], priority: 2, x: 53, y: 29, w: 37, h: 13, z: 9 },
      { id: "knot", name: "粗线结", kind: "knot", interaction: "scrub", gestureCount: 4, route: "safe", blockers: ["phone"], priority: 7, x: 15, y: 49, w: 31, h: 23, z: 7 },
      { id: "cable-safe", name: "稳妥线", kind: "cable", interaction: "trace", route: "safe", blockers: ["knot"], priority: 8, x: 9, y: 67, w: 51, h: 14, z: 6 },
      { id: "cable-fast", name: "高压线", kind: "cable", interaction: "trace", route: "fast", blockers: ["remote"], priority: 3, x: 49, y: 68, w: 42, h: 14, z: 6 },
      { id: "mic", name: "领唱麦", kind: "mic", goal: true, paths: [["cable-safe"], ["cable-fast"]], x: 29, y: 58, w: 49, h: 16, z: 4 }
    ]
  },
  {
    chapter: 2,
    title: "左右手感不同",
    target: "终场麦",
    rule: "双线结",
    subtitle: "左边先卡节拍，右边先挪手机；两边都要划结再捋线。",
    boardHint: "卡点或直取，选定后别换边",
    assist: "none",
    timeLimit: 20,
    parMoves: 4,
    moveLimit: 5,
    startingPressure: 32,
    pressureRate: 1.1,
    routeSwitchPressure: 22,
    wrongPressure: 32,
    wrongTimePenalty: 6,
    items: [
      { id: "glow", name: "节拍棒", kind: "glow", interaction: "rhythm", rhythmPeriod: 1350, route: "left", bonusTime: 3, blockers: [], priority: 1, x: 56, y: 12, w: 35, h: 8, z: 10 },
      { id: "phone", name: "手机", kind: "phone", route: "right", blockers: [], priority: 6, x: 16, y: 18, w: 25, h: 20, z: 10 },
      { id: "dice", name: "骰子", kind: "dice", decoy: true, blockers: [], x: 43, y: 28, w: 17, h: 16, z: 9 },
      { id: "knot-left", name: "左线结", kind: "knot", interaction: "scrub", gestureCount: 5, route: "left", blockers: ["glow"], priority: 2, x: 52, y: 43, w: 30, h: 22, z: 8 },
      { id: "knot-right", name: "右线结", kind: "knot", interaction: "scrub", gestureCount: 5, route: "right", blockers: ["phone"], priority: 7, x: 13, y: 46, w: 30, h: 22, z: 8 },
      { id: "cable-left", name: "左麦线", kind: "cable", interaction: "trace", route: "left", blockers: ["knot-left"], priority: 3, x: 46, y: 68, w: 46, h: 14, z: 6 },
      { id: "cable-right", name: "右麦线", kind: "cable", interaction: "trace", route: "right", blockers: ["knot-right"], priority: 8, x: 8, y: 68, w: 49, h: 14, z: 6 },
      { id: "mic", name: "终场麦", kind: "mic", goal: true, paths: [["cable-left"], ["cable-right"]], x: 29, y: 58, w: 50, h: 16, z: 4 }
    ]
  },
  {
    chapter: 2,
    title: "压轴三条路",
    target: "冠军麦",
    rule: "终极路线",
    subtitle: "倾倒、摇动、擦拭、解结、捋线全部混在三条路线里。",
    boardHint: "三条路线，六种操作，只通一条",
    assist: "none",
    timeLimit: 21,
    parMoves: 4,
    moveLimit: 6,
    startingPressure: 48,
    pressureRate: 1.3,
    routeSwitchPressure: 24,
    wrongPressure: 34,
    wrongTimePenalty: 6,
    items: [
      { id: "glow", name: "节拍棒", kind: "glow", interaction: "rhythm", rhythmPeriod: 1200, route: "bonus", bonusTime: 4, blockers: [], priority: 6, x: 57, y: 10, w: 34, h: 8, z: 12 },
      { id: "coaster", name: "防滑垫", kind: "coaster", interaction: "scrub", gestureCount: 4, route: "safe", pressureRelief: 20, blockers: [], priority: 10, x: 9, y: 11, w: 20, h: 15, z: 12 },
      { id: "bucket", name: "满冰桶", kind: "bucket", interaction: "pour", holdMs: 850, route: "fast", risk: true, pressure: 18, blockers: [], priority: 1, x: 5, y: 32, w: 23, h: 26, z: 11 },
      { id: "phone", name: "手机", kind: "phone", route: "safe", blockers: ["coaster"], priority: 11, x: 37, y: 24, w: 22, h: 18, z: 10 },
      { id: "shaker", name: "沙锤", kind: "shaker", interaction: "shake", gestureCount: 6, route: "bonus", blockers: ["glow"], priority: 7, x: 68, y: 32, w: 23, h: 19, z: 10 },
      { id: "remote", name: "切歌器", kind: "remote", interaction: "hold", holdMs: 900, route: "fast", blockers: ["bucket"], priority: 2, x: 16, y: 51, w: 34, h: 12, z: 9 },
      { id: "snack", name: "零食盘", kind: "snack", route: "bonus", blockers: ["shaker"], priority: 8, x: 69, y: 51, w: 24, h: 16, z: 9 },
      { id: "knot", name: "冠军结", kind: "knot", interaction: "scrub", gestureCount: 6, route: "safe", blockers: ["phone"], priority: 12, x: 44, y: 46, w: 24, h: 19, z: 8 },
      { id: "cable-fast", name: "冒险线", kind: "cable", interaction: "trace", route: "fast", blockers: ["remote"], priority: 3, x: 5, y: 71, w: 39, h: 13, z: 6 },
      { id: "cable-bonus", name: "加时线", kind: "cable", interaction: "trace", route: "bonus", blockers: ["snack"], priority: 9, x: 59, y: 72, w: 35, h: 12, z: 6 },
      { id: "cable-safe", name: "泄压线", kind: "cable", interaction: "trace", route: "safe", blockers: ["knot"], priority: 13, x: 31, y: 66, w: 39, h: 13, z: 7 },
      { id: "mic", name: "冠军麦", kind: "mic", goal: true, paths: [["cable-fast"], ["cable-bonus"], ["cable-safe"]], x: 32, y: 58, w: 45, h: 14, z: 4 }
    ]
  }
];

const STORAGE_KEY = "move-this-mic-progress-v4";
const MAX_PRESSURE = 100;
const WRONG_PRESSURE = 24;
const DEFAULT_RISK_PRESSURE = 12;
const WRONG_TIME_PENALTY = 4;
const COMBO_WINDOW_MS = 2400;
const COMBO_BONUS_SECONDS = 3;
const ROUTE_LABELS = {
  safe: "稳妥路线",
  fast: "冒险路线",
  bonus: "加时路线",
  left: "左侧路线",
  right: "右侧路线"
};
const INTERACTION_LABELS = {
  hold: "长按",
  scrub: "往返",
  pour: "倾倒",
  shake: "摇动",
  trace: "捋线",
  carry: "稳运",
  rhythm: "卡点"
};
const RHYTHM_WINDOW = [0.32, 0.68];
const LEVEL_DIFFICULTY = [1, 2, 2, 4, 4, 5, 5, 6, 6];
const app = document.querySelector("#app");

function emptyProgress() {
  return {
    version: 4,
    unlockedLevel: 0,
    bestStars: Array(LEVELS.length).fill(0),
    bestMoves: Array(LEVELS.length).fill(null)
  };
}

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw || raw.version !== 4) return emptyProgress();
    const progress = emptyProgress();
    progress.unlockedLevel = clamp(Number(raw.unlockedLevel) || 0, 0, LEVELS.length - 1);
    progress.bestStars = progress.bestStars.map((_, index) => clamp(Number(raw.bestStars?.[index]) || 0, 0, 3));
    progress.bestMoves = progress.bestMoves.map((_, index) => {
      const value = Number(raw.bestMoves?.[index]);
      return Number.isFinite(value) && value > 0 ? value : null;
    });
    return progress;
  } catch {
    return emptyProgress();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  } catch {
    // Private webviews can disable storage; the current run still works.
  }
}

const state = {
  screen: "entry",
  previousScreen: "entry",
  levelIndex: 0,
  removed: new Set(),
  pullCounts: new Map(),
  interactionProgress: new Map(),
  removedNames: [],
  score: 0,
  levelMoves: 0,
  levelMistakes: 0,
  detours: 0,
  combo: 0,
  bestCombo: 0,
  lastMoveAt: 0,
  comboBonusAwarded: false,
  committedRoute: "",
  routeSwitches: 0,
  hintUsed: false,
  hintId: "",
  pressure: 0,
  maxPressure: 0,
  currentStars: 0,
  success: false,
  failureReason: "",
  newRecord: false,
  feedback: "拖走压在上面的物件。",
  feedbackTone: "calm",
  shakeId: "",
  copied: false,
  deadlineAt: 0,
  lastTimerAt: 0,
  timeLeft: 0,
  timer: null,
  transitionLocked: false,
  progress: loadProgress()
};

function currentLevel() {
  return LEVELS[state.levelIndex];
}

function availableForSet(item, removed) {
  if (item.paths) return item.paths.some(path => path.every(blocker => removed.has(blocker)));
  return (item.blockers || []).every(blocker => removed.has(blocker));
}

function available(item) {
  return availableForSet(item, state.removed);
}

function validateLevels() {
  LEVELS.forEach((level, levelIndex) => {
    const ids = new Set();
    level.items.forEach(item => {
      if (ids.has(item.id)) throw new Error(`level ${levelIndex + 1}: duplicate item ${item.id}`);
      ids.add(item.id);
      if (!ITEM_ASSETS[item.kind]) throw new Error(`level ${levelIndex + 1}: missing asset kind ${item.kind}`);
    });
    const goals = level.items.filter(item => item.goal);
    if (goals.length !== 1) throw new Error(`level ${levelIndex + 1}: expected one goal`);
    level.items.forEach(item => {
      const references = item.paths?.flat() || item.blockers || [];
      references.forEach(reference => {
        if (!ids.has(reference)) throw new Error(`level ${levelIndex + 1}: missing blocker ${reference}`);
      });
    });

    const removed = new Set();
    for (let pass = 0; pass < level.items.length + 1; pass += 1) {
      level.items.forEach(item => {
        if (!removed.has(item.id) && availableForSet(item, removed)) removed.add(item.id);
      });
    }
    if (!removed.has(goals[0].id)) throw new Error(`level ${levelIndex + 1}: goal is unreachable`);
  });
}

validateLevels();

function remainingItems() {
  return currentLevel().items.filter(item => !state.removed.has(item.id));
}

function unresolvedBlockers(item) {
  const paths = item.paths || [item.blockers || []];
  return paths
    .map(path => path.filter(blocker => !state.removed.has(blocker)))
    .sort((left, right) => left.length - right.length)[0] || [];
}

function itemName(itemId) {
  return currentLevel().items.find(item => item.id === itemId)?.name || itemId;
}

function pullsRemaining(item) {
  return Math.max(0, (item.pulls || 1) - (state.pullCounts.get(item.id) || 0));
}

function formatTime(value) {
  return String(Math.max(0, Math.ceil(value))).padStart(2, "0");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function addPressure(value) {
  state.pressure = clamp(state.pressure + value, 0, MAX_PRESSURE);
  state.maxPressure = Math.max(state.maxPressure, state.pressure);
}

function pulse(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Haptics are optional in embedded webviews.
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stopClock() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

function startClock() {
  stopClock();
  state.deadlineAt = Date.now() + currentLevel().timeLimit * 1000;
  state.lastTimerAt = Date.now();
  state.timeLeft = currentLevel().timeLimit;
  state.timer = setInterval(() => {
    if (state.screen !== "game") return;
    const now = Date.now();
    const deltaSeconds = Math.max(0, (now - state.lastTimerAt) / 1000);
    state.lastTimerAt = now;
    if (currentLevel().pressureRate) {
      addPressure(currentLevel().pressureRate * deltaSeconds);
      if (state.pressure >= MAX_PRESSURE) {
        endLevel(false, "pressure");
        return;
      }
    }
    state.timeLeft = Math.max(0, (state.deadlineAt - now) / 1000);
    updateTimeDom();
    if (state.timeLeft <= 0) endLevel(false, "time");
  }, 160);
}

function updateTimeDom() {
  if (state.screen !== "game") return;
  const level = currentLevel();
  const time = document.querySelector("[data-time]");
  const bar = document.querySelector("[data-time-bar]");
  const timeBox = document.querySelector("[data-time-box]");
  const pressureBar = document.querySelector("[data-pressure-bar]");
  const pressureValue = document.querySelector("[data-pressure-value]");
  if (time) time.textContent = formatTime(state.timeLeft || level.timeLimit);
  if (bar) bar.style.width = `${clamp((state.timeLeft / level.timeLimit) * 100, 0, 100)}%`;
  if (timeBox) timeBox.classList.toggle("is-danger", state.timeLeft <= 10);
  if (pressureBar) pressureBar.style.width = `${state.pressure}%`;
  if (pressureValue) pressureValue.textContent = String(Math.round(state.pressure));
}

function resetLevelState() {
  const level = currentLevel();
  state.removed = new Set();
  state.pullCounts = new Map();
  state.interactionProgress = new Map();
  state.removedNames = [];
  state.score = 0;
  state.levelMoves = 0;
  state.levelMistakes = 0;
  state.detours = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.lastMoveAt = 0;
  state.comboBonusAwarded = false;
  state.committedRoute = "";
  state.routeSwitches = 0;
  state.hintUsed = false;
  state.hintId = "";
  state.pressure = level.startingPressure || 0;
  state.maxPressure = state.pressure;
  state.currentStars = 0;
  state.success = false;
  state.failureReason = "";
  state.newRecord = false;
  state.feedback = level.subtitle;
  state.feedbackTone = "calm";
  state.shakeId = "";
  state.copied = false;
  state.transitionLocked = false;
}

function startLevel(index) {
  const targetIndex = clamp(Number(index) || 0, 0, LEVELS.length - 1);
  if (targetIndex > state.progress.unlockedLevel) {
    state.screen = "levels";
    render();
    return;
  }
  stopClock();
  state.levelIndex = targetIndex;
  state.screen = "game";
  resetLevelState();
  startClock();
  render();
}

function nextPlayableLevel() {
  for (let index = 0; index <= state.progress.unlockedLevel; index += 1) {
    if (!state.progress.bestStars[index]) return index;
  }
  return state.progress.unlockedLevel;
}

function totalBestStars() {
  return state.progress.bestStars.reduce((sum, stars) => sum + stars, 0);
}

function calculateLevelStars() {
  const level = currentLevel();
  if (!state.hintUsed && state.levelMistakes === 0 && state.levelMoves <= level.parMoves && state.timeLeft >= level.timeLimit * 0.2) return 3;
  if (state.levelMistakes <= 1 && state.levelMoves <= level.parMoves + 2) return 2;
  return 1;
}

function recordProgress(stars) {
  const index = state.levelIndex;
  const oldStars = state.progress.bestStars[index] || 0;
  const oldMoves = state.progress.bestMoves[index];
  state.newRecord = stars > oldStars || oldMoves === null || state.levelMoves < oldMoves;
  state.progress.bestStars[index] = Math.max(oldStars, stars);
  state.progress.bestMoves[index] = oldMoves === null ? state.levelMoves : Math.min(oldMoves, state.levelMoves);
  if (index < LEVELS.length - 1) state.progress.unlockedLevel = Math.max(state.progress.unlockedLevel, index + 1);
  saveProgress();
}

function completeLevel() {
  stopClock();
  state.transitionLocked = true;
  state.success = true;
  state.failureReason = "";
  state.currentStars = calculateLevelStars();
  state.score += state.currentStars * 320 + Math.ceil(state.timeLeft * 18);
  recordProgress(state.currentStars);
  state.feedback = `${currentLevel().target}到手，本关 ${state.currentStars} 星。`;
  state.feedbackTone = "success";
  pulse([30, 35, 60]);
  render();

  window.setTimeout(() => {
    if (state.screen !== "game" || !state.transitionLocked) return;
    state.screen = "result";
    render();
  }, 620);
}

function registerRouteChoice(item) {
  if (!item.route) return "";
  if (!state.committedRoute) {
    state.committedRoute = item.route;
    return `已锁定${ROUTE_LABELS[item.route] || "当前路线"}`;
  }
  if (state.committedRoute === item.route) return "";

  const pressure = currentLevel().routeSwitchPressure || 12;
  state.committedRoute = item.route;
  state.routeSwitches += 1;
  state.combo = 0;
  addPressure(pressure);
  state.deadlineAt -= 2000;
  state.timeLeft = Math.max(0, state.timeLeft - 2);
  return `中途换路，缠线值 +${pressure}、倒计时 -2 秒`;
}

function moveBudgetExhausted() {
  const limit = currentLevel().moveLimit;
  return Boolean(limit && state.levelMoves >= limit);
}

function registerCorrectAction(item) {
  const now = Date.now();
  state.combo = now - state.lastMoveAt <= COMBO_WINDOW_MS ? state.combo + 1 : 1;
  state.lastMoveAt = now;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.levelMoves += 1;
  state.score += 70 + state.combo * 28;

  if (state.combo >= 3 && !state.comboBonusAwarded) {
    state.comboBonusAwarded = true;
    state.deadlineAt += COMBO_BONUS_SECONDS * 1000;
    state.timeLeft += COMBO_BONUS_SECONDS;
    state.score += 180;
    return `连拆 x${state.combo}，额外 +${COMBO_BONUS_SECONDS} 秒。`;
  }
  return "";
}

function removeItem(item) {
  if (state.transitionLocked || state.removed.has(item.id)) return;

  const routeMessage = registerRouteChoice(item);
  const comboMessage = registerCorrectAction(item);
  const remainingBefore = pullsRemaining(item);
  if (remainingBefore > 1) {
    state.pullCounts.set(item.id, (state.pullCounts.get(item.id) || 0) + 1);
    addPressure(item.pullPressure || 3);
    state.feedback = routeMessage || comboMessage || `${item.name}松了一圈，还要再拉 ${remainingBefore - 1} 次。`;
    state.feedbackTone = routeMessage ? "risk" : comboMessage ? "combo" : "pull";
    pulse([18, 20, 28]);
    if (state.pressure >= MAX_PRESSURE) {
      endLevel(false, "pressure");
      return;
    }
    if (moveBudgetExhausted()) {
      endLevel(false, "moves");
      return;
    }
    render();
    return;
  }

  state.removed.add(item.id);
  state.pullCounts.delete(item.id);
  state.removedNames.unshift(item.name);
  if (item.decoy) state.detours += 1;
  state.score += item.goal ? 430 : item.decoy ? 10 : 60;

  if (item.goal) {
    completeLevel();
    return;
  }

  const messages = [];
  let tone = "calm";
  if (item.risk) {
    const pressure = item.pressure || DEFAULT_RISK_PRESSURE;
    addPressure(pressure);
    state.score += 90;
    messages.push(`${item.name}没洒，缠线值 +${pressure}`);
    tone = "risk";
    pulse(22);
  }
  if (item.bonusTime) {
    state.deadlineAt += item.bonusTime * 1000;
    state.timeLeft += item.bonusTime;
    messages.push(`倒计时 +${item.bonusTime} 秒`);
    tone = "combo";
  }
  if (item.pressureRelief) {
    addPressure(-item.pressureRelief);
    messages.push(`缠线值 -${item.pressureRelief}`);
    tone = "relief";
  }
  if (item.decoy) {
    messages.push("它并不挡住目标麦");
    tone = "detour";
  }
  if (!messages.length) messages.push(`${item.name}移开，路线松了一段`);
  if (comboMessage) {
    messages.unshift(comboMessage);
    tone = "combo";
  }
  if (routeMessage) {
    messages.unshift(routeMessage);
    tone = state.routeSwitches ? "risk" : "calm";
  }
  state.feedback = `${messages.join("，")}。`;
  state.feedbackTone = tone;

  if (state.pressure >= MAX_PRESSURE) {
    endLevel(false, "pressure");
    return;
  }
  if (moveBudgetExhausted()) {
    endLevel(false, "moves");
    return;
  }
  render();
}

function wrongItem(item) {
  if (state.transitionLocked) return;
  const blockers = unresolvedBlockers(item).map(itemName);
  state.levelMistakes += 1;
  state.levelMoves += 1;
  state.combo = 0;
  state.score = Math.max(0, state.score - 80);
  const timePenalty = currentLevel().wrongTimePenalty || WRONG_TIME_PENALTY;
  const wrongPressure = currentLevel().wrongPressure || WRONG_PRESSURE;
  state.deadlineAt -= timePenalty * 1000;
  state.timeLeft = Math.max(0, state.timeLeft - timePenalty);
  addPressure(wrongPressure);
  state.shakeId = item.id;
  state.feedback = blockers.length
    ? `${item.name}还卡着，先动${blockers.join("或")}。`
    : `${item.name}扯紧了麦线，扣 ${timePenalty} 秒。`;
  state.feedbackTone = "error";
  pulse([55, 30, 55]);

  if (state.pressure >= MAX_PRESSURE) {
    endLevel(false, "pressure");
    return;
  }
  if (state.timeLeft <= 0) {
    endLevel(false, "time");
    return;
  }
  if (moveBudgetExhausted()) {
    endLevel(false, "moves");
    return;
  }

  render();
  window.setTimeout(() => {
    if (state.shakeId === item.id && state.screen === "game") {
      state.shakeId = "";
      render();
    }
  }, 420);
}

function useHint() {
  if (state.screen !== "game" || state.hintUsed || state.transitionLocked) return;
  const candidates = remainingItems().filter(available);
  candidates.sort((left, right) => {
    if (left.goal !== right.goal) return left.goal ? -1 : 1;
    if (left.decoy !== right.decoy) return left.decoy ? 1 : -1;
    return (left.priority || 99) - (right.priority || 99);
  });
  const item = candidates[0];
  if (!item) return;

  state.hintUsed = true;
  state.hintId = item.id;
  state.deadlineAt -= 3000;
  state.timeLeft = Math.max(0, state.timeLeft - 3);
  state.feedback = `观察到${item.name}可以动，代价 -3 秒，本关失去三星。`;
  state.feedbackTone = "hint";
  render();
  if (state.timeLeft <= 0) {
    endLevel(false, "time");
    return;
  }
  window.setTimeout(() => {
    if (state.screen === "game" && state.hintId === item.id) {
      state.hintId = "";
      render();
    }
  }, 1600);
}

function rejectTapForDragItem(item) {
  state.feedback = `${item.name}容易洒，必须拖进撤离区。`;
  state.feedbackTone = "risk";
  pulse([28, 18, 28]);
  render();
}

function endLevel(success, reason = "time") {
  stopClock();
  state.success = success;
  state.failureReason = success ? "" : reason;
  state.currentStars = success ? state.currentStars : 0;
  state.screen = "result";
  state.feedback = success
    ? `${currentLevel().target}已经救出。`
    : reason === "pressure"
      ? "缠线值爆了，这桌越扯越紧。"
      : reason === "moves"
        ? "动作次数用完了，目标麦还没脱困。"
        : "倒计时归零，目标麦还卡着。";
  state.feedbackTone = success ? "success" : "error";
  render();
}

function resultTitle() {
  if (!state.success) return "这麦还卡着";
  if (state.currentStars === 3) return "最短路线拿下";
  if (state.currentStars === 2) return "稳稳救出";
  return "先过关再说";
}

function starMarkup(count, max = 3) {
  return Array.from({ length: max }, (_, index) => `<span class="${index < count ? "is-on" : ""}">★</span>`).join("");
}

function shareText() {
  const level = currentLevel();
  const status = state.success ? `拿到 ${state.currentStars} 星` : "差一点过关";
  return `我在《挪开这个麦》第 ${state.levelIndex + 1} 关「${level.title}」${status}，用了 ${state.levelMoves} 步。你能走出 ${level.parMoves} 步最短路线吗？`;
}

function renderEntry() {
  const continueIndex = nextPlayableLevel();
  const completed = state.progress.bestStars.filter(Boolean).length;
  return `
    <main class="app-shell entry-screen" data-screen="entry">
      <section class="entry-hero">
        <div class="entry-art" role="img" aria-label="麦克风被线和包厢物件压住"></div>
        <div class="entry-overlay">
          <p class="brand-line">KTV 桌面救援挑战</p>
          <h1>挪开<br><span>这个麦</span></h1>
          <p class="entry-copy">别清整桌。看准压住麦的路线，用最少几步把它救出来。</p>
        </div>
        <div class="entry-rule-strip" aria-label="玩法特点">
          <span><strong>9</strong> 个关卡</span>
          <span><strong>${completed}</strong> 已通过</span>
          <span><strong>${totalBestStars()}</strong> / 27 星</span>
        </div>
      </section>
      <section class="entry-actions">
        <button class="primary-action" data-action="continue"><span>继续第 ${continueIndex + 1} 关</span><b aria-hidden="true">→</b></button>
        <button class="ghost-action" data-action="levels">选关与记录</button>
      </section>
    </main>
  `;
}

function renderLevelButton(level, index) {
  const unlocked = index <= state.progress.unlockedLevel;
  const stars = state.progress.bestStars[index] || 0;
  const moves = state.progress.bestMoves[index];
  return `
    <button class="level-card ${unlocked ? "is-unlocked" : "is-locked"} ${stars ? "is-complete" : ""}" ${unlocked ? `data-level-index="${index}"` : "disabled"}>
      <span class="level-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="level-card-copy"><small>${escapeHtml(level.rule)} · 难度 ${LEVEL_DIFFICULTY[index]}</small><strong>${escapeHtml(level.title)}</strong></span>
      <span class="level-record">${unlocked ? `<b>${starMarkup(stars)}</b><small>${moves ? `${moves} 步` : "未挑战"}</small>` : "未解锁"}</span>
    </button>
  `;
}

function renderLevelSelect() {
  return `
    <main class="app-shell level-screen" data-screen="levels">
      <header class="level-select-top">
        <button class="icon-action" data-action="home" aria-label="返回首页">←</button>
        <div><p class="eyebrow">救麦关卡</p><h1>选一桌开拆</h1></div>
        <div class="total-stars"><strong>${totalBestStars()}</strong><span>/ 27 星</span></div>
      </header>
      <div class="progress-track" aria-label="解锁进度"><span style="width:${((state.progress.unlockedLevel + 1) / LEVELS.length) * 100}%"></span></div>
      ${CHAPTERS.map(chapter => `
        <section class="chapter-band">
          <header><span>${chapter.eyebrow}</span><strong>${chapter.title}</strong></header>
          <div class="level-list">
            ${LEVELS.slice(chapter.range[0], chapter.range[1] + 1).map((level, offset) => renderLevelButton(level, chapter.range[0] + offset)).join("")}
          </div>
        </section>
      `).join("")}
      <button class="ghost-action" data-action="app">App 每日关卡与同桌榜</button>
    </main>
  `;
}

function renderItem(item) {
  const isAvailable = available(item);
  const activeZ = isAvailable ? (item.goal ? 25 : item.decoy ? 17 : 20) : item.z;
  const blockers = unresolvedBlockers(item).map(itemName);
  const remainingPulls = pullsRemaining(item);
  const isLoosened = (state.pullCounts.get(item.id) || 0) > 0;
  const interaction = item.interaction || "";
  const interactionProgress = state.interactionProgress.get(item.id) || 0;
  const rhythmPeriod = item.rhythmPeriod || 1500;
  const rhythmDelay = interaction === "rhythm" ? -(performance.now() % rhythmPeriod) : 0;
  let effectFlag = "";
  if (item.bonusTime) effectFlag = `<span class="effect-flag is-bonus">+${item.bonusTime}s</span>`;
  if (item.pressureRelief) effectFlag = `<span class="effect-flag is-relief">-${item.pressureRelief}</span>`;
  return `
    <button
      class="board-item item-${item.kind} ${isAvailable ? "is-available" : "is-blocked"} ${item.decoy ? "is-decoy" : ""} ${item.risk ? "is-risk" : ""} ${item.goal ? "is-target" : ""} ${item.pulls ? "is-tough" : ""} ${interaction ? `has-interaction interaction-${interaction}` : ""} ${interactionProgress > 0 ? "has-interaction-progress" : ""} ${isLoosened ? "is-loosened" : ""} ${state.hintId === item.id ? "is-hinted" : ""} ${state.shakeId === item.id ? "is-shaking" : ""}"
      data-item-id="${item.id}"
      data-interaction="${interaction || "move"}"
      data-available="${isAvailable ? "true" : "false"}"
      style="left:${item.x}%;top:${item.y}%;width:${item.w}%;height:${item.h}%;z-index:${activeZ};--interaction-progress:${interactionProgress * 100}%;--rhythm-period:${rhythmPeriod}ms;--rhythm-delay:${rhythmDelay}ms;"
      aria-label="${escapeHtml(item.name)}${blockers.length ? `，先挪开${escapeHtml(blockers.join("或"))}` : interaction ? `，${INTERACTION_LABELS[interaction]}` : "，可以挪开"}"
    >
      <span class="item-shape has-sprite"><img src="${ITEM_ASSETS[item.kind]}" alt="" draggable="false"></span>
      <span class="item-name">${escapeHtml(item.name)}</span>
      ${item.goal ? '<span class="target-flag">目标</span>' : ""}
      ${item.risk ? `<span class="risk-flag ${item.dragOnly ? "is-drag" : ""}">${item.dragOnly ? "拖" : "!"}</span>` : ""}
      ${item.pulls && remainingPulls > 0 ? `<span class="pull-flag">${isLoosened ? "再拉" : `x${remainingPulls}`}</span>` : ""}
      ${effectFlag}
      ${interaction ? `<span class="interaction-flag">${INTERACTION_LABELS[interaction]}</span><span class="interaction-meter"><i></i></span>` : ""}
      ${interaction === "rhythm" ? '<span class="rhythm-rail"><i></i><b></b></span>' : ""}
    </button>
  `;
}

function renderGame() {
  const level = currentLevel();
  const availableCount = remainingItems().filter(available).length;
  const removedList = state.removedNames.slice(0, 3);
  const assist = level.assist || "full";
  const availabilityText = assist === "none" ? "可动提示关闭" : `${availableCount} 个能动`;
  const routeStatus = state.committedRoute ? ROUTE_LABELS[state.committedRoute] : "路线未锁定";
  const activeCarry = remainingItems().find(item => item.interaction === "carry" && available(item));
  const activePour = remainingItems().find(item => item.interaction === "pour" && available(item));
  return `
    <main class="app-shell game-screen" data-screen="game">
      <header class="game-top">
        <div class="level-title">
          <p class="eyebrow">第 ${state.levelIndex + 1} / ${LEVELS.length} 关 · ${CHAPTERS[level.chapter].eyebrow}</p>
          <h1>${escapeHtml(level.title)}</h1>
        </div>
        <div class="score-pill"><span>得分</span><strong>${state.score}</strong></div>
      </header>

      <section class="mission-bar">
        <span class="mission-dot" aria-hidden="true"></span>
        <div><small>${escapeHtml(level.rule)}</small><strong>救出${escapeHtml(level.target)}</strong></div>
        <div class="mission-par"><small>三星</small><strong>${level.parMoves} 步</strong></div>
      </section>

      <section class="status-row">
        <div class="time-box" data-time-box><span>剩余</span><strong data-time>${formatTime(state.timeLeft || level.timeLimit)}</strong></div>
        <div class="status-middle">
          <div class="time-track" aria-hidden="true"><span data-time-bar></span></div>
          <div class="pressure-row" aria-label="缠线值"><span>缠线值${level.pressureRate ? " ↑" : ""}</span><div class="pressure-track"><span data-pressure-bar style="width:${state.pressure}%"></span></div><strong data-pressure-value>${Math.round(state.pressure)}</strong></div>
        </div>
        <div class="move-box"><span>${level.moveLimit ? "动作" : "本关"}</span><strong>${state.levelMoves}${level.moveLimit ? `/${level.moveLimit}` : ""}</strong></div>
      </section>

      <div class="feedback-line tone-${state.feedbackTone}">${escapeHtml(state.feedback)}</div>

      <section class="puzzle-board assist-${assist}" data-board>
        <div class="board-surface"></div>
        <div class="board-caption"><span>${escapeHtml(level.boardHint)}</span><strong>${availabilityText}</strong></div>
        ${activeCarry ? `<div class="carry-gate" data-carry-gate style="left:${activeCarry.gateX}%;top:${activeCarry.gateY}%;width:${activeCarry.gateW}%;height:${activeCarry.gateH}%;"><span>安全门</span></div>` : ""}
        ${level.items.filter(item => !state.removed.has(item.id)).map(renderItem).join("")}
        ${state.combo >= 2 ? `<div class="combo-burst">连拆 <strong>x${state.combo}</strong></div>` : ""}
      </section>

      <section class="drop-tray ${activePour ? "is-pour-target" : ""}" data-drop-zone>
        <span class="tray-icon" aria-hidden="true">↓</span>
        <div><span class="tray-title">${activePour ? "排水位" : "撤离区"}</span><p>${activePour ? "冰桶拖来后停住" : removedList.length ? removedList.map(escapeHtml).join(" · ") : "点一下或拖到这里"}</p></div>
      </section>

      <footer class="game-actions game-actions-v5">
        <button class="text-action" data-action="restart">重开</button>
        <button class="text-action" data-action="hint" ${state.hintUsed ? "disabled" : ""}>${state.hintUsed ? "已观察" : "观察 -3s"}</button>
        <button class="text-action" data-action="levels">选关</button>
        <span>${escapeHtml(routeStatus)}</span>
      </footer>
    </main>
  `;
}

function renderResult() {
  const level = currentLevel();
  const bestMoves = state.progress.bestMoves[state.levelIndex];
  const hasNext = state.success && state.levelIndex < LEVELS.length - 1;
  return `
    <main class="app-shell result-screen" data-screen="result">
      <section class="result-hero">
        <div class="result-art"></div>
        <div class="result-heading">
          <p class="eyebrow">第 ${state.levelIndex + 1} 关 · ${state.success ? "救麦成功" : "挑战失败"}</p>
          <h1>${escapeHtml(resultTitle())}</h1>
          <div class="result-stars" aria-label="${state.currentStars} 星">${starMarkup(state.currentStars)}</div>
        </div>
      </section>
      <div class="result-level-line"><span>${escapeHtml(level.title)}</span><strong>${escapeHtml(level.rule)}</strong></div>
      <p class="result-copy">${escapeHtml(state.feedback)}</p>
      ${state.success && state.newRecord ? '<div class="record-banner">刷新本关记录</div>' : ""}
      <section class="result-score-row">
        <div><span>本关得分</span><strong>${state.score}</strong></div>
        <div><span>完成步数</span><strong>${state.levelMoves || "-"}</strong></div>
        <div><span>最佳</span><strong>${bestMoves || "-"}</strong></div>
      </section>
      <section class="result-actions">
        ${state.success
          ? `<button class="primary-action" data-action="${hasNext ? "next" : "levels"}"><span>${hasNext ? `下一关 · ${state.levelIndex + 2}` : "查看全部关卡"}</span><b aria-hidden="true">→</b></button>`
          : '<button class="primary-action" data-action="retry"><span>再试一次</span><b aria-hidden="true">↻</b></button>'}
        ${state.success
          ? '<div class="result-action-pair"><button class="ghost-action" data-action="retry">重玩本关</button><button class="ghost-action" data-action="levels">选关</button></div>'
          : '<button class="ghost-action" data-action="levels">返回选关</button>'}
        <button class="ghost-action" data-action="share">发给同桌挑战</button>
      </section>
    </main>
  `;
}

function renderShare() {
  return `
    <main class="app-shell share-screen" data-screen="share">
      <section class="share-card">
        <p class="eyebrow">第 ${state.levelIndex + 1} 关挑战</p>
        <h1>敢不敢少走一步</h1>
        <p data-share-text>${escapeHtml(shareText())}</p>
        <div class="share-score"><strong>${state.success ? `${state.currentStars}/3` : "未过关"}</strong><span>${escapeHtml(currentLevel().title)}</span></div>
      </section>
      <section class="result-actions">
        <button class="primary-action" data-action="copy"><span>${state.copied ? "已复制" : "复制挑战文案"}</span><b aria-hidden="true">↗</b></button>
        <button class="ghost-action" data-action="result">返回成绩</button>
      </section>
    </main>
  `;
}

function renderAppTeaser() {
  return `
    <main class="app-shell app-screen" data-screen="app">
      <section class="app-heading">
        <p class="eyebrow">救麦战绩站</p>
        <h1>同桌最快几步？</h1>
        <p class="result-copy">H5 已保存 ${totalBestStars()} / 27 星。App 继续承接每日随机桌面、同桌最少步数榜和主题关卡包。</p>
      </section>
      <section class="app-list">
        <span><b>01</b> 同桌最少步数榜</span>
        <span><b>02</b> 每日随机桌面</span>
        <span><b>03</b> 麦克风和桌面主题</span>
      </section>
      <section class="result-actions">
        <button class="primary-action" data-action="levels"><span>返回 9 关挑战</span><b aria-hidden="true">→</b></button>
        <button class="ghost-action" data-action="home">返回首页</button>
      </section>
    </main>
  `;
}

function render() {
  if (state.screen === "entry") app.innerHTML = renderEntry();
  if (state.screen === "levels") app.innerHTML = renderLevelSelect();
  if (state.screen === "game") app.innerHTML = renderGame();
  if (state.screen === "result") app.innerHTML = renderResult();
  if (state.screen === "share") app.innerHTML = renderShare();
  if (state.screen === "app") app.innerHTML = renderAppTeaser();
  bindEvents();
  updateTimeDom();
}

function bindEvents() {
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", handleAction));
  document.querySelectorAll("[data-level-index]").forEach(button => {
    button.addEventListener("click", () => startLevel(Number(button.dataset.levelIndex)));
  });
  if (state.screen === "game") bindBoardItems();
}

async function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  if (action === "continue") startLevel(nextPlayableLevel());
  if (action === "retry" || action === "restart") startLevel(state.levelIndex);
  if (action === "next") startLevel(state.levelIndex + 1);
  if (action === "hint") useHint();
  if (action === "levels") {
    stopClock();
    state.screen = "levels";
    render();
  }
  if (action === "home") {
    stopClock();
    state.screen = "entry";
    render();
  }
  if (action === "share") {
    state.previousScreen = state.screen;
    state.screen = "share";
    render();
  }
  if (action === "result") {
    state.screen = "result";
    render();
  }
  if (action === "app") {
    stopClock();
    state.screen = "app";
    render();
  }
  if (action === "copy") {
    try {
      await navigator.clipboard?.writeText(shareText());
    } catch {
      // Clipboard can be unavailable in local file-like previews.
    }
    state.copied = true;
    render();
  }
}

function bindBoardItems() {
  document.querySelectorAll("[data-item-id]").forEach(element => {
    element.addEventListener("pointerdown", event => {
      const item = currentLevel().items.find(candidate => candidate.id === element.dataset.itemId);
      if (!item) return;
      if (!available(item)) {
        wrongItem(item);
        return;
      }
      if (item.interaction === "hold") beginHold(event, element, item);
      else if (item.interaction === "scrub" || item.interaction === "shake") beginAlternatingGesture(event, element, item);
      else if (item.interaction === "trace") beginTrace(event, element, item);
      else if (item.interaction === "pour") beginPour(event, element, item);
      else if (item.interaction === "carry") beginCarry(event, element, item);
      else if (item.interaction === "rhythm") hitRhythm(event, item);
      else beginDrag(event, element, item);
    });
  });
}

function safeRelease(element, pointerId) {
  try {
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
  } catch {
    // The element may have been removed after a completed gesture.
  }
}

function pointInRect(x, y, rect) {
  return Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
}

function setInteractionProgress(item, element, value) {
  const progress = clamp(value, 0, 1);
  state.interactionProgress.set(item.id, progress);
  element?.style.setProperty("--interaction-progress", `${progress * 100}%`);
}

function interactionFeedback(message, tone = "pull") {
  state.feedback = message;
  state.feedbackTone = tone;
  pulse(18);
  render();
}

function beginHold(event, element, item) {
  event.preventDefault();
  const pointerId = event.pointerId;
  const holdMs = item.holdMs || 800;
  let done = false;
  element.setPointerCapture(pointerId);
  element.classList.add("is-holding");
  element.style.setProperty("--gesture-duration", `${holdMs}ms`);
  setInteractionProgress(item, element, 0);

  const timer = window.setTimeout(() => {
    done = true;
    cleanup();
    safeRelease(element, pointerId);
    setInteractionProgress(item, element, 1);
    removeItem(item);
  }, holdMs);

  function cleanup() {
    element.removeEventListener("pointerup", up);
    element.removeEventListener("pointercancel", cancel);
  }

  function up() {
    if (done) return;
    window.clearTimeout(timer);
    cleanup();
    safeRelease(element, pointerId);
    state.interactionProgress.delete(item.id);
    interactionFeedback(`按住${item.name}，等进度走满再松手。`);
  }

  function cancel() {
    if (done) return;
    window.clearTimeout(timer);
    cleanup();
    state.interactionProgress.delete(item.id);
    render();
  }

  element.addEventListener("pointerup", up);
  element.addEventListener("pointercancel", cancel);
}

function beginAlternatingGesture(event, element, item) {
  event.preventDefault();
  const pointerId = event.pointerId;
  const required = item.gestureCount || (item.interaction === "shake" ? 5 : 4);
  const threshold = item.interaction === "shake" ? 24 : 16;
  let segments = Math.round((state.interactionProgress.get(item.id) || 0) * required);
  let lastX = event.clientX;
  let lastDirection = 0;
  let done = false;
  element.setPointerCapture(pointerId);
  element.classList.add("is-gesturing");

  function cleanup() {
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);
    element.removeEventListener("pointercancel", cancel);
  }

  function complete() {
    done = true;
    cleanup();
    safeRelease(element, pointerId);
    setInteractionProgress(item, element, 1);
    removeItem(item);
  }

  function move(moveEvent) {
    if (done) return;
    const distance = moveEvent.clientX - lastX;
    const direction = Math.sign(distance);
    element.style.transform = `translateX(${clamp(moveEvent.clientX - event.clientX, -24, 24)}px) rotate(${direction * (item.interaction === "shake" ? 9 : 4)}deg)`;
    if (Math.abs(distance) < threshold || !direction || (lastDirection && direction === lastDirection)) return;
    segments += 1;
    lastDirection = direction;
    lastX = moveEvent.clientX;
    setInteractionProgress(item, element, segments / required);
    pulse(item.interaction === "shake" ? 12 : 8);
    if (segments >= required) complete();
  }

  function up() {
    if (done) return;
    cleanup();
    safeRelease(element, pointerId);
    element.style.transform = "";
    interactionFeedback(`${item.name}${item.interaction === "shake" ? "再左右摇" : "再来回划"} ${required - segments} 次。`);
  }

  function cancel() {
    if (done) return;
    cleanup();
    safeRelease(element, pointerId);
    element.style.transform = "";
    render();
  }

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
  element.addEventListener("pointercancel", cancel);
}

function beginTrace(event, element, item) {
  event.preventDefault();
  const rect = element.getBoundingClientRect();
  const startRatio = (event.clientX - rect.left) / rect.width;
  if (startRatio > 0.38) {
    state.interactionProgress.delete(item.id);
    interactionFeedback(`从${item.name}左侧线头按下，再一路捋到右端。`);
    return;
  }

  const pointerId = event.pointerId;
  let done = false;
  let furthest = startRatio;
  element.setPointerCapture(pointerId);
  element.classList.add("is-gesturing");
  setInteractionProgress(item, element, 0);

  function cleanup() {
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", stop);
    element.removeEventListener("pointercancel", stop);
  }

  function move(moveEvent) {
    if (done) return;
    const ratio = clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1);
    furthest = Math.max(furthest, ratio);
    setInteractionProgress(item, element, furthest);
    if (furthest < 0.88) return;
    done = true;
    cleanup();
    safeRelease(element, pointerId);
    removeItem(item);
  }

  function stop() {
    if (done) return;
    cleanup();
    safeRelease(element, pointerId);
    state.interactionProgress.delete(item.id);
    interactionFeedback(`${item.name}只捋到 ${Math.round(furthest * 100)}%，要一口气捋到底。`);
  }

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", stop);
  element.addEventListener("pointercancel", stop);
}

function beginPour(event, element, item) {
  event.preventDefault();
  const pointerId = event.pointerId;
  const startX = event.clientX;
  const startY = event.clientY;
  const holdMs = item.holdMs || 750;
  let pourTimer = null;
  let done = false;
  element.setPointerCapture(pointerId);
  element.classList.add("is-dragging");
  element.style.setProperty("--gesture-duration", `${holdMs}ms`);

  function trayElement() {
    return document.querySelector("[data-drop-zone]");
  }

  function stopPour() {
    if (pourTimer) window.clearTimeout(pourTimer);
    pourTimer = null;
    element.classList.remove("is-pouring");
    trayElement()?.classList.remove("is-pour-active");
    element.style.setProperty("--interaction-progress", "0%");
  }

  function cleanup() {
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);
    element.removeEventListener("pointercancel", cancel);
  }

  function startPour() {
    if (pourTimer || done) return;
    element.classList.add("is-pouring");
    trayElement()?.classList.add("is-pour-active");
    element.style.setProperty("--interaction-progress", "100%");
    pourTimer = window.setTimeout(() => {
      done = true;
      cleanup();
      safeRelease(element, pointerId);
      setInteractionProgress(item, element, 1);
      removeItem(item);
    }, holdMs);
  }

  function move(moveEvent) {
    if (done) return;
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    element.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
    const tray = trayElement()?.getBoundingClientRect();
    if (pointInRect(moveEvent.clientX, moveEvent.clientY, tray)) startPour();
    else stopPour();
  }

  function up() {
    if (done) return;
    stopPour();
    cleanup();
    safeRelease(element, pointerId);
    state.interactionProgress.delete(item.id);
    interactionFeedback(`把${item.name}拖到排水位，并停住 ${Math.round(holdMs / 100) / 10} 秒倒空。`, "risk");
  }

  function cancel() {
    if (done) return;
    stopPour();
    cleanup();
    safeRelease(element, pointerId);
    render();
  }

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
  element.addEventListener("pointercancel", cancel);
}

function beginCarry(event, element, item) {
  event.preventDefault();
  const pointerId = event.pointerId;
  const startX = event.clientX;
  const startY = event.clientY;
  let passedGate = false;
  element.setPointerCapture(pointerId);
  element.classList.add("is-dragging");

  function gateElement() {
    return document.querySelector("[data-carry-gate]");
  }

  function cleanup() {
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);
    element.removeEventListener("pointercancel", cancel);
  }

  function move(moveEvent) {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    element.style.transform = `translate(${dx}px, ${dy}px) rotate(${clamp(dx / 20, -4, 4)}deg) scale(1.04)`;
    if (!passedGate && pointInRect(moveEvent.clientX, moveEvent.clientY, gateElement()?.getBoundingClientRect())) {
      passedGate = true;
      gateElement()?.classList.add("is-passed");
      setInteractionProgress(item, element, 0.55);
      pulse([12, 24]);
    }
  }

  function up(upEvent) {
    cleanup();
    safeRelease(element, pointerId);
    const tray = document.querySelector("[data-drop-zone]")?.getBoundingClientRect();
    if (passedGate && pointInRect(upEvent.clientX, upEvent.clientY, tray)) {
      setInteractionProgress(item, element, 1);
      removeItem(item);
      return;
    }
    state.interactionProgress.delete(item.id);
    interactionFeedback(passedGate ? `${item.name}要继续稳稳送进撤离区。` : `先让${item.name}穿过桌上的安全门，别直接扔。`, "risk");
  }

  function cancel() {
    cleanup();
    safeRelease(element, pointerId);
    state.interactionProgress.delete(item.id);
    render();
  }

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
  element.addEventListener("pointercancel", cancel);
}

function rhythmWaitMs(item) {
  const period = item.rhythmPeriod || 1500;
  const phaseMs = performance.now() % period;
  const start = 0.42 * period;
  const end = 0.58 * period;
  if (phaseMs >= start && phaseMs <= end) return 0;
  const target = 0.5 * period;
  return phaseMs < start ? target - phaseMs : period - phaseMs + target;
}

function hitRhythm(event, item) {
  event.preventDefault();
  const period = item.rhythmPeriod || 1500;
  const phase = (performance.now() % period) / period;
  if (phase >= RHYTHM_WINDOW[0] && phase <= RHYTHM_WINDOW[1]) {
    state.interactionProgress.set(item.id, 1);
    removeItem(item);
    return;
  }
  state.levelMistakes += 1;
  addPressure(6);
  state.shakeId = item.id;
  state.feedback = phase < RHYTHM_WINDOW[0] ? "按早了，等亮点进入绿色区域。" : "按晚了，下一拍再来。";
  state.feedbackTone = "error";
  pulse([35, 20, 35]);
  if (state.pressure >= MAX_PRESSURE) {
    endLevel(false, "pressure");
    return;
  }
  render();
}

function beginDrag(event, element, item) {
  event.preventDefault();
  const pointerId = event.pointerId;
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;
  element.setPointerCapture(pointerId);
  element.classList.add("is-dragging");

  function move(moveEvent) {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
    element.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
  }

  function cleanup() {
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);
    element.removeEventListener("pointercancel", cancel);
  }

  function up(upEvent) {
    element.releasePointerCapture(pointerId);
    cleanup();
    const rect = document.querySelector("[data-drop-zone]")?.getBoundingClientRect();
    const inTray = rect && upEvent.clientX >= rect.left && upEvent.clientX <= rect.right && upEvent.clientY >= rect.top && upEvent.clientY <= rect.bottom;
    if (!moved && item.dragOnly) {
      rejectTapForDragItem(item);
      return;
    }
    if (inTray || !moved) {
      removeItem(item);
      return;
    }
    element.style.transform = "";
    element.classList.remove("is-dragging");
  }

  function cancel() {
    cleanup();
    element.style.transform = "";
    element.classList.remove("is-dragging");
  }

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
  element.addEventListener("pointercancel", cancel);
}

window.__moveThisMicDebug = {
  getScreen: () => state.screen,
  getState: () => ({
    screen: state.screen,
    levelIndex: state.levelIndex,
    removedCount: state.removed.size,
    currentItemCount: currentLevel()?.items.length || 0,
    score: state.score,
    levelMoves: state.levelMoves,
    mistakes: state.levelMistakes,
    pressure: state.pressure,
    maxPressure: state.maxPressure,
    timeLeft: state.timeLeft,
    currentStars: state.currentStars,
    bestCombo: state.bestCombo,
    committedRoute: state.committedRoute,
    routeSwitches: state.routeSwitches,
    hintUsed: state.hintUsed,
    hintId: state.hintId,
    interactionProgress: Object.fromEntries(state.interactionProgress),
    transitionLocked: state.transitionLocked,
    pullCounts: Object.fromEntries(state.pullCounts),
    progress: JSON.parse(JSON.stringify(state.progress)),
    success: state.success,
    failureReason: state.failureReason
  }),
  getFirstAvailableItemId: () => {
    const candidates = remainingItems().filter(available);
    candidates.sort((left, right) => {
      if (left.goal !== right.goal) return left.goal ? -1 : 1;
      if (left.decoy !== right.decoy) return left.decoy ? 1 : -1;
      return (left.priority || 99) - (right.priority || 99);
    });
    return candidates[0]?.id || "";
  },
  getAvailableAction: () => {
    const candidates = remainingItems().filter(available);
    candidates.sort((left, right) => {
      if (left.goal !== right.goal) return left.goal ? -1 : 1;
      if (left.decoy !== right.decoy) return left.decoy ? 1 : -1;
      return (left.priority || 99) - (right.priority || 99);
    });
    const item = candidates[0];
    if (!item) return null;
    return {
      id: item.id,
      interaction: item.interaction || (item.dragOnly ? "drag" : "move"),
      holdMs: item.holdMs || 0,
      gestureCount: item.gestureCount || 0,
      rhythmWaitMs: item.interaction === "rhythm" ? rhythmWaitMs(item) : 0
    };
  },
  getActionForItem: itemId => {
    const item = currentLevel().items.find(candidate => candidate.id === itemId);
    if (!item) return null;
    return {
      id: item.id,
      interaction: item.interaction || (item.dragOnly ? "drag" : "move"),
      holdMs: item.holdMs || 0,
      gestureCount: item.gestureCount || 0,
      rhythmWaitMs: item.interaction === "rhythm" ? rhythmWaitMs(item) : 0
    };
  },
  getFirstBlockedItemId: () => remainingItems().find(candidate => !available(candidate))?.id || "",
  getFirstToughAvailableItemId: () => remainingItems().find(item => item.pulls && available(item))?.id || "",
  getFirstBonusAvailableItemId: () => remainingItems().find(item => item.bonusTime && available(item))?.id || "",
  getGoalItemId: () => currentLevel().items.find(item => item.goal)?.id || "",
  getTrayCenter: () => {
    const rect = document.querySelector("[data-drop-zone]")?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
  },
  getCarryGateCenter: () => {
    const rect = document.querySelector("[data-carry-gate]")?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
  },
  resetProgress: () => {
    state.progress = emptyProgress();
    saveProgress();
    state.screen = "entry";
    render();
  },
  unlockAll: () => {
    state.progress.unlockedLevel = LEVELS.length - 1;
    saveProgress();
    render();
  },
  openLevel: index => startLevel(index)
};

render();
