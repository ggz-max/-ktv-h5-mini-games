const screens = [...document.querySelectorAll(".screen")];
const storageKey = "mental-state-sign.today";
const state = {
  scene: "work",
  symptom: "overthink",
  current: null,
  friend: null,
  friends: [],
  drawCount: 0
};

const scanLines = [
  "正在读取脑内碎片",
  "正在检测表面正常浓度",
  "正在匹配今日不对劲指数",
  "正在把异常写成签文"
];

const fortunes = {
  work: {
    overthink: ["后台过载签", "今天适合先躲一下世界", "你不是不行，你只是同时打开了太多人生后台。", "关掉一个群", "硬撑体面", "消失十分钟", 83],
    lag: ["反应延迟签", "灵魂比身体晚到半拍", "消息看见了，脑子也看见了，只是执行系统还没上线。", "慢慢回", "立刻解释", "把手机扣过去", 67],
    perform: ["体面营业签", "外壳在线，内核请假", "你今天看起来很稳，主要是因为崩溃被你排到了下班后。", "装得漂亮", "深夜复盘", "买杯冰的", 76],
    spark: ["临时燃烧签", "突然能量上线", "你会在某个瞬间突然很强，然后迅速怀疑刚才那个人是谁。", "趁热推进", "过度承诺", "发一个句号", 72],
    empty: ["电量红线签", "请勿继续压榨自己", "你现在不是懒，是精神电池正在显示一个非常诚实的红色。", "低功耗模式", "自责加班", "少说三句话", 88],
    wild: ["礼貌发疯签", "还在微笑，但不多", "你已经把尖叫压缩成了一个非常得体的“好的”。", "阴阳怪气一点", "真的开火", "深呼吸三秒", 91]
  },
  love: {
    overthink: ["回音放大签", "一句话能反复播放八遍", "你不是想太多，你只是把对方的标点符号也纳入了情报系统。", "先别脑补", "深夜追问", "去洗个头", 86],
    lag: ["已读缓存签", "心动和嘴硬同时卡住", "你已经有答案了，只是尊严正在加载一个更酷的版本。", "晚点再说", "秒删朋友圈", "发给朋友审判", 74],
    perform: ["无事发生签", "表面云淡风轻", "你今天最擅长的技能，是把在意伪装成“随便”。", "保持松弛", "连环试探", "听一首老歌", 79],
    spark: ["粉红短路签", "快乐来得很可疑", "一点点甜就能让你重新相信宇宙，虽然宇宙本人可能没这个意思。", "享受一下", "立刻上头", "截屏留证", 82],
    empty: ["情绪掉线签", "不想争，也不想哄", "你的情绪今天很珍贵，暂时不适合拿去做关系维护。", "早点睡", "硬聊到底", "把话留到明天", 69],
    wild: ["优雅爆炸签", "很想问，但要体面", "你现在像一封写完但没发的长消息，热量巨大，杀伤克制。", "写备忘录", "发小作文", "删除输入框", 94]
  },
  alone: {
    overthink: ["深夜开庭签", "脑内陪审团全员到齐", "今天的你会审判过去三年的自己，并顺手预测未来五年的尴尬。", "放点白噪音", "继续考古", "把灯打开", 89],
    lag: ["灵魂离线签", "人还在，信号弱", "你不是空白，你只是需要等意识从远处走回来。", "发呆", "强行振作", "站起来伸懒腰", 64],
    perform: ["独处演员签", "连自己也要敷衍一下", "你今天很会假装一切正常，连外卖备注都写得很礼貌。", "承认累了", "美化生活", "少刷十分钟", 73],
    spark: ["凌晨企划签", "突然想重启人生", "你会在不该清醒的时候异常清醒，并产生三个宏大计划。", "记下来", "立刻All in", "先保存草稿", 81],
    empty: ["软塌塌签", "今天适合低配活着", "没有惊天动地的原因，就是电量低、心也低、被窝很有道理。", "躺平一会", "攻击自己", "吃点热的", 87],
    wild: ["房间风暴签", "想把生活重新洗牌", "你的内心已经把桌子掀了，但现实里只是换了个睡姿。", "整理一角", "深夜大扫除", "扔一个没用的东西", 78]
  },
  money: {
    overthink: ["余额雷达签", "每个数字都有回声", "你今天对金钱的敏感度很高，高到一杯奶茶都像战略决策。", "算小账", "恐慌消费", "打开记账", 84],
    lag: ["搞钱待机签", "想努力，但启动慢", "发财的念头很清楚，行动的腿还在请年假。", "做一小步", "自我鄙视", "处理一个待办", 66],
    perform: ["富贵幻觉签", "气质先到，钱在路上", "你今天可以先拥有一种很贵的精神状态，虽然支付软件另有看法。", "保持审美", "假装不看余额", "清一个购物车", 75],
    spark: ["副业点火签", "突然觉得自己很会赚", "你的搞钱雷达短暂开机，请趁热区分灵感和冲动。", "列方案", "立刻囤课", "问一个懂的人", 80],
    empty: ["贫穷低气压签", "不是没钱，是心也没预算", "今天不要用消费证明自己还活着，证明方式可以便宜一点。", "免费快乐", "报复性下单", "出门走走", 90],
    wild: ["暴富妄想签", "很想立刻改命", "你已经在脑内完成财务自由，现实进度暂时卡在第一步。", "投递一次", "相信玄学", "少看成功学", 93]
  }
};

const symptomCycle = ["overthink", "lag", "perform", "spark", "empty", "wild"];
const friendSeats = [
  ["主唱位", "嘴上说随便，麦克风已经在手里了"],
  ["沙发角落位", "看似安静，其实把全场精神状态都分析完了"],
  ["点歌台位", "负责把大家的嘴硬都排进下一首歌"],
  ["门口放风位", "随时准备逃跑，但每次都最后才走"],
  ["气氛组位", "电量忽高忽低，胜在发疯很有礼貌"],
  ["结账位", "表面冷静，内心正在和余额谈判"]
];

const friendChemistryLabels = ["互相救场", "一起嘴硬", "同步掉线", "礼貌发疯", "互相拆台", "精神共振"];
const quickSquadNames = ["嘴硬同事", "熬夜搭子", "已读朋友", "气氛组长", "省电选手", "夜聊军师", "临时主唱", "逃跑专家"];

function hashText(text) {
  return [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function makeFriend(name, salt = state.friends.length) {
  const seed = hashText(`${name}-${state.scene}-${state.symptom}-${state.current.score}-${salt}`);
  const picked = friendSeats[(seed + name.length * 7 + salt * 11) % friendSeats.length];
  return {
    name,
    seat: picked[0],
    line: picked[1],
    sync: 54 + ((seed + state.current.score + salt * 13) % 45),
    label: friendChemistryLabels[seed % friendChemistryLabels.length]
  };
}

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === name);
  });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1300);
}

function selectInGroup(button) {
  const group = button.closest("[data-group]");
  group.querySelectorAll("button").forEach((item) => item.classList.remove("is-selected"));
  button.classList.add("is-selected");
  state[group.dataset.group] = button.dataset.value;
  showToast(group.dataset.group === "scene" ? "场景已锁定" : "故障已记录");
}

function syncChoiceButtons() {
  document.querySelectorAll("[data-group]").forEach((group) => {
    const value = state[group.dataset.group];
    group.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.value === value);
    });
  });
}

function randomDraw() {
  const scenes = Object.keys(fortunes);
  state.scene = scenes[Math.floor(Math.random() * scenes.length)];
  state.symptom = symptomCycle[Math.floor(Math.random() * symptomCycle.length)];
  syncChoiceButtons();
  startDraw();
}

function pickFortune() {
  const data = fortunes[state.scene][state.symptom];
  state.current = {
    title: data[0],
    subtitle: data[1],
    body: data[2],
    good: data[3],
    bad: data[4],
    action: data[5],
    score: data[6],
    code: `MOOD-${data[6]}`,
    level: data[6] >= 88 ? "高频异常" : data[6] >= 76 ? "中高频异常" : "低电量异常"
  };
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderResumeCard(record) {
  const button = document.querySelector("#resumeBtn");
  const text = document.querySelector("#resumeText");
  if (!record?.current) {
    button.hidden = true;
    return;
  }

  const friendCount = record.friends?.length || 0;
  text.textContent = friendCount
    ? `上次抽到：${record.current.title}｜${friendCount} 位同桌`
    : `上次抽到：${record.current.title}`;
  button.hidden = false;
}

function saveTodayRecord() {
  if (!state.current) return;
  const record = {
    date: todayKey(),
    scene: state.scene,
    symptom: state.symptom,
    current: state.current,
    friend: state.friend,
    friends: state.friends
  };
  localStorage.setItem(storageKey, JSON.stringify(record));
  renderResumeCard(record);
}

function loadTodayRecord() {
  try {
    const record = JSON.parse(localStorage.getItem(storageKey) || "null");
    return record?.date === todayKey() ? record : null;
  } catch {
    return null;
  }
}

function restoreTodayRecord() {
  const record = loadTodayRecord();
  if (!record) return false;
  state.scene = record.scene;
  state.symptom = record.symptom;
  state.current = record.current;
  state.friend = record.friend || null;
  state.friends = record.friends || [];
  renderFortune();
  showScreen("result");
  return true;
}

function renderFortune() {
  const result = state.current;
  setText("#fortuneCode", result.code);
  setText("#fortuneLevel", result.level);
  setText("#fortuneTitle", result.title);
  setText("#fortuneSubtitle", result.subtitle);
  setText("#fortuneBody", result.body);
  setText("#goodFor", result.good);
  setText("#badFor", result.bad);
  setText("#luckyAction", result.action);
  setText("#meterText", `${result.score}%`);
  setText("#posterTitle", result.title);
  setText("#posterBody", result.body);
  setText("#posterCode", result.code);
  setText("#posterMeter", `${result.score}%`);
  setText("#posterLevel", result.level);
  setText("#posterSubtitle", result.subtitle);
  const meterFill = document.querySelector("#meterFill");
  if (meterFill) meterFill.style.width = `${result.score}%`;
  const preview = document.querySelector("#shareCopyPreview");
  if (preview) preview.classList.remove("is-visible");
  renderFriendSeat();
}

function shareCopy() {
  const result = state.current;
  const squadLine = state.friends.length
    ? `群聊入座榜：${state.friends.map((friend) => `${friend.name}${friend.sync}%坐${friend.seat}`).join("，")}。`
    : "";
  const friendLine = state.friend ? `我顺手把${state.friend.name}塞进来，TA 是${state.friend.seat}：${state.friend.line}，${state.friend.label} ${state.friend.sync}%。${squadLine}` : "你也抽一张，我想看看谁更不对劲。";
  return `我今天抽到「${result.title}」：${result.body} 今日不对劲指数 ${result.score}%。${friendLine}`;
}

function renderFriendSeat() {
  const panel = document.querySelector("#friendSeatResult");
  const poster = document.querySelector("#posterFriend");
  const rerankButton = document.querySelector("#rerankBtn");
  const hint = document.querySelector("#friendSeatHint");
  if (!panel || !poster || !rerankButton || !hint) return;
  if (!state.friend) {
    panel.classList.remove("is-visible");
    panel.replaceChildren();
    poster.replaceChildren();
    poster.classList.remove("is-visible");
    rerankButton.hidden = true;
    hint.textContent = "最多 3 位，重复昵称会更新";
    return;
  }

  const text = `${state.friend.name}：${state.friend.seat}｜${state.friend.line}`;
  const line = document.createElement("span");
  line.textContent = text;
  const score = document.createElement("b");
  score.textContent = state.friends.length > 1
    ? `今日风暴源｜${state.friend.label} ${state.friend.sync}%`
    : `${state.friend.label} ${state.friend.sync}%`;
  const list = document.createElement("div");
  list.className = "friend-seat-list";
  state.friends.forEach((friend, index) => {
    const item = document.createElement("i");
    item.textContent = `${index + 1}. ${friend.name} · ${friend.seat} · ${friend.sync}%`;
    list.appendChild(item);
  });
  panel.replaceChildren(line, score, list);
  panel.classList.add("is-visible");

  const posterTitle = document.createElement("strong");
  posterTitle.textContent = "群聊入座榜";
  const posterLead = document.createElement("span");
  posterLead.textContent = state.friends.length > 1
    ? `今日风暴源：${state.friend.name}｜${state.friend.label} ${state.friend.sync}%`
    : `${state.friend.name}：${state.friend.seat}｜${state.friend.label} ${state.friend.sync}%`;
  const posterList = document.createElement("div");
  posterList.className = "poster-friend-list";
  state.friends.forEach((friend, index) => {
    const item = document.createElement("i");
    item.textContent = `${index + 1}. ${friend.name} · ${friend.seat} · ${friend.sync}%`;
    posterList.appendChild(item);
  });
  poster.replaceChildren(posterTitle, posterLead, posterList);
  poster.classList.add("is-visible");
  rerankButton.hidden = state.friends.length < 2;
  hint.textContent = state.friends.length >= 3
    ? "榜单已满 3 位，再输入会替换最早成员"
    : `已入榜 ${state.friends.length}/3，再拉几位更好玩`;
}

function assignFriendSeat() {
  const input = document.querySelector("#friendName");
  const name = input.value.trim() || "这位朋友";
  const friend = makeFriend(name);
  state.friend = friend;
  state.friends = [friend, ...state.friends.filter((item) => item.name !== name)].slice(0, 3);
  input.value = "";
  renderFriendSeat();
  saveTodayRecord();
}

function fillQuickSquad() {
  const start = (state.drawCount + state.current.score + hashText(state.current.title)) % quickSquadNames.length;
  const names = Array.from({ length: 3 }, (_, index) => quickSquadNames[(start + index * 2) % quickSquadNames.length]);
  state.friends = names
    .map((name, index) => makeFriend(name, state.drawCount + index + 7))
    .sort((a, b) => b.sync - a.sync);
  state.friend = state.friends[0];
  renderFriendSeat();
  saveTodayRecord();
}

function rerankFriends() {
  if (state.friends.length < 2) return;
  state.drawCount += 1;
  state.friends = state.friends
    .map((friend, index) => makeFriend(friend.name, state.drawCount + index + 3))
    .sort((a, b) => b.sync - a.sync);
  state.friend = state.friends[0];
  renderFriendSeat();
  saveTodayRecord();
}

async function copyShareText() {
  const text = shareCopy();
  try {
    await navigator.clipboard.writeText(text);
    showToast("海报文案已复制");
  } catch {
    showToast("复制失败，可以长按截图");
  }
}

function rebutFortune() {
  const currentIndex = symptomCycle.indexOf(state.symptom);
  const offset = 1 + (state.drawCount % (symptomCycle.length - 1));
  state.symptom = symptomCycle[(currentIndex + offset) % symptomCycle.length];
  document.querySelectorAll("[data-group=\"symptom\"] .chip").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.value === state.symptom);
  });
  state.drawCount += 1;
  state.friend = null;
  state.friends = [];
  pickFortune();
  renderFortune();
  saveTodayRecord();
  showToast("已重新校准你的嘴硬指数");
}

function startDraw() {
  state.drawCount += 1;
  showScreen("loading");
  let index = 0;
  const scanText = document.querySelector("#scanText");
  scanText.textContent = scanLines[index];

  const timer = setInterval(() => {
    index += 1;
    scanText.textContent = scanLines[index] || scanLines[scanLines.length - 1];
    if (index >= scanLines.length - 1) clearInterval(timer);
  }, 360);

  setTimeout(() => {
    state.friend = null;
    state.friends = [];
    pickFortune();
    renderFortune();
    saveTodayRecord();
    showScreen("result");
  }, 1500);
}

function on(selector, eventName, handler) {
  const element = document.querySelector(selector);
  if (element) element.addEventListener(eventName, handler);
}

on("#startBtn", "click", () => showScreen("quiz"));

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.go));
});

document.querySelectorAll(".choice, .chip").forEach((button) => {
  button.addEventListener("click", () => selectInGroup(button));
});

on("#drawBtn", "click", startDraw);
on("#randomDrawBtn", "click", randomDraw);
on("#posterBtn", "click", () => {
  showScreen("poster");
  showToast("海报已生成，长按截图分享");
});
on("#copyTextBtn", "click", copyShareText);
on("#posterCopyBtn", "click", copyShareText);
on("#rebutBtn", "click", rebutFortune);
on("#friendSeatBtn", "click", assignFriendSeat);
on("#quickSquadBtn", "click", fillQuickSquad);
on("#rerankBtn", "click", rerankFriends);
on("#friendName", "keydown", (event) => {
  if (event.key === "Enter") assignFriendSeat();
});
on("#resumeBtn", "click", restoreTodayRecord);

pickFortune();
renderFortune();
renderResumeCard(loadTodayRecord());

const debugScreen = new URLSearchParams(window.location.search).get("screen");
if (["home", "quiz", "loading", "result"].includes(debugScreen)) {
  if (debugScreen === "result") {
    state.scene = "alone";
    state.symptom = "wild";
    pickFortune();
    renderFortune();
  }
  showScreen(debugScreen);
}
