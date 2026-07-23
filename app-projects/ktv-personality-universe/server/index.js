const fs = require("fs");
const http = require("http");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "www-room-lineup");
const configPath = process.env.KTV_REMOTE_CONFIG || path.join(__dirname, "remote-config.json");
const dataDir = process.env.KTV_DATA_DIR || path.join(__dirname, "data");
const eventsPath = path.join(dataDir, "events.jsonl");
const statePath = path.join(dataDir, "state.json");
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";
const adminToken = process.env.KTV_ADMIN_TOKEN || "";
const dailyFreeRolls = Number(process.env.KTV_DAILY_FREE_ROLLS || 3);
const dailyShareRewards = Number(process.env.KTV_DAILY_SHARE_REWARDS || 1);
const buildVersion = "20260629-1725-skins-v3";
const defaultCodes = ["SPARK", "SKIP", "ROMEO", "ECHO", "DROP", "MUTE", "LOOP", "BOSS", "HYPE", "RISK", "DUO", "DRAMA"];
const displayCodes = {
  "SPARK": "STAR",
  "SKIP": "SKIPPER",
  "ROMEO": "LOVER",
  "ECHO": "ECHO",
  "DROP": "GHOST",
  "MUTE": "FIXER",
  "LOOP": "REPEATER",
  "BOSS": "BOSS",
  "HYPE": "HOPER",
  "RISK": "CHALLENGER",
  "DUO": "PARTNER",
  "DRAMA": "JOKER"
};

const skinPools = {
  SPARK: ["开场火花", "皇冠主唱", "舞台过载"],
  SKIP: ["冷脸控台", "下一首预言", "救场遥控器"],
  ROMEO: ["纯爱告白", "失恋电台", "复合幻想"],
  ECHO: ["副歌接住", "人声回环", "和声光环"],
  DROP: ["角落开麦", "副歌显形", "透明主唱"],
  MUTE: ["静音破冰", "冷场急救", "气氛修补匠"],
  LOOP: ["单曲循环", "上头复读", "本命刻录"],
  BOSS: ["包厢控台", "顺序导演", "原唱裁判"],
  HYPE: ["热歌信徒", "明日开场", "元气副歌"],
  RISK: ["高音盲盒", "破音勇者", "封神一嗓"],
  DUO: ["副驾主唱", "默契合拍", "双麦结盟"],
  DRAMA: ["苦笑小丑", "嘴硬返场", "崩溃谢幕"]
};

const legacySkinNames = new Set([
  "闇撹櫣鐖嗗満",
  "鍐疯劯鎺у満",
  "鍗堝鐢靛彴",
  "浜哄０鍥炵幆",
  "楂樼┖鍓瓕",
  "闈欓煶鐮村啺",
  "寰幆涓婂ご",
  "鍏ㄥ眬鎺у彴",
  "鍋囬珮娼埗閫?",
  "楂橀煶鐩茬洅",
  "鍓┚涓诲敱",
  "灏忎笐琛ュ",
  "榛樿鐨偆"
]);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function json(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "pragma": "no-cache",
    "expires": "0",
    "x-content-type-options": "nosniff",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function todayKey() {
  const chinaOffsetMs = 8 * 60 * 60 * 1000;
  return new Date(Date.now() + chinaOffsetMs).toISOString().slice(0, 10);
}

function previousDayKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() - 1);
  const chinaOffsetMs = 8 * 60 * 60 * 1000;
  return new Date(date.getTime() + chinaOffsetMs).toISOString().slice(0, 10);
}

function readState() {
  return readJson(statePath, { users: {} });
}

function writeState(state) {
  writeJson(statePath, state);
}

function emptyDaily() {
  return {
    date: todayKey(),
    freeUsed: 0,
    shareRewardsUsed: 0,
    bonusAvailable: 0
  };
}

function userId(req, url) {
  const explicit = String(
    url.searchParams.get("member") ||
    req.headers["x-ktv-member"] ||
    req.headers["x-member-id"] ||
    ""
  ).replace(/[^\w-]/g, "").slice(0, 40);
  if (explicit && !["friend", "demo", "guest"].includes(explicit.toLowerCase())) return explicit;
  return clientId(req);
}

function normalizeServerSkins(code, skins) {
  const pool = skinPoolFor(code);
  const defaultName = defaultSkinName(code);
  const safeSkins = Array.isArray(skins) ? skins : [];
  const normalized = [...new Set(safeSkins
    .filter(Boolean)
    .map((name) => String(name).slice(0, 32))
    .filter((name) => !legacySkinNames.has(name))
    .filter((name) => pool.includes(name)))];
  if (!normalized.includes(defaultName)) normalized.unshift(defaultName);
  return normalized;
}

function getUserState(state, id) {
  if (!state.users[id]) {
    state.users[id] = {
      ownedCodes: ["SPARK"],
      ownedSkins: { SPARK: ["开场火花"] },
      equippedSkins: { SPARK: "开场火花" },
      ownedRelations: [],
      primaryPersonaCode: "",
      currentCode: "SPARK",
      singingProfile: null,
      rollCount: 0,
      streakDays: 0,
      lastRollDate: "",
      daily: emptyDaily(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  const user = state.users[id];
  if (!Array.isArray(user.ownedCodes)) user.ownedCodes = ["SPARK"];
  user.ownedCodes = [...new Set(user.ownedCodes)].filter((code) => defaultCodes.includes(code));
  if (!user.ownedCodes.includes("SPARK")) user.ownedCodes.unshift("SPARK");
  if (!user.ownedSkins || typeof user.ownedSkins !== "object" || Array.isArray(user.ownedSkins)) user.ownedSkins = {};
  user.ownedCodes.forEach((code) => {
    user.ownedSkins[code] = normalizeServerSkins(code, user.ownedSkins[code]);
  });
  Object.keys(user.ownedSkins).forEach((code) => {
    if (!defaultCodes.includes(code)) delete user.ownedSkins[code];
  });
  if (!user.equippedSkins || typeof user.equippedSkins !== "object" || Array.isArray(user.equippedSkins)) user.equippedSkins = {};
  user.ownedCodes.forEach((code) => {
    const selected = String(user.equippedSkins[code] || "").slice(0, 32);
    const owned = user.ownedSkins[code] || [defaultSkinName(code)];
    user.equippedSkins[code] = owned.includes(selected) ? selected : owned[0];
  });
  Object.keys(user.equippedSkins).forEach((code) => {
    if (!defaultCodes.includes(code) || !user.ownedCodes.includes(code)) delete user.equippedSkins[code];
  });
  user.primaryPersonaCode = defaultCodes.includes(user.primaryPersonaCode) ? user.primaryPersonaCode : "";
  if (!defaultCodes.includes(user.currentCode)) user.currentCode = user.ownedCodes[0] || "SPARK";
  if (!Array.isArray(user.ownedRelations)) user.ownedRelations = [];
  const seenRelations = new Set();
  user.ownedRelations = user.ownedRelations
    .map((item) => ({
      key: `${String(item?.friendCode || "").toUpperCase()}-${String(item?.myCode || item?.mineCode || "").toUpperCase()}`,
      friendCode: String(item?.friendCode || "").toUpperCase().slice(0, 12),
      friendTitle: String(item?.friendTitle || "").slice(0, 32),
      myCode: String(item?.myCode || item?.mineCode || "").toUpperCase().slice(0, 12),
      myTitle: String(item?.myTitle || "").slice(0, 32),
      name: String(item?.name || "").slice(0, 36),
      title: String(item?.title || "").slice(0, 80),
      text: String(item?.text || "").slice(0, 180),
      createdAt: item?.createdAt && !Number.isNaN(new Date(item.createdAt).getTime()) ? new Date(item.createdAt).toISOString() : new Date().toISOString()
    }))
    .filter((item) => defaultCodes.includes(item.friendCode) && defaultCodes.includes(item.myCode) && item.name && item.title)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter((item) => {
      if (seenRelations.has(item.key)) return false;
      seenRelations.add(item.key);
      return true;
    })
    .slice(0, 24);
  if (user.singingProfile && typeof user.singingProfile !== "object") user.singingProfile = null;
  user.streakDays = Math.max(0, Number(user.streakDays) || 0);
  user.lastRollDate = String(user.lastRollDate || "").slice(0, 10);
  if (!user.daily || user.daily.date !== todayKey()) user.daily = emptyDaily();
  user.rollCount = Math.max(0, Number(user.rollCount) || 0);
  user.updatedAt = new Date().toISOString();
  return user;
}

function markRollStreak(user) {
  const today = todayKey();
  if (user.lastRollDate === today) return;
  user.streakDays = user.lastRollDate === previousDayKey(today)
    ? Math.max(0, Number(user.streakDays) || 0) + 1
    : 1;
  user.lastRollDate = today;
}

function streakRewardFor(user) {
  const days = Math.max(0, Number(user.streakDays) || 0);
  if (days >= 7) {
    return {
      status: "archive_story_open",
      milestone: 7,
      remainingDays: 0,
      title: "\u0037 \u5929\u4eba\u683c\u6863\u6848\u5df2\u6210\u518c",
      text: "\u4f60\u7684\u5e38\u89c1\u5531\u6b4c\u4eba\u683c\u3001\u5173\u7cfb\u5361\u548c\u76ae\u80a4\u5206\u652f\u5df2\u7ecf\u6709\u4e86\u8fde\u7eed\u8bb0\u5f55\uff0c\u9002\u5408\u56de\u770b\u81ea\u5df1\u7684 KTV \u5b87\u5b99\u3002"
    };
  }
  if (days >= 3) {
    return {
      status: "storyline_building",
      milestone: 7,
      remainingDays: 7 - days,
      title: `\u518d\u8fde\u7eed ${7 - days} \u5929\uff0c\u8865\u9f50\u4eba\u683c\u6545\u4e8b\u7ebf`,
      text: "\u8fde\u7eed\u56de\u6765\u4e0d\u662f\u4e3a\u4e86\u5237\u5956\u52b1\uff0c\u800c\u662f\u770b\u4f60\u7684\u4e3b\u7c7b\u578b\u3001\u540c\u7cfb\u4eba\u683c\u548c\u670b\u53cb\u5173\u7cfb\u4f1a\u4e0d\u4f1a\u8d8a\u6765\u8d8a\u51c6\u3002"
    };
  }
  return {
    status: "archive_building",
    milestone: 3,
    remainingDays: Math.max(0, 3 - days),
    title: `\u518d\u8fde\u7eed ${Math.max(0, 3 - days)} \u5929\uff0c\u770b\u89c1\u4eba\u683c\u53d8\u5316`,
    text: "\u8fde\u7eed\u56de\u6765\u4f1a\u6c89\u6dc0\u4f60\u7684\u70b9\u6b4c\u753b\u50cf\u3001\u4e3b\u7c7b\u578b\u548c\u65b0\u5173\u7cfb\u5361\uff0c\u8ba9\u6863\u6848\u5e93\u66f4\u50cf\u4f60\u7684\u5531\u6b4c\u4eba\u683c\u4e3b\u9875\u3002"
  };
}

function defaultSkinName(code) {
  return skinPools[code]?.[0] || "\u9ed8\u8ba4\u76ae\u80a4";
}

function skinPoolFor(code) {
  return skinPools[code] || [defaultSkinName(code)];
}

function unlockSkin(user, code, hadPersona = false) {
  if (!defaultCodes.includes(code)) return { name: "", isNew: false, ownedCount: 0, total: 0 };
  const pool = skinPoolFor(code);
  const defaultName = defaultSkinName(code);
  const hadSkinArchive = Array.isArray(user.ownedSkins[code]) && user.ownedSkins[code].length > 0;
  if (!hadSkinArchive) user.ownedSkins[code] = [defaultName];
  user.ownedSkins[code] = [...new Set(user.ownedSkins[code])];
  if (!hadPersona) {
    return {
      name: defaultName,
      isNew: true,
      ownedCount: user.ownedSkins[code].length,
      total: pool.length
    };
  }
  const next = pool.find((name) => !user.ownedSkins[code].includes(name));
  if (next) user.ownedSkins[code].push(next);
  return {
    name: next || user.ownedSkins[code][user.ownedSkins[code].length - 1] || defaultSkinName(code),
    isNew: Boolean(next),
    ownedCount: user.ownedSkins[code].length,
    total: pool.length
  };
}

function archiveFor(user) {
  return {
    ownedCodes: user.ownedCodes,
    ownedSkins: user.ownedSkins,
    equippedSkins: user.equippedSkins,
    ownedRelations: user.ownedRelations,
    primaryPersonaCode: user.primaryPersonaCode,
    currentCode: user.currentCode,
    rollCount: user.rollCount,
    streakDays: user.streakDays,
    lastRollDate: user.lastRollDate,
    streakReward: streakRewardFor(user),
    singingProfile: user.singingProfile || null
  };
}

function quotaFor(user) {
  const freeRemaining = Math.max(0, dailyFreeRolls - (Number(user.daily.freeUsed) || 0));
  const bonusRemaining = Math.max(0, Number(user.daily.bonusAvailable) || 0);
  return {
    dailyLimit: dailyFreeRolls,
    freeRemaining,
    bonusRemaining,
    remaining: freeRemaining + bonusRemaining,
    shareRewardRemaining: Math.max(0, dailyShareRewards - (Number(user.daily.shareRewardsUsed) || 0)),
    nextResetAt: `${todayKey()}T23:59:59+08:00`
  };
}

function clampRatio(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function profileFromRequest(body = {}) {
  return normalizeSingingProfile(body.profile && typeof body.profile === "object" ? body.profile : {});
}

function profileForRoll(payload, user) {
  if (payload.profile && typeof payload.profile === "object") {
    return normalizeSingingProfile(payload.profile);
  }
  if (user.singingProfile && typeof user.singingProfile === "object") {
    return normalizeSingingProfile(user.singingProfile);
  }
  return normalizeSingingProfile({});
}

function normalizeSingingProfile(profile = {}) {
  return {
    source: String(profile.source || "unknown").replace(/[^\w:-]/g, "").slice(0, 32),
    fastSongRatio: clampRatio(profile.fastSongRatio, 0.58),
    loveSongRatio: clampRatio(profile.loveSongRatio, 0.42),
    pureLoveRatio: clampRatio(profile.pureLoveRatio, 0.3),
    hurtLoveRatio: clampRatio(profile.hurtLoveRatio, 0.18),
    popSongRatio: clampRatio(profile.popSongRatio, 0.5),
    chorusRatio: clampRatio(profile.chorusRatio, 0.36),
    skipRatio: clampRatio(profile.skipRatio, 0.22),
    repeatRatio: clampRatio(profile.repeatRatio, 0.28),
    highNoteRatio: clampRatio(profile.highNoteRatio, 0.18),
    controlRatio: clampRatio(profile.controlRatio, 0.16),
    duetRatio: clampRatio(profile.duetRatio, 0.12),
    dramaRatio: clampRatio(profile.dramaRatio, 0.15)
  };
}

const moodKeywords = {
  love: ["love", "lover", "romance", "sweet", "wedding", "告白", "表白", "情歌", "爱情", "甜", "爱你", "恋人", "喜欢", "心动"],
  pureLove: ["pure", "first-love", "crush", "告白", "表白", "初恋", "纯爱", "甜", "爱你", "喜欢", "心动", "恋人"],
  hurtLove: ["hurt", "sad", "breakup", "cry", "emo", "失恋", "分手", "遗憾", "伤心", "心碎", "眼泪", "痛", "孤独", "小丑"],
  pop: ["pop", "hot", "viral", "chart", "流行", "热门", "热歌", "榜单", "抖音", "爆款"],
  chorus: ["chorus", "duet", "party", "合唱", "对唱", "朋友", "全场", "一起唱"],
  control: ["control", "dj", "host", "切歌", "控场", "主持", "气氛", "安排"],
  drama: ["drama", "opera", "emo", "剧情", "戏剧", "飙戏", "大结局", "遗憾", "破防"]
};

function textHasAny(text, words) {
  const source = String(text || "").toLowerCase();
  return words.some((word) => source.includes(String(word).toLowerCase()));
}

function songEventsFromPayload(payload = {}) {
  const raw = Array.isArray(payload.events) ? payload.events
    : Array.isArray(payload.songs) ? payload.songs
      : Array.isArray(payload.records) ? payload.records
        : [];
  return raw
    .filter((item) => item && typeof item === "object")
    .slice(0, 200)
    .map((item) => ({
      title: String(item.title || item.songName || item.name || "").slice(0, 80),
      artist: String(item.artist || item.singer || "").slice(0, 80),
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).slice(0, 30)).slice(0, 12) : [],
      mood: String(item.mood || item.emotion || "").slice(0, 40),
      genre: String(item.genre || item.style || "").slice(0, 40),
      bpm: Number(item.bpm || item.tempo || 0),
      skipped: Boolean(item.skipped || item.cut || item.skip),
      repeatCount: Math.max(0, Number(item.repeatCount || item.repeats || 0) || 0),
      chorusCount: Math.max(0, Number(item.chorusCount || item.chorus || item.duetCount || 0) || 0),
      duet: Boolean(item.duet || item.isDuet),
      highNote: Boolean(item.highNote || item.highPitch),
      switchedByUser: Boolean(item.switchedByUser || item.controlled || item.operated)
    }));
}

function profileFromSongEvents(events = [], source = "song-events") {
  const safeEvents = Array.isArray(events) ? events : [];
  if (!safeEvents.length) return normalizeSingingProfile({ source });
  const total = safeEvents.length;
  const count = (predicate) => safeEvents.filter(predicate).length / total;
  const textOf = (item) => [item.title, item.artist, item.mood, item.genre, ...(item.tags || [])].join(" ");
  const has = (item, key) => textHasAny(textOf(item), moodKeywords[key]);
  const fastSongRatio = count((item) => Number(item.bpm) >= 124 || textHasAny(textOf(item), ["fast", "dance", "rock", "edm", "快歌", "舞曲", "摇滚", "电音"]));
  const loveSongRatio = count((item) => has(item, "love") || has(item, "pureLove") || has(item, "hurtLove"));
  const pureLoveRatio = count((item) => has(item, "pureLove"));
  const hurtLoveRatio = count((item) => has(item, "hurtLove"));
  const popSongRatio = count((item) => has(item, "pop"));
  const chorusRatio = count((item) => item.chorusCount > 0 || item.duet || has(item, "chorus"));
  const skipRatio = count((item) => item.skipped);
  const repeatRatio = count((item) => item.repeatCount > 0);
  const highNoteRatio = count((item) => item.highNote || Number(item.bpm) >= 150 || textHasAny(textOf(item), ["高音", "飙高音", "挑战"]));
  const controlRatio = count((item) => item.switchedByUser || has(item, "control"));
  const duetRatio = count((item) => item.duet || item.chorusCount > 0 || textHasAny(textOf(item), ["duet", "对唱"]));
  const dramaRatio = count((item) => has(item, "drama") || has(item, "hurtLove"));
  return normalizeSingingProfile({
    source,
    fastSongRatio,
    loveSongRatio,
    pureLoveRatio,
    hurtLoveRatio,
    popSongRatio,
    chorusRatio,
    skipRatio,
    repeatRatio,
    highNoteRatio,
    controlRatio,
    duetRatio,
    dramaRatio
  });
}

const personaProfileModels = {
  SPARK: { fastSongRatio: .92, popSongRatio: .72, chorusRatio: .52 },
  SKIP: { skipRatio: .9, controlRatio: .5, fastSongRatio: .36 },
  ROMEO: { pureLoveRatio: .92, loveSongRatio: .82, repeatRatio: .38 },
  ECHO: { chorusRatio: .9, duetRatio: .36, popSongRatio: .42 },
  DROP: { chorusRatio: .64, highNoteRatio: .82, fastSongRatio: .42 },
  MUTE: { controlRatio: .68, fastSongRatio: .62, skipRatio: .42 },
  LOOP: { repeatRatio: .9, loveSongRatio: .55, popSongRatio: .38 },
  BOSS: { controlRatio: .92, skipRatio: .55, chorusRatio: .32 },
  HYPE: { popSongRatio: .92, fastSongRatio: .72, chorusRatio: .48 },
  RISK: { highNoteRatio: .92, dramaRatio: .82, fastSongRatio: .38 },
  DUO: { duetRatio: .92, chorusRatio: .58, loveSongRatio: .46 },
  DRAMA: { hurtLoveRatio: .92, dramaRatio: .78, loveSongRatio: .58 }
};

function scoreProfile(profile) {
  return Object.fromEntries(Object.entries(personaProfileModels).map(([code, model]) => {
    const entries = Object.entries(model);
    const distance = entries.reduce((sum, [field, target]) => {
      const delta = clampRatio(profile[field]) - target;
      return sum + (delta * delta);
    }, 0) / entries.length;
    const fit = 1 - Math.sqrt(distance);
    const intensity = entries.reduce((sum, [field]) => sum + clampRatio(profile[field]), 0) / entries.length;
    return [code, Math.max(0, fit) + intensity * .08];
  }));
}

function rankedProfileMatches(profile) {
  const scores = scoreProfile(profile);
  return defaultCodes
    .map((code) => ({ code, score: scores[code] || 0 }))
    .sort((a, b) => b.score - a.score);
}

function matchSummaryItem(item) {
  return {
    code: item.code,
    displayCode: displayCodes[item.code] || item.code,
    score: Number((item.score || 0).toFixed(4))
  };
}

function choosePersonaWithMatch(user, profile, config) {
  const ranked = rankedProfileMatches(profile);
  const firstRoll = user.rollCount <= 0;
  if (firstRoll) {
    const code = ranked[0]?.code || "SPARK";
    return {
      code,
      firstRoll,
      reason: "PRIMARY_FROM_PROFILE",
      source: profile.source || "unknown",
      rank: 1,
      topCandidates: ranked.slice(0, 6).map(matchSummaryItem),
      pool: ranked.slice(0, 1).map(matchSummaryItem)
    };
  }
  const weights = config.dropWeights || {};
  const ownedSet = new Set(user.ownedCodes);
  const candidateCodes = ranked
    .slice(0, Math.min(6, ranked.length))
    .map((item) => item.code);
  const pool = candidateCodes
    .filter((code) => code !== user.currentCode)
    .map((code) => {
      const novelty = ownedSet.has(code) ? 0.35 : 1;
      const base = Number(weights[code] || 1);
      return {
        code,
        score: Math.max(0.05, (ranked.find((item) => item.code === code)?.score || 0.2) * base * novelty)
      };
    });
  const total = pool.reduce((sum, item) => sum + item.score, 0);
  let cursor = Math.random() * total;
  for (const item of pool) {
    cursor -= item.score;
    if (cursor <= 0) {
      return {
        code: item.code,
        firstRoll,
        reason: "PROFILE_CANDIDATE_COLLECTION",
        source: profile.source || "unknown",
        rank: Math.max(1, ranked.findIndex((rankedItem) => rankedItem.code === item.code) + 1),
        topCandidates: ranked.slice(0, 6).map(matchSummaryItem),
        pool: pool.map(matchSummaryItem)
      };
    }
  }
  const fallbackCode = pool[0]?.code || "SPARK";
  return {
    code: fallbackCode,
    firstRoll,
    reason: "PROFILE_CANDIDATE_COLLECTION",
    source: profile.source || "unknown",
    rank: Math.max(1, ranked.findIndex((rankedItem) => rankedItem.code === fallbackCode) + 1),
    topCandidates: ranked.slice(0, 6).map(matchSummaryItem),
    pool: pool.map(matchSummaryItem)
  };
}

function choosePersona(user, profile, config) {
  return choosePersonaWithMatch(user, profile, config).code;
}

function safeJoin(base, pathname) {
  const decoded = decodeURIComponent(pathname);
  const file = path.join(base, decoded === "/" ? "index.html" : decoded);
  if (!file.startsWith(base)) return "";
  return file;
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > limit) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function clientId(req) {
  const raw = [
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
    req.headers["user-agent"] || ""
  ].join("|");
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

function sanitizeEvent(input) {
  const now = new Date().toISOString();
  return {
    receivedAt: now,
    name: String(input.name || "").replace(/[^\w:-]/g, "").slice(0, 48),
    persona: String(input.persona || "").replace(/[^\w-]/g, "").slice(0, 24),
    variant: String(input.variant || "").replace(/[^\w-]/g, "").slice(0, 24),
    context: {
      room: String(input.context?.room || "").slice(0, 32),
      source: String(input.context?.source || "").slice(0, 32),
      member: String(input.context?.member || "").slice(0, 32),
      fromPersona: String(input.context?.fromPersona || "").replace(/[^\w-]/g, "").slice(0, 24)
    },
    detail: typeof input.detail === "object" && input.detail ? input.detail : {},
    at: String(input.at || now).slice(0, 40)
  };
}

function summarizeEvents() {
  if (!fs.existsSync(eventsPath)) {
    return { total: 0, byName: {}, byPersona: {}, recent: [] };
  }
  const lines = fs.readFileSync(eventsPath, "utf8").split(/\r?\n/).filter(Boolean);
  const byName = {};
  const byPersona = {};
  const recent = [];
  lines.slice(-2000).forEach((line) => {
    try {
      const event = JSON.parse(line);
      byName[event.name] = (byName[event.name] || 0) + 1;
      byPersona[event.persona] = (byPersona[event.persona] || 0) + 1;
      recent.push(event);
    } catch {
      // Ignore malformed historical rows.
    }
  });
  return {
    total: lines.length,
    byName,
    byPersona,
    recent: recent.slice(-30).reverse()
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, {
      ok: true,
      service: "ktv-personality-universe",
      build: buildVersion,
      at: new Date().toISOString()
    });
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    const config = readJson(configPath, {});
    const origin = `${url.protocol}//${req.headers.host}`;
    return json(res, 200, {
      ...config,
      shareBase: config.shareBase || origin
    });
  }

  if (req.method === "GET" && url.pathname === "/api/profile/quota") {
    const state = readState();
    const id = userId(req, url);
    const user = getUserState(state, id);
    writeState(state);
    return json(res, 200, {
      ok: true,
      member: id,
      quota: quotaFor(user),
      archive: archiveFor(user)
    });
  }

  if (req.method === "GET" && url.pathname === "/api/singing-profile") {
    const state = readState();
    const id = userId(req, url);
    const user = getUserState(state, id);
    writeState(state);
    return json(res, 200, {
      ok: true,
      member: id,
      profile: user.singingProfile || null
    });
  }

  if (req.method === "POST" && url.pathname === "/api/singing-profile") {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const state = readState();
      const id = userId(req, url);
      const user = getUserState(state, id);
      const profile = normalizeSingingProfile(payload.profile || payload);
      user.singingProfile = {
        ...profile,
        updatedAt: new Date().toISOString()
      };
      user.updatedAt = new Date().toISOString();
      writeState(state);
      return json(res, 200, {
        ok: true,
        member: id,
        profile: user.singingProfile
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/song-events") {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const events = songEventsFromPayload(payload);
      if (!events.length) {
        return json(res, 400, { ok: false, error: "EMPTY_SONG_EVENTS" });
      }
      const state = readState();
      const id = userId(req, url);
      const user = getUserState(state, id);
      const profile = profileFromSongEvents(events, String(payload.source || "song-events").slice(0, 32));
      user.singingProfile = {
        ...profile,
        eventCount: events.length,
        updatedAt: new Date().toISOString()
      };
      user.updatedAt = new Date().toISOString();
      writeState(state);
      return json(res, 200, {
        ok: true,
        member: id,
        accepted: events.length,
        profile: user.singingProfile,
        topCandidates: rankedProfileMatches(profile).slice(0, 6).map(matchSummaryItem)
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/archive") {
    const state = readState();
    const id = userId(req, url);
    const user = getUserState(state, id);
    writeState(state);
    return json(res, 200, {
      ok: true,
      member: id,
      ownedCodes: user.ownedCodes,
      ownedSkins: user.ownedSkins,
      equippedSkins: user.equippedSkins,
      ownedRelations: user.ownedRelations,
      primaryPersonaCode: user.primaryPersonaCode,
      currentCode: user.currentCode,
      rollCount: user.rollCount,
      streakDays: user.streakDays,
      lastRollDate: user.lastRollDate,
      singingProfile: user.singingProfile || null,
      quota: quotaFor(user)
    });
  }

  if (req.method === "POST" && url.pathname === "/api/persona/roll") {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const state = readState();
      const id = userId(req, url);
      const user = getUserState(state, id);
      const quota = quotaFor(user);
      if (quota.remaining <= 0) {
        writeState(state);
        return json(res, 429, {
          ok: false,
          error: "ROLL_QUOTA_EXHAUSTED",
          message: "Daily roll quota exhausted",
          quota
        });
      }
      if (quota.freeRemaining > 0) {
        user.daily.freeUsed += 1;
      } else {
        user.daily.bonusAvailable = Math.max(0, user.daily.bonusAvailable - 1);
      }
      const config = readJson(configPath, {});
      const profile = profileForRoll(payload, user);
      const selection = choosePersonaWithMatch(user, profile, config);
      const code = selection.code;
      const wasOwned = user.ownedCodes.includes(code);
      if (payload.profile && typeof payload.profile === "object") {
        user.singingProfile = {
          ...profile,
          updatedAt: new Date().toISOString()
        };
      }
      user.currentCode = code;
      user.rollCount += 1;
      if (!user.primaryPersonaCode) user.primaryPersonaCode = code;
      markRollStreak(user);
      if (!user.ownedCodes.includes(code)) user.ownedCodes.push(code);
      const skinDrop = unlockSkin(user, code, wasOwned);
      if (skinDrop?.name) user.equippedSkins[code] = skinDrop.name;
      user.updatedAt = new Date().toISOString();
      writeState(state);
      return json(res, 200, {
        ok: true,
        member: id,
        code,
        isNew: !wasOwned,
        skinDrop,
        match: selection,
        quota: quotaFor(user),
        archive: archiveFor(user)
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/skins/equip") {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const code = String(payload.code || "").toUpperCase().replace(/[^\w-]/g, "").slice(0, 12);
      const skinName = String(payload.skinName || "").slice(0, 32);
      if (!defaultCodes.includes(code)) {
        return json(res, 400, { ok: false, error: "INVALID_SKIN_CODE" });
      }
      const state = readState();
      const id = userId(req, url);
      const user = getUserState(state, id);
      if (!user.ownedCodes.includes(code) || !user.ownedSkins[code]?.includes(skinName)) {
        return json(res, 403, { ok: false, error: "SKIN_NOT_OWNED" });
      }
      user.equippedSkins[code] = skinName;
      user.updatedAt = new Date().toISOString();
      writeState(state);
      return json(res, 200, {
        ok: true,
        member: id,
        equipped: { code, skinName },
        quota: quotaFor(user),
        archive: archiveFor(user)
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/relations") {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const item = payload.relation || payload;
      const friendCode = String(item.friendCode || "").toUpperCase().replace(/[^\w-]/g, "").slice(0, 12);
      const myCode = String(item.myCode || item.mineCode || "").toUpperCase().replace(/[^\w-]/g, "").slice(0, 12);
      if (!defaultCodes.includes(friendCode) || !defaultCodes.includes(myCode)) {
        return json(res, 400, { ok: false, error: "INVALID_RELATION_CODES" });
      }
      const state = readState();
      const id = userId(req, url);
      const user = getUserState(state, id);
      const relation = {
        key: `${friendCode}-${myCode}`,
        friendCode,
        friendTitle: String(item.friendTitle || "").slice(0, 32),
        myCode,
        myTitle: String(item.myTitle || "").slice(0, 32),
        name: String(item.name || "KTV 关系卡").slice(0, 36),
        title: String(item.title || "你们的包厢关系已生成").slice(0, 80),
        text: String(item.text || "").slice(0, 180),
        createdAt: item.createdAt && !Number.isNaN(new Date(item.createdAt).getTime()) ? new Date(item.createdAt).toISOString() : new Date().toISOString()
      };
      user.ownedRelations = [relation, ...user.ownedRelations.filter((stored) => stored.key !== relation.key)].slice(0, 24);
      user.updatedAt = new Date().toISOString();
      writeState(state);
      return json(res, 200, {
        ok: true,
        member: id,
        relation,
        quota: quotaFor(user),
        archive: archiveFor(user)
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/share/reward") {
    const state = readState();
    const id = userId(req, url);
    const user = getUserState(state, id);
    if (user.daily.shareRewardsUsed >= dailyShareRewards) {
      writeState(state);
      return json(res, 200, {
        ok: true,
        granted: false,
        reason: "DAILY_SHARE_REWARD_USED",
        quota: quotaFor(user)
      });
    }
    user.daily.shareRewardsUsed += 1;
    user.daily.bonusAvailable += 1;
    user.updatedAt = new Date().toISOString();
    writeState(state);
    return json(res, 200, {
      ok: true,
      granted: true,
      quota: quotaFor(user)
    });
  }

  if (req.method === "POST" && url.pathname === "/api/events") {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const items = Array.isArray(payload.events) ? payload.events : [payload];
      const rows = items
        .slice(0, 20)
        .map((event) => ({
          ...sanitizeEvent(event),
          clientId: clientId(req)
        }))
        .filter((event) => event.name);
      if (rows.length) {
        fs.mkdirSync(dataDir, { recursive: true });
        fs.appendFileSync(eventsPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
      }
      return json(res, 202, { ok: true, accepted: rows.length });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/admin/state") {
    if (adminToken && req.headers.authorization !== `Bearer ${adminToken}`) {
      return json(res, 401, { ok: false, error: "Unauthorized" });
    }
    return json(res, 200, {
      ok: true,
      config: readJson(configPath, {}),
      events: summarizeEvents(),
      state: readState()
    });
  }

  return json(res, 404, { ok: false, error: "API not found" });
}

function serveStatic(req, res, url) {
  const file = safeJoin(publicDir, url.pathname);
  if (!file) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      fs.readFile(path.join(publicDir, "index.html"), (fallbackError, fallback) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, {
          "content-type": contentTypes[".html"],
          "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "pragma": "no-cache",
          "expires": "0",
          "surrogate-control": "no-store",
          "x-content-type-options": "nosniff"
        });
        res.end(fallback);
      });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file).toLowerCase();
    const noStoreFiles = new Set([
      "index.html",
      "app.js",
      "styles.css",
      "sw.js",
      "manifest.webmanifest"
    ]);
    const shouldNoStore = noStoreFiles.has(base) || ext === ".html" || url.searchParams.has("v");
    const headers = {
      "content-type": contentTypes[ext] || "application/octet-stream",
      "cache-control": shouldNoStore ? "no-store, no-cache, must-revalidate, proxy-revalidate" : "public, max-age=300",
      "x-content-type-options": "nosniff"
    };
    if (shouldNoStore) {
      headers.pragma = "no-cache";
      headers.expires = "0";
      headers["surrogate-control"] = "no-store";
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
});

server.listen(port, host, () => {
  console.log(`KTV Personality Universe listening on http://${host}:${port}`);
});
