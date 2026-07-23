const views = Array.from(document.querySelectorAll(".view"));
const scanLine = document.querySelector("#scan-line");
const progressBar = document.querySelector("#progress-bar");
const toast = document.querySelector(".toast");
const modal = document.querySelector(".modal");
const opsPanel = document.querySelector(".ops-panel");
const opsLog = document.querySelector(".ops-log");
const sharePosterPreview = document.querySelector(".share-poster-preview");
const modalKicker = document.querySelector("[data-modal-kicker]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalPreview = document.querySelector("[data-modal-preview]");
const modalList = document.querySelector("[data-modal-list]");
const modalAction = document.querySelector("[data-modal-action]");
const collectionGrid = document.querySelector("[data-collection-grid]");
const lineupGrid = document.querySelector("[data-lineup-grid]");
const skinShelf = document.querySelector("[data-skin-shelf]");
const skinChase = document.querySelector("[data-skin-chase]");
const seriesMap = document.querySelector("[data-series-map]");
const relationVault = document.querySelector("[data-relation-vault]");
const ownedShowcase = document.querySelector("[data-owned-showcase]");
const proofBars = document.querySelector("[data-proof-bars]");
const availableViews = views.map((view) => view.dataset.view);
const params = new URLSearchParams(window.location.search);
const phoneShell = document.querySelector(".phone");
const APP_BUILD = "20260701-demo-clean";
const RELATION_FEATURE_ENABLED = false;

document.documentElement.dataset.build = APP_BUILD;

function purgeLegacyRelationUi() {
  if (RELATION_FEATURE_ENABLED) return;
  document
    .querySelectorAll(
      ".relation-vault, [data-library-section='relations'], [data-relation-vault], .share-challenge, .share-relay-ticket, .share-loop, .share-readiness, [data-friend-compare]"
    )
    .forEach((node) => node.remove());
}

purgeLegacyRelationUi();

function isShareEntryUrl() {
  if (!RELATION_FEATURE_ENABLED) return false;
  const currentParams = new URLSearchParams(window.location.search);
  return currentParams.get("source") === "share" &&
    Boolean(personaByCode(currentParams.get("from"))) &&
    !currentParams.has("persona") &&
    !currentParams.has("owned") &&
    !currentParams.has("bonus");
}

function shouldRenderShareEntry() {
  return Boolean(invitedPersona) && isShareEntryUrl();
}

function cleanParam(value, fallback = "") {
  return (value || fallback).replace(/[<>]/g, "").trim().slice(0, 32);
}

const context = {
  room: cleanParam(params.get("room"), ""),
  source: cleanParam(params.get("source"), "demo"),
  member: cleanParam(params.get("member"), ""),
  fromPersona: cleanParam(params.get("from"), "")
};

let remoteConfig = {
  enabled: true,
  shareBase: "",
  experiment: {},
  copy: {},
  growth: {}
};

const personas = [
  {
    code: "SPARK",
    legacyCode: "BOOM",
    typeId: "B-001",
    displayCode: "STAR",
    title: "主场星",
    desc: "快歌一响，你就像默认站在包厢主舞台中间。",
    skinName: "开场火花",
    rank: "SSR?",
    rarity: "掉落率 7.8%",
    series: "热场系",
    hook: "把普通开场唱成自己主场的人。",
    signature: "别人还在点前奏，你已经把包厢唱成主舞台。",
    evidence: "快歌、开场曲、流行热歌和第一轮互动偏高。",
    skinLore: "开场火花是一张主舞台卡，快歌一响就像轮到你上场。",
    collectValue: "热场系核心卡，适合点亮档案库第一张高光人格。",
    evidenceStats: [["42%", "首歌占比"], ["6", "主动合唱"], ["91", "热场峰值"]],
    match: "匹配度 92% · 精准命中 3/3 维",
    unlockHint: "历史快歌、开场和互动偏好越强，STAR 主场星越容易命中。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-spark-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/star-opening-spark.png",
    scan: "正在检测开场爆发值",
    nextDrop: "SKIPPER（切歌师）"
  },
  {
    code: "SKIP",
    legacyCode: "CUT-X",
    typeId: "C-213",
    displayCode: "SKIPPER",
    title: "切歌师",
    desc: "你不是没耐心，你只是能在全场沉默一首歌前救场。",
    skinName: "冷脸控台",
    rank: "SR",
    rarity: "掉落率 12.4%",
    series: "控场系",
    hook: "自动扫描气氛低压区的人。",
    signature: "你不是讨厌这首歌，你只是知道下一首歌更适合此刻。",
    evidence: "切歌、插队、换原唱、下一首歌的干预频率偏高。",
    skinLore: "冷脸控台是一张切歌卡，无聊前奏活不过你的下一首。",
    collectValue: "控场系入门卡，适合给朋友精准吐槽。",
    evidenceStats: [["7", "切歌预警"], ["3", "控台干预"], ["88", "冷静指数"]],
    match: "匹配度 87% · 精准命中 3/3 维",
    unlockHint: "历史切歌和控场偏好越强，SKIPPER 切歌师越容易命中。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-skip-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/skipper-cold-console.png",
    scan: "正在分析切歌偏好曲线",
    nextDrop: "LOVER（纯爱者）"
  },
  {
    code: "ROMEO",
    legacyCode: "SAD-FM",
    typeId: "R-520",
    displayCode: "LOVER",
    title: "纯爱者",
    desc: "你一开口，包厢忽然像有人不小心调暗了灯。",
    skinName: "纯爱告白",
    rank: "SSR",
    rarity: "掉落率 10.6%",
    series: "情绪系",
    hook: "把麦克风过成月光的人。",
    signature: "你不是唱歌，你是在给全场发送午夜未读消息。",
    evidence: "情歌、慢歌、老歌和突然安静片段占比高。",
    skinLore: "纯爱告白是一张情歌卡，每一句都像没发出去的真心话。",
    collectValue: "情绪系门面卡，适合做朋友圈分享封面。",
    evidenceStats: [["64%", "情歌占比"], ["4", "全场安静"], ["96", "氛围杀值"]],
    match: "匹配度 90% · 精准命中 3/3 维",
    unlockHint: "历史纯情情歌偏好越强，LOVER 纯爱者越容易命中。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-romeo-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/lover-confession.png",
    scan: "正在读取情歌频段",
    nextDrop: "ECHO（回声者）"
  },
  {
    code: "ECHO",
    legacyCode: "ECHO",
    typeId: "E-404",
    displayCode: "ECHO",
    title: "回声者",
    desc: "你永远不抢第一句，但每一句副歌都需要你的影子。",
    skinName: "副歌接住",
    rank: "SR",
    rarity: "掉落率 8.9%",
    series: "合唱系",
    hook: "没有你，副歌少一半灵魂。",
    signature: "你的存在感不在麦上，而在每一个刚好接住的副歌里。",
    evidence: "合唱响应快、补位稳定、别人唱到一半时自动加入。",
    skinLore: "副歌接住是一张和声卡，不抢第一句，但副歌不能少你。",
    collectValue: "合唱系核心卡，适合给低调但很关键的人。",
    evidenceStats: [["11", "副歌补位"], ["78%", "同步命中"], ["87", "背景存在感"]],
    match: "匹配度 88% · 精准命中 3/3 维",
    unlockHint: "历史合唱响应越强，ECHO 回声者越容易命中。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-echo-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/echo-chorus-catch.png",
    scan: "正在生成合唱回环轨迹",
    nextDrop: "STAR（主场星）"
  },
  {
    code: "DROP",
    legacyCode: "DROP",
    typeId: "D-808",
    displayCode: "GHOST",
    title: "隐身者",
    desc: "你平时不说话，但副歌一到，所有人都知道你还活着。",
    skinName: "角落开麦",
    rank: "R",
    rarity: "掉落率 15.2%",
    series: "合唱系",
    hook: "专治包厢突然没人接歌。",
    signature: "你沉默很久，然后在一句副歌里让全场记住。",
    evidence: "爆点出场感强，副歌瞬间加入，高位处理突然上线。",
    skinLore: "角落开麦是一张隐身卡，低调不是缺席，是在等副歌。",
    collectValue: "合唱系补位卡，用得好看起来像一次神秘空投。",
    evidenceStats: [["3", "爆点潜伏"], ["9", "副歌空投"], ["84", "瞬间音量"]],
    match: "匹配度 83% · 命中 2/3 维",
    unlockHint: "历史副歌爆点和关键句参与更高时，有机会撞到 GHOST 隐身者。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-drop-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/ghost-corner-mic.png",
    scan: "正在捕捉副歌空投轨迹",
    nextDrop: "FIXER（救场者）"
  },
  {
    code: "MUTE",
    legacyCode: "MUTE",
    typeId: "M-000",
    displayCode: "FIXER",
    title: "救场者",
    desc: "全场突然安静时，只有你还能自然地把一句话接上。",
    skinName: "静音破冰",
    rank: "R",
    rarity: "掉落率 14.1%",
    series: "热场系",
    hook: "沉默里长出一首歌的前奏。",
    signature: "别人需要热身，你已经在一句笑声里点亮气氛。",
    evidence: "插话自然、圆场能力强、冷场后能快速拉回歌单。",
    skinLore: "静音破冰是一张救场卡，空气冷掉时你负责递第一句话。",
    collectValue: "热场系支撑卡，和 STAR 组成开场救场组合。",
    evidenceStats: [["5", "圆场次数"], ["12s", "冷场反应"], ["82", "破冰成功率"]],
    match: "匹配度 84% · 命中 2/3 维",
    unlockHint: "历史圆场和冷启动数据更高时，有机会撞到 FIXER 救场者。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-mute-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/fixer-silence-breaker.png",
    scan: "正在测试冷场免疫反应",
    nextDrop: "REPEATER（复读者）"
  },
  {
    code: "LOOP",
    legacyCode: "LOOP",
    typeId: "L-999",
    displayCode: "REPEATER",
    title: "复读者",
    desc: "你不是只会一首，你只是觉得本命歌还欠你一遍。",
    skinName: "单曲循环",
    rank: "R",
    rarity: "掉落率 13.8%",
    series: "上头系",
    hook: "同一首歌也能唱出连续剧。",
    signature: "这首歌不是放过了，是你还没放过这首歌。",
    evidence: "重复点歌、反复哼同一句、对某首歌异常执着。",
    skinLore: "单曲循环是一张复读卡，不是只会一首，是这首还没唱够。",
    collectValue: "上头系记忆卡，适合当作你的精神锚点。",
    evidenceStats: [["1", "本命歌"], ["4", "重复提示"], ["93", "上头浓度"]],
    match: "匹配度 86% · 命中 2/3 维",
    unlockHint: "历史重复点唱数据更高时，有机会撞到 REPEATER 复读者。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-loop-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/repeater-single-loop.png",
    scan: "正在识别单曲回环指数",
    nextDrop: "BOSS（控场者）"
  },
  {
    code: "BOSS",
    legacyCode: "BOSS",
    typeId: "B-777",
    displayCode: "BOSS",
    title: "控场者",
    desc: "你说随便，其实你对原唱、顺序和下一首都有灵魂意见。",
    skinName: "包厢控台",
    rank: "SR",
    rarity: "掉落率 9.9%",
    series: "控场系",
    hook: "把点歌 UI 玩成控制台的人。",
    signature: "你嘴上说随便，手已经伸向原唱切换的位置。",
    evidence: "调音量、换原唱、改顺序、查看下一首的频率高。",
    skinLore: "包厢控台是一张导演卡，嘴上说随便，手已经接管控制台。",
    collectValue: "控场系骨干卡，和 SKIPPER 组成幕后老板组。",
    evidenceStats: [["8", "控台操作"], ["2", "原唱切换"], ["90", "全局掌控"]],
    match: "匹配度 89% · 精准命中 3/3 维",
    unlockHint: "历史控台操作数据更高时，有机会撞到 BOSS 控场者。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-boss-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/boss-room-console.png",
    scan: "正在扫描控台占有欲",
    nextDrop: "HOPER（希望派）"
  },
  {
    code: "HYPE",
    legacyCode: "HYPE",
    typeId: "H-666",
    displayCode: "HOPER",
    title: "希望派",
    desc: "你喊的每一句都像开场白，哪怕这一秒其实还没唱。",
    skinName: "热歌信徒",
    rank: "R",
    rarity: "掉落率 11.1%",
    series: "热场系",
    hook: "把前奏讲成决赛现场。",
    signature: "你喊一句准备，所有人以为下一秒要颁奖。",
    evidence: "前奏起哄、拍手带节奏、用普通段落制造高潮。",
    skinLore: "热歌信徒是一张希望卡，流行热歌一响你先相信今晚会赢。",
    collectValue: "热场系爆发卡，适合和 STAR 组成双启动。",
    evidenceStats: [["6", "前奏起哄"], ["5", "伪高潮"], ["89", "气氛拉升"]],
    match: "匹配度 85% · 命中 2/3 维",
    unlockHint: "历史流行歌、起哄和提气数据更高时，有机会撞到 HOPER 希望派。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-hype-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/hoper-hot-song-believer.png",
    scan: "正在计算气氛拉升斜率",
    nextDrop: "CHALLENGER（挑战者）"
  },
  {
    code: "RISK",
    legacyCode: "RISK",
    typeId: "R-404",
    displayCode: "CHALLENGER",
    title: "挑战者",
    desc: "每一个高音都是挑战，赢了封神，输了全包厢笑过去。",
    skinName: "高音盲盒",
    rank: "R",
    rarity: "掉落率 16.6%",
    series: "冒险系",
    hook: "明知危险，还是要摸那个高音。",
    signature: "高音不是问题，是你给今晚加的挑战关。",
    evidence: "频繁挑战高音、明明也知道悬、越唱越想试。",
    skinLore: "高音盲盒是一张开奖式皮肤，声线永远停在冲上去的瞬间。",
    collectValue: "冒险系笑点卡，适合给敢冲也敢输的人。",
    evidenceStats: [["4", "高音挑战"], ["37%", "破音概率"], ["99", "勇气指数"]],
    match: "匹配度 81% · 命中 2/3 维",
    unlockHint: "历史高音挑战和冒险点歌更高时，有机会撞到 CHALLENGER 挑战者。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-risk-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/challenger-high-note-box.png",
    scan: "正在估算高音挑战值",
    nextDrop: "PARTNER（搭子）"
  },
  {
    code: "DUO",
    legacyCode: "DUO",
    typeId: "D-002",
    displayCode: "PARTNER",
    title: "搭子",
    desc: "只要别人开口，你就能自然变成这首歌的第二声部。",
    skinName: "副驾主唱",
    rank: "SR",
    rarity: "掉落率 9.4%",
    series: "合唱系",
    hook: "从不抢歌，但永远在歌里。",
    signature: "别人刚唱一句，你已经自然接上歌词。",
    evidence: "跟唱频率高、合唱启动快、麦不在手也不缺席。",
    skinLore: "副驾主唱是一张搭档卡，不抢方向盘，但永远接得住。",
    collectValue: "合唱系社交卡，适合给群里最会接歌的人。",
    evidenceStats: [["10", "自然接唱"], ["0", "抢麦压力"], ["86", "配合默契"]],
    match: "匹配度 86% · 命中 2/3 维",
    unlockHint: "历史双人合唱和接唱数据更高时，有机会撞到 PARTNER 搭子。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-duo-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/partner-copilot-vocal.png",
    scan: "正在定位合唱搭子半径",
    nextDrop: "JOKER（小丑）"
  },
  {
    code: "DRAMA",
    legacyCode: "DRAMA",
    typeId: "D-999",
    displayCode: "JOKER",
    title: "小丑",
    desc: "一句普通歌词，到你这里永远会多出一点故事。",
    skinName: "苦笑小丑",
    rank: "SSR",
    rarity: "掉落率 6.6%",
    series: "情绪系",
    hook: "把受伤情歌唱成嘴硬小剧场。",
    signature: "你越唱受伤情歌，越像在笑着给自己补妆。",
    evidence: "受伤情歌、自嘲歌词、入戏表情和嘴硬反转偏高。",
    skinLore: "苦笑小丑是一张嘴硬卡，越唱受伤情歌，越像笑着补妆。",
    collectValue: "情绪系稀有卡，适合当朋友圈压轴展示。",
    evidenceStats: [["3s", "尾音延长"], ["7", "表情投入"], ["95", "故事张力"]],
    match: "匹配度 91% · 精准命中 3/3 维",
    unlockHint: "历史受伤情歌、入戏和自嘲感更高时，有机会撞到 JOKER 小丑。",
    avatar: "./assets/visuals/pencil-export/avatars/avatar-drama-pencil.png",
    skinArt: "./assets/visuals/persona-skins-v3/joker-bitter-smile.png",
    scan: "正在读取尾音戏剧张力",
    nextDrop: "STAR（主场星）"
  }
];

const personaHotTakes = {
  SPARK: {
    identityClaim: "我是 STAR 主场星，快歌一响就像轮到我上场。",
    verdict: "你不是单纯爱热闹，你是历史快歌和开场曲偏好都在冒火。",
    weakness: "弱点：别人还在试音，你已经想把副歌提前搬上来。",
    shareHook: "系统说我是 STAR，原来我的歌单自带主场灯。"
  },
  SKIP: {
    identityClaim: "我是 SKIPPER 切歌师，无聊前奏活不过我的手。",
    verdict: "你不是没耐心，你只是对无聊前奏过敏。",
    weakness: "弱点：手离切歌键太近，朋友的深情容易活不过 30 秒。",
    shareHook: "测完发现我是 SKIPPER，不是扫兴，是在保护今晚的兴致。"
  },
  ROMEO: {
    identityClaim: "我是 LOVER 纯爱者，每首情歌都像没发出去的真心话。",
    verdict: "你唱的不是情歌，是一条没发出去的聊天记录。",
    weakness: "弱点：灯一暗，你就容易把普通歌词唱成遗言。",
    shareHook: "系统说我是 LOVER，难怪我唱纯爱歌像在公开告白。"
  },
  ECHO: {
    identityClaim: "我是 ECHO 回声者，不抢主唱，但每段副歌都有我的回声。",
    verdict: "你的点歌画像不是主唱型，是把别人声音接厚的合唱型。",
    weakness: "弱点：太会接歌，容易被朋友默认成免费和声插件。",
    shareHook: "系统说我是 ECHO，原来我不是背景音，是副歌的第二层灵魂。"
  },
  DROP: {
    identityClaim: "我是 GHOST 隐身者，平时像没在场，关键句突然现身。",
    verdict: "你平时安静，一到副歌就像空投砸进包厢。",
    weakness: "弱点：存在感来得太突然，朋友会怀疑你刚刚一直在蓄力。",
    shareHook: "我测出来是 GHOST，意思是我只在关键副歌显灵。"
  },
  MUTE: {
    identityClaim: "我是 FIXER 救场者，空气一静我就递下一句。",
    verdict: "你的画像不是话多，是冷场出现时总能先把局面打碎。",
    weakness: "弱点：太会圆场，容易被迫承包所有冷场。",
    shareHook: "系统认证我是 FIXER，不是话多，是包厢防冷场装置。"
  },
  LOOP: {
    identityClaim: "我是 REPEATER 复读者，一首歌能把今晚唱成连续剧。",
    verdict: "你不是只会一首歌，你是在修复某段人生。",
    weakness: "弱点：本命歌一响，你的退出键会自动失灵。",
    shareHook: "我被测成 REPEATER，看来我和那首歌还没彻底和解。"
  },
  BOSS: {
    identityClaim: "我是 BOSS 控场者，嘴上随便，歌单顺序必须有章法。",
    verdict: "你的点歌数据暴露了：原唱、顺序、下一首，其实你都想管。",
    weakness: "弱点：别人点歌靠感觉，你点歌像在排项目计划。",
    shareHook: "系统说我是 BOSS，包厢遥控器确实应该归我。"
  },
  HYPE: {
    identityClaim: "我是 HOPER 希望派，流行歌一响就负责把大家拉回人间。",
    verdict: "你唱流行不是跟风，是负责把今晚唱亮。",
    weakness: "弱点：再普通的副歌，你也能听出一点明天会更好。",
    shareHook: "系统说我是 HOPER，原来我不是只会唱流行，我是在给全场续命。"
  },
  RISK: {
    identityClaim: "我是 CHALLENGER 挑战者，明知会破也要冲上去。",
    verdict: "你的高音挑战偏好很诚实：唱不唱得上去另说，先冲一把。",
    weakness: "弱点：越悬越想冲，破音也要破得有尊严。",
    shareHook: "系统说我是 CHALLENGER，高音不是问题，是我的挑战环节。"
  },
  DUO: {
    identityClaim: "我是 PARTNER 搭子，别人一开口我就能接住。",
    verdict: "你不一定抢麦，但你永远能自然混进别人的歌。",
    weakness: "弱点：太会合唱，容易被朋友当作自动补位。",
    shareHook: "系统说我是 PARTNER，不是蹭唱，是官方认证合唱搭子。"
  },
  DRAMA: {
    identityClaim: "我是 JOKER 小丑，把受伤情歌唱成自嘲段子。",
    verdict: "你唱的不是受伤情歌，是笑着给自己补妆。",
    weakness: "弱点：越难过越想搞笑，朋友一听就知道你在嘴硬。",
    shareHook: "我测出来是 JOKER，原来我唱苦情歌是在给自己补妆。"
  }
};

const totalCards = personas.length;

const personaSocialProofs = {
  SPARK: {
    roast: "你一进来，包厢音量像被人手动拧到 200%。",
    cue: "适合发给每次第一个站起来、第一首就要热场的人。"
  },
  SKIP: {
    roast: "你不是切歌，你是在替大家做歌单急救。",
    cue: "适合发给那个嘴上说随便、手却一直靠近遥控器的人。"
  },
  ROMEO: {
    roast: "你唱情歌不像唱歌，像把聊天框截图念出来。",
    cue: "适合发给那个灯一暗就自动进入回忆模式的人。"
  },
  ECHO: {
    roast: "你不抢主唱，但少了你副歌会突然变空。",
    cue: "适合发给那个永远能把大家带进合唱的人。"
  },
  DROP: {
    roast: "你前面安静半小时，只为了副歌那一句空降。",
    cue: "适合发给那个平时低调、关键句突然封神的人。"
  },
  MUTE: {
    roast: "冷场刚出现，你已经把下一句话递到每个人嘴边。",
    cue: "适合发给那个负责救场、圆场、破冰的人。"
  },
  LOOP: {
    roast: "这首歌不是你的收藏，是你的精神工牌。",
    cue: "适合发给那个总有一首歌必须再来一遍的人。"
  },
  BOSS: {
    roast: "你说随便，但遥控器最后总会出现在你手上。",
    cue: "适合发给那个能把点歌顺序管成项目排期的人。"
  },
  HYPE: {
    roast: "高潮还没到，你已经开始给全场颁奖。",
    cue: "适合发给那个负责起哄、鼓掌、把气氛喊起来的人。"
  },
  RISK: {
    roast: "你明知道高音危险，但不冲一下就浑身难受。",
    cue: "适合发给那个每次都想挑战原唱尊严的人。"
  },
  DUO: {
    roast: "你不是伴唱，你是官方认证合唱安全感。",
    cue: "适合发给那个总能自然接上第二声部的人。"
  },
  DRAMA: {
    roast: "普通歌词到你嘴里，会自动长出大结局。",
    cue: "适合发给那个唱歌自带镜头、慢动作和片尾字幕的人。"
  }
};

const personaDeepReads = {
  SPARK: {
    cause: "快歌和高能段落更容易被你接住，包厢刚起步时你最先进入状态。",
    contrast: "别人以为你只是爱热闹，其实你在替全场完成第一次破冰。",
    target: "发给那个总等你点第一首、你不来就没人开局的朋友。"
  },
  SKIP: {
    cause: "切歌、控台和节奏判断一起偏高，你对冷掉的前奏反应很快。",
    contrast: "你看起来没耐心，其实是在阻止一首歌把气氛拖进低电量。",
    target: "发给那个每次说随便，最后还是让你来管歌单的人。"
  },
  ROMEO: {
    cause: "情歌、循环和入戏指标同时冒头，你更容易把歌词唱成私人消息。",
    contrast: "你表面只是深情，实际是在用麦克风处理一些没说完的话。",
    target: "发给那个听你唱两句就开始问“你是不是又想谁了”的朋友。"
  },
  ECHO: {
    cause: "副歌参与和双人默契更高，你总能在别人需要时自然补上第二声。",
    contrast: "你不抢主角，但少了你，一首歌会突然少掉一层安全感。",
    target: "发给那个每次唱到副歌都会回头找你合的人。"
  },
  DROP: {
    cause: "副歌命中和爆点强度偏高，你的存在感集中在最该出现的那一句。",
    contrast: "你前面像在省电，真正上场时却能把全场注意力砸醒。",
    target: "发给那个平时很安静，但关键副歌一定会突然开大的朋友。"
  },
  MUTE: {
    cause: "控场和救场速度一起出现，你对包厢安静的瞬间很敏感。",
    contrast: "你不是话多，你是在别人还没尴尬前先把空气接住。",
    target: "发给那个有他在就不会冷场、没他在大家只会看手机的人。"
  },
  LOOP: {
    cause: "重复点唱和情绪粘性偏高，你对某些歌有明显的长期记忆点。",
    contrast: "你不是不会换歌，你是觉得这一首还有一段情绪没唱完。",
    target: "发给那个本命歌响起时，谁切歌都会被他记一晚的人。"
  },
  BOSS: {
    cause: "控台操作、顺序调整和全局调度都强，你会自然接管点歌节奏。",
    contrast: "你嘴上说随便，其实脑子里已经排好了下一轮流程。",
    target: "发给那个遥控器最后总会回到他手上的朋友。"
  },
  HYPE: {
    cause: "高能冲动和热场速度偏高，前奏刚响你就能提前把气氛抬起来。",
    contrast: "你不是夸张，你是在给一首普通歌安装现场感。",
    target: "发给那个还没开唱就开始鼓掌、喊麦、制造仪式感的人。"
  },
  RISK: {
    cause: "高音冒险和戏剧张力一起偏高，你会被危险段落自动吸引。",
    contrast: "你不是不知道会破音，你只是觉得不冲一下这首歌不完整。",
    target: "发给那个每次挑战原唱尊严，输了也要笑着唱完的人。"
  },
  DUO: {
    cause: "双人合唱和自然接唱更强，你很容易和别人形成稳定声部。",
    contrast: "你不一定站在最中间，但你让主唱听起来更像主唱。",
    target: "发给那个不用喊就会自己接上来、永远刚好慢半拍的人。"
  },
  DRAMA: {
    cause: "戏剧张力、情绪浓度和尾音停留都高，普通句子到你这里会变成画面。",
    contrast: "别人是在唱歌词，你是在给歌词补镜头、灯光和片尾字幕。",
    target: "发给那个唱一句都像在演大结局、全场忍不住看他的朋友。"
  }
};

const skinCatalog = {
  SPARK: [
    { name: "开场火花", art: "./assets/visuals/persona-skins-v3/star-opening-spark.png", rarity: "SSR?", status: "owned", tagline: "快歌一响，主舞台直接亮起来。" },
    { name: "皇冠主唱", art: "./assets/visuals/persona-skins-v3/star-crown-singer.png", rarity: "SR", status: "locked", tagline: "今晚不是抢麦，是默认轮到你上场。" },
    { name: "舞台过载", art: "./assets/visuals/persona-skins-v3/star-stage-overload.png", rarity: "R", status: "locked", tagline: "灯光、火花和音量一起拉满。" }
  ],
  SKIP: [
    { name: "冷脸控台", art: "./assets/visuals/persona-skins-v3/skipper-cold-console.png", rarity: "SR", status: "owned", tagline: "无聊前奏活不过你的下一首。" },
    { name: "下一首预言", art: "./assets/visuals/persona-skins-v3/skipper-next-song-prophet.png", rarity: "SR", status: "locked", tagline: "别人还没腻，你已经知道该换哪首。" },
    { name: "救场遥控器", art: "./assets/visuals/persona-skins-v3/skipper-rescue-remote.png", rarity: "R", status: "locked", tagline: "一键把尴尬切到下一幕。" }
  ],
  ROMEO: [
    { name: "纯爱告白", art: "./assets/visuals/persona-skins-v3/lover-confession.png", rarity: "SSR", status: "owned", tagline: "每首情歌都像没发出去的真心话。" },
    { name: "失恋电台", art: "./assets/visuals/persona-skins-v3/lover-broken-radio.png", rarity: "SR", status: "locked", tagline: "深夜频道自动播放你的遗憾。" },
    { name: "复合幻想", art: "./assets/visuals/persona-skins-v3/lover-reunion-fantasy.png", rarity: "R", status: "locked", tagline: "唱到最后，连幻想都替你开灯。" }
  ],
  ECHO: [
    { name: "副歌接住", art: "./assets/visuals/persona-skins-v3/echo-chorus-catch.png", rarity: "SR", status: "owned", tagline: "不抢第一句，但副歌不能少你。" },
    { name: "人声回环", art: "./assets/visuals/persona-skins-v3/echo-vocal-loop.png", rarity: "SR", status: "locked", tagline: "你的和声让整首歌变厚。" },
    { name: "和声光环", art: "./assets/visuals/persona-skins-v3/echo-harmony-halo.png", rarity: "R", status: "locked", tagline: "站在旁边，也能把现场照亮。" }
  ],
  DROP: [
    { name: "角落开麦", art: "./assets/visuals/persona-skins-v3/ghost-corner-mic.png", rarity: "R", status: "owned", tagline: "低调不是缺席，是在等副歌。" },
    { name: "副歌显形", art: "./assets/visuals/persona-skins-v3/ghost-chorus-reveal.png", rarity: "SR", status: "locked", tagline: "一到关键句，全场突然看见你。" },
    { name: "透明主唱", art: "./assets/visuals/persona-skins-v3/ghost-transparent-lead.png", rarity: "R", status: "locked", tagline: "存在感很轻，但声音很准。" }
  ],
  MUTE: [
    { name: "静音破冰", art: "./assets/visuals/persona-skins-v3/fixer-silence-breaker.png", rarity: "R", status: "owned", tagline: "空气冷掉时，你负责递第一句话。" },
    { name: "冷场急救", art: "./assets/visuals/persona-skins-v3/fixer-cold-rescue.png", rarity: "SR", status: "locked", tagline: "尴尬超过三秒，你开始抢救现场。" },
    { name: "气氛修补匠", art: "./assets/visuals/persona-skins-v3/fixer-mood-mender.png", rarity: "R", status: "locked", tagline: "把碎掉的气氛一点点修回来。" }
  ],
  LOOP: [
    { name: "单曲循环", art: "./assets/visuals/persona-skins-v3/repeater-single-loop.png", rarity: "R", status: "owned", tagline: "不是只会一首，是这首还没唱够。" },
    { name: "上头复读", art: "./assets/visuals/persona-skins-v3/repeater-repeat-fever.png", rarity: "SR", status: "locked", tagline: "同一句反复唱，越唱越像咒语。" },
    { name: "本命刻录", art: "./assets/visuals/persona-skins-v3/repeater-anthem-record.png", rarity: "R", status: "locked", tagline: "把本命歌刻进你的包厢档案。" }
  ],
  BOSS: [
    { name: "包厢控台", art: "./assets/visuals/persona-skins-v3/boss-room-console.png", rarity: "SR", status: "owned", tagline: "嘴上说随便，手已经接管控制台。" },
    { name: "顺序导演", art: "./assets/visuals/persona-skins-v3/boss-queue-director.png", rarity: "SR", status: "locked", tagline: "今晚的歌单节奏由你剪辑。" },
    { name: "原唱裁判", art: "./assets/visuals/persona-skins-v3/boss-original-judge.png", rarity: "R", status: "locked", tagline: "原唱开不开，你心里有标准。" }
  ],
  HYPE: [
    { name: "热歌信徒", art: "./assets/visuals/persona-skins-v3/hoper-hot-song-believer.png", rarity: "R", status: "owned", tagline: "流行热歌一响，你先相信今晚会赢。" },
    { name: "明日开场", art: "./assets/visuals/persona-skins-v3/hoper-tomorrow-opening.png", rarity: "SR", status: "locked", tagline: "每个前奏都像新的开局。" },
    { name: "元气副歌", art: "./assets/visuals/persona-skins-v3/hoper-energy-chorus.png", rarity: "R", status: "locked", tagline: "副歌还没来，快乐已经先到了。" }
  ],
  RISK: [
    { name: "高音盲盒", art: "./assets/visuals/persona-skins-v3/challenger-high-note-box.png", rarity: "R", status: "owned", tagline: "明知有风险，还是想开这一嗓。" },
    { name: "破音勇者", art: "./assets/visuals/persona-skins-v3/challenger-crack-hero.png", rarity: "SR", status: "locked", tagline: "破了也算冲过，至少全场记住。" },
    { name: "封神一嗓", art: "./assets/visuals/persona-skins-v3/challenger-god-note.png", rarity: "SSR", status: "locked", tagline: "一嗓封神，今晚名场面归你。" }
  ],
  DUO: [
    { name: "副驾主唱", art: "./assets/visuals/persona-skins-v3/partner-copilot-vocal.png", rarity: "SR", status: "owned", tagline: "不抢方向盘，但永远接得住。" },
    { name: "默契合拍", art: "./assets/visuals/persona-skins-v3/partner-perfect-sync.png", rarity: "SR", status: "locked", tagline: "朋友一句，你刚好下一句。" },
    { name: "双麦结盟", art: "./assets/visuals/persona-skins-v3/partner-dual-mic-pact.png", rarity: "R", status: "locked", tagline: "两支麦克风，自动组成同盟。" }
  ],
  DRAMA: [
    { name: "苦笑小丑", art: "./assets/visuals/persona-skins-v3/joker-bitter-smile.png", rarity: "SSR", status: "owned", tagline: "越唱受伤情歌，越像笑着补妆。" },
    { name: "嘴硬返场", art: "./assets/visuals/persona-skins-v3/joker-stubborn-return.png", rarity: "SR", status: "locked", tagline: "嘴上没事，返场比谁都认真。" },
    { name: "崩溃谢幕", art: "./assets/visuals/persona-skins-v3/joker-final-curtain.png", rarity: "R", status: "locked", tagline: "最后一幕也要笑着唱完。" }
  ]
};

const skinDepthProfiles = {
  SPARK: {
    "霓虹爆场": {
      branch: "开场人格的主舞台形态：第一首歌还没进副歌，你已经把所有人的音量推高。",
      scene: "适合保存成门面卡，发出去就是一句“今晚谁负责开场”。",
      collect: "STAR 的核心卡，代表你不是跟着热闹走，而是热闹从你这里开始。",
      unlock: "首次命中 STAR 即入库；后续重复命中会继续补齐热场分支。"
    },
    "假高潮制造": {
      branch: "开场人格的起哄形态：高潮还没到，你先把全场骗进总决赛。",
      scene: "适合那些前奏一响就鼓掌、喊麦、提前庆祝的人。",
      collect: "这张皮肤让 STAR 从“点火”变成“制造幻觉”，更有梗，也更适合朋友吐槽。",
      unlock: "重复命中热场/高能画像时更容易掉落。"
    },
    "高音盲盒": {
      branch: "开场人格的冒险形态：你负责把气氛推到大家不敢推的位置。",
      scene: "适合高音前全场看你一眼，你也真的敢冲的时刻。",
      collect: "它补上 STAR 的危险感，让开场不只是热闹，还有一点失控的爽。",
      unlock: "高能段落和高音偏好更强时，更容易进入这张皮肤池。"
    }
  },
  SKIP: {
    "冷脸控场": {
      branch: "切歌人格的冷静形态：你不解释，直接把包厢从尴尬里救出来。",
      scene: "适合朋友深情开错歌、前奏太长、全场突然低头玩手机的时候。",
      collect: "SKIPPER 的代表皮肤，爽点是“我不是扫兴，我是在救场”。",
      unlock: "首次命中 SKIPPER 即入库；后续重复命中会解锁控场分支。"
    },
    "全局控台": {
      branch: "切歌人格的导演形态：歌单顺序、原唱伴奏、下一首，全都在你脑子里排好了。",
      scene: "适合那些嘴上说随便，但手已经靠近控制区的人。",
      collect: "它把 SKIPPER 从“切掉一首歌”升级成“管理整场节奏”。",
      unlock: "控场和切歌画像更强时更容易掉落。"
    },
    "静音破冰": {
      branch: "切歌人格的社交形态：不是只会切，也会在空气冷掉时递出第一句话。",
      scene: "适合包厢突然没声、大家互相等人救场的时候。",
      collect: "这张让 SKIPPER 不再只是冷脸，也有圆场和破冰的一面。",
      unlock: "控场画像叠加热场画像时更容易进入这张皮肤池。"
    }
  },
  ROMEO: {
    "午夜电台": {
      branch: "情歌人格的主频形态：你一开口，包厢像被调到凌晨 1 点。",
      scene: "适合唱完后所有人安静三秒，像听完一条没发出去的语音。",
      collect: "LOVER 的核心卡，身份识别最强，适合作为分享封面。",
      unlock: "首次命中 LOVER 即入库；重复命中会补齐情绪分支。"
    },
    "循环上头": {
      branch: "情歌人格的执念形态：不是你爱重复，是这首歌还有话没说完。",
      scene: "适合同一首歌想再唱一遍、同一句歌词反复咬住的时刻。",
      collect: "它把 LOVER 的情绪从“深情”推到“放不下”，更容易引发朋友对号入座。",
      unlock: "情歌占比和重复点唱同时偏高时更容易掉落。"
    },
    "尾音拉满": {
      branch: "情歌人格的戏剧形态：最后一个字不是唱完，是谢幕。",
      scene: "适合普通歌词被你唱出镜头感、尾音拖到朋友抬头的时候。",
      collect: "这张让 LOVER 有了压轴感，是情绪系里最适合炫的分支。",
      unlock: "情歌画像叠加入戏/戏剧张力时更容易进入这张皮肤池。"
    }
  },
  ECHO: {
    "人声回环": {
      branch: "合唱人格的稳定形态：你不抢第一句，但副歌一定有你的影子。",
      scene: "适合主唱一开口，你自然补上第二层声音的时候。",
      collect: "ECHO 的核心卡，代表你是包厢里最不吵但最不能缺的人。",
      unlock: "首次命中 ECHO 即入库；重复命中会补齐合唱分支。"
    },
    "高空副歌": {
      branch: "合唱人格的爆点形态：沉默很久，然后在关键句突然降临。",
      scene: "适合整首歌前半段低调，副歌一到所有人都看过来的时刻。",
      collect: "它让 ECHO 多了惊喜感，从稳定陪唱变成关键空投。",
      unlock: "合唱响应和高能段落偏高时更容易掉落。"
    },
    "副驾主唱": {
      branch: "合唱人格的搭子形态：别人负责握方向盘，你负责把路唱顺。",
      scene: "适合朋友主唱，你慢半拍跟上，却刚好把歌补满。",
      collect: "这张强化 ECHO 的关系属性，最适合被朋友分享后形成互动。",
      unlock: "合唱画像叠加双人/搭子偏好时更容易进入这张皮肤池。"
    }
  },
  DROP: {
    "高空副歌": {
      branch: "空投人格的原生形态：前面安静不是没参与，是在等爆点。",
      scene: "适合副歌第一句突然上线，让朋友意识到你一直在蓄力。",
      collect: "GHOST 的核心卡，爽点是低调后的突然封神。",
      unlock: "首次命中 GHOST 即入库；重复命中会补齐爆点分支。"
    },
    "人声回环": {
      branch: "空投人格的扩散形态：你不只落下一句，还能把全场一起带起来。",
      scene: "适合关键句之后，大家跟着你接第二轮副歌。",
      collect: "这张让 GHOST 从单点爆发变成群体记忆点。",
      unlock: "副歌命中和合唱响应同时偏高时更容易掉落。"
    },
    "霓虹爆场": {
      branch: "空投人格的炸场形态：低调到最后，然后把包厢灯全部打开。",
      scene: "适合平时不争，突然唱出今晚最亮的一段。",
      collect: "它补上 GHOST 的反差感，是最适合截图炫耀的分支。",
      unlock: "爆点强度和热场画像叠加时更容易进入这张皮肤池。"
    }
  },
  MUTE: {
    "静音破冰": {
      branch: "破冰人格的主形态：安静不是空白，是你准备接住场子的前一秒。",
      scene: "适合包厢突然没人说话，你自然把下一句递出去的时候。",
      collect: "FIXER 的核心卡，代表你有一种不吵但很关键的救场能力。",
      unlock: "首次命中 FIXER 即入库；重复命中会补齐救场分支。"
    },
    "冷脸控场": {
      branch: "破冰人格的硬切形态：空气不对，你直接把局切到下一幕。",
      scene: "适合沉默超过三秒，你决定不再等别人反应。",
      collect: "这张让 FIXER 多了决断力，不只是圆场，也能控场。",
      unlock: "控场和尴尬规避画像更强时更容易掉落。"
    },
    "假高潮制造": {
      branch: "破冰人格的热启动形态：用一句起哄把冷空气重新点燃。",
      scene: "适合没人敢先嗨，你先把笑声和掌声拉起来。",
      collect: "它让 FIXER 从“救冷场”变成“重新开局”，复玩感更强。",
      unlock: "破冰画像叠加热场画像时更容易进入这张皮肤池。"
    }
  },
  LOOP: {
    "循环上头": {
      branch: "循环人格的原生形态：这首歌不是放过了，是还没唱到你满意。",
      scene: "适合同一首歌想再来一遍，并且每遍都有新理由。",
      collect: "REPEATER 的核心卡，代表你的本命歌执念。",
      unlock: "首次命中 REPEATER 即入库；重复命中会补齐上头分支。"
    },
    "午夜电台": {
      branch: "循环人格的情绪形态：同一首歌每播一次，都像换一个深夜频道。",
      scene: "适合把重复点唱唱成回忆连载的人。",
      collect: "这张让 REPEATER 不只是重复，而是带着故事继续重播。",
      unlock: "重复点唱和情歌画像同时偏高时更容易掉落。"
    },
    "尾音拉满": {
      branch: "循环人格的结局形态：每次重唱，都像重新拍一个结尾。",
      scene: "适合某一句没处理好就想整首重来的时刻。",
      collect: "它把 REPEATER 的执念做成戏剧化收藏点，越看越像你的歌单签名。",
      unlock: "重复点唱叠加入戏画像时更容易进入这张皮肤池。"
    }
  },
  BOSS: {
    "全局控台": {
      branch: "控台人格的主形态：嘴上说随便，脑子里已经有整晚流程。",
      scene: "适合原唱、音量、下一首、顺序都被你默默校准的时候。",
      collect: "BOSS 的核心卡，代表你是包厢体验的隐形产品经理。",
      unlock: "首次命中 BOSS 即入库；重复命中会补齐控台分支。"
    },
    "冷脸控场": {
      branch: "控台人格的风控形态：切歌不是无情，是为了保住整场节奏。",
      scene: "适合一首歌快把气氛拖垮，你果断按下下一首的时候。",
      collect: "这张让 BOSS 更锋利，强化“我懂今晚该怎么走”的身份。",
      unlock: "控台操作和切歌倾向同时偏高时更容易掉落。"
    },
    "静音破冰": {
      branch: "控台人格的备用按钮形态：全局控场，也要有一键救场能力。",
      scene: "适合场面突然冷掉，你一边调歌一边把话接上。",
      collect: "它让 BOSS 不只是控制欲，也有兜底能力。",
      unlock: "控场画像叠加破冰/热场画像时更容易进入这张皮肤池。"
    }
  },
  HYPE: {
    "假高潮制造": {
      branch: "起哄人格的原生形态：高潮没到，你先帮大家预支兴奋。",
      scene: "适合前奏一响就喊“来了来了”，哪怕其实还没来。",
      collect: "HOPER 的核心卡，代表你是包厢气氛放大器。",
      unlock: "首次命中 HOPER 即入库；重复命中会补齐高能分支。"
    },
    "霓虹爆场": {
      branch: "起哄人格的主舞台形态：第一分钟就像临时开了演唱会。",
      scene: "适合大家还没进入状态，你已经开始举杯、鼓掌、点火。",
      collect: "这张把 HOPER 的提气能力视觉化成舞台感，分享冲击更强。",
      unlock: "高能互动和快歌偏好同时偏高时更容易掉落。"
    },
    "高音盲盒": {
      branch: "起哄人格的危险形态：每次喊上去，都像开一个不保证成功的盒。",
      scene: "适合朋友被你怂恿冲高音，你自己也忍不住跟着冲。",
      collect: "它让 HOPER 更搞笑，也更像朋友会转发吐槽的卡。",
      unlock: "高能段落和高音偏好更强时更容易进入这张皮肤池。"
    }
  },
  RISK: {
    "高音盲盒": {
      branch: "冒险人格的原生形态：明知道有风险，也想听听自己能不能赢。",
      scene: "适合高音前全场倒吸一口气，你却已经准备闯关。",
      collect: "CHALLENGER 的核心卡，笑点和爽点都来自那一下不确定。",
      unlock: "首次命中 CHALLENGER 即入库；重复命中会补齐冒险分支。"
    },
    "霓虹爆场": {
      branch: "冒险人格的封神形态：赢了全场亮灯，输了全场笑着原谅。",
      scene: "适合一首歌最难的地方，你偏要把它唱成名场面。",
      collect: "这张让 CHALLENGER 的风险变成炫耀资本，更适合分享给朋友挑战。",
      unlock: "高音冒险叠加热场画像时更容易掉落。"
    },
    "尾音拉满": {
      branch: "冒险人格的谢幕形态：就算破，也要破得有尊严、有镜头。",
      scene: "适合危险高音之后还要把尾音唱完的人。",
      collect: "它让 CHALLENGER 不只是搞笑，也有一种硬撑到底的戏剧感。",
      unlock: "高音冒险叠加入戏画像时更容易进入这张皮肤池。"
    }
  },
  DUO: {
    "副驾主唱": {
      branch: "搭子人格的主形态：不抢驾驶位，但你让整首歌不跑偏。",
      scene: "适合朋友主唱，你自然补上和声、节奏和安全感。",
      collect: "PARTNER 的核心卡，代表你是别人愿意一起唱的人。",
      unlock: "首次命中 PARTNER 即入库；重复命中会补齐搭子分支。"
    },
    "人声回环": {
      branch: "搭子人格的扩音形态：你把别人的主歌垫成一个双人现场。",
      scene: "适合朋友一句，你接一句，歌突然变厚的时刻。",
      collect: "这张让 PARTNER 更有关系感，特别适合分享后让朋友来测配对。",
      unlock: "双人合唱和副歌响应同时偏高时更容易掉落。"
    },
    "午夜电台": {
      branch: "搭子人格的故事形态：陪唱也能陪出一段剧情。",
      scene: "适合别人唱情歌，你在旁边接得比主唱还懂。",
      collect: "它让 PARTNER 从“会配合”变成“会共情”，更适合情绪局。",
      unlock: "双人画像叠加情歌画像时更容易进入这张皮肤池。"
    }
  },
  DRAMA: {
    "小丑补妆": {
      branch: "小丑人格的原生形态：受伤情歌到你嘴里，会先变成自嘲，再变成嘴硬。",
      scene: "适合唱苦情歌却还要笑着圆回来的时刻。",
      collect: "JOKER 的核心卡，最适合做高辨识度的个人门面。",
      unlock: "首次命中 JOKER 即入库；重复命中会补齐自嘲和入戏分支。"
    },
    "午夜电台": {
      branch: "戏剧人格的深夜形态：灯光一暗，你的每句歌词都有旁白。",
      scene: "适合把情绪唱到朋友突然安静的时刻。",
      collect: "这张让 JOKER 的自嘲更有氛围，不只是演，是会让人听进去。",
      unlock: "入戏画像叠加情歌画像时更容易掉落。"
    },
    "尾音拉满": {
      branch: "戏剧人格的连载形态：这一句不演到位，剧情不能结束。",
      scene: "适合唱完还想重来，因为上一遍的情绪还没演准。",
      collect: "它把 JOKER 变成可反复观看的角色，适合做长期收藏分支。",
      unlock: "入戏画像叠加重复点唱时更容易进入这张皮肤池。"
    }
  }
};

const personaProductProfiles = {
  SPARK: {
    position: "开场型人格：负责把局点燃，让别人愿意跟着唱。",
    social: "朋友看到会说：你一进包厢，歌还没放气氛先来了。",
    play: "适合做分享封面，第一眼就能看懂这是热场担当。",
    nameLogic: "Star 是主场感：快歌、开场曲和第一轮互动越高，越像那个一上来就把包厢唱成自己主舞台的人。",
    songSignals: "快歌占比、流行热歌、首轮互动、合唱带动。",
    visualDirection: "角色要像站在包厢灯光最前面的点火人，霓虹、火花、麦克风和开场舞台感必须强。"
  },
  SKIP: {
    position: "控场型人格：负责判断哪首该留、哪首该切。",
    social: "朋友看到会说：你不是没耐心，你是在保护大家的兴致。",
    play: "适合做吐槽型分享，容易引发朋友对号入座。",
    nameLogic: "Skipper 是跳过无聊片段的人：切歌和控台行为越多，越像包厢里的节奏急救员。",
    songSignals: "切歌倾向、控台干预、跳过前奏、顺序调整。",
    visualDirection: "角色要像冷脸遥控器玩家，手里有切歌键、控制台和一副“我在救场”的表情。"
  },
  ROMEO: {
    position: "情歌型人格：负责把普通点歌唱成私人电台。",
    social: "朋友看到会说：你唱的不是歌，是没发出去的聊天记录。",
    play: "适合做朋友圈人格卡，身份认同最强。",
    nameLogic: "Lover 是纯爱信号：纯爱情歌、告白歌和慢歌越集中，越像把麦克风当真心话的人。",
    songSignals: "纯爱情歌、甜歌、慢歌、情歌占比、重复点唱。",
    visualDirection: "角色要有纯爱电台感，月光、耳机、情书、柔和霓虹，不要油腻深情，要像年轻人的真心话。"
  },
  ECHO: {
    position: "合唱型人格：负责接住别人，让一首歌变成群体参与。",
    social: "朋友看到会说：你不抢麦，但少了你副歌就空了。",
    play: "适合被分享后拉朋友来测，天然有关系链。",
    nameLogic: "Echo 是回声：你不是第一个开口，但副歌和别人声音后面总会出现你的第二层。",
    songSignals: "合唱响应、副歌跟唱、双人默契、流行歌接唱。",
    visualDirection: "角色要像半透明回声精灵，音浪环绕、双麦、影子分身，重点是“接住别人”。"
  },
  DROP: {
    position: "爆点型人格：平时低调，关键副歌突然出现。",
    social: "朋友看到会说：你刚刚不说话，原来是在攒大招。",
    play: "适合做反差型人格，结果出来有惊喜感。",
    nameLogic: "Ghost 是隐身者：前面存在感低，但副歌爆点一来就突然现身。",
    songSignals: "副歌命中、关键句加入、爆点强度、前半段低参与后半段高参与。",
    visualDirection: "角色要像从灯光和音浪里显形的影子，低调、悬浮、关键句突然发光。"
  },
  MUTE: {
    position: "破冰型人格：空气安静时，负责把第一句话接上。",
    social: "朋友看到会说：冷场不可怕，可怕的是你不在场。",
    play: "适合做包厢社交货币，容易被朋友拿来调侃。",
    nameLogic: "Fixer 是救场的人：空气一静，你就把沉默接住，让局重新流动。",
    songSignals: "冷场后操作、圆场速度、救场点歌、快歌拉回。",
    visualDirection: "角色要像冰面裂开后的霓虹角色，手里可以有破冰锤或发光麦克风，表情轻松不尴尬。"
  },
  LOOP: {
    position: "执念型人格：对本命歌有极强重复播放欲。",
    social: "朋友看到会说：这首歌不是你的歌单，是你的精神工牌。",
    play: "适合做收藏型人格，用户会想知道自己的本命歌人格。",
    nameLogic: "Repeater 是复读者：一首歌反复出现，不是没歌唱，是这首歌还没被你唱完。",
    songSignals: "重复点唱、本命歌、同句循环、熟歌依赖。",
    visualDirection: "角色要围绕唱片、磁带、循环箭头和上头音浪，像困在一首歌里的可爱执念体。"
  },
  BOSS: {
    position: "指挥型人格：点歌顺序、原唱切换、气氛节奏都想管。",
    social: "朋友看到会说：你说随便，但遥控器最好还是给你。",
    play: "适合做强标签人格，分享出去识别度很高。",
    nameLogic: "Boss 是控台老板：你说随便，但歌单、原唱、顺序和音量其实都在你脑子里。",
    songSignals: "控台操作、原唱切换、顺序调整、下一首查看。",
    visualDirection: "角色要像包厢控制台指挥官，按钮、波形屏、墨镜或西装都可以，但要可爱潮玩化。"
  },
  HYPE: {
    position: "起哄型人格：负责把普通前奏喊成决赛开场。",
    social: "朋友看到会说：还没到高潮，你已经开始颁奖了。",
    play: "适合做搞笑型人格，轻松、不冒犯、传播快。",
    nameLogic: "Hoper 是希望派：流行热歌和正向副歌越多，越像负责把今晚唱亮的人。",
    songSignals: "流行热歌、提气歌、正向副歌、起哄和拍手。",
    visualDirection: "角色要明亮、夸张、像流行歌现场的气氛放大器，灯牌、烟花和彩色能量感要强。"
  },
  RISK: {
    position: "冒险型人格：明知高音危险，还是想冲一次。",
    social: "朋友看到会说：你不是唱歌，你是在和破音签生死状。",
    play: "适合做挑战型人格，天然引出“你敢不敢测”。",
    nameLogic: "Challenger 是挑战者：越危险越想试，高音不是段落，是挑战关。",
    songSignals: "高音挑战、破音风险、戏剧张力、冲刺倾向。",
    visualDirection: "角色要像拿麦克风闯关的玩家，高音波峰、夸张表情和危险但好笑的姿态。"
  },
  DUO: {
    position: "搭子型人格：不一定主唱，但永远能自然合上。",
    social: "朋友看到会说：你是官方认证的合唱安全感。",
    play: "适合做关系型分享，朋友会想测自己是不是搭子。",
    nameLogic: "Partner 是搭子：别人一开口，你就能自然接上第二声部。",
    songSignals: "双人合唱、自然接唱、默契氛围、陪唱稳定。",
    visualDirection: "角色要有双麦和副驾感，可以是一左一右的舞台构图，强调陪伴、默契和安全感。"
  },
  DRAMA: {
    position: "入戏型人格：把一句普通歌词唱出片尾字幕。",
    social: "朋友看到会说：你唱歌自带镜头和慢动作。",
    play: "适合做戏精型分享，结果越夸张越有记忆点。",
    nameLogic: "Joker 是小丑：受伤情歌越多，越会把难过唱成自嘲和嘴硬。",
    songSignals: "受伤情歌、自嘲歌词、入戏程度、情绪浓度。",
    visualDirection: "角色要有小丑/舞台妆/面具元素，但不能阴森恐怖，要像年轻人自嘲式嘴硬，潮玩、荒诞、可分享。"
  }
};

const fallbackSkinPool = [
  "./assets/visuals/skin-card-hype-fake-climax.png",
  "./assets/visuals/skin-card-mute-ice-break.png",
  "./assets/visuals/skin-card-loop-repeat-fever.png",
  "./assets/visuals/skin-card-ctrl-console-owner.png",
  "./assets/visuals/skin-card-drop-chorus-drop.png",
  "./assets/visuals/skin-card-duet-co-pilot.png",
  "./assets/visuals/skin-card-drama-tail-note.png",
  "./assets/visuals/skin-card-tone-high-note-blindbox.png"
];

function defaultSkinsForPersona(persona) {
  const offset = Math.max(0, personas.findIndex((item) => item.code === persona.code));
  return [
    {
      name: persona.skinName,
      art: persona.skinArt,
      rarity: persona.rank,
      status: "owned",
      tagline: persona.skinLore
    },
    {
      name: `${persona.series} 变体`,
      art: fallbackSkinPool[offset % fallbackSkinPool.length],
      rarity: "SR",
      status: "locked",
      tagline: persona.hook
    },
    {
      name: "隐藏异色",
      art: fallbackSkinPool[(offset + 3) % fallbackSkinPool.length],
      rarity: "R",
      status: "locked",
      tagline: persona.collectValue
    }
  ];
}

const scanTexts = [
  "正在读取你的历史点唱画像",
  "正在分析节奏、情绪、合唱与控场偏好",
  "正在匹配最像你的 KTV 人格卡",
  "正在生成可分享的人格档案"
];

const fallbackSingingProfile = {
  source: "demo-history",
  fastSongRatio: 0.58,
  loveSongRatio: 0.42,
  pureLoveRatio: 0.3,
  hurtLoveRatio: 0.18,
  popSongRatio: 0.5,
  chorusRatio: 0.36,
  skipRatio: 0.22,
  repeatRatio: 0.28,
  highNoteRatio: 0.18,
  controlRatio: 0.16,
  duetRatio: 0.12,
  dramaRatio: 0.15
};

function personaByCode(code) {
  const raw = String(code || "").trim().toUpperCase();
  return personas.find((persona) => persona.code === raw || persona.legacyCode === raw || persona.displayCode === raw);
}

function normalizeCode(code) {
  return personaByCode(code)?.code || String(code || "").trim().toUpperCase();
}

function personaDisplayCode(persona) {
  return persona?.displayCode || persona?.code || "";
}

function clampRatio(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function parseSingingProfile(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readSingingProfile() {
  const injected = parseSingingProfile(window.__ktvSingingProfile);
  const stored = parseSingingProfile(window.localStorage.getItem("ktv-singing-profile"));
  const queryProfile = [
    "fast",
    "love",
    "pureLove",
    "hurtLove",
    "pop",
    "chorus",
    "skip",
    "repeat",
    "high",
    "control",
    "duet",
    "drama"
  ].some((key) => params.has(key)) ? {
    source: "query",
    fastSongRatio: params.get("fast"),
    loveSongRatio: params.get("love"),
    pureLoveRatio: params.get("pureLove"),
    hurtLoveRatio: params.get("hurtLove"),
    popSongRatio: params.get("pop"),
    chorusRatio: params.get("chorus"),
    skipRatio: params.get("skip"),
    repeatRatio: params.get("repeat"),
    highNoteRatio: params.get("high"),
    controlRatio: params.get("control"),
    duetRatio: params.get("duet"),
    dramaRatio: params.get("drama")
  } : null;
  const profile = injected || queryProfile || stored || fallbackSingingProfile;
  return {
    source: String(profile.source || "unknown").slice(0, 32),
    fastSongRatio: clampRatio(profile.fastSongRatio, fallbackSingingProfile.fastSongRatio),
    loveSongRatio: clampRatio(profile.loveSongRatio, fallbackSingingProfile.loveSongRatio),
    pureLoveRatio: clampRatio(profile.pureLoveRatio, fallbackSingingProfile.pureLoveRatio),
    hurtLoveRatio: clampRatio(profile.hurtLoveRatio, fallbackSingingProfile.hurtLoveRatio),
    popSongRatio: clampRatio(profile.popSongRatio, fallbackSingingProfile.popSongRatio),
    chorusRatio: clampRatio(profile.chorusRatio, fallbackSingingProfile.chorusRatio),
    skipRatio: clampRatio(profile.skipRatio, fallbackSingingProfile.skipRatio),
    repeatRatio: clampRatio(profile.repeatRatio, fallbackSingingProfile.repeatRatio),
    highNoteRatio: clampRatio(profile.highNoteRatio, fallbackSingingProfile.highNoteRatio),
    controlRatio: clampRatio(profile.controlRatio, fallbackSingingProfile.controlRatio),
    duetRatio: clampRatio(profile.duetRatio, fallbackSingingProfile.duetRatio),
    dramaRatio: clampRatio(profile.dramaRatio, fallbackSingingProfile.dramaRatio)
  };
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

function scoreProfileByPersona(profile) {
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

function resolvePersonaFromSingingProfile(profile) {
  const scores = scoreProfileByPersona(profile);
  const best = Object.entries(scores)
    .filter(([code]) => personas.some((persona) => persona.code === code))
    .sort((a, b) => b[1] - a[1])[0];
  return best?.[0] || "SPARK";
}

function rankedPersonaMatches(profile = readSingingProfile()) {
  const scores = scoreProfileByPersona(profile);
  return Object.entries(scores)
    .map(([code, score]) => ({
      code,
      score,
      persona: personaByCode(code)
    }))
    .filter((item) => item.persona)
    .sort((a, b) => b.score - a.score);
}

function nextProfileCandidateIndex(profile = readSingingProfile()) {
  const ranked = rankedPersonaMatches(profile);
  const currentCode = currentPersona().code;
  const candidateCodes = ranked.slice(0, Math.min(6, ranked.length)).map((item) => item.code);
  const previousOwnedCodes = new Set(ownedCodes);
  const scoredPool = candidateCodes
    .filter((code) => code !== currentCode)
    .map((code, index) => {
      const match = ranked.find((item) => item.code === code);
      const novelty = previousOwnedCodes.has(code) ? 0.35 : 1;
      return {
        code,
        index,
        score: Math.max(0.05, (match?.score || 0.2) * novelty)
      };
    });
  const pool = scoredPool.length ? scoredPool : ranked.filter((item) => item.code !== currentCode);
  const total = pool.reduce((sum, item) => sum + item.score, 0);
  let cursor = ((Date.now() % 100000) + scanCount * 17 + ownedCount() * 31) / 100000 * total;
  for (const item of pool) {
    cursor -= item.score;
    if (cursor <= 0) {
      return personas.findIndex((persona) => persona.code === item.code);
    }
  }
  return personas.findIndex((persona) => persona.code === pool[0]?.code);
}

const evidenceMetricMap = {
  SPARK: [["fastSongRatio", "快歌占比", "%"], ["popSongRatio", "流行热歌", "%"], ["chorusRatio", "合唱带动", "%"]],
  SKIP: [["skipRatio", "切歌倾向", "%"], ["controlRatio", "控台干预", "%"], ["fastSongRatio", "节奏偏好", "%"]],
  ROMEO: [["pureLoveRatio", "纯爱情歌", "%"], ["loveSongRatio", "情歌占比", "%"], ["repeatRatio", "循环上头", "%"]],
  ECHO: [["chorusRatio", "合唱响应", "%"], ["duetRatio", "搭子指数", "%"], ["popSongRatio", "流行接唱", "%"]],
  DROP: [["chorusRatio", "副歌命中", "%"], ["highNoteRatio", "爆点强度", "%"], ["fastSongRatio", "入场速度", "%"]],
  MUTE: [["controlRatio", "破冰操作", "%"], ["fastSongRatio", "救场速度", "%"], ["skipRatio", "尴尬规避", "%"]],
  LOOP: [["repeatRatio", "重复点唱", "%"], ["loveSongRatio", "情绪粘性", "%"], ["popSongRatio", "熟歌依赖", "%"]],
  BOSS: [["controlRatio", "控台操作", "%"], ["skipRatio", "顺序调整", "%"], ["chorusRatio", "全局调度", "%"]],
  HYPE: [["popSongRatio", "流行热歌", "%"], ["fastSongRatio", "热场速度", "%"], ["chorusRatio", "起哄响应", "%"]],
  RISK: [["highNoteRatio", "高音冒险", "%"], ["dramaRatio", "失控边缘", "%"], ["fastSongRatio", "冲刺倾向", "%"]],
  DUO: [["duetRatio", "双人合唱", "%"], ["chorusRatio", "自然接唱", "%"], ["loveSongRatio", "默契氛围", "%"]],
  DRAMA: [["hurtLoveRatio", "受伤情歌", "%"], ["dramaRatio", "自嘲入戏", "%"], ["loveSongRatio", "情绪浓度", "%"]]
};

const proofDimensionMeta = {
  fastSongRatio: { axis: "节奏", label: "快歌热场" },
  loveSongRatio: { axis: "情绪", label: "情歌占比" },
  pureLoveRatio: { axis: "纯爱", label: "纯爱情歌" },
  hurtLoveRatio: { axis: "受伤", label: "受伤情歌" },
  popSongRatio: { axis: "流行", label: "流行热歌" },
  chorusRatio: { axis: "合唱", label: "副歌参与" },
  skipRatio: { axis: "切歌", label: "切歌倾向" },
  repeatRatio: { axis: "循环", label: "重复点唱" },
  highNoteRatio: { axis: "爆点", label: "高能段落" },
  controlRatio: { axis: "控场", label: "控台操作" },
  duetRatio: { axis: "搭子", label: "双人合唱" },
  dramaRatio: { axis: "入戏", label: "戏剧张力" }
};

function percentLabel(value) {
  return `${Math.round(clampRatio(value) * 100)}%`;
}

function metricHitState(value, target) {
  const delta = clampRatio(value) - clampRatio(target, .6);
  if (delta >= -.08) return "命中";
  if (delta >= -.18) return "接近";
  if (value >= .55) return "有信号";
  return "低信号";
}

function personaMatchSummary(persona, profile = readSingingProfile()) {
  const metrics = evidenceMetricMap[persona.code] || evidenceMetricMap.SPARK;
  const model = personaProfileModels[persona.code] || {};
  const ranked = rankedPersonaMatches(profile);
  const match = ranked.find((item) => item.code === persona.code);
  const rankIndex = ranked.findIndex((item) => item.code === persona.code);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;
  const scorePercent = Math.max(1, Math.min(99, Math.round(((match?.score || 0) / 1.08) * 100)));
  const items = metrics.slice(0, 3).map(([field]) => {
    const meta = proofDimensionMeta[field] || { axis: field, label: field };
    const value = clampRatio(profile[field], 0);
    const target = clampRatio(model[field], .6);
    const state = metricHitState(value, target);
    return {
      field,
      axis: meta.axis,
      label: meta.label,
      value,
      target,
      state,
      percent: Math.round(value * 100),
      targetPercent: Math.round(target * 100)
    };
  });
  const hitCount = items.filter((item) => item.state === "命中").length;
  const topMatches = ranked.slice(0, 3).map((item) => personaDisplayCode(item.persona));
  return {
    rank,
    scorePercent,
    hitCount,
    total: items.length,
    topMatches,
    items
  };
}

function evidenceFromProfile(persona, profile = readSingingProfile()) {
  const summary = personaMatchSummary(persona, profile);
  const stats = summary.items.map((item) => [percentLabel(item.value), item.label]);
  const proofLabels = summary.items
    .filter((item) => item.state === "命中")
    .slice(0, 2)
    .map((item) => `${item.label} ${item.percent}%`);
  const fallbackLabels = summary.items
    .slice(0, 2)
    .map((item) => `${item.label} ${item.percent}%`);
  const sourceText = profile.source && profile.source !== "unknown" ? "历史点唱画像" : "点唱偏好画像";
  return {
    stats,
    text: `${sourceText}显示：${(proofLabels.length ? proofLabels : fallbackLabels).join("、")}，综合匹配 ${summary.scorePercent}% · ${summary.hitCount}/${summary.total} 维命中，因此生成 ${personaDisplayCode(persona)}（${persona.title}）。`
  };
}

function proofPathFor(persona, profile = readSingingProfile()) {
  const summary = personaMatchSummary(persona, profile);
  const items = summary.items;
  const lead = items[0] || { axis: "画像", label: "点唱偏好", percent: 0, state: "命中" };
  const hitLabels = items
    .filter((item) => item.state === "命中")
    .map((item) => item.label);
  const sourceText = profile.source && profile.source !== "unknown" ? "历史点唱画像" : "点唱偏好画像";
  return {
    title: `匹配 ${summary.scorePercent}% · ${lead.axis} ${lead.percent}% · ${personaDisplayCode(persona)}`,
    text: `${sourceText}在「${(hitLabels.length ? hitLabels : items.map((item) => item.label)).join(" / ")}」上更接近 ${personaDisplayCode(persona)} 模型，所以生成 ${personaDisplayCode(persona)}（${persona.title}）人格卡。`,
    rankText: summary.rank
      ? `画像候选 TOP ${summary.rank} · ${summary.hitCount}/${summary.total} 维命中：${summary.topMatches.join(" / ")}`
      : `画像候选 · ${summary.hitCount}/${summary.total} 维命中：${summary.topMatches.join(" / ")}`,
    scorePercent: summary.scorePercent,
    hitCount: summary.hitCount,
    total: summary.total,
    items
  };
}

function runnerUpFor(persona, profile = readSingingProfile()) {
  const ranked = rankedPersonaMatches(profile);
  const currentIndex = ranked.findIndex((item) => item.code === persona.code);
  const nextMatches = ranked
    .filter((item) => item.code !== persona.code)
    .slice(0, 2)
    .map((item) => ({
      ...item,
      summary: personaMatchSummary(item.persona, profile)
    }));
  const runner = nextMatches[0];
  const also = nextMatches[1];
  if (!runner?.persona) {
    return {
      title: "没有明显第二人格",
      text: `${personaDisplayCode(persona)} 信号最集中，这次画像没有拉出足够强的第二候选。`
    };
  }
  const runnerDisplay = personaDisplayCode(runner.persona);
  const alsoDisplay = also?.persona ? personaDisplayCode(also.persona) : "";
  const runnerLead = runner.summary.items?.[0];
  const currentRankText = currentIndex >= 0 ? `TOP ${currentIndex + 1}` : "TOP 1";
  const runnerRankText = `TOP ${ranked.findIndex((item) => item.code === runner.code) + 1}`;
  return {
    title: `${runnerDisplay} 差点上桌${alsoDisplay ? ` · ${alsoDisplay} 也有信号` : ""}`,
    text: `${runnerRankText} ${runnerDisplay} 在${runnerLead?.label || runner.persona.title}上接近你，但本次 ${personaDisplayCode(persona)} 是${currentRankText}，主画像更集中，所以先生成 ${personaDisplayCode(persona)}。`
  };
}

function personaTriggerText(persona, profile = readSingingProfile()) {
  const summary = personaMatchSummary(persona, profile);
  const triggers = summary.items.map((item) => (
    `${item.label}：当前 ${item.percent}% / 目标 ${item.targetPercent}%（${item.state}）`
  ));
  return `${personaDisplayCode(persona)} 主要看 ${summary.items.map((item) => item.label).join("、")}。${triggers.join("；")}。`;
}

function rollReasonFor(persona, proofPath, wasOwned) {
  const display = personaDisplayCode(persona);
  const lead = proofPath.items?.[0];
  const leadText = lead ? `${lead.axis} ${lead.percent}%` : "画像特征";
  const matchText = proofPath.scorePercent ? `综合匹配 ${proofPath.scorePercent}% · ${proofPath.hitCount}/${proofPath.total} 维命中` : leadText;
  if (!primaryPersonaCode || primaryPersonaCode === persona.code) {
    return `首次主类型来自历史点唱画像：${matchText}，把你推向 ${display}。`;
  }
  if (wasOwned) {
    return `这次仍落在 ${display} 的高相似区间：${matchText}，重复命中会补齐皮肤分支。`;
  }
  return `主类型已固定，后续开卡会在画像相近候选里补图鉴；本次 ${matchText}，命中 ${display}。`;
}

function renderProofPath(proofPath) {
  if (!proofBars) return;
  proofBars.innerHTML = (proofPath.items || []).map((item) => `
    <div class="proof-bar">
      <span>${escapeHtml(item.axis)} · ${escapeHtml(item.state || "命中")}</span>
      <b>${escapeHtml(item.label)}</b>
      <i><em style="width: ${Math.max(8, item.percent)}%"></em></i>
      <strong>${item.percent}%</strong>
    </div>
  `).join("");
}

function resolveHistoryPersonaCode() {
  const explicitCode = normalizeCode(params.get("persona") || params.get("result"));
  if (personaByCode(explicitCode)) return explicitCode;
  return resolvePersonaFromSingingProfile(readSingingProfile());
}

function personaLabel(persona) {
  return `${personaDisplayCode(persona)}（${persona.title}）`;
}

function hotTakeFor(persona) {
  return personaHotTakes[persona.code] || {
    verdict: persona.signature,
    weakness: persona.hook,
    shareHook: persona.signature
  };
}

function socialProofFor(persona) {
  return personaSocialProofs[persona.code] || {
    roast: productProfileFor(persona).social,
    cue: "适合发给朋友，让他判断这是不是你本人。"
  };
}

function deepReadFor(persona) {
  return personaDeepReads[persona.code] || {
    cause: persona.evidence,
    contrast: persona.signature,
    target: productProfileFor(persona).social
  };
}

function productProfileFor(persona) {
  return personaProductProfiles[persona.code] || {
    position: `${persona.series}人格，核心特征是${persona.hook}`,
    social: persona.signature,
    play: persona.collectValue,
    nameLogic: `${personaDisplayCode(persona)} 是 ${persona.title} 的外显词，来自你的点歌画像和包厢行为。`,
    songSignals: persona.evidence,
    visualDirection: persona.skinLore
  };
}

const relationshipCombos = {
  "ROMEO+SPARK": {
    name: "月光烟花局",
    title: "一个负责上头，一个负责把灯打开",
    text: "LOVER 把一首歌唱成聊天记录，STAR 把下一首歌直接推到副歌。你们同框时，包厢很难只安静听歌。"
  },
  "ECHO+ROMEO": {
    name: "情歌接住局",
    title: "一个递情绪，一个接和声",
    text: "LOVER 负责把故事唱出来，ECHO 负责把所有人拉进副歌。你们适合互相转发，因为朋友会想知道自己站哪边。"
  },
  "ROMEO+SKIP": {
    name: "深情刹车局",
    title: "一个入戏太深，一个负责救场",
    text: "LOVER 刚准备把灯调暗，SKIPPER 已经把危险前奏切掉。你们一组，既有故事，也有求生欲。"
  },
  "DUO+ECHO": {
    name: "合唱永动机",
    title: "你们一开口，单人歌会自动变双人局",
    text: "PARTNER 负责找搭子，ECHO 负责把合唱扩散成全员参与。朋友点开后，很容易想证明自己不是背景音。"
  },
  "DROP+ECHO": {
    name: "副歌空投队",
    title: "一个等爆点，一个扩音量",
    text: "GHOST 专挑爆点入场，ECHO 负责把那一下变成全包厢的记忆点。你们的组合像一首歌突然被点亮。"
  },
  "DROP+DUO": {
    name: "卡点双人舞",
    title: "一个抓节拍，一个抓搭子",
    text: "GHOST 把最狠的一拍抓住，PARTNER 把身边的人一起拉上车。你们不是随便唱，是在制造现场。"
  },
  "BOSS+SKIP": {
    name: "控台双人组",
    title: "一个掌控节奏，一个切掉废歌",
    text: "BOSS 管全局，SKIPPER 管风险。你们在同一个包厢，歌单很难失控，除非你们自己想让它失控。"
  },
  "HYPE+SPARK": {
    name: "双核热场",
    title: "一个点火，一个把火拱大",
    text: "STAR 把气氛点着，HOPER 负责把音量和血压继续抬高。你们一起测出来，很适合发群里让大家认领。"
  },
  "MUTE+SPARK": {
    name: "反差开关",
    title: "一个突然引爆，一个安静观察",
    text: "FIXER 平时像旁观者，STAR 一上来就开大。你们的关系像包厢里的隐藏按钮，按下去才知道谁更疯。"
  },
  "LOOP+ROMEO": {
    name: "上头循环局",
    title: "一个反复播放，一个反复心动",
    text: "REPEATER 不怕重复，LOVER 不怕入戏。你们的共同点是：一首歌结束了，情绪不一定结束。"
  },
  "DRAMA+LOOP": {
    name: "剧情连播局",
    title: "一个加戏，一个循环播放",
    text: "JOKER 负责把普通歌词演成连续剧，REPEATER 负责让经典片段反复出现。你们在一起，包厢像开了番外篇。"
  },
  "HYPE+RISK": {
    name: "高音事故预备役",
    title: "一个敢冲，一个怕不够炸",
    text: "CHALLENGER 负责挑战上限，HOPER 负责把上限继续往上喊。你们的组合适合分享，因为朋友会忍不住想看自己有没有这么危险。"
  },
  "RISK+SPARK": {
    name: "失控点火局",
    title: "一个点火，一个直接冲破音",
    text: "STAR 把场子点起来，CHALLENGER 把高音推到边缘。你们不是普通组合，是包厢里的气氛警报。"
  }
};

const personaRelationshipProfiles = {
  SPARK: { role: "点火位", verb: "把第一首歌点成开场秀", flavor: "热场", scene: "他一上来就让气氛有了火星", invite: "适合拉朋友来认领谁负责收不住场" },
  SKIP: { role: "刹车位", verb: "把尴尬前奏切掉", flavor: "控场", scene: "他看起来冷静，其实一直在替全局踩刹车", invite: "适合拉朋友来证明自己不是扫兴，是救场" },
  ROMEO: { role: "情绪位", verb: "把歌词唱成聊天记录", flavor: "入戏", scene: "他一开口，灯光就像自动变暗", invite: "适合拉朋友来看看谁才是真正的情歌事故" },
  ECHO: { role: "接唱位", verb: "把副歌扩散成全员合唱", flavor: "合唱", scene: "他不抢主唱，但总能让一首歌变热闹", invite: "适合拉朋友来测谁最容易被他带进副歌" },
  DROP: { role: "爆点位", verb: "在最狠的一拍突然空降", flavor: "空投", scene: "他平时不一定多说，关键句一定要落地有声", invite: "适合拉朋友来猜谁会被他突然点燃" },
  MUTE: { role: "破冰位", verb: "把冷场接成下一句", flavor: "冷启动", scene: "他像隐藏按钮，不按不知道有多会接", invite: "适合拉朋友来看看谁是安静外表下的暗线" },
  LOOP: { role: "循环位", verb: "把本命歌按到重播", flavor: "上头", scene: "他不是忘不掉歌，是忘不掉那一下感觉", invite: "适合拉朋友来认领谁会陪他循环到散场" },
  BOSS: { role: "控台位", verb: "把歌单顺序重新排好", flavor: "指挥", scene: "遥控器到他手里，局面就开始有秩序", invite: "适合拉朋友来看看谁敢挑战他的控台权" },
  HYPE: { role: "起哄位", verb: "把前奏喊成决赛现场", flavor: "助燃", scene: "他不一定唱最多，但一定让别人唱更疯", invite: "适合拉朋友来测谁会被他拱上台面" },
  RISK: { role: "冒险位", verb: "把高音推到破音边缘", flavor: "冲线", scene: "他唱歌像闯一口高音，冲上去全场记住", invite: "适合拉朋友来围观谁最容易和他一起上头" },
  DUO: { role: "搭子位", verb: "自然接上第二声部", flavor: "陪唱", scene: "他出现后，一个人的歌会突然有安全感", invite: "适合拉朋友来测谁最适合和他绑定" },
  DRAMA: { role: "加戏位", verb: "把歌词演成大结局", flavor: "戏剧", scene: "他不是唱一首歌，是给这首歌补完镜头", invite: "适合拉朋友来认领谁会陪他把剧情演完" }
};

const relationshipEndings = ["互补局", "拆台局", "接力局", "反差局", "高光局", "名场面"];

function relationHash(...codes) {
  return codes.join("").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function dynamicRelationshipFor(friend, mine) {
  const friendProfile = personaRelationshipProfiles[friend.code] || {
    role: `${friend.title}位`,
    verb: friend.hook,
    flavor: friend.series,
    scene: friend.signature,
    invite: "适合拉朋友来看看自己会站在哪个位置"
  };
  const mineProfile = personaRelationshipProfiles[mine.code] || {
    role: `${mine.title}位`,
    verb: mine.hook,
    flavor: mine.series,
    scene: mine.signature,
    invite: "适合拉朋友来看看自己会站在哪个位置"
  };
  const sameSeries = friend.series === mine.series;
  const ending = sameSeries ? `${mine.series}同频局` : relationshipEndings[relationHash(friend.code, mine.code) % relationshipEndings.length];
  const spark = relationHash(friend.code, mine.code, mine.series) % 3;
  const angle = [
    `${personaDisplayCode(friend)} 负责${friendProfile.verb}，${personaDisplayCode(mine)} 负责${mineProfile.verb}。`,
    `${personaDisplayCode(friend)} 像${friendProfile.role}，${personaDisplayCode(mine)} 像${mineProfile.role}，你们同框后很容易把普通局唱成有记忆点的局。`,
    `${personaDisplayCode(friend)} 是${friendProfile.flavor}型：${friendProfile.scene}；${personaDisplayCode(mine)} 是${mineProfile.flavor}型：${mineProfile.scene}。这两种气质碰到一起，包厢里会自动分出站位。`
  ][spark];
  const bridge = sameSeries
    ? `你们都属于${mine.series}，像同一首歌里的两段高光，朋友一看就会想知道自己是不是也在这个系列。`
    : `你们不在同一条音轨上，但刚好能把对方的短板补成梗，朋友很容易想加入看看三个人会变成什么局。`;

  return {
    name: `${friendProfile.flavor}${mineProfile.flavor}${ending}`,
    title: `一个${friendProfile.role}，一个${mineProfile.role}`,
    text: `${angle}${bridge}${mineProfile.invite}。`
  };
}

function relationshipFor(friend, mine) {
  if (!friend || !mine) {
    return {
      name: "人格待配对",
      title: "发给朋友测完，关系才会出现",
      text: "朋友测出自己的人格后，这里会自动生成你们两个人的 KTV 关系。"
    };
  }

  if (friend.code === mine.code) {
    return {
      name: `双 ${personaDisplayCode(mine)} 同频`,
      title: `你们不是朋友，是同一个 ${mine.title} 的双开`,
      text: `两个人都测出 ${personaDisplayCode(mine)}，说明你们在 KTV 里会互相放大同一种气质。发给朋友看，他大概率会嘴硬但点头。`
    };
  }

  const key = [friend.code, mine.code].sort().join("+");
  if (relationshipCombos[key]) return relationshipCombos[key];

  return dynamicRelationshipFor(friend, mine);
}

function relationPlaybookFor(friend, mine, relation) {
  const friendProfile = personaRelationshipProfiles[friend.code] || {
    role: `${friend.title}位`,
    verb: friend.hook,
    invite: "适合拉朋友来看看自己会站在哪个位置"
  };
  const mineProfile = personaRelationshipProfiles[mine.code] || {
    role: `${mine.title}位`,
    verb: mine.hook,
    invite: "适合拉朋友来看看自己会站在哪个位置"
  };
  return {
    hook: `${personaDisplayCode(friend)} ${friendProfile.role} × ${personaDisplayCode(mine)} ${mineProfile.role}`,
    beats: [
      { label: "开局", text: `${personaDisplayCode(friend)} 先${friendProfile.verb}` },
      { label: "补位", text: `${personaDisplayCode(mine)} 接着${mineProfile.verb}` },
      { label: "发出去", text: relation.name.includes("同频") ? "继续接力，让朋友来认领同一频段" : "继续接力，朋友加入后重算新关系" }
    ],
    share: `${relation.name}不是结论，是下一位朋友加入前的临时站位。`
  };
}

const entryVariants = {
  expose: {
    eyebrow: "历史点唱画像 · KTV 人格卡",
    titleTop: "测出你的",
    titleHot: "KTV 人格卡",
    subtitle: "用你的唱歌偏好生成，30 秒拿到可分享人格卡",
    hook: "不是随机抽卡，是读取你的点唱画像",
    question: "你的卡还没揭晓",
    cta: "用点唱画像生成卡"
  },
  test: {
    eyebrow: "历史点唱画像 · KTV 人格卡",
    titleTop: "测出你的",
    titleHot: "KTV 人格卡",
    subtitle: "基于点唱偏好生成，朋友点开也能测自己",
    hook: "朋友点开测自己的卡，再自动算关系",
    question: "你的卡还没揭晓",
    cta: "用点唱画像生成卡"
  }
};

let scanTimer = null;
let currentIndex = Number(window.localStorage.getItem("ktv-persona-index") || 0) % personas.length;
let scanCount = Number(window.localStorage.getItem("ktv-scan-count") || 1);
let bonusDrops = 0;
let preferredCode = resolveHistoryPersonaCode();
let events = JSON.parse(window.localStorage.getItem("ktv-events") || "[]");
let ownedCodes = JSON.parse(window.localStorage.getItem("ktv-owned-codes") || "[\"SPARK\"]").map(normalizeCode);
let ownedSkins = JSON.parse(window.localStorage.getItem("ktv-owned-skins") || "{\"SPARK\":[\"开场火花\"]}");
let equippedSkins = JSON.parse(window.localStorage.getItem("ktv-equipped-skins") || "{}");
let ownedRelations = JSON.parse(window.localStorage.getItem("ktv-owned-relations") || "[]");
let primaryPersonaCode = normalizeCode(window.localStorage.getItem("ktv-primary-persona") || "");
let entryVariant = window.localStorage.getItem("ktv-entry-variant") || "expose";
let lastViewed = "";
let previewPosterCode = "";
let invitedPersona = null;
let activeRelationShare = null;
let lastSkinPreview = null;
let lastSkinDrop = null;
let lastPersonaWasOwned = false;
const localPreviewMode = window.location.protocol === "file:" ||
  ["127.0.0.1", "localhost", ""].includes(window.location.hostname);
let serverMode = window.location.protocol !== "file:";
const remoteApiRequired = window.location.protocol !== "file:" && !localPreviewMode;
let quotaState = null;
let rollInFlight = false;
let quotaCountdownTimer = null;
let streakDays = Math.max(0, Number(window.localStorage.getItem("ktv-streak-days")) || 0);
let streakRewardState = null;

function currentPersona() {
  return personas[currentIndex];
}

function validPersonaCode(code) {
  const normalized = normalizeCode(code);
  return personas.some((persona) => persona.code === normalized) ? normalized : "";
}

function primaryPersona() {
  return personaByCode(primaryPersonaCode);
}

function savePrimaryPersona() {
  if (primaryPersonaCode) {
    window.localStorage.setItem("ktv-primary-persona", primaryPersonaCode);
  } else {
    window.localStorage.removeItem("ktv-primary-persona");
  }
}

function ensurePrimaryPersona(code) {
  const normalized = validPersonaCode(code);
  if (!normalized || primaryPersona()) return primaryPersonaCode;
  primaryPersonaCode = normalized;
  savePrimaryPersona();
  return primaryPersonaCode;
}

function bindText(name, value) {
  document.querySelectorAll(`[data-bind="${name}"]`).forEach((node) => {
    node.textContent = value;
  });
}

function compactResultText(value, max = 28) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function bindProgress(name, percent) {
  document.querySelectorAll(`[data-bind-style="${name}"]`).forEach((node) => {
    node.style.width = `${Math.max(0, Math.min(percent, 100))}%`;
  });
}

function bindImage(name, src, alt) {
  document.querySelectorAll(`img[data-bind="${name}"]`).forEach((node) => {
    node.src = src;
    if (alt) node.alt = alt;
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function coverImage(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (image.width - sw) / 2;
  const sy = (image.height - sh) / 2;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const chars = Array.from(text);
  const lines = [];
  let line = "";

  chars.forEach((char) => {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = testLine;
    }
  });
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((item, index) => {
    const output = index === maxLines - 1 && lines.length > maxLines ? `${item.slice(0, -1)}...` : item;
    ctx.fillText(output, x, y + index * lineHeight);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadTextFile(text, filename, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeBackUrl() {
  const raw = params.get("backUrl");
  if (!raw) return "";
  try {
    const url = new URL(raw, window.location.href);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function sharePlayUrl() {
  const configuredBase = params.get("shareBase") || remoteConfig.shareBase;
  const persona = currentPersona();
  const url = new URL(configuredBase || window.location.href, window.location.href);
  url.search = "";
  url.searchParams.set("persona", persona.code);
  url.hash = "#share";
  return url.href;
}

function shareRunnerUpHook(persona = currentPersona()) {
  const runnerUp = runnerUpFor(persona);
  if (!runnerUp?.title || runnerUp.title.includes("没有明显")) return "";
  return runnerUp.title.replace(/\s*差点上桌/g, "").replace(/\s*·\s*/g, "，");
}

function trimSentenceEnd(text) {
  return String(text || "").replace(/[。！？.!?]+$/u, "");
}

function shareMessage() {
  const persona = currentPersona();
  const socialProof = socialProofFor(persona);
  const relationContext = currentRelationContext();
  if (relationContext) {
    const { relation } = relationContext;
    return `我和朋友测出「${relation.name}」：${relation.title}。你也入局测一下，系统会按你的唱歌画像重算新的 KTV 关系卡：${sharePlayUrl()}`;
  }
  const runnerHook = shareRunnerUpHook(persona);
  const runnerText = runnerHook ? `，差点变成 ${runnerHook}` : "";
  return `我抽到「${personaLabel(persona)}」：${trimSentenceEnd(socialProof.roast)}${runnerText}。这是我的 KTV 人格卡：${sharePlayUrl()}`;
}

function setShareReadyStatus(status) {
  bindText("shareReadyStatus", status);
}

function postEvent(event) {
  if (window.location.protocol === "file:") return;
  const url = new URL("/api/events", window.location.origin);
  if (context.member) url.searchParams.set("member", context.member);
  window.fetch?.(url.href, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(context.member ? { "x-ktv-member": context.member } : {})
    },
    body: JSON.stringify(event),
    keepalive: true
  }).catch(() => {});
}

async function apiJson(path, options = {}) {
  if (!serverMode) throw new Error("Server API unavailable in file preview");
  const url = new URL(path, window.location.origin);
  if (context.member) url.searchParams.set("member", context.member);
  const response = await fetch(url.href, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(context.member ? { "x-ktv-member": context.member } : {}),
      ...(options.body ? { "content-type": "application/json" } : {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || `HTTP ${response.status}`);
    error.payload = payload;
    throw error;
  }
  return payload;
}

function applyArchiveState(archive = {}, quota = quotaState, options = {}) {
  if (Array.isArray(archive.ownedCodes) && archive.ownedCodes.length) {
    ownedCodes = uniqueOwnedCodes(archive.ownedCodes);
  }
  if (archive.ownedSkins && typeof archive.ownedSkins === "object") {
    ownedSkins = normalizeOwnedSkins(archive.ownedSkins);
    saveOwnedSkins();
  }
  if (archive.equippedSkins && typeof archive.equippedSkins === "object") {
    equippedSkins = normalizeEquippedSkins(archive.equippedSkins);
    saveEquippedSkins();
  }
  if (Array.isArray(archive.ownedRelations)) {
    ownedRelations = normalizeOwnedRelations(archive.ownedRelations);
    saveOwnedRelations();
  }
  if (archive.primaryPersonaCode !== undefined) {
    primaryPersonaCode = validPersonaCode(archive.primaryPersonaCode);
    savePrimaryPersona();
  }
  ownedSkins = normalizeOwnedSkins(ownedSkins);
  if (archive.currentCode) {
    const index = personas.findIndex((persona) => persona.code === normalizeCode(archive.currentCode));
    if (index >= 0) currentIndex = index;
  }
  if (archive.singingProfile && typeof archive.singingProfile === "object") {
    window.localStorage.setItem("ktv-singing-profile", JSON.stringify(archive.singingProfile));
    preferredCode = resolvePersonaFromSingingProfile(readSingingProfile());
  }
  if (Number.isFinite(Number(archive.rollCount))) {
    scanCount = Math.max(1, Number(archive.rollCount) + 1);
  }
  if (Number.isFinite(Number(archive.streakDays))) {
    streakDays = Math.max(0, Number(archive.streakDays) || 0);
    window.localStorage.setItem("ktv-streak-days", String(streakDays));
  }
  streakRewardState = archive.streakReward && typeof archive.streakReward === "object" ? archive.streakReward : streakRewardState;
  quotaState = quota || quotaState;
  syncDemoState();
  if (options.render !== false && document.readyState !== "loading") {
    renderPersona();
    updateRollButtons();
  }
}

async function refreshServerState() {
  if (!serverMode) return false;
  try {
    const payload = await apiJson("/api/profile/quota");
    applyArchiveState(payload.archive, payload.quota, { render: false });
    return true;
  } catch {
    if (!remoteApiRequired) {
      serverMode = false;
    }
    return false;
  }
}

async function grantShareReward() {
  if (!serverMode) return false;
  try {
    const payload = await apiJson("/api/share/reward", { method: "POST" });
    quotaState = payload.quota || quotaState;
    updateRollButtons();
    if (payload.granted) {
      track("share_reward_granted");
      showToast("分享奖励已到账，可多开 1 张");
    }
    return Boolean(payload.granted);
  } catch {
    return false;
  }
}

async function handleShareReward() {
  return false;
}

function quotaRemaining() {
  if (!quotaState) return Infinity;
  return Number(quotaState.remaining) || 0;
}

function resetCountdownLabel(value) {
  if (!value) return "明天刷新";
  const resetAt = new Date(value).getTime();
  if (!Number.isFinite(resetAt)) return "明天刷新";
  const diffMs = resetAt - Date.now();
  if (diffMs <= 0) return "即将刷新";
  const totalMinutes = Math.max(1, Math.ceil(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}分钟`;
  return `${hours}小时${minutes}分`;
}

function resetCountdownExpired(value) {
  if (!value) return false;
  const resetAt = new Date(value).getTime();
  return Number.isFinite(resetAt) && resetAt <= Date.now();
}

function startQuotaCountdown() {
  if (quotaCountdownTimer) return;
  quotaCountdownTimer = window.setInterval(async () => {
    if (!quotaState?.nextResetAt) return;
    bindText("entryQuotaReset", resetCountdownLabel(quotaState.nextResetAt));
    if (resetCountdownExpired(quotaState.nextResetAt)) {
      await refreshServerState();
      renderDailyQuest();
      updateRollButtons();
    }
  }, 30000);
}

function formatResetTime(value) {
  if (!value) return "明天刷新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "明天刷新";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} 刷新`;
}

function renderDailyQuest() {
  const hasRemoteQuota = Boolean(quotaState);
  const remaining = hasRemoteQuota ? Math.max(0, Number(quotaState.remaining) || 0) : 3;
  const exhausted = hasRemoteQuota && remaining <= 0;
  bindText("dailyQuestRemaining", String(remaining));
  bindText("dailyQuestTitle", exhausted ? "今日开卡已用完" : `今日还能开 ${remaining} 张`);
  bindText(
    "dailyQuestText",
    exhausted
      ? "今天的卡池已经锁定，明天刷新后再来开新人格。"
      : "随机抽一张人格卡，抽到后自动入库，重复抽到会补齐对应皮肤。"
  );
  bindText("dailyQuestReset", hasRemoteQuota ? formatResetTime(quotaState.nextResetAt) : "今晚 23:59 刷新");
}

function renderStreakReward() {
  const days = Math.max(1, streakDays || Math.min(scanCount, 7));
  const milestone = Number(streakRewardState?.milestone) || (days >= 7 ? 7 : 3);
  const remaining = Math.max(0, milestone - days);
  bindText("streakMilestone", String(milestone));
  if (streakRewardState?.title && streakRewardState?.text) {
    bindText("streakRewardTitle", streakRewardState.title);
    bindText("streakRewardText", streakRewardState.text);
  } else if (days >= 7) {
    bindText("streakRewardTitle", "7 天人格档案已成册");
    bindText("streakRewardText", "你的常见唱歌人格、关系卡和皮肤分支已经有了连续记录，适合回看自己的 KTV 宇宙。");
  } else if (days >= 3) {
    bindText("streakRewardTitle", `再连续 ${remaining} 天，补齐人格故事线`);
    bindText("streakRewardText", "连续回来不是为了刷奖励，而是看你的主类型、同系人格和朋友关系会不会越来越准。");
  } else {
    bindText("streakRewardTitle", `再连续 ${remaining} 天，看见人格变化`);
    bindText("streakRewardText", "连续回来会沉淀你的点歌画像、主类型和新关系卡，让档案库更像你的唱歌人格主页。");
  }
  document.querySelectorAll("[data-streak-dot]").forEach((node) => {
    const index = Number(node.dataset.streakDot) || 0;
    node.classList.toggle("is-lit", index <= Math.min(days, 3));
  });
}

function updateRollButtons() {
  const remaining = quotaRemaining();
  const hasRemoteQuota = Number.isFinite(remaining);
  const exhausted = hasRemoteQuota && remaining <= 0;
  const exhaustedHint = "今日开卡次数已用完 · 明天刷新";
  bindText("entryQuotaRemaining", hasRemoteQuota ? String(Math.max(0, remaining)) : "3");
  bindText("entryQuotaShare", String(ownedCount()));
  bindText("entryQuotaReset", hasRemoteQuota ? formatResetTime(quotaState?.nextResetAt).replace(" 刷新", "") : "23:59");
  bindText("quotaHint", hasRemoteQuota
    ? (exhausted ? exhaustedHint : `今日还可开 ${remaining} 张`)
    : "今日免费 3 次 · 抽到自动入库");
  updateQuotaGatedActions();
}

function quotaExhaustedMessage() {
  return "今日开卡次数已用完，明天刷新后再来";
}

function isRollEntryButton(button) {
  if (!button || button.dataset.next !== "entry") return false;
  const action = button.dataset.missionAction || "";
  return ["skin-roll", "daily-roll", "retry", "route"].includes(action);
}

function updateQuotaGatedActions() {
  const remaining = quotaRemaining();
  const hasRemoteQuota = Number.isFinite(remaining);
  const exhausted = hasRemoteQuota && remaining <= 0;
  document.querySelectorAll("[data-next]").forEach((button) => {
    const gated = button.dataset.next === "scan" || isRollEntryButton(button);
    if (!gated) return;
    button.classList.toggle("is-disabled", exhausted);
    button.setAttribute("aria-disabled", exhausted ? "true" : "false");
    button.disabled = button.dataset.next === "scan" && exhausted;
    if (isRollEntryButton(button)) {
      button.title = exhausted ? quotaExhaustedMessage() : "";
    }
  });
  applyEntryQuotaState(exhausted, remaining);
}

function applyEntryQuotaState(exhausted, remaining) {
  const entryCta = document.querySelector("[data-bind=\"entryCta\"]");
  const entryButton = entryCta?.closest("[data-next]");
  const hasRemoteQuota = Boolean(quotaState);

  if (hasRemoteQuota) {
    bindText("entryQuotaReset", resetCountdownLabel(quotaState?.nextResetAt));
  }

  if (!entryButton || !entryCta) return;

  if (exhausted) {
    entryButton.dataset.next = "library";
    entryButton.disabled = false;
    entryButton.classList.add("is-quota-empty");
    entryButton.classList.remove("is-disabled");
    entryButton.setAttribute("aria-disabled", "false");
    entryButton.title = "今日开卡次数已用完，先查看档案库";
    entryCta.textContent = "查看我的档案库";
    bindText(
      "quotaHint",
      "今日开卡次数已用完，先查看档案库"
    );
    return;
  }

  entryButton.dataset.next = "scan";
  entryButton.classList.remove("is-quota-empty");
  entryButton.title = "";
  const variant = entryVariants[entryVariant] || entryVariants.expose;
  entryCta.textContent = variant.cta || "用点唱画像生成卡";
}

function saveOwnedCodes() {
  window.localStorage.setItem("ktv-owned-codes", JSON.stringify(ownedCodes));
}

function saveOwnedSkins() {
  window.localStorage.setItem("ktv-owned-skins", JSON.stringify(ownedSkins));
}

function saveEquippedSkins() {
  window.localStorage.setItem("ktv-equipped-skins", JSON.stringify(equippedSkins));
}

function saveOwnedRelations() {
  window.localStorage.setItem("ktv-owned-relations", JSON.stringify(ownedRelations));
}

function uniqueOwnedCodes(codes) {
  return [...new Set(codes.map(normalizeCode))].filter((code) => personas.some((persona) => persona.code === code));
}

function relationKey(friendCode, myCode) {
  return `${normalizeCode(friendCode)}-${normalizeCode(myCode)}`;
}

function normalizeRelationItem(item = {}) {
  const friendCode = normalizeCode(item.friendCode);
  const myCode = normalizeCode(item.myCode || item.mineCode);
  const friend = personaByCode(friendCode);
  const mine = personaByCode(myCode);
  if (!friend || !mine) return null;
  const relation = relationshipFor(friend, mine);
  const playbook = relationPlaybookFor(friend, mine, relation);
  const createdAt = item.createdAt && !Number.isNaN(new Date(item.createdAt).getTime())
    ? new Date(item.createdAt).toISOString()
    : new Date().toISOString();
  return {
    key: relationKey(friend.code, mine.code),
    friendCode: friend.code,
    friendTitle: friend.title,
    myCode: mine.code,
    myTitle: mine.title,
    name: String(item.name || relation.name).slice(0, 36),
    title: String(item.title || relation.title).slice(0, 80),
    text: String(item.text || relation.text).slice(0, 180),
    hook: String(item.hook || playbook.hook).slice(0, 80),
    createdAt
  };
}

function normalizeOwnedRelations(value = ownedRelations) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map(normalizeRelationItem)
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter((item) => {
      if (seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    })
    .slice(0, 24);
}

function persistRelationToServer(item) {
  if (!serverMode || !item) return;
  apiJson("/api/relations", {
    method: "POST",
    body: JSON.stringify({ relation: item })
  })
    .then((payload) => applyArchiveState(payload.archive, payload.quota || quotaState))
    .catch(() => {});
}

function rememberRelation(friend, mine) {
  if (!RELATION_FEATURE_ENABLED) return null;
  const relation = relationshipFor(friend, mine);
  const key = relationKey(friend.code, mine.code);
  const existing = ownedRelations.find((stored) => stored.key === key);
  const item = normalizeRelationItem({
    friendCode: friend.code,
    myCode: mine.code,
    name: relation.name,
    title: relation.title,
    text: relation.text,
    hook: relationPlaybookFor(friend, mine, relation).hook,
    createdAt: existing?.createdAt || new Date().toISOString()
  });
  if (!item) return null;
  const isNew = !existing;
  ownedRelations = normalizeOwnedRelations([item, ...ownedRelations.filter((stored) => stored.key !== item.key)]);
  saveOwnedRelations();
  if (isNew) {
    track("relation_collect", { relation: item.name, friendCode: item.friendCode, myCode: item.myCode });
    persistRelationToServer(item);
  }
  return item;
}

function currentRelationContext() {
  if (!RELATION_FEATURE_ENABLED) return null;
  if (activeRelationShare) {
    const friend = personaByCode(activeRelationShare.friendCode);
    const mine = personaByCode(activeRelationShare.myCode);
    if (friend && mine) return { friend, mine, relation: relationshipFor(friend, mine), source: "archive" };
  }
  const persona = currentPersona();
  if (invitedPersona) return { friend: invitedPersona, mine: persona, relation: relationshipFor(invitedPersona, persona), source: "invite" };
  return null;
}

function clearActiveRelationShare() {
  activeRelationShare = null;
}

function normalizeOwnedSkins(value = ownedSkins) {
  const next = {};
  uniqueOwnedCodes(ownedCodes).forEach((code) => {
    const persona = personaByCode(code);
    const defaultName = persona?.skinName || (skinCatalog[code]?.[0]?.name) || "默认皮肤";
    const names = Array.isArray(value?.[code]) ? value[code] : [defaultName];
    next[code] = [...new Set(names.filter(Boolean).map((name) => String(name).slice(0, 32)))];
    if (!next[code].includes(defaultName)) next[code].unshift(defaultName);
  });
  return next;
}

function isSkinOwned(persona, skin) {
  const names = normalizeOwnedSkins()[persona.code] || [];
  return names.includes(skin.name);
}

function normalizeEquippedSkins(value = equippedSkins) {
  const next = {};
  const skins = normalizeOwnedSkins();
  uniqueOwnedCodes(ownedCodes).forEach((code) => {
    const persona = personaByCode(code);
    const fallback = persona?.skinName || skinsForPersona(persona)?.[0]?.name || "";
    const selected = String(value?.[code] || fallback).slice(0, 32);
    const ownedNames = skins[code] || [];
    next[code] = ownedNames.includes(selected) ? selected : (ownedNames[0] || fallback);
  });
  return next;
}

function equippedSkinFor(persona) {
  const ownedCatalog = skinCatalogWithOwnership(persona);
  const name = normalizeEquippedSkins()[persona.code];
  return ownedCatalog.find((skin) => skin.name === name) || ownedCatalog.find((skin) => skin.status === "owned") || ownedCatalog[0];
}

function persistEquippedSkinToServer(code, skinName) {
  if (!serverMode) return;
  apiJson("/api/skins/equip", {
    method: "POST",
    body: JSON.stringify({ code, skinName })
  })
    .then((payload) => applyArchiveState(payload.archive, payload.quota || quotaState))
    .catch(() => {});
}

function equipSkin(code, skinName, persist = true) {
  const persona = personaByCode(code);
  if (!persona) return false;
  const skin = skinCatalogWithOwnership(persona).find((item) => item.name === skinName);
  if (!skin || skin.status !== "owned") return false;
  equippedSkins = normalizeEquippedSkins({ ...equippedSkins, [persona.code]: skin.name });
  saveEquippedSkins();
  if (persist) persistEquippedSkinToServer(persona.code, skin.name);
  track("skin_equip", { code: persona.code, skin: skin.name });
  previewPosterCode = "";
  renderPersona();
  showToast(`已装备「${skin.name}」`);
  return true;
}

function skinCatalogWithOwnership(persona) {
  return skinsForPersona(persona).map((skin) => ({
    ...skin,
    status: isSkinOwned(persona, skin) ? "owned" : "locked",
    equipped: normalizeEquippedSkins()[persona.code] === skin.name
  }));
}

function unlockLocalSkin(code, skinName, advance = false) {
  const persona = personaByCode(code);
  if (!persona) return;
  const catalog = skinsForPersona(persona);
  const fallback = catalog[0]?.name || persona.skinName;
  const name = skinName || (advance ? catalog.find((skin) => !isSkinOwned(persona, skin))?.name : fallback) || fallback;
  ownedSkins = normalizeOwnedSkins();
  ownedSkins[persona.code] = [...new Set([...(ownedSkins[persona.code] || [fallback]), name])];
  saveOwnedSkins();
  equippedSkins = normalizeEquippedSkins({ ...equippedSkins, [persona.code]: name });
  saveEquippedSkins();
  lastSkinDrop = { code: persona.code, name, isNew: advance || Boolean(skinName), ownedCount: ownedSkins[persona.code].length, total: catalog.length };
}

function applyBonusUnlocks(count) {
  const bonusCount = Math.max(0, Number(count) || 0);
  if (!bonusCount) return;
  const ownedSet = new Set(ownedCodes);
  let unlocked = 0;
  personas.forEach((persona) => {
    if (unlocked >= bonusCount || ownedSet.has(persona.code)) return;
    ownedSet.add(persona.code);
    unlocked += 1;
  });
  ownedCodes = uniqueOwnedCodes([...ownedSet]);
  saveOwnedCodes();
  ownedSkins = normalizeOwnedSkins();
  saveOwnedSkins();
}

if (!window.localStorage.getItem("ktv-owned-codes")) {
  saveOwnedCodes();
}

ownedSkins = normalizeOwnedSkins(ownedSkins);
saveOwnedSkins();
equippedSkins = normalizeEquippedSkins(equippedSkins);
saveEquippedSkins();
ownedRelations = normalizeOwnedRelations(ownedRelations);
saveOwnedRelations();

function syncDemoState() {
  window.localStorage.setItem("ktv-persona-index", String(currentIndex));
  window.localStorage.setItem("ktv-scan-count", String(scanCount));
  window.localStorage.setItem("ktv-bonus-drops", "0");
  window.localStorage.setItem("ktv-preferred-code", preferredCode);
  window.localStorage.setItem("ktv-owned-codes", JSON.stringify(ownedCodes));
  window.localStorage.setItem("ktv-owned-skins", JSON.stringify(normalizeOwnedSkins()));
  window.localStorage.setItem("ktv-equipped-skins", JSON.stringify(normalizeEquippedSkins()));
  window.localStorage.setItem("ktv-owned-relations", JSON.stringify(normalizeOwnedRelations()));
  savePrimaryPersona();
  window.localStorage.setItem("ktv-entry-variant", entryVariant);
  window.localStorage.setItem("ktv-events", JSON.stringify(events));
  window.localStorage.setItem("ktv-streak-days", String(streakDays));
}

function resetDemoState(options = {}) {
  currentIndex = options.currentIndex ?? 0;
  scanCount = options.scanCount ?? 1;
  bonusDrops = 0;
  preferredCode = normalizeCode(options.preferredCode ?? resolveHistoryPersonaCode());
  ownedCodes = uniqueOwnedCodes(options.ownedCodes ?? ["SPARK"]);
  ownedSkins = normalizeOwnedSkins(options.ownedSkins ?? { SPARK: ["开场火花"] });
  equippedSkins = normalizeEquippedSkins(options.equippedSkins ?? {});
  ownedRelations = normalizeOwnedRelations(options.ownedRelations ?? []);
  primaryPersonaCode = validPersonaCode(options.primaryPersonaCode || "");
  entryVariant = options.entryVariant ?? entryVariant;
  events = options.events ?? [];
  streakDays = 0;
  streakRewardState = null;
  lastSkinDrop = null;
  lastPersonaWasOwned = false;
  lastViewed = "";
  syncDemoState();
}

function ownedCount() {
  return new Set(ownedCodes).size;
}

function ensureCurrentOwned() {
  if (serverMode) {
    ownedSkins = normalizeOwnedSkins(ownedSkins);
    renderPersona();
    return;
  }
  const code = currentPersona().code;
  if (!ownedCodes.includes(code)) {
    ownedCodes = [...ownedCodes, code];
    saveOwnedCodes();
    track("skin_collect", { code });
  }
  unlockLocalSkin(code, currentPersona().skinName, false);
  renderPersona();
}

function nextLockedPersona() {
  return personas.find((persona) => !ownedCodes.includes(persona.code)) || personas[(currentIndex + 1) % personas.length];
}

function nextCollectionTarget(current, ownedSet = new Set(ownedCodes)) {
  const seriesCards = personas.filter((persona) => persona.series === current.series);
  const sameSeriesTarget = seriesCards.find((persona) => !ownedSet.has(persona.code));
  return sameSeriesTarget || nextLockedPersona();
}

function renderRelationVault() {
  const section = relationVault?.closest(".relation-vault");
  if (!RELATION_FEATURE_ENABLED) {
    if (section) section.hidden = true;
    if (relationVault) relationVault.innerHTML = "";
    return;
  }
  if (section) section.hidden = false;
  const relations = normalizeOwnedRelations();
  bindText("relationVaultCount", `${relations.length} 个关系`);
  bindText(
    "relationVaultText",
    relations.length
      ? `最近沉淀 ${relations.length} 张关系卡，朋友测完会继续补齐你的关系宇宙。`
      : "朋友点开分享后测完，会自动沉淀你们的 KTV 关系卡。"
  );
  if (!relationVault) return;
  if (!relations.length) {
    const persona = currentPersona();
    relationVault.innerHTML = `
      <article class="relation-vault-card is-empty">
        <div class="relation-vault-pair">
          <b>${escapeHtml(personaDisplayCode(persona))}</b>
          <em>×</em>
          <b>???</b>
        </div>
        <div class="relation-vault-info">
          <span>待生成关系卡</span>
          <strong>发给朋友，测你们俩是哪种 KTV 关系</strong>
          <em>${escapeHtml(personaDisplayCode(persona))} 已带入 · 朋友测完自动入库</em>
          <p>这里不是空列表，而是下一张可以被点亮的关系卡槽。</p>
          <button type="button" data-next="share" data-relation-empty-share>生成朋友入口</button>
        </div>
      </article>
    `;
    return;
  }
  relationVault.innerHTML = relations.slice(0, 6).map((item) => {
    const friend = personaByCode(item.friendCode);
    const mine = personaByCode(item.myCode);
    const friendLabel = friend ? personaDisplayCode(friend) : item.friendCode;
    const mineLabel = mine ? personaDisplayCode(mine) : item.myCode;
    return `
    <article class="relation-vault-card" role="button" tabindex="0" data-relation-key="${escapeHtml(item.key)}" aria-label="打开 ${escapeHtml(item.name)} ${escapeHtml(friendLabel)} 和 ${escapeHtml(mineLabel)}">
      <div class="relation-vault-pair">
        <b>${escapeHtml(friendLabel)}</b>
        <em>×</em>
        <b>${escapeHtml(mineLabel)}</b>
      </div>
      <div class="relation-vault-info">
        <span>${escapeHtml(item.name)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <em>${escapeHtml(item.hook)}</em>
        <p>${escapeHtml(item.text)}</p>
      </div>
    </article>
  `;
  }).join("");
}

function openRelationDetail(key) {
  const item = normalizeOwnedRelations().find((relation) => relation.key === key);
  if (!item) return;
  const friend = personaByCode(item.friendCode);
  const mine = personaByCode(item.myCode);
  if (!friend || !mine) return;
  const relation = relationshipFor(friend, mine);
  const playbook = relationPlaybookFor(friend, mine, relation);
  activeRelationShare = item;
  previewPosterCode = "";
  const friendLabel = personaDisplayCode(friend);
  const mineLabel = personaDisplayCode(mine);
  setModalContent({
    kicker: "OWNED RELATION CARD",
    title: `${item.name} · ${friendLabel} × ${mineLabel}`,
    images: [mine.skinArt, friend.avatar],
    tags: ["关系卡", friend.title, mine.title],
    insight: item.title,
    highlights: [
      { label: playbook.beats[0].label, title: friendLabel, text: playbook.beats[0].text },
      { label: playbook.beats[1].label, title: mineLabel, text: playbook.beats[1].text },
      { label: playbook.beats[2].label, title: "接力", text: playbook.beats[2].text }
    ],
    proofStats: [["1", "关系卡"], ["2", "人格同框"], ["∞", "可接力"]],
    items: [
      { label: "组合钩子", text: item.hook || playbook.hook },
      { label: "关系解读", text: item.text },
      { label: "朋友人格", text: `${friendLabel}（${friend.title}）：${productProfileFor(friend).position}` },
      { label: "我的人格", text: `${mineLabel}（${mine.title}）：${productProfileFor(mine).position}` },
      { label: "可玩点", text: playbook.share }
    ],
    action: "生成关系图",
    actionMode: "share-relation",
    actionCode: item.key
  });
  setModal(true);
  track("relation_detail_open", { relation: item.name, friendCode: item.friendCode, myCode: item.myCode });
}

function renderCollection() {
  const current = currentPersona();
  const ownedSet = new Set(ownedCodes);
  const primary = primaryPersona();
  const primaryCode = primary?.code || "";
  const currentIsPrimary = current.code === primaryCode;
  const collected = Math.min(ownedCount(), totalCards);
  const currentSkins = skinCatalogWithOwnership(current);
  const ownedSkinCount = currentSkins.filter((skin) => skin.status === "owned").length;
  const equippedSkin = equippedSkinFor(current);
  const seriesCards = personas.filter((persona) => persona.series === current.series);
  const ownedSeriesCount = seriesCards.filter((persona) => ownedSet.has(persona.code)).length;
  const target = nextCollectionTarget(current, ownedSet);
  const targetingSameSeries = target.series === current.series && ownedSeriesCount < seriesCards.length;
  const routeTitle = targetingSameSeries ? `下一步：补齐${current.series}人格` : `下一步：扩展${target.series}人格`;
  const routeText = targetingSameSeries
    ? `已收集 ${collected}/${totalCards}，当前系别 ${ownedSeriesCount}/${seriesCards.length}。下一张目标 ${personaDisplayCode(target)} 会补齐${current.series}拼图。`
    : `已收集 ${collected}/${totalCards}，${current.series}已补齐。下一张目标 ${personaDisplayCode(target)} 会打开${target.series}关系组合。`;

  bindText("ownedTotal", String(collected));
  bindText("ownedRatio", `${collected}/${totalCards}`);
  bindText("librarySummary", `我的人格卡 ${collected}/${totalCards} · 当前 ${personaLabel(current)}`);
  bindText("libraryIdentityLine", `${currentIsPrimary ? "主类型" : "当前卡"} ${personaDisplayCode(current)} · 装备「${equippedSkin?.name || current.skinName}」· 皮肤 ${ownedSkinCount}/${currentSkins.length} · 下张 ${personaDisplayCode(target)}`);
  bindText("archivePrimaryCode", personaDisplayCode(current));
  bindText("archivePrimaryTitle", current.title);
  bindText("archiveOwnedCount", `${collected}/${totalCards}`);
  bindText("archiveOwnedText", `已收集 ${collected} 张`);
  bindText("archiveNextCode", personaDisplayCode(target));
  bindText("archiveNextTitle", target.title);
  bindText("archiveSkinName", equippedSkin?.name || current.skinName);
  bindText("archiveSkinCount", `${ownedSkinCount}/${currentSkins.length}`);
  bindText("ownedShowcaseTitle", `当前 ${personaDisplayCode(current)} · 已收集 ${collected} 张`);
  bindText("ownedShowcaseHint", `你现在拥有：${ownedCodes.map((code) => personaDisplayCode(personaByCode(code))).filter(Boolean).join(" / ")}。抽到的新卡会先进入这里。`);
  bindText("collectionWallCount", `${collected}/${totalCards}`);
  bindText("collectionWallText", `全套 12 张人格卡：亮起的是已收集，灰掉的是待解锁。当前 ${personaDisplayCode(current)}（${current.title}），剩余 ${Math.max(totalCards - collected, 0)} 张。`);
  bindText("lockedTotal", String(Math.max(totalCards - collected, 0)));
  bindText("streakDays", `${Math.max(1, streakDays || Math.min(scanCount, 7))}天`);
  bindText("skinShelfCount", `${ownedSkinCount}/${currentSkins.length}`);
  bindText("seriesMapTitle", `${current.series}人格`);
  bindText("seriesMapText", `你已收集 ${ownedSeriesCount}/${seriesCards.length}。同系人格会补齐你的 KTV 角色拼图。`);
  bindText("collectionTarget", personaLabel(target));
  bindText("collectionRouteTitle", routeTitle);
  bindText("collectionRouteText", routeText);
  const missionStep = Math.max(1, Math.min(3, ownedSet.size));
  bindText("missionProgress", `${missionStep}/3`);
  bindText("targetCode", personaDisplayCode(target));
  bindText("targetTitle", target.title);
  bindText("targetHint", target.unlockHint);
  bindText("targetReason", `${hotTakeFor(target).identityClaim} ${targetingSameSeries ? `补齐${current.series}拼图` : `扩展${target.series}拼图`}后，卡册会更完整。`);
  bindText("targetProgress", `${missionStep}/3`);
  bindText("primaryPersonaBadge", currentIsPrimary ? "主类型" : "扩展卡");
  bindImage("targetAvatar", target.avatar, `${personaLabel(target)} 下一张人格卡剪影`);
  bindText(
    "missionHint",
    missionStep >= 3 ? "收集进度已推进，可以再测或生成分享图。" : "再开一张补档案，或直接生成分享图。"
  );
  bindProgress("missionProgress", (missionStep / 3) * 100);
  renderDailyQuest();
  renderStreakReward();
  renderRelationVault();

  if (ownedShowcase) {
    const ownedPersonas = personas
      .filter((persona) => ownedSet.has(persona.code))
      .sort((a, b) => {
        if (a.code === current.code) return -1;
        if (b.code === current.code) return 1;
        if (a.code === primaryCode) return -1;
        if (b.code === primaryCode) return 1;
        return ownedCodes.indexOf(a.code) - ownedCodes.indexOf(b.code);
      });
    ownedShowcase.innerHTML = ownedPersonas.map((persona) => {
      const isCurrent = persona.code === current.code;
      const isPrimary = persona.code === primaryCode;
      const skins = skinCatalogWithOwnership(persona);
      const ownedSkinsForPersona = skins.filter((skin) => skin.status === "owned").length;
      const skin = equippedSkinFor(persona);
      const status = isCurrent ? "当前" : isPrimary ? "主类型" : "已收集";
      return `
        <button class="${isCurrent ? "is-current" : ""} ${isPrimary ? "is-primary-persona" : ""}" type="button" data-collection-code="${persona.code}" aria-label="查看 ${personaDisplayCode(persona)} ${persona.title} ${status}">
          <img src="${skin.art || persona.skinArt}" alt="" aria-hidden="true">
          <span>${status}</span>
          <strong>${personaDisplayCode(persona)}</strong>
          <b>${persona.title}</b>
          <em>${skin.name} · ${ownedSkinsForPersona}/${skins.length}</em>
        </button>
      `;
    }).join("");
  }

  if (seriesMap) {
    seriesMap.innerHTML = seriesCards.map((persona) => {
      const isOwned = ownedSet.has(persona.code);
      const isCurrent = persona.code === current.code;
      const displayCode = personaDisplayCode(persona);
      return `
        <button class="${isOwned ? "is-owned" : ""} ${isCurrent ? "is-current" : ""}" type="button" data-series-code="${persona.code}" aria-label="查看 ${displayCode} ${persona.title}">
          <img src="${persona.avatar}" alt="" aria-hidden="true">
          <span>${displayCode}</span>
          <b>${persona.title}</b>
          <em>${isCurrent ? "当前" : isOwned ? "已收集" : "待解锁"}</em>
        </button>
      `;
    }).join("");
  }

  if (collectionGrid) {
    collectionGrid.innerHTML = personas.map((persona) => {
      const isOwned = ownedSet.has(persona.code);
      const isPrimary = persona.code === primaryCode;
      const isCurrent = persona.code === current.code;
      const displayCode = personaDisplayCode(persona);
      const mark = isOwned ? "✓" : "?";
      const status = isCurrent && isPrimary ? "当前主类型" : isCurrent ? "当前" : isPrimary ? "主类型" : isOwned ? "已收集" : "待解锁";
      return `
        <button class="${isOwned ? "is-owned" : ""} ${isPrimary ? "is-primary-persona" : ""} ${isCurrent ? "is-current" : ""}" type="button" data-collection-code="${persona.code}" aria-label="${displayCode} ${persona.title} ${status}">
          <img src="${persona.avatar}" alt="" aria-hidden="true">
          <b>${mark}</b>
          <span>${displayCode}</span>
          <em>${persona.title} · ${status}</em>
        </button>
      `;
    }).join("");
  }

  if (skinShelf) {
    const chaseIndex = nextChaseSkinIndex(currentSkins);
    const chaseSkin = currentSkins[chaseIndex] || currentSkins[0];
    const chaseDepth = chaseSkin ? skinDepthFor(current, chaseSkin) : null;
    if (skinChase && chaseSkin && chaseDepth) {
      skinChase.dataset.skinIndex = String(chaseIndex);
      skinChase.classList.toggle("is-owned", chaseSkin.status === "owned");
      bindImage("skinChaseArt", chaseSkin.art, `${chaseSkin.name} 皮肤预览`);
      bindText("skinChaseName", `${chaseSkin.name} · ${chaseSkin.rarity || current.rank}`);
      bindText("skinChaseText", chaseDepth.collect);
    }
    skinShelf.innerHTML = currentSkins.map((skin, index) => `
      <article class="${skin.status === "owned" ? "is-owned" : "is-locked"} ${skin.equipped ? "is-equipped" : ""}" data-skin-index="${index}" role="button" tabindex="0" aria-label="预览 ${skin.name} 皮肤">
        <img src="${skin.art}" alt="" aria-hidden="true">
        ${skin.equipped ? "<i>装备中</i>" : ""}
        <div>
          <b>${skin.rarity || (index === 0 ? current.rank : "R")}</b>
          <strong>${skin.name}</strong>
          <span>${skin.equipped ? "已装备" : skin.status === "owned" ? "已拥有" : "预览未解锁"}</span>
        </div>
      </article>
    `).join("");
  }

  collectionGrid?.querySelectorAll("[data-collection-code]").forEach((node) => {
    const code = node.dataset.collectionCode;
    const persona = personas.find((item) => item.code === code);
    const isOwned = ownedSet.has(code);
    const isPrimary = code === primaryCode;
    const isCurrent = code === current.code;
    node.classList.toggle("is-owned", isOwned);
    node.classList.toggle("is-primary-persona", isPrimary);
    node.classList.toggle("is-current", isCurrent);
    const mark = node.querySelector("b");
    const label = node.querySelector("span");
    const meta = node.querySelector("em");
    if (mark) mark.textContent = isOwned ? "✓" : "?";
    if (label && persona) label.textContent = personaDisplayCode(persona);
    if (meta && persona) meta.textContent = `${persona.title} · ${isCurrent && isPrimary ? "当前主类型" : isCurrent ? "当前" : isPrimary ? "主类型" : isOwned ? "已收集" : "待解锁"}`;
  });

  document.querySelector(".owned-skin-card")?.classList.toggle("is-new", ownedSet.has(current.code));
  document.querySelector(".owned-skin-card")?.classList.toggle("is-primary-persona", currentIsPrimary);
}

function lineupCardsFor(persona) {
  const ownedSet = new Set(ownedCodes);
  const candidates = [
    persona,
    ...personas.filter((item) => item.series === persona.series && item.code !== persona.code),
    ...personas.filter((item) => ownedSet.has(item.code) && item.code !== persona.code),
    ...personas.filter((item) => item.code !== persona.code)
  ];
  const seen = new Set();
  return candidates.filter((item) => {
    if (seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  }).slice(0, 4);
}

function renderLineup() {
  if (!lineupGrid) return;
  const current = currentPersona();
  const classes = ["gold featured", "cyan tilt-left", "pink tilt-right", "green"];
  lineupGrid.innerHTML = lineupCardsFor(current).map((persona, index) => {
    const isCurrent = persona.code === current.code;
    const cardClass = classes[index] || "green";
    const note = isCurrent ? "我的测试结果，适合直接分享给朋友。" : `朋友也可能是：${persona.title}`;
    return `
      <article class="persona-card ${cardClass}">
        <div class="card-head"><span>${persona.typeId}</span><b>${personaDisplayCode(persona)}</b></div>
        <img class="visual-avatar persona-avatar" src="${persona.avatar}" alt="${personaDisplayCode(persona)} 人格形象">
        <h3>${personaDisplayCode(persona)}</h3>
        <h4>${persona.title}</h4>
        <p>${note}</p>
      </article>
    `;
  }).join("");
}

function detailTags(persona, isOwned) {
  const status = isOwned ? "已收集" : "未解锁";
  return [persona.series, persona.rank, persona.rarity, status];
}

function detailItems(persona, isOwned) {
  const hotTake = hotTakeFor(persona);
  const dynamicEvidence = evidenceFromProfile(persona);
  const proofPath = proofPathFor(persona);
  const productProfile = productProfileFor(persona);
  const triggerText = personaTriggerText(persona);
  if (isOwned) {
    return [
      { label: "身份宣言", text: hotTake.identityClaim },
      { label: "一句话判定", text: hotTake.verdict },
      { label: "命名解释", text: productProfile.nameLogic },
      { label: "点歌信号", text: productProfile.songSignals },
      { label: "点歌触发器", text: triggerText },
      { label: "人格定位", text: productProfile.position },
      { label: "朋友会怎么说", text: productProfile.social },
      { label: "反向弱点", text: hotTake.weakness },
      { label: "命中证据", text: dynamicEvidence.text || persona.evidence },
      { label: "画像排名", text: proofPath.rankText },
      { label: "皮肤设定", text: persona.skinLore },
      { label: "可玩点", text: productProfile.play }
    ];
  }
  return [
    { label: "未解锁", text: `还没抽到 ${personaLabel(persona)}。` },
    { label: "命名解释", text: productProfile.nameLogic },
    { label: "点歌信号", text: productProfile.songSignals },
    { label: "点歌触发器", text: triggerText },
    { label: "人格定位", text: productProfile.position },
    { label: "解锁提示", text: persona.unlockHint },
    { label: "卡片预告", text: persona.hook },
    { label: "人格系别", text: `${persona.series} · ${persona.rank}` }
  ];
}

function detailHighlights(persona, isOwned) {
  const deepRead = deepReadFor(persona);
  if (!isOwned) {
    return [
      {
        label: "人格预告",
        title: persona.title,
        text: productProfileFor(persona).position
      },
      {
        label: "解锁后可看",
        title: "为什么像你",
        text: deepRead.cause
      },
      {
        label: "适合发给",
        title: "等朋友对号入座",
        text: deepRead.target
      }
    ];
  }
  return [
    {
      label: "成因",
      title: "为什么是你",
      text: deepRead.cause
    },
    {
      label: "反差",
      title: "别人没看懂的你",
      text: deepRead.contrast
    },
    {
      label: "发给谁",
      title: "最容易被戳中的人",
      text: deepRead.target
    }
  ];
}

function skinsForPersona(persona) {
  return skinCatalog[persona.code] || defaultSkinsForPersona(persona);
}

function skinDepthFor(persona, skin) {
  const depth = skinDepthProfiles[persona.code]?.[skin.name];
  return depth || {
    branch: skin.tagline || persona.skinLore,
    scene: productProfileFor(persona).social,
    collect: productProfileFor(persona).play,
    unlock: "继续再测同一人格，有机会补齐这套皮肤。"
  };
}

function nextChaseSkinIndex(skins) {
  const lockedIndex = skins.findIndex((skin) => skin.status !== "owned");
  return lockedIndex >= 0 ? lockedIndex : Math.max(0, skins.findIndex((skin) => !skin.equipped));
}

function dropSummaryFor(persona, skinDrop, wasOwnedBefore, ownedSkinCount, totalSkinCount) {
  const skinName = skinDrop?.name || equippedSkinFor(persona)?.name || persona.skinName;
  if (!wasOwnedBefore) {
    return {
      state: "NEW CARD",
      headline: `${personaDisplayCode(persona)} 新人格已入库`,
      detail: `首张卡面「${skinName}」已自动装备，当前皮肤 ${ownedSkinCount}/${totalSkinCount}。`
    };
  }
  if (skinDrop?.isNew) {
    return {
      state: "NEW SKIN",
      headline: `补到 ${personaDisplayCode(persona)} 新皮肤`,
      detail: `「${skinName}」已加入档案库，可直接生成新的分享图。`
    };
  }
  return {
    state: "EQUIPPED",
    headline: `${personaDisplayCode(persona)} 当前卡面已确认`,
    detail: `已装备「${skinName}」，继续再测有机会补齐剩余皮肤。`
  };
}

function resultRoleFor(persona, wasOwnedBefore) {
  if (wasOwnedBefore) {
    return {
      label: "已有人格回访",
      note: `${personaDisplayCode(persona)} 已在档案库中，本次用于补皮肤、换卡面和生成分享图。`
    };
  }
  if (persona.code === primaryPersonaCode) {
    return {
      label: "你的主类型",
      note: "首次命中会作为你的主类型，后续开卡用于扩展人格宇宙。"
    };
  }
  return {
    label: "本次扩展卡",
    note: "历史点唱画像不变，本次是在主类型之外补齐新人格和关系组合。"
  };
}

function statWidth(value) {
  const number = Number(String(value || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(number)) return 62;
  return Math.max(12, Math.min(100, number));
}

function setModalContent({
  kicker,
  title,
  images = [],
  tags = [],
  skins = [],
  items = [],
  insight = "",
  highlights = [],
  proofStats = [],
  skinOwnerCode = "",
  activeSkinIndex = 0,
  action = "知道了",
  actionMode = "close",
  actionCode = "",
  actionSkin = ""
}) {
  if (modalKicker) modalKicker.textContent = kicker;
  if (modalTitle) modalTitle.textContent = title;
  if (modalPreview) {
    modalPreview.innerHTML = `
      <div class="modal-hero-art">
        ${images.map((src, index) => (
          `<img class="${index === 0 ? "is-card" : "is-avatar"}" src="${src}" alt="" aria-hidden="true">`
        )).join("")}
      </div>
      ${highlights.length ? `
        <section class="modal-highlights" aria-label="人格档案速读">
          ${highlights.slice(0, 3).map((item) => `
            <article>
              <span>${item.label}</span>
              <b>${item.title}</b>
              <p>${item.text}</p>
            </article>
          `).join("")}
        </section>
      ` : ""}
      ${insight ? `<section class="modal-insight"><span>IDENTITY CLAIM</span><strong>${insight}</strong></section>` : ""}
      ${proofStats.length ? `
        <section class="modal-proof" aria-label="命中证据">
          ${proofStats.slice(0, 3).map(([value, label]) => `
            <div>
              <span>${label}</span>
              <b>${value}</b>
              <i style="--proof:${statWidth(value)}%"></i>
            </div>
          `).join("")}
        </section>
      ` : ""}
      <div class="modal-tags">
        ${tags.map((tag) => `<span>${tag}</span>`).join("")}
      </div>
      <section class="skin-vault" aria-label="人格皮肤库">
        <p>人格皮肤库</p>
        <div>
          ${skins.map((skin, index) => `
            <article
              class="${skin.status === "owned" ? "is-owned" : "is-locked"} ${skin.equipped ? "is-equipped" : ""} ${index === activeSkinIndex ? "is-active" : ""}"
              role="button"
              tabindex="0"
              data-modal-skin-index="${index}"
              data-modal-skin-owner="${skinOwnerCode}"
              aria-label="预览 ${skin.name} 皮肤"
            >
              <img src="${skin.art}" alt="" aria-hidden="true">
              <span>${skin.name}<em>${skin.equipped ? "已装备" : skin.status === "owned" ? "已拥有" : "预览"}</em></span>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }
  if (modalList) {
    modalList.innerHTML = items.map((item) => (
      `<li><b>${item.label}</b><span>${item.text}</span></li>`
    )).join("");
  }
  if (modalAction) {
    modalAction.textContent = action;
    modalAction.dataset.mode = actionMode;
    modalAction.dataset.code = actionCode;
    modalAction.dataset.skin = actionSkin;
  }
}

function openCardDetail(code) {
  const normalized = normalizeCode(code);
  const persona = personas.find((item) => item.code === normalized) || currentPersona();
  const isOwned = ownedCodes.includes(persona.code);
  const dynamicEvidence = evidenceFromProfile(persona);
  setModalContent({
    kicker: isOwned ? "OWNED PERSONA CARD" : "LOCKED PERSONA CARD",
    title: personaLabel(persona),
    images: [persona.skinArt, persona.avatar],
    tags: detailTags(persona, isOwned),
    skins: skinCatalogWithOwnership(persona),
    insight: hotTakeFor(persona).identityClaim,
    highlights: detailHighlights(persona, isOwned),
    proofStats: dynamicEvidence.stats || persona.evidenceStats || [],
    skinOwnerCode: persona.code,
    items: detailItems(persona, isOwned),
    action: isOwned ? "生成分享图" : "再测一次",
    actionMode: isOwned ? "share" : "retry"
  });
  setModal(true);
  track("card_detail_open", { code: persona.code, owned: isOwned });
}

function openPersonaSkinPreview(code, index) {
  const persona = personaByCode(code) || currentPersona();
  const skins = skinCatalogWithOwnership(persona);
  const skin = skins[Number(index)] || skins[0];
  if (!skin) return;
  lastSkinPreview = skin.name;
  const isOwned = skin.status === "owned";
  const isEquipped = Boolean(skin.equipped);
  const dynamicEvidence = evidenceFromProfile(persona);
  const skinDepth = skinDepthFor(persona, skin);
  setModalContent({
    kicker: isOwned ? "OWNED SKIN" : "LOCKED SKIN PREVIEW",
    title: `${skin.name} · ${personaLabel(persona)}`,
    images: [skin.art, persona.avatar],
    tags: [persona.series, skin.rarity || persona.rank, isEquipped ? "已装备" : isOwned ? "已拥有" : "未解锁"],
    skins: skins,
    insight: skinDepth.branch,
    proofStats: dynamicEvidence.stats || persona.evidenceStats || [],
    skinOwnerCode: persona.code,
    activeSkinIndex: Math.max(0, skins.indexOf(skin)),
    items: [
      { label: "皮肤状态", text: isEquipped ? "这张皮肤正在作为你的当前人格卡面。" : isOwned ? "这张皮肤已在你的档案库里，可以一键装备后生成分享图。" : "这张皮肤还没解锁，但可以先预览卡面。" },
      { label: "人格分支", text: skinDepth.branch },
      { label: "出现时刻", text: skinDepth.scene },
      { label: "收藏理由", text: skinDepth.collect },
      { label: "解锁方式", text: isOwned ? "继续再测同一人格，可以补齐剩余皮肤分支。" : skinDepth.unlock }
    ],
    action: isEquipped ? "生成分享图" : isOwned ? "装备这张" : "再测一次",
    actionMode: isEquipped ? "share" : isOwned ? "equip" : "retry",
    actionCode: persona.code,
    actionSkin: skin.name
  });
  setModal(true);
  track("skin_preview_open", { code: persona.code, skin: skin.name, owned: isOwned });
}

function openSkinPreview(index) {
  openPersonaSkinPreview(currentPersona().code, index);
}

function renderEntryVariant() {
  const variant = entryVariants[entryVariant] || entryVariants.expose;
  const hasInvite = shouldRenderShareEntry();
  if (!hasInvite) invitedPersona = null;
  document.querySelectorAll("[data-share-only]").forEach((node) => {
    node.hidden = !hasInvite;
    node.dataset.shareReady = hasInvite ? "true" : "false";
  });
  const profile = readSingingProfile();
  const summaryParts = [
    ["快歌", profile.fastSongRatio],
    ["纯爱", profile.pureLoveRatio],
    ["受伤情歌", profile.hurtLoveRatio],
    ["流行热歌", profile.popSongRatio],
    ["合唱", profile.chorusRatio]
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([label]) => label);
  document.documentElement.classList.toggle("is-share-entry", hasInvite);
  document.body?.classList.toggle("is-share-entry", hasInvite);
  phoneShell?.classList.toggle("is-share-entry", hasInvite);
  bindText("entryEyebrow", variant.eyebrow);
  bindText("entryTitleTop", variant.titleTop);
  bindText("entryTitleHot", variant.titleHot);
  bindText("entrySubtitle", variant.subtitle);
  bindText("entryHook", variant.hook);
  bindText("entryQuestion", variant.question);
  bindText("entryCta", variant.cta);
  bindText("entryProfileSummary", `不是随机抽卡：你的${summaryParts.join("、")}偏好会决定人格卡`);
  bindText("entryMetricTempo", percentLabel(profile.fastSongRatio));
  bindText("entryMetricMood", percentLabel(profile.loveSongRatio));
  bindText("entryMetricChorus", percentLabel(profile.chorusRatio));
  if (hasInvite) {
    bindText("entrySubtitle", `测完生成你的卡，并自动算出你和 ${personaDisplayCode(invitedPersona)} 的关系卡`);
    bindText("entryQuestion", `${personaDisplayCode(invitedPersona)} 已在场，等你的卡入局`);
    bindText("entryCta", "生成我的卡并算关系");
    bindText("entryProfileSummary", `不是复制朋友结果：你的点唱画像会决定你和 ${personaDisplayCode(invitedPersona)} 的关系`);
    bindText("friendCode", personaDisplayCode(invitedPersona));
    bindText("friendTitle", invitedPersona.title);
    bindText("sharePromiseFriend", `${personaDisplayCode(invitedPersona)} 已带入`);
    bindText("sharePromiseRelation", `算你和 ${personaDisplayCode(invitedPersona)}`);
    bindText("entryRelayTitle", `测出你的卡，和 ${personaDisplayCode(invitedPersona)} 生成关系`);
    bindText("entryRelayA", `${personaDisplayCode(invitedPersona)} 已带入`);
    bindText("entryRelayB", "你的卡待生成");
    bindText("entryRelayC", "关系卡自动入库");
    bindImage("friendAvatar", invitedPersona.avatar, `${invitedPersona.code} ${invitedPersona.title} 朋友的人格形象`);
  }
}

function renderRelationship() {
  const hasInvite = shouldRenderShareEntry();
  document.querySelectorAll("[data-friend-compare]").forEach((node) => {
    node.hidden = !hasInvite;
  });
  if (!hasInvite) return;

  const persona = currentPersona();
  const relation = relationshipFor(invitedPersona, persona);
  const playbook = relationPlaybookFor(invitedPersona, persona, relation);
  const activeView = document.querySelector(".view.is-active")?.dataset.view || "";
  if (activeView === "result") {
    rememberRelation(invitedPersona, persona);
  }
  bindText("relationName", relation.name);
  bindText("relationTitle", relation.title);
  bindText("relationText", relation.text);
  bindText("friendCompareCode", personaDisplayCode(invitedPersona));
  bindText("friendCompareTitle", invitedPersona.title);
  bindText("myCompareCode", personaDisplayCode(persona));
  bindText("myCompareTitle", persona.title);
  bindText("relationRevealStatus", activeView === "result" ? "关系卡已入库" : "测完生成关系卡");
  bindText("relationBeatA", playbook.beats[0]?.text || `${personaDisplayCode(invitedPersona)} 已带入`);
  bindText("relationBeatB", playbook.beats[1]?.text || `${personaDisplayCode(persona)} 生成卡面`);
  bindText("relationBeatC", playbook.beats[2]?.text || "发给下一位朋友继续接力");
  bindImage("friendCompareAvatar", invitedPersona.avatar, `${invitedPersona.code} ${invitedPersona.title}`);
  bindImage("myCompareAvatar", persona.avatar, `${personaDisplayCode(persona)} ${persona.title}`);
}

function applyRemoteConfig(config) {
  if (!config || config.enabled === false) return;
  remoteConfig = {
    ...remoteConfig,
    ...config,
    experiment: { ...remoteConfig.experiment, ...(config.experiment || {}) },
    copy: { ...remoteConfig.copy, ...(config.copy || {}) },
    growth: { ...remoteConfig.growth, ...(config.growth || {}) }
  };

  const remoteVariant = remoteConfig.experiment.entryVariant;
  if (!params.has("variant") && entryVariants[remoteVariant]) {
    entryVariant = remoteVariant;
    window.localStorage.setItem("ktv-entry-variant", entryVariant);
  }

  const copy = remoteConfig.copy || {};
  Object.entries({
    eyebrow: "entryEyebrow",
    titleTop: "entryTitleTop",
    titleHot: "entryTitleHot",
    subtitle: "entrySubtitle",
    cta: "entryCta"
  }).forEach(([key, bindName]) => {
    if (copy[key]) bindText(bindName, copy[key]);
  });
  renderEntryVariant();
}

async function loadRemoteConfig() {
  if (window.location.protocol === "file:") return;
  try {
    const response = await fetch(`/api/config?t=${Date.now()}`, {
      headers: { accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return;
    applyRemoteConfig(await response.json());
    track("remote_config_loaded", { version: remoteConfig.version || "" });
  } catch {
    // Static preview and offline mode intentionally fall back to local defaults.
  }
}

function renderEntryPreview() {
  bindText("entryPreviewCode", "???");
  bindText("entryPreviewTitle", "人格待生成");
  bindText("entryPreviewHint", "读取历史点唱 · 结果页揭晓");
  bindImage("entryAvatar", "./assets/visuals/ui-scan-mic-orb.png", "待生成的人格卡");
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1500);
}

function track(name, detail = {}) {
  const event = {
    name,
    detail,
    persona: currentPersona().code,
    variant: entryVariant,
    context,
    at: new Date().toISOString()
  };
  events = [event, ...events].slice(0, 80);
  window.localStorage.setItem("ktv-events", JSON.stringify(events));
  postEvent(event);
  renderOps();
}

function eventCount(name) {
  return events.filter((event) => event.name === name).length;
}

function renderOps() {
  if (!opsPanel?.classList.contains("is-visible")) return;
  document.querySelectorAll("[data-ops]").forEach((node) => {
    node.textContent = eventCount(node.dataset.ops);
  });
  if (!opsLog) return;
  opsLog.innerHTML = events.slice(0, 8).map((event) => {
    const time = new Date(event.at).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    return `<li>${time} · ${event.name} · ${event.persona}</li>`;
  }).join("");
}

function renderPersona() {
  const persona = currentPersona();
  const hotTake = hotTakeFor(persona);
  const socialProof = socialProofFor(persona);
  const deepRead = deepReadFor(persona);
  const owned = Math.min(ownedCount(), totalCards);
  const typePosition = personas.findIndex((item) => item.code === persona.code) + 1;
  const seriesCards = personas.filter((item) => item.series === persona.series);
  const ownedSet = new Set(ownedCodes);
  const ownedSeries = seriesCards.filter((item) => ownedSet.has(item.code)).length;
  const seriesTotal = seriesCards.length;
  const currentSkins = skinCatalogWithOwnership(persona);
  const ownedSkinCount = currentSkins.filter((skin) => skin.status === "owned").length;
  const equippedSkin = equippedSkinFor(persona);
  const skinDrop = lastSkinDrop?.code === persona.code ? lastSkinDrop : null;
  const dropName = skinDrop?.name || persona.skinName;
  const dropSummary = dropSummaryFor(persona, skinDrop, lastPersonaWasOwned, ownedSkinCount, currentSkins.length);
  const resultRole = resultRoleFor(persona, lastPersonaWasOwned);
  const relationContext = currentRelationContext();
  const relation = relationContext?.relation || null;
  const dynamicEvidence = evidenceFromProfile(persona);
  const proofPath = proofPathFor(persona);
  const runnerUp = runnerUpFor(persona);
  const runnerHook = shareRunnerUpHook(persona);
  const leadProof = proofPath.items?.[0] || { axis: "画像", percent: 0 };
  const rollReason = rollReasonFor(persona, proofPath, lastPersonaWasOwned);

  bindText("code", personaDisplayCode(persona));
  bindText("title", persona.title);
  bindText("desc", persona.desc);
  bindText("skinName", equippedSkin?.name || persona.skinName);
  bindText("rank", persona.rank);
  bindText("rarity", persona.rarity);
  bindText("drop", `本次掉落：${dropName}`);
  bindText("dropState", dropSummary.state);
  bindText("dropHeadline", dropSummary.headline);
  bindText("dropDetail", dropSummary.detail);
  bindText("resultRoleLabel", resultRole.label);
  bindText("resultRoleNote", resultRole.note);
  bindText("typeCount", `${typePosition}/${totalCards}`);
  bindText("roundLabel", `${personaDisplayCode(persona)} · 第 ${scanCount} 次`);
  bindText(
    "skinDesc",
    skinDrop?.isNew
      ? `${personaDisplayCode(persona)} 新皮肤「${dropName}」已入库，当前皮肤 ${ownedSkinCount}/${currentSkins.length}`
      : `${personaDisplayCode(persona)} 当前装备「${equippedSkin?.name || persona.skinName}」，皮肤 ${ownedSkinCount}/${currentSkins.length}`
  );
  bindText("ownedCount", `人格 ${owned}/${totalCards}`);
  bindText("nextDrop", persona.nextDrop);
  bindText("archiveText", `${personaLabel(persona)} 已入库。下一次测试，再抽一张新人格`);
  bindText("seriesProgress", `${persona.series} ${ownedSeries}/${seriesTotal}`);
  bindText("skinProgress", `皮肤 ${ownedSkinCount}/${currentSkins.length}`);
  bindText("librarySummary", `已收集 ${owned} 张人格`);
  bindText("typeId", persona.typeId);
  bindText("ownedMeta", `第 ${scanCount} 次解锁 · ${persona.title}`);
  bindText("seriesName", `${persona.series} 人格`);
  bindText("seriesCount", `${ownedSeries}/${seriesTotal}`);
  bindText("sharePosterKicker", relation ? "你们的 KTV 关系" : "我的 KTV 人格卡");
  bindText("posterCaption", relation ? `${relation.name} · ${personaDisplayCode(relationContext.friend)} × ${personaDisplayCode(relationContext.mine)}` : `${personaLabel(persona)} 已生成`);
  bindText("shareCardFaceLabel", relation ? "当前分享关系图" : "当前分享卡面");
  bindText(
    "shareCardFaceText",
    relation
      ? `${personaDisplayCode(relationContext.friend)} × ${personaDisplayCode(relationContext.mine)} · ${relation.name}`
      : `装备皮肤：${equippedSkin?.name || persona.skinName} · ${ownedSkinCount}/${currentSkins.length}${runnerHook ? ` · 差点：${runnerHook}` : ""}`
  );
  bindText("shareTitle", relation ? "关系卡已生成" : "人格分享图已生成");
  bindText(
    "shareText",
    relation
      ? `你和朋友测出「${relation.name}」：${relation.title}。继续发给下一位朋友，他入局后会按自己的唱歌画像重算新关系。`
      : `${trimSentenceEnd(socialProof.roast)}${runnerHook ? `。${runnerHook}，也差点命中你。` : "。"}保存或复制你的 KTV 人格卡，发出去就能展示本次抽卡结果。`
  );
  bindText("shareRouteLabel", relation ? "接力入口已带上你俩的关系" : "我的人格卡已生成");
  bindText(
    "shareRouteText",
    relation ? "下一位朋友点开不是围观，会测自己的卡，并重算他和你的 KTV 关系。" : "保存图片或复制链接，分享你的 KTV 人格结果。"
  );
  bindText("shareLoopKicker", relation ? "RELATION LOOP" : "SHARE LOOP");
  bindText("shareLoopA", relation ? "下一位朋友加入这局" : "朋友点开测自己");
  bindText("shareLoopB", relation ? "按他的画像重算关系" : "你的卡自动带入");
  bindText("shareLoopC", relation ? "新关系继续接力" : "生成你俩关系卡");
  bindText("relayTicketKicker", relation ? "关系接力凭证" : "朋友入口凭证");
  bindText(
    "relayTicketTitle",
    relation
      ? `${relation.name} 已生成，下一位朋友加入后会重算新关系`
      : `${personaDisplayCode(persona)} 已带入，朋友测完会生成他自己的卡`
  );
  bindText("relayTicketA", relation ? `${personaDisplayCode(relationContext.friend)} × ${personaDisplayCode(relationContext.mine)}` : `${personaDisplayCode(persona)} 已带入`);
  bindText("relayTicketB", relation ? "下一位测自己" : "朋友测自己");
  bindText("relayTicketC", relation ? "新关系继续接力" : "关系卡自动入库");
  bindText("shareReadyRoute", relation ? "关系已带入" : `${personaDisplayCode(persona)} 已带入`);
  bindText("shareReadyFriend", relation ? "下一位测自己" : "朋友测自己的卡");
  bindText("shareReadyReward", relation ? "新关系接力" : "关系卡入库");
  setShareReadyStatus("准备好了，复制入口或系统分享都可以。");
  bindText("shareProofKicker", relation ? "RELATION HOOK" : "SHARE HOOK");
  bindText("shareChallengeKicker", relation ? "RELATION RELAY" : "FRIEND CHALLENGE");
  bindText("shareChallengeTitle", relation ? "让下一位朋友加入这局" : "让朋友入局，测你们俩的 KTV 关系");
  bindText(
    "shareChallengeText",
    relation ? "他测完不是围观关系图，而是生成自己的卡，再和你的卡重算新关系。" : "他测完不是复制你的结果，而是生成自己的卡，再和你的卡配成关系。"
  );
  bindText("shareChallengeOtherCode", relation ? personaDisplayCode(relationContext.friend) : "???");
  bindText("matchPill", persona.match);
  bindText("signature", persona.signature);
  bindText("identityClaim", hotTake.identityClaim);
  bindText("ahaLineA", `${personaDisplayCode(persona)}：${compactResultText(hotTake.verdict, 26)}`);
  bindText("ahaLineB", `朋友会说：${compactResultText(relation ? relation.title : socialProof.roast, 24)}`);
  bindText("ahaLineC", `命中证据：${leadProof.axis} ${leadProof.percent}%`);
  bindText("readCause", deepRead.cause);
  bindText("readContrast", deepRead.contrast);
  bindText("readTarget", deepRead.target);
  bindText("verdict", hotTake.verdict);
  bindText("weakness", hotTake.weakness);
  bindText("shareHook", relation ? `${relation.name}：${relation.title}` : hotTake.shareHook);
  bindText("friendRoast", relation ? relation.title : socialProof.roast);
  bindText("friendCue", relation ? relation.text : runnerHook ? `${socialProof.cue} 差点命中：${runnerHook}。` : socialProof.cue);
  bindText("evidenceText", dynamicEvidence.text || persona.evidence);
  bindText("proofPathTitle", proofPath.title);
  bindText("proofPathText", proofPath.text);
  bindText("proofRankText", proofPath.rankText);
  bindText("runnerUpTitle", runnerUp.title);
  bindText("runnerUpText", runnerUp.text);
  bindText("rollReasonText", rollReason);
  renderProofPath(proofPath);
  (dynamicEvidence.stats || persona.evidenceStats || []).slice(0, 3).forEach(([value, label], index) => {
    const key = ["A", "B", "C"][index];
    bindText(`evidenceValue${key}`, value);
    bindText(`evidenceLabel${key}`, label);
  });

  bindImage("avatar", persona.avatar, `${personaDisplayCode(persona)} 人格形象`);
  bindImage("skinArt", equippedSkin?.art || persona.skinArt);
  renderRelationship();
  renderCollection();
  renderLineup();
  updateRollButtons();
}

async function generateSharePoster() {
  const persona = currentPersona();
  const hotTake = hotTakeFor(persona);
  const dynamicEvidence = evidenceFromProfile(persona);
  const relationContext = currentRelationContext();
  const relation = relationContext?.relation || null;
  const friendPersona = relationContext?.friend || null;
  const minePersona = relationContext?.mine || persona;
  const runnerHook = shareRunnerUpHook(persona);
  const currentSkins = skinCatalogWithOwnership(persona);
  const ownedSkinCount = currentSkins.filter((skin) => skin.status === "owned").length;
  const equippedSkin = equippedSkinFor(persona);
  const skinDrop = lastSkinDrop?.code === persona.code ? lastSkinDrop : null;
  const dropName = skinDrop?.name || equippedSkin?.name || persona.skinName;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d");
  const [avatar, skin, friendAvatar] = await Promise.all([
    loadImage(minePersona.avatar),
    loadImage(equippedSkin?.art || persona.skinArt),
    friendPersona ? loadImage(friendPersona.avatar) : Promise.resolve(null)
  ]);

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "#11001a");
  bg.addColorStop(.38, "#211036");
  bg.addColorStop(1, "#05020b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = .72;
  ctx.strokeStyle = "rgba(255, 68, 203, .55)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-80, 330);
  ctx.bezierCurveTo(210, 210, 400, 520, 740, 310);
  ctx.bezierCurveTo(900, 210, 1040, 260, 1160, 210);
  ctx.stroke();
  ctx.strokeStyle = "rgba(53, 240, 255, .45)";
  ctx.beginPath();
  ctx.moveTo(-70, 520);
  ctx.bezierCurveTo(220, 410, 470, 670, 780, 500);
  ctx.bezierCurveTo(930, 420, 1030, 460, 1150, 390);
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < 42; i += 1) {
    const x = (i * 97) % canvas.width;
    const y = 58 + ((i * 149) % 1160);
    ctx.fillStyle = i % 3 === 0 ? "rgba(255, 213, 91, .75)" : "rgba(53, 240, 255, .62)";
    ctx.beginPath();
    ctx.arc(x, y, i % 4 === 0 ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const haze = ctx.createLinearGradient(0, 0, 0, canvas.height);
  haze.addColorStop(0, "rgba(255, 56, 200, .08)");
  haze.addColorStop(.5, "rgba(10, 4, 24, .08)");
  haze.addColorStop(1, "rgba(6, 2, 14, .74)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  drawRoundRect(ctx, 94, 350, 892, 520, 68);
  ctx.clip();
  coverImage(ctx, skin, 94, 350, 892, 520);
  ctx.restore();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255, 213, 91, .56)";
  drawRoundRect(ctx, 94, 350, 892, 520, 68);
  ctx.stroke();

  if (relation && friendAvatar) {
    ctx.save();
    drawRoundRect(ctx, 108, 118, 188, 188, 94);
    ctx.clip();
    coverImage(ctx, friendAvatar, 108, 118, 188, 188);
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255, 213, 91, .78)";
    drawRoundRect(ctx, 108, 118, 188, 188, 94);
    ctx.stroke();

    ctx.save();
    drawRoundRect(ctx, 784, 118, 188, 188, 94);
    ctx.clip();
    coverImage(ctx, avatar, 784, 118, 188, 188);
    ctx.restore();
    ctx.strokeStyle = "rgba(53, 240, 255, .78)";
    drawRoundRect(ctx, 784, 118, 188, 188, 94);
    ctx.stroke();

    ctx.fillStyle = "rgba(8, 4, 18, .78)";
    drawRoundRect(ctx, 350, 168, 380, 88, 44);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "1000 38px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(`${personaDisplayCode(friendPersona)}  ×  ${personaDisplayCode(minePersona)}`, 540, 186);
  } else {
    ctx.save();
    drawRoundRect(ctx, 748, 106, 196, 196, 98);
    ctx.clip();
    coverImage(ctx, avatar, 748, 106, 196, 196);
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(53, 240, 255, .72)";
    drawRoundRect(ctx, 748, 106, 196, 196, 98);
    ctx.stroke();
  }

  const cardX = 82;
  const cardY = 910;
  const cardW = 916;
  const cardH = 400;
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 54);
  const cardGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGradient.addColorStop(0, "rgba(255, 79, 190, .72)");
  cardGradient.addColorStop(.45, "rgba(255, 224, 86, .42)");
  cardGradient.addColorStop(1, "rgba(48, 240, 255, .68)");
  ctx.fillStyle = cardGradient;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 255, 255, .28)";
  ctx.stroke();

  drawRoundRect(ctx, cardX + 22, cardY + 22, cardW - 44, cardH - 44, 42);
  ctx.fillStyle = "rgba(8, 4, 18, .82)";
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "900 46px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(relation ? "我俩的 KTV 关系" : "我的 KTV 人格", 82, 82);

  ctx.fillStyle = "#ffe15d";
  ctx.font = relation ? "1000 92px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" : "1000 126px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(relation ? relation.name : personaDisplayCode(persona), 78, relation ? 142 : 146);

  ctx.fillStyle = "#35f0ff";
  ctx.font = "1000 44px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(relation ? `${relation.title}` : `${persona.typeId} · ${persona.rank} · ${persona.rarity}`, 88, 292);

  ctx.fillStyle = "#fff";
  ctx.font = "1000 70px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(relation ? "关系卡已生成" : persona.title, cardX + 58, cardY + 66);

  ctx.fillStyle = "#35f0ff";
  ctx.font = "1000 38px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(relation ? `${personaDisplayCode(friendPersona)} × ${personaDisplayCode(minePersona)} · 接力入口已生成` : `皮肤：${dropName} · ${ownedSkinCount}/${currentSkins.length}${runnerHook ? " · 差点命中" : ""}`, cardX + 60, cardY + 152);

  ctx.fillStyle = "rgba(255,255,255,.82)";
  ctx.font = "900 34px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  wrapText(ctx, relation ? relation.text : runnerHook ? `${hotTake.identityClaim} 差点命中：${runnerHook}。` : hotTake.identityClaim, cardX + 60, cardY + 214, 790, 48, 2);

  const loopSteps = relation
    ? ["朋友加入这局", "测出自己的卡", "新关系继续接力"]
    : ["朋友点开测自己", "自动算你俩关系", "关系卡回到档案库"];
  drawRoundRect(ctx, cardX + 52, cardY + 292, cardW - 104, 92, 28);
  ctx.fillStyle = "rgba(255, 255, 255, .09)";
  ctx.fill();
  ctx.fillStyle = "#ffe15d";
  ctx.font = "900 24px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(relation ? "RELATION LOOP" : "SHARE LOOP", cardX + 76, cardY + 312);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 28px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(loopSteps.join("  →  "), cardX + 76, cardY + 346);

  ctx.fillStyle = "rgba(8, 4, 18, .72)";
  drawRoundRect(ctx, 90, 1322, 900, 78, 39);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "1000 32px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(relation ? "点开加入这局，看看你和我是什么关系" : "点开测你的 KTV 人格，看看我们是什么关系", 540, 1344);

  ctx.fillStyle = "rgba(255,255,255,.52)";
  ctx.font = "800 26px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText("KTV PERSONALITY UNIVERSE", 540, 1268);

  return canvas.toDataURL("image/png");
}

async function refreshSharePreview() {
  if (!sharePosterPreview) return;
  const persona = currentPersona();
  const relationContext = currentRelationContext();
  const posterKey = relationContext ? `${relationContext.friend.code}+${relationContext.mine.code}` : persona.code;
  if (previewPosterCode === posterKey && sharePosterPreview.dataset.generated === "true") return;
  sharePosterPreview.dataset.generated = "loading";
  try {
    const dataUrl = await generateSharePoster();
    sharePosterPreview.src = dataUrl;
    sharePosterPreview.dataset.generated = "true";
    sharePosterPreview.dataset.mode = relationContext ? "relation" : "persona";
    previewPosterCode = posterKey;
  } catch {
    sharePosterPreview.dataset.generated = "error";
  }
}

function setModal(open) {
  if (!modal) return;
  modal.classList.toggle("is-open", open);
  modal.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("modal-lock", open);
  if (open) {
    modal.querySelector(".modal-card")?.scrollTo({ top: 0 });
  }
}

async function rollPersonaFromServer() {
  const payload = await apiJson("/api/persona/roll", {
    method: "POST",
    body: JSON.stringify({
      profile: readSingingProfile(),
      currentCode: currentPersona().code
    })
  });
  quotaState = payload.quota || quotaState;
  applyArchiveState(payload.archive, quotaState);
  if (payload.skinDrop?.name) {
    lastSkinDrop = { code: normalizeCode(payload.code), ...payload.skinDrop };
    equippedSkins = normalizeEquippedSkins({ ...equippedSkins, [normalizeCode(payload.code)]: payload.skinDrop.name });
    saveEquippedSkins();
  }
  lastPersonaWasOwned = !payload.isNew;
  const index = personas.findIndex((persona) => persona.code === normalizeCode(payload.code));
  if (index >= 0) currentIndex = index;
  scanCount = Math.max(1, Number(payload.archive?.rollCount || scanCount));
  syncDemoState();
  renderPersona();
  updateRollButtons();
  return payload;
}

function rollPersonaLocally() {
  const historyCode = resolveHistoryPersonaCode();
  const preferredIndex = personas.findIndex((persona) => persona.code === historyCode);
  const firstScan = scanCount <= 1;
  const previousOwnedCodes = new Set(ownedCodes);
  if (firstScan && preferredIndex >= 0) {
    currentIndex = preferredIndex;
    preferredCode = historyCode;
  } else {
    const nextIndex = nextProfileCandidateIndex();
    currentIndex = nextIndex >= 0 ? nextIndex : ((currentIndex + 1) % personas.length);
  }
  scanCount += 1;
  const code = currentPersona().code;
  lastPersonaWasOwned = previousOwnedCodes.has(code);
  ensurePrimaryPersona(code);
  unlockLocalSkin(code, undefined, previousOwnedCodes.has(code));
  window.localStorage.setItem("ktv-persona-index", String(currentIndex));
  window.localStorage.setItem("ktv-scan-count", String(scanCount));
  renderPersona();
}

async function nextPersona() {
  if (rollInFlight) return false;
  if (serverMode && quotaRemaining() <= 0) {
    showToast(quotaExhaustedMessage());
    updateRollButtons();
    return false;
  }
  rollInFlight = true;
  try {
    if (serverMode) {
      await rollPersonaFromServer();
    } else {
      rollPersonaLocally();
    }
    return true;
  } catch (error) {
    if (error.payload?.error === "ROLL_QUOTA_EXHAUSTED") {
      quotaState = error.payload.quota || quotaState;
      showToast(quotaExhaustedMessage());
      updateRollButtons();
      return false;
    }
    if (!remoteApiRequired) {
      serverMode = false;
      rollPersonaLocally();
      return true;
    }
    showToast("服务端开卡暂时不可用，请稍后再试");
    return false;
  } finally {
    rollInFlight = false;
  }
}

function setPreferredPersona(code) {
  preferredCode = normalizeCode(code);
  window.localStorage.setItem("ktv-preferred-code", preferredCode);
  bindText("pickLabel", "历史点唱画像");
  renderEntryPreview();
}

function showView(name, pushHash = true) {
  views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === name);
  });

  if (pushHash && window.location.hash !== `#${name}`) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${name}`);
  }

  if (lastViewed !== name) {
    lastViewed = name;
    track(`${name}_view`);
  }

  if (name === "scan") {
    track("scan_start", { preferredCode });
    runScan();
  } else if (name === "result") {
    ensureCurrentOwned();
  } else if (name === "share") {
    refreshSharePreview();
  } else if (scanTimer) {
    window.clearInterval(scanTimer);
    scanTimer = null;
  }
}

window.__ktvDemo = {
  personas,
  relationshipFor,
  readSingingProfile,
  resolvePersonaFromSingingProfile,
  scoreProfileByPersona,
  showView,
  renderPersona,
  setPreferredPersona,
  resetDemoState,
  applyArchiveState,
  applyRemoteConfig
};

function runScan() {
  let step = 0;
  const profile = readSingingProfile();
  const scanMetricLabels = {
    tempo: `快歌 ${percentLabel(profile.fastSongRatio)}`,
    mood: `情歌 ${percentLabel(Math.max(profile.pureLoveRatio, profile.hurtLoveRatio, profile.loveSongRatio))}`,
    chorus: `合唱 ${percentLabel(profile.chorusRatio)}`,
    control: `控场 ${percentLabel(profile.controlRatio)}`
  };
  progressBar.style.width = "0%";
  scanLine.textContent = currentPersona().scan;
  document.querySelectorAll("[data-scan-code]").forEach((node) => {
    node.classList.remove("is-active", "is-final");
    node.textContent = scanMetricLabels[node.dataset.scanCode] || node.textContent;
  });

  scanTimer = window.setInterval(() => {
    step += 1;
    const text = scanTexts[Math.min(step, scanTexts.length - 1)];
    scanLine.textContent = step === 1 ? currentPersona().scan : text;
    progressBar.style.width = `${Math.min(step * 28, 100)}%`;
    const codeCount = document.querySelectorAll("[data-scan-code]").length || 1;
    document.querySelectorAll("[data-scan-code]").forEach((node, index) => {
      node.classList.toggle("is-active", index === (step - 1) % codeCount);
    });

    if (step >= 4) {
      window.clearInterval(scanTimer);
      scanTimer = null;
      document.querySelectorAll("[data-scan-code]").forEach((node) => {
        node.classList.remove("is-active");
        node.classList.add("is-final");
      });
      window.setTimeout(() => showView("result"), 260);
    }
  }, 460);
}

async function handleNextNavigation(button) {
  if (!button || button.disabled) return;
  const next = button.dataset.next;
  if (!next) return;
  if (isRollEntryButton(button) && serverMode && quotaRemaining() <= 0) {
    showToast(quotaExhaustedMessage());
    updateRollButtons();
    return;
  }
  if (next === "scan") {
    button.disabled = true;
    const canContinue = await nextPersona();
    button.disabled = false;
    if (!canContinue) return;
  } else if (next === "reward" || next === "equipped" || next === "archive") {
    ensureCurrentOwned();
  }
  const eventMap = {
    reward: "reward_claim",
    equipped: "skin_equip",
    archive: "archive_save",
    library: "library_open",
    lineup: "share_create",
    share: "share_create",
    entry: "retry_start"
  };
  if (eventMap[next]) {
    track(eventMap[next]);
  }
  showView(next);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-next]");
  if (!button) return;
  handleNextNavigation(button);
});

document.querySelector("[data-save-poster]")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "生成中";
  try {
    const persona = currentPersona();
    const dataUrl = await generateSharePoster();
    if (sharePosterPreview) {
      sharePosterPreview.src = dataUrl;
    }
    downloadDataUrl(dataUrl, `ktv-persona-${persona.code}.png`);
    await handleShareReward();
    try {
      await navigator.clipboard.writeText(shareMessage());
      track("copy_share_text");
      setShareReadyStatus("分享图已保存，人格卡链接已复制。");
      showToast("分享图已生成，人格卡链接已复制");
    } catch {
      setShareReadyStatus("分享图已保存，入口可继续用系统分享。");
      showToast("分享图已生成，可继续系统分享");
    }
    track("poster_save");
  } catch {
    showToast("生成失败，请再试一次");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});

document.querySelectorAll("[data-copy-text]").forEach((button) => {
  button.addEventListener("click", async () => {
  const text = shareMessage();
  try {
    await navigator.clipboard.writeText(text);
    track("copy_share_text");
    await handleShareReward();
    setShareReadyStatus("人格卡链接已复制，可直接发给朋友查看。");
    showToast("人格卡链接已复制");
  } catch {
    setShareReadyStatus("复制失败，可以改用系统分享。");
    showToast("当前环境无法复制，请用系统分享");
  }
  });
});

document.querySelector("[data-system-share]")?.addEventListener("click", async () => {
  const text = shareMessage();
  const url = sharePlayUrl();
  if (navigator.share) {
    try {
      await navigator.share({
        title: "KTV 人格测试",
        text,
        url
      });
      track("system_share");
      await handleShareReward();
      setShareReadyStatus("已调起系统分享，可展示你的人格卡。");
      showToast("已调起系统分享");
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    track("system_share_fallback");
    await handleShareReward();
    setShareReadyStatus("系统分享不可用，已改为复制人格卡链接。");
    showToast("已复制人格卡链接");
  } catch {
    setShareReadyStatus("当前环境不支持系统分享，请手动保存分享图。");
    showToast("当前环境不支持系统分享");
  }
});

document.querySelector("[data-close-modal]")?.addEventListener("click", () => {
  setModal(false);
});

modal?.addEventListener("click", (event) => {
  if (event.target === modal) {
    setModal(false);
    return;
  }
  const modalSkin = event.target.closest("[data-modal-skin-index]");
  if (modalSkin) {
    openPersonaSkinPreview(modalSkin.dataset.modalSkinOwner, modalSkin.dataset.modalSkinIndex);
  }
});

modal?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const modalSkin = event.target.closest("[data-modal-skin-index]");
  if (!modalSkin) return;
  event.preventDefault();
  openPersonaSkinPreview(modalSkin.dataset.modalSkinOwner, modalSkin.dataset.modalSkinIndex);
});

modalAction?.addEventListener("click", () => {
  const mode = modalAction?.dataset.mode || "close";
  if (mode === "share") {
    setModal(false);
    showView("lineup");
    return;
  }
  if (mode === "share-relation") {
    setModal(false);
    showView("share");
    track("relation_share_create", { key: modalAction.dataset.code || "" });
    return;
  }
  if (mode === "equip") {
    const didEquip = equipSkin(modalAction.dataset.code, modalAction.dataset.skin);
    if (didEquip) setModal(false);
    return;
  }
  if (mode === "retry") {
    setModal(false);
    showView("entry");
    return;
  }
  setModal(false);
});

relationVault?.addEventListener("click", (event) => {
  if (event.target.closest("[data-relation-empty-share]")) {
    track("relation_empty_share");
    return;
  }
  const card = event.target.closest("[data-relation-key]");
  if (!card) return;
  openRelationDetail(card.dataset.relationKey);
});

relationVault?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-relation-key]");
  if (!card) return;
  event.preventDefault();
  openRelationDetail(card.dataset.relationKey);
});

document.querySelector("[data-open-card-detail]")?.addEventListener("click", () => {
  openCardDetail(currentPersona().code);
});

document.querySelector("[data-open-card-detail]")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openCardDetail(currentPersona().code);
  }
});

document.querySelector("[data-result-skin-preview]")?.addEventListener("click", () => {
  openSkinPreview(0);
});

collectionGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-collection-code]");
  if (!button) return;
  openCardDetail(button.dataset.collectionCode);
});

collectionGrid?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const button = event.target.closest("[data-collection-code]");
  if (!button) return;
  event.preventDefault();
  openCardDetail(button.dataset.collectionCode);
});

ownedShowcase?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-collection-code]");
  if (!button) return;
  openCardDetail(button.dataset.collectionCode);
});

ownedShowcase?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const button = event.target.closest("[data-collection-code]");
  if (!button) return;
  event.preventDefault();
  openCardDetail(button.dataset.collectionCode);
});

seriesMap?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-series-code]");
  if (!button) return;
  openCardDetail(button.dataset.seriesCode);
});

seriesMap?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const button = event.target.closest("[data-series-code]");
  if (!button) return;
  event.preventDefault();
  openCardDetail(button.dataset.seriesCode);
});

skinShelf?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-skin-index]");
  if (!card) return;
  openSkinPreview(card.dataset.skinIndex);
});

skinShelf?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-skin-index]");
  if (!card) return;
  event.preventDefault();
  openSkinPreview(card.dataset.skinIndex);
});

skinChase?.addEventListener("click", () => {
  openSkinPreview(skinChase.dataset.skinIndex || 0);
});

document.querySelectorAll("[data-mission-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.missionAction;
    track("mission_action", { action });
    if (action === "route") {
      showToast("已准备再开一张人格卡");
    }
  });
});

document.querySelectorAll("[data-library-jump]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(`[data-library-section="${button.dataset.libraryJump}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    track("library_jump", { target: button.dataset.libraryJump });
  });
});

document.querySelector("[data-back-song]")?.addEventListener("click", () => {
  const url = safeBackUrl();
  if (!url) {
    showToast("演示入口未配置返回地址");
    track("back_song_missing");
    return;
  }
  track("back_song_click", { url });
  window.location.href = url;
});

document.querySelector("[data-reset-events]")?.addEventListener("click", () => {
  events = [];
  window.localStorage.setItem("ktv-events", JSON.stringify(events));
  renderOps();
  showToast("本地记录已清空");
});

document.querySelector("[data-export-events]")?.addEventListener("click", () => {
  if (events.length === 0) {
    showToast("暂无记录可导出");
    return;
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    persona: currentPersona().code,
    variant: entryVariant,
    context,
    scanCount,
    ownedCodes,
    events
  };
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  downloadTextFile(JSON.stringify(payload, null, 2), `ktv-events-${stamp}.json`);
  track("events_export");
  showToast("事件 JSON 已导出");
});

document.querySelector("[data-reset-demo]")?.addEventListener("click", () => {
  resetDemoState();
  renderPersona();
  setPreferredPersona(preferredCode);
  renderOps();
  showView("entry");
  showToast("演示状态已重置");
});

const isSharedEntry = isShareEntryUrl();
const shareFromPersona = isSharedEntry ? personaByCode(params.get("from")) : null;

if (isSharedEntry) {
  invitedPersona = shareFromPersona;
} else {
  invitedPersona = null;
}

if (params.has("reset") || isSharedEntry) {
  resetDemoState();
}

if (invitedPersona) {
  track("share_entry_open", {
    fromCode: invitedPersona.code,
    fromTitle: invitedPersona.title,
    member: context.member || "friend"
  });
}

if (params.has("persona")) {
  const code = normalizeCode(params.get("persona"));
  const index = personas.findIndex((persona) => persona.code === code);
  if (index >= 0) {
    currentIndex = index;
    preferredCode = personas[index].code;
    if (!ownedCodes.includes(preferredCode)) {
      ownedCodes = [...ownedCodes, preferredCode];
    }
    syncDemoState();
  }
}

if (params.has("owned")) {
  const codes = params.get("owned")
    .split(",")
    .map(normalizeCode)
    .filter((code) => personas.some((persona) => persona.code === code));
  ownedCodes = [...new Set(codes.length ? codes : ownedCodes)];
  ownedCodes = uniqueOwnedCodes(ownedCodes);
  if (!ownedCodes.includes("SPARK")) {
    ownedCodes = ["SPARK", ...ownedCodes];
  }
  syncDemoState();
}

if (params.has("bonus")) {
  applyBonusUnlocks(params.get("bonus"));
  syncDemoState();
}

if (params.has("variant")) {
  const variant = params.get("variant");
  entryVariant = entryVariants[variant] ? variant : "expose";
  syncDemoState();
}

async function boot() {
  await loadRemoteConfig();
  await refreshServerState();
  renderPersona();
  renderEntryVariant();
  setPreferredPersona(preferredCode);
  updateRollButtons();
  startQuotaCountdown();

  if (params.has("ops")) {
    opsPanel?.classList.add("is-visible");
    opsPanel?.setAttribute("aria-hidden", "false");
    renderOps();
  }

  const initial = window.location.hash.replace("#", "");
  if (availableViews.includes(initial)) {
    showView(initial, false);
  } else {
    showView("entry");
  }

  if (params.has("detail")) {
    const detailCode = normalizeCode(params.get("detail"));
    window.setTimeout(() => openCardDetail(detailCode), 180);
  }
}

boot();
