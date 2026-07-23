import QRCode from "qrcode";
import { Check, createIcons, Crown, DoorOpen, HelpCircle, LogOut, Megaphone, Play, RotateCcw, Share2, Users, Vibrate, Volume2, VolumeX, WifiOff, X } from "lucide";
import { cardPotValue, forecastCard, rowPotValue } from "../shared/game.ts";
import "./styles.css";

type RoomStatus = "waiting" | "playing" | "resolving" | "result";

interface PublicPlayer {
  id: string;
  name: string;
  avatar: number;
  connected: boolean;
  spectator: boolean;
  isHost: boolean;
  timeoutCount: number;
  rematchVote: boolean;
  score: number;
  submitted: boolean;
  isBot?: boolean;
}

interface Placement {
  play: { playerId: string; playerName: string; card: number; isSystem?: boolean };
  rowIndex: number;
  rowsAfter: number[][];
  penalty?: Penalty;
}

interface Penalty {
  playerId: string;
  playerName: string;
  sourcePlayerId?: string;
  sourcePlayerName?: string;
  points: number;
  reason?: string;
  card?: number;
  rowIndex?: number;
}

interface ServerState {
  serverTime: number;
  room: {
    code: string;
    status: RoomStatus;
    hostId: string;
    playerId: string;
    activeCount: number;
    connectedCount: number;
    gameIndex: number;
    players: PublicPlayer[];
    recommendedMode: { mode: string; label: string; rounds: number };
    rematchThreshold: number;
    rematchVotes: number;
  };
  game: null | {
    config: { mode: string; label: string; rounds: number };
    roundIndex: number;
    rows: number[][];
    hand: number[];
    selectedCard: number | null;
    selectedDelayed: boolean;
    delayAvailable: boolean;
    deadline: number;
    submittedCount: number;
    totalPlayers: number;
    ranking: Array<{ id: string; name: string; score: number }>;
    cheerCount: number;
    viewerCheered: boolean;
    punishmentAccepted: boolean;
    lastResolution?: { placements: Placement[]; penalties: Penalty[] };
  };
}

interface Session {
  code: string;
  playerId: string;
  sessionToken: string;
}

const app = document.querySelector<HTMLDivElement>("#app")!;
const params = new URLSearchParams(location.search);
const joinCode = (params.get("join") || "").toUpperCase();
const preview = params.get("preview");
const storageKey = "room-blame-king-session";
const profileKey = "room-blame-king-profile";

let socket: WebSocket | null = null;
let pollTimer: number | null = null;
let transport: "ws" | "poll" | null = null;
let session: Session | null = readJson<Session>(storageKey);
let state: ServerState | null = null;
let connected = false;
let selectedCard: number | null = null;
let useDelay = false;
let lastRoundKey = "";
let errorMessage = "";
let tutorialOpen = !preview && !session && !localStorage.getItem("room-blame-king-tutorial-seen");
let tutorialStarted = false;
let tutorialStep = 0;
let tutorialSelected: number | null = null;
let tutorialDelay = false;
let tutorialComplete = false;
let countdownTimer: number | null = null;
let soundEnabled = localStorage.getItem("room-blame-king-sound") !== "off";
let audioContext: AudioContext | null = null;
let bgmTimer: number | null = null;
let bgmGain: GainNode | null = null;
let bgmCompressor: DynamicsCompressorNode | null = null;
let bgmStep = 0;
let lastResolutionEffectKey = "";
let lastResultEffectKey = "";
type ResultStage = "winner" | "blame" | "punishment" | "ranking";
let resultStage: ResultStage = "ranking";
let resultCeremonyKey = "";
let resultTimers: number[] = [];
const profile = readJson<{ name: string; avatar: number }>(profileKey) || { name: randomName(), avatar: Math.floor(Math.random() * 12) };

function readJson<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || "null") as T; } catch { return null; }
}

function randomName() {
  const first = ["稳住", "不粘锅", "气氛", "闪亮", "淡定", "机智", "快乐", "清醒"];
  const second = ["选手", "麦霸", "队友", "玩家", "同学", "歌手"];
  return `${first[Math.floor(Math.random() * first.length)]}${second[Math.floor(Math.random() * second.length)]}`;
}

function saveProfile() {
  localStorage.setItem(profileKey, JSON.stringify(profile));
}

function icon(name: string, label: string, size = 20) {
  return `<i data-lucide="${name}" aria-hidden="true" style="width:${size}px;height:${size}px"></i><span class="sr-only">${label}</span>`;
}

function hydrateIcons() {
  createIcons({ icons: { Check, Crown, DoorOpen, HelpCircle, LogOut, Megaphone, Play, RotateCcw, Share2, Users, Vibrate, Volume2, VolumeX, WifiOff, X } });
}

function avatar(index: number, extra = "") {
  return `<span class="avatar avatar-${index % 12} ${extra}" aria-hidden="true"></span>`;
}

function track(event: string, properties: Record<string, unknown> = {}) {
  fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event, properties }) }).catch(() => undefined);
}

function getAudioContext() {
  if (!soundEnabled) return null;
  audioContext ||= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function scheduledTone(context: AudioContext, frequency: number, start: number, duration: number, type: OscillatorType, volume: number, destination: AudioNode = context.destination) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.detune.setValueAtTime(type === "triangle" ? -5 : 0, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function tone(frequency: number, duration: number, delay = 0, type: OscillatorType = "sine", volume = 0.045) {
  const context = getAudioContext();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playSound(kind: "select" | "confirm" | "land" | "danger" | "boom" | "win" | "cheer") {
  if (kind === "select") tone(440, 0.07, 0, "triangle", 0.035);
  if (kind === "confirm") { tone(330, 0.08, 0, "triangle"); tone(660, 0.12, 0.07, "triangle"); }
  if (kind === "land") { tone(520, 0.06, 0, "sine", 0.025); tone(700, 0.05, 0.045, "sine", 0.02); }
  if (kind === "danger") { tone(190, 0.13, 0, "square", 0.035); tone(150, 0.16, 0.14, "square", 0.035); }
  if (kind === "boom") { tone(95, 0.45, 0, "sawtooth", 0.085); tone(58, 0.5, 0.04, "square", 0.055); }
  if (kind === "win") [523, 659, 784].forEach((note, index) => tone(note, 0.2, index * 0.11, "triangle", 0.045));
  if (kind === "cheer") [392, 523, 659, 784].forEach((note, index) => tone(note, 0.16, index * 0.065, "square", 0.04));
}

function backgroundMusicAllowed(current = state) {
  return !current || ["waiting", "playing", "resolving"].includes(current.room.status);
}

// Original pentatonic loop: short plucked phrases keep it festive without competing with KTV vocals.
function scheduleBgmPhrase() {
  const context = getAudioContext();
  if (!context || context.state !== "running" || !backgroundMusicAllowed()) return;
  const phrases = [
    [392, 440, 523, 659, 587, 523, 440, 392, 330, 392, 440, 523],
    [523, 587, 659, 784, 659, 587, 523, 440, 523, 587, 523, 392],
    [440, 523, 659, 784, 880, 784, 659, 587, 523, 440, 392, 440],
    [523, 659, 587, 523, 440, 392, 330, 392, 440, 523, 587, 523]
  ];
  const bass = [196, 220, 165, 196];
  const phrase = phrases[bgmStep % phrases.length];
  const start = context.currentTime + 0.04;
  const beat = 0.38;
  if (!bgmGain) {
    bgmGain = context.createGain();
    bgmCompressor = context.createDynamicsCompressor();
    bgmGain.gain.setValueAtTime(1.05, start);
    bgmCompressor.threshold.setValueAtTime(-18, start);
    bgmCompressor.knee.setValueAtTime(12, start);
    bgmCompressor.ratio.setValueAtTime(3, start);
    bgmCompressor.attack.setValueAtTime(0.006, start);
    bgmCompressor.release.setValueAtTime(0.24, start);
    bgmGain.connect(bgmCompressor).connect(context.destination);
  }
  const destination = bgmGain;
  phrase.forEach((note, index) => {
    scheduledTone(context, note, start + index * beat, beat * 1.16, "triangle", index % 3 === 0 ? 0.043 : 0.034, destination);
    if (index % 4 === 3) scheduledTone(context, note * 2, start + index * beat, beat * 0.48, "sine", 0.012, destination);
  });
  scheduledTone(context, bass[bgmStep % bass.length], start, beat * 5.4, "sine", 0.038, destination);
  scheduledTone(context, bass[(bgmStep + 1) % bass.length], start + beat * 6, beat * 5.4, "sine", 0.034, destination);
  [0, 3, 6, 9].forEach(index => scheduledTone(context, index % 6 === 0 ? 78 : 112, start + index * beat, 0.075, "square", 0.008, destination));
  bgmStep += 1;
}

function stopBgm() {
  if (bgmTimer !== null) window.clearInterval(bgmTimer);
  bgmTimer = null;
  if (audioContext && bgmGain) bgmGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.035);
  bgmGain = null;
  bgmCompressor = null;
  delete document.documentElement.dataset.bgm;
}

function manageBgm(current = state) {
  const shouldPlay = soundEnabled && !preview && backgroundMusicAllowed(current);
  if (!shouldPlay) { stopBgm(); return; }
  const context = getAudioContext();
  if (!context || context.state !== "running" || bgmTimer !== null) return;
  scheduleBgmPhrase();
  bgmTimer = window.setInterval(scheduleBgmPhrase, 4560);
  document.documentElement.dataset.bgm = "playing";
}

function unlockAudio() {
  const context = getAudioContext();
  if (!context) return;
  void context.resume().then(() => manageBgm()).catch(() => undefined);
}

function clearResultCeremony() {
  resultTimers.forEach(timer => window.clearTimeout(timer));
  resultTimers = [];
}

function setResultStage(stage: ResultStage, key: string) {
  if (resultCeremonyKey !== key || state?.room.status !== "result") return;
  resultStage = stage;
  if (stage === "blame") { playSound("boom"); if (navigator.vibrate) navigator.vibrate([100, 60, 180]); }
  if (stage === "punishment") playSound("danger");
  render();
}

function syncResultCeremony(current: ServerState) {
  if (current.room.status !== "result" || !current.game) {
    if (resultCeremonyKey) clearResultCeremony();
    resultCeremonyKey = "";
    resultStage = "ranking";
    return;
  }
  const key = `${current.room.code}:${current.room.gameIndex}`;
  if (resultCeremonyKey !== key) {
    clearResultCeremony();
    resultCeremonyKey = key;
    resultStage = "winner";
    resultTimers = [
      window.setTimeout(() => setResultStage("blame", key), 1400),
      window.setTimeout(() => setResultStage("punishment", key), 3900),
      window.setTimeout(() => setResultStage("ranking", key), 9000)
    ];
  } else if (current.game.punishmentAccepted && resultStage === "punishment") {
    clearResultCeremony();
    resultTimers = [window.setTimeout(() => setResultStage("ranking", key), 650)];
  }
}

function runStateEffects(current: ServerState) {
  manageBgm(current);
  if (!current.game || preview) return;
  if (current.room.status === "resolving") {
    const key = `${current.room.gameIndex}:${current.game.roundIndex}`;
    if (key === lastResolutionEffectKey) return;
    lastResolutionEffectKey = key;
    const placements = current.game.lastResolution?.placements || [];
    placements.forEach((placement, index) => window.setTimeout(() => {
      playSound(placement.penalty ? "boom" : "land");
      if (placement.penalty && navigator.vibrate) navigator.vibrate([90, 45, 140]);
    }, Math.min(index * 180, 1300)));
  }
  if (current.room.status === "result") {
    const key = `${current.room.code}:${current.room.gameIndex}`;
    if (key === lastResultEffectKey) return;
    lastResultEffectKey = key;
    playSound("win");
  }
}

function showError(message: string) {
  errorMessage = message;
  render();
  window.setTimeout(() => { if (errorMessage === message) { errorMessage = ""; render(); } }, 3200);
}

async function createRoom() {
  saveProfile();
  try {
    const response = await fetch("/api/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(profile) });
    if (!response.ok) throw new Error("创建房间失败");
    session = await response.json();
    localStorage.setItem(storageKey, JSON.stringify(session));
    history.replaceState(null, "", `?room=${session!.code}`);
    connect();
  } catch (error) { showError(error instanceof Error ? error.message : "创建失败"); }
}

async function joinRoom(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) { showError("请输入6位房间码"); return; }
  saveProfile();
  try {
    const response = await fetch(`/api/rooms/${normalized}/join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(profile) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "加入房间失败");
    session = data;
    localStorage.setItem(storageKey, JSON.stringify(session));
    history.replaceState(null, "", `?room=${normalized}`);
    tutorialOpen = !localStorage.getItem("room-blame-king-tutorial-seen");
    if (tutorialOpen) {
      tutorialStarted = false;
      tutorialStep = 0;
      tutorialSelected = null;
      tutorialDelay = false;
      tutorialComplete = false;
    }
    connect();
  } catch (error) { showError(error instanceof Error ? error.message : "加入失败"); }
}

function acceptServerMessage(message: any) {
  if (message.type === "state") {
    const previousResolutionKey = state?.room.status === "resolving" && state.game ? `${state.room.gameIndex}:${state.game.roundIndex}` : "";
    const nextState = message as ServerState;
    state = nextState;
    syncResultCeremony(nextState);
    const roundKey = state?.game ? `${state.room.gameIndex}:${state.game.roundIndex}` : "";
    if (roundKey !== lastRoundKey) {
      selectedCard = null;
      useDelay = false;
      lastRoundKey = roundKey;
    }
    if (state?.game?.selectedCard) selectedCard = state.game.selectedCard;
    if (state?.room.status === "waiting") selectedCard = null;
    const nextResolutionKey = state?.room.status === "resolving" && state.game ? `${state.room.gameIndex}:${state.game.roundIndex}` : "";
    if (!previousResolutionKey || previousResolutionKey !== nextResolutionKey) render();
    runStateEffects(nextState);
  } else if (message.type === "error") showError(message.message || "操作失败");
}

async function pollState() {
  const current = session;
  if (!current || transport !== "poll") return;
  try {
    const response = await fetch(`/api/rooms/${current.code}/state?player=${encodeURIComponent(current.playerId)}&token=${encodeURIComponent(current.sessionToken)}`, { cache: "no-store" });
    if (response.status === 401) {
      session = null;
      state = null;
      localStorage.removeItem(storageKey);
      showError("房间已失效，请重新加入");
      return;
    }
    if (!response.ok) throw new Error(`poll ${response.status}`);
    connected = true;
    errorMessage = "";
    acceptServerMessage(await response.json());
  } catch {
    connected = false;
    render();
  }
}

function startPolling() {
  if (!session || transport === "poll") return;
  transport = "poll";
  socket?.close();
  socket = null;
  if (pollTimer !== null) window.clearInterval(pollTimer);
  void pollState();
  pollTimer = window.setInterval(() => void pollState(), 600);
}

function connect() {
  if (!session) { render(); return; }
  transport = null;
  socket?.close();
  if (location.hostname.endsWith(".tbox.ktvsky.com")) {
    startPolling();
    return;
  }
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  socket = new WebSocket(`${protocol}://${location.host}/ws?room=${encodeURIComponent(session.code)}&player=${encodeURIComponent(session.playerId)}&token=${encodeURIComponent(session.sessionToken)}`);
  const fallbackTimer = window.setTimeout(() => { if (socket?.readyState !== WebSocket.OPEN) startPolling(); }, 1500);
  socket.addEventListener("open", () => {
    window.clearTimeout(fallbackTimer);
    transport = "ws";
    if (pollTimer !== null) window.clearInterval(pollTimer);
    pollTimer = null;
    connected = true;
    errorMessage = "";
    render();
  });
  socket.addEventListener("message", event => {
    acceptServerMessage(JSON.parse(event.data));
  });
  socket.addEventListener("error", () => startPolling());
  socket.addEventListener("close", event => {
    window.clearTimeout(fallbackTimer);
    if (event.code === 1008) { session = null; state = null; localStorage.removeItem(storageKey); showError("房间已失效，请重新加入"); return; }
    if (transport !== "poll") startPolling();
  });
}

function send(action: string, payload: Record<string, unknown> = {}) {
  const request = { action, requestId: crypto.randomUUID(), ...payload };
  if (transport === "ws" && socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(request));
    return;
  }
  const current = session;
  if (!current || transport !== "poll") { showError("正在连接房间"); return; }
  void fetch(`/api/rooms/${current.code}/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...request, playerId: current.playerId, sessionToken: current.sessionToken })
  }).then(async response => {
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showError(data.error || "操作失败");
    } else {
      void pollState();
    }
  }).catch(() => showError("网络不稳定，请重试"));
}

function leaveRoom() {
  send("leave");
  stopBgm();
  clearResultCeremony();
  resultCeremonyKey = "";
  resultStage = "ranking";
  socket?.close();
  socket = null;
  transport = null;
  if (pollTimer !== null) window.clearInterval(pollTimer);
  pollTimer = null;
  session = null;
  state = null;
  localStorage.removeItem(storageKey);
  history.replaceState(null, "", location.pathname);
  render();
}

function openTutorial() {
  tutorialOpen = true;
  tutorialStarted = false;
  tutorialStep = 0;
  tutorialSelected = null;
  tutorialDelay = false;
  tutorialComplete = false;
  render();
}
function closeTutorial() { tutorialOpen = false; render(); }
function finishTutorial() {
  localStorage.setItem("room-blame-king-tutorial-seen", "1");
  tutorialOpen = false;
  render();
}

function homeView() {
  return `<main class="screen home-screen">
    <div class="home-art" aria-hidden="true"></div>
    <button id="sound-toggle" class="icon-button ambient-sound home-ambient-sound" type="button" title="${soundEnabled ? "关闭背景音乐和音效" : "打开背景音乐和音效"}">${icon(soundEnabled ? "volume-2" : "volume-x", soundEnabled ? "关闭背景音乐和音效" : "打开背景音乐和音效")}</button>
    <header class="home-title">
      <span class="eyebrow">KTV 欢乐多人局</span>
      <h1>包厢<br><strong>背锅王</strong></h1>
      <p>同时选牌，谁挤爆谁背锅</p>
    </header>
    <section class="entry-dock" aria-label="开始游戏">
      <div class="profile-row">
        <button class="avatar-picker" id="avatar-picker" type="button" aria-label="更换头像">${avatar(profile.avatar)}</button>
        <label><span>你的称呼</span><input id="profile-name" maxlength="16" value="${escapeHtml(profile.name)}" autocomplete="nickname"></label>
      </div>
      <button class="primary-button" id="create-room" type="button">${icon("users", "创建房间")}<span>创建包厢</span></button>
      <div class="join-row">
        <input id="room-code" maxlength="6" placeholder="输入6位房间码" value="${escapeHtml(joinCode)}" aria-label="房间码">
        <button id="join-room" class="secondary-button" type="button">加入</button>
      </div>
      <button id="home-help" class="quiet-button" type="button">${icon("help-circle", "查看规则")}<span>20秒看懂规则</span></button>
    </section>
  </main>`;
}

function waitingView(current: ServerState) {
  const me = current.room.players.find(player => player.id === current.room.playerId)!;
  const isHost = current.room.hostId === current.room.playerId;
  const players = current.room.players.filter(player => !player.spectator);
  const spectators = current.room.players.filter(player => player.spectator);
  return `<main class="screen waiting-screen">
    <header class="topbar">
      <button id="leave-room" class="icon-button" type="button" title="退出房间">${icon("x", "退出房间")}</button>
      <div><span class="topbar-label">房间码</span><strong>${current.room.code}</strong></div>
      <button id="room-help" class="icon-button" type="button" title="玩法说明">${icon("help-circle", "玩法说明")}</button>
    </header>
    <button id="sound-toggle" class="icon-button ambient-sound waiting-ambient-sound" type="button" title="${soundEnabled ? "关闭背景音乐和音效" : "打开背景音乐和音效"}">${icon(soundEnabled ? "volume-2" : "volume-x", soundEnabled ? "关闭背景音乐和音效" : "打开背景音乐和音效")}</button>
    <section class="waiting-hero">
      <span class="mode-tag">${current.room.recommendedMode.label} · ${current.room.recommendedMode.rounds}回合</span>
      <h2>${players.length === 1 ? "先和3位人机过招" : players.length === 2 ? "你们俩，加2位人机开局" : players.length < 5 ? "小包也能开，五人更热闹" : "人齐了，准备一起背锅"}</h2>
      <p>歌曲不用停，边唱边背锅</p>
    </section>
    <section class="invite-strip">
      <div id="qr-code" class="qr-code" aria-label="加入房间二维码"></div>
      <div><span>扫码加入</span><strong>${current.room.code}</strong><small>${players.length}/8 人在场</small></div>
      <button id="share-room" class="icon-button light" type="button" title="复制邀请链接">${icon("share-2", "复制邀请链接")}</button>
    </section>
    <section class="player-section">
      <div class="section-heading"><h3>本包厢</h3><span>${players.filter(player => player.connected).length} 人在线</span></div>
      <div class="player-grid">${players.map(playerCard).join("")}${Array.from({ length: Math.max(0, 8 - players.length) }, emptySeat).join("")}</div>
      ${spectators.length ? `<p class="spectator-line">旁观等待：${spectators.map(item => escapeHtml(item.name)).join("、")}</p>` : ""}
    </section>
    <footer class="action-footer">
      ${isHost ? `<button id="start-game" class="primary-button" type="button">${icon("play", "开始游戏")}<span>${players.length < 3 ? "开始人机体验局" : "开始游戏"}</span></button>` : `<div class="host-waiting"><span class="pulse-dot"></span>等房主 ${escapeHtml(current.room.players.find(p => p.isHost)?.name || "")} 开局</div>`}
      <small>${me.spectator ? "本局旁观，下一局有空位即可加入" : players.length < 3 ? "人机会真实出牌、背锅并参与排名" : "第6张收走整排锅值"}</small>
    </footer>
  </main>`;
}

function playerCard(player: PublicPlayer) {
  return `<div class="player-chip ${player.connected ? "" : "offline"}">
    ${avatar(player.avatar)}
    ${player.isHost ? `<span class="host-badge" title="房主"></span>` : ""}
    <strong>${escapeHtml(player.name)}</strong>
    <small>${player.connected ? (player.spectator ? "旁观" : "已就位") : "重连中"}</small>
  </div>`;
}

function emptySeat() { return `<div class="player-chip empty"><span class="empty-seat"></span><strong>等一位</strong><small>扫码加入</small></div>`; }

function cardHtml(card: number, options: { selectable?: boolean; selected?: boolean; disabled?: boolean; compact?: boolean } = {}) {
  const color = ["coral", "yellow", "aqua"][card % 3];
  return `<button class="number-card ${color} ${options.selected ? "selected" : ""} ${options.compact ? "compact" : ""}" ${options.selectable ? `data-card="${card}"` : ""} ${options.disabled || !options.selectable ? "disabled" : ""} type="button"><span class="card-number">${card}</span><small class="card-pot">锅 ${cardPotValue(card)}</small></button>`;
}

function gameView(current: ServerState) {
  const game = current.game!;
  const me = current.room.players.find(player => player.id === current.room.playerId)!;
  const isResolving = current.room.status === "resolving";
  const remaining = Math.max(0, Math.ceil((game.deadline - Date.now()) / 1000));
  const forecast = selectedCard ? forecastCard(game.rows, selectedCard) : null;
  const bots = current.room.players.filter(player => player.isBot);
  const hasPenalty = Boolean(game.lastResolution?.penalties.length);
  return `<main class="screen game-screen ${isResolving ? "is-resolving" : ""} ${isResolving && hasPenalty ? "has-penalty" : ""}">
    <header class="game-header">
      <div><span>${game.config.label}</span><strong>第 ${Math.min(game.roundIndex + 1, game.config.rounds)} / ${game.config.rounds} 回合</strong></div>
      <div class="score-pill"><span class="pot-icon"></span><b>${me.score}</b><small>背锅值</small></div>
      <button id="sound-toggle" class="icon-button dark" type="button" title="${soundEnabled ? "关闭背景音乐和音效" : "打开背景音乐和音效"}">${icon(soundEnabled ? "volume-2" : "volume-x", soundEnabled ? "关闭背景音乐和音效" : "打开背景音乐和音效")}</button>
      <button id="game-help" class="icon-button dark" type="button" title="玩法说明">${icon("help-circle", "玩法说明")}</button>
    </header>
    <section class="table-area" aria-label="公共牌列">
      <div class="round-status"><span>${isResolving ? "正在排牌" : game.selectedCard ? "等其他人出牌" : "选一张安全牌"}</span><b id="countdown">${isResolving ? "·" : remaining}</b></div>
      <div class="card-rows">${game.rows.map((row, rowIndex) => `<div class="card-row ${forecast?.rowIndex === rowIndex ? "forecast-row" : ""}"><span class="row-label">${rowIndex + 1}</span><div class="row-cards">${row.map(card => cardHtml(card, { compact: true })).join("")}${Array.from({ length: 5 - row.length }, () => `<span class="card-slot"></span>`).join("")}</div><span class="row-count"><b>${rowPotValue(row)}</b>锅<br>${row.length}/5</span></div>`).join("")}</div>
      <div class="submit-count">${game.submittedCount}/${game.totalPlayers} 人已选</div>
      ${bots.length ? `<div class="bot-strip">${bots.map(bot => `<span>${avatar(bot.avatar)}<b>${escapeHtml(bot.name)}</b><i class="${bot.submitted ? "ready" : ""}"></i></span>`).join("")}</div>` : ""}
    </section>
    <section class="hand-area">
      <div class="hand-heading"><span>你的手牌</span><small>${game.selectedCard ? `已出 ${game.selectedCard}${game.selectedDelayed ? " · 已甩锅" : ""}` : "确认后不能更换"}</small></div>
      <div class="hand-cards">${game.hand.map(card => cardHtml(card, { selectable: !game.selectedCard && !isResolving, selected: selectedCard === card, disabled: Boolean(game.selectedCard) || isResolving })).join("")}</div>
      <div class="decision-row">
        <div class="forecast-copy">${forecast ? (forecast.willTakeRow ? (useDelay ? `<strong>甩锅：若仍爆排，${forecast.penaltyPoints}锅转给前一位</strong><span>你的牌将在本轮最后落位</span>` : `<strong>高危：当前会收走第${forecast.rowIndex + 1}排的 ${forecast.penaltyPoints} 锅</strong>`) : `<strong>预计进入第${forecast.rowIndex + 1}排</strong><span>${useDelay ? "甩锅牌最后落位；安全时不会转移锅点" : `当前 ${forecast.currentRowPots} 锅 · ${forecast.currentRowLength}/5张`}</span>`) : `<strong>先选一张，看看风险</strong><span>${useDelay ? "若最后爆排，锅点甩给前一位落牌玩家" : "别人出牌可能改变结果"}</span>`}</div>
        <button id="delay-toggle" class="delay-toggle ${useDelay ? "active" : ""}" type="button" ${!game.delayAvailable || game.selectedCard || isResolving ? "disabled" : ""}><span class="delay-pot"></span><b>${game.delayAvailable ? "甩锅" : "已用"}</b><small>${useDelay ? "爆排转移" : "每局一次"}</small></button>
      </div>
      <button id="confirm-card" class="primary-button confirm-button" type="button" ${!selectedCard || game.selectedCard || isResolving ? "disabled" : ""}><span>${game.selectedCard ? "本轮已确认" : selectedCard ? `确定出 ${selectedCard}${useDelay ? "并甩锅" : ""}` : "先选一张牌"}</span></button>
    </section>
    ${isResolving ? resolutionOverlay(current) : ""}
  </main>`;
}

function resolutionOverlay(current: ServerState) {
  const penalties = current.game?.lastResolution?.penalties || [];
  const placements = current.game?.lastResolution?.placements || [];
  const transfer = penalties.find(item => item.sourcePlayerId);
  const ownPenalty = penalties.find(item => item.playerId === current.room.playerId);
  const ownTransfer = penalties.find(item => item.sourcePlayerId === current.room.playerId);
  const headline = ownTransfer
    ? `你把 ${ownTransfer.points} 锅甩给了${ownTransfer.playerName}`
    : ownPenalty?.sourcePlayerName
      ? `${ownPenalty.sourcePlayerName}把 ${ownPenalty.points} 锅甩给了你`
      : ownPenalty
        ? `你背了 ${ownPenalty.points} 点`
        : transfer
          ? `${transfer.sourcePlayerName}把 ${transfer.points} 锅甩给了${transfer.playerName}`
          : penalties.length ? `${penalties[0].playerName} 挤爆了牌列` : "这轮没人背锅";
  const label = ownTransfer ? "甩锅成功" : ownPenalty?.sourcePlayerName ? "锅被甩来了" : ownPenalty ? "锅从天降" : transfer ? "本轮甩锅" : penalties.length ? "本轮背锅" : "安全落位";
  return `<div class="resolution-overlay ${ownPenalty ? "own-penalty" : ""} ${transfer ? "transferred-penalty" : ""}">
    <div class="placement-parade" aria-label="本轮出牌顺序">${placements.map((placement, index) => `<div class="placement-play ${placement.penalty ? "exploded" : ""}" style="--play-index:${index}"><span>${escapeHtml(placement.play.playerName)}</span><b>${placement.play.card}</b><i>→ 第${placement.rowIndex + 1}排</i></div>`).join("")}</div>
    <div class="${penalties.length ? "penalty-burst" : "safe-landing"}" aria-hidden="true"></div>
    <span>${label}</span>
    <strong>${escapeHtml(headline)}</strong>
    <small>${penalties.length ? penalties.map(item => item.sourcePlayerName ? `${escapeHtml(item.sourcePlayerName)} → ${escapeHtml(item.playerName)} · ${item.points}锅` : `${escapeHtml(item.playerName)} +${item.points}`).join(" · ") : "漂亮，继续稳住"}</small>
  </div>`;
}

const ktvPunishments = [
  "喝一口，酒或饮料均可",
  "和第一名碰杯喝一口，饮料也可以",
  "下一首歌副歌独唱",
  "用方言唱下一句歌词",
  "模仿原唱完成一句"
];

function punishmentFor(code: string, gameIndex: number) {
  const seed = [...code].reduce((total, character) => total + character.charCodeAt(0), gameIndex * 17);
  return ktvPunishments[seed % ktvPunishments.length];
}

function resultCeremonyView(current: ServerState, stage: Exclude<ResultStage, "ranking">) {
  const game = current.game!;
  const me = current.room.players.find(player => player.id === current.room.playerId)!;
  const ranking = game.ranking;
  const winners = ranking.filter(item => item.score === ranking[0]?.score);
  const blame = ranking[ranking.length - 1];
  const previous = ranking[ranking.length - 2];
  const blamePlayer = current.room.players.find(player => player.id === blame?.id);
  const isBlame = blame?.id === me.id;
  const isBot = Boolean(blamePlayer?.isBot);
  const punishment = isBot ? "人机替大家背锅，本局全员免罚" : punishmentFor(current.room.code, current.room.gameIndex);
  const scoreGap = Math.max(0, (blame?.score || 0) - (previous?.score || 0));
  if (stage === "winner") {
    return `<main class="screen result-screen winner ceremony-screen ceremony-winner">
      <button id="skip-ceremony" class="icon-button ceremony-skip" type="button" title="跳过仪式">${icon("x", "跳过仪式")}</button>
      <section class="ceremony-content"><span class="ceremony-kicker">本局不粘锅</span><div class="result-emblem"></div><h1>${escapeHtml(winners.map(item => item.name).join("、"))}</h1><p>${winners[0]?.score || 0} 锅 · 稳稳拿下全场</p></section>
    </main>`;
  }
  if (stage === "blame") {
    return `<main class="screen result-screen ceremony-screen ceremony-blame">
      <button id="skip-ceremony" class="icon-button ceremony-skip" type="button" title="跳过仪式">${icon("x", "跳过仪式")}</button>
      <section class="ceremony-content"><span class="ceremony-kicker">今晚的背锅王是</span><div class="ceremony-avatar">${avatar(blamePlayer?.avatar || 0)}</div><h1>${escapeHtml(blame?.name || "背锅王")}</h1><p><b>${blame?.score || 0}</b> 锅${scoreGap ? ` · 比上一名多 ${scoreGap} 锅` : " · 同分压轴背锅"}</p><div class="ceremony-pot" aria-hidden="true"></div></section>
    </main>`;
  }
  return `<main class="screen result-screen ceremony-screen ceremony-punishment">
    <section class="ceremony-content">
      <span class="ceremony-kicker">背锅王接受惩罚</span>
      <div class="ceremony-avatar">${avatar(blamePlayer?.avatar || 0)}</div>
      <h1>${escapeHtml(blame?.name || "背锅王")}</h1>
      <div class="punishment-draw"><small>KTV 惩罚已抽中</small><strong>${escapeHtml(punishment)}</strong><em>${isBot ? "真人玩家安全过关" : "酒或无酒精饮料均可，任务可跳过"}</em></div>
      <div class="cheer-meter"><span>${game.cheerCount}</span><small>人正在起哄</small><i style="--cheers:${Math.min(100, game.cheerCount / Math.max(1, current.room.connectedCount) * 100)}%"></i></div>
    </section>
    <footer class="ceremony-actions">
      ${isBot ? `<button id="skip-ceremony" class="primary-button" type="button"><span>查看排行榜</span></button>` : isBlame ? `<button id="accept-punishment" class="primary-button" type="button">${icon("check", "我认罚")}<span>我认罚</span></button>` : `<button id="ceremony-cheer" class="primary-button" type="button" ${game.viewerCheered ? "disabled" : ""}>${icon("megaphone", "全场起哄")}<span>${game.viewerCheered ? "已经起哄" : "全场起哄"}</span></button>`}
      ${!isBot ? `<button id="skip-ceremony" class="quiet-button" type="button">先看排行榜</button>` : ""}
    </footer>
  </main>`;
}

function resultView(current: ServerState) {
  const game = current.game!;
  const me = current.room.players.find(player => player.id === current.room.playerId)!;
  const ranking = game.ranking;
  const winnerScore = ranking[0]?.score;
  const blame = ranking[ranking.length - 1];
  const blamePlayer = current.room.players.find(player => player.id === blame?.id);
  const punishment = blamePlayer?.isBot ? "人机替大家背锅，本局全员免罚" : punishmentFor(current.room.code, current.room.gameIndex);
  const winners = ranking.filter(item => item.score === winnerScore);
  const myRank = ranking.findIndex(item => item.id === me.id) + 1;
  const isWinner = winners.some(item => item.id === me.id);
  const isHost = current.room.hostId === me.id;
  const previewStage = preview?.startsWith("ceremony-") ? preview.replace("ceremony-", "") as ResultStage : null;
  const stage = previewStage || resultStage;
  if (stage !== "ranking") return resultCeremonyView(current, stage);
  return `<main class="screen result-screen ${isWinner ? "winner" : ""}">
    <header class="result-hero">
      <span class="result-kicker">第 ${current.room.gameIndex} 局结束</span>
      <div class="result-emblem"></div>
      <h2>${isWinner ? "稳稳不粘锅" : myRank === ranking.length ? "本局背锅王" : `本局第 ${myRank} 名`}</h2>
      <p>${isWinner ? `你只背了 ${me.score} 点，拿下全场` : `${escapeHtml(blame?.name || me.name)} 今天承包了最多意外`}</p>
    </header>
    <section class="result-punishment ${blamePlayer?.isBot ? "bot-punishment" : ""}">
      <span class="punishment-pot" aria-hidden="true"></span>
      <div><small>KTV 背锅惩罚</small><strong>${escapeHtml(blame?.name || "背锅王")}：${escapeHtml(punishment)}</strong><em>${blamePlayer?.isBot ? "真人玩家安全过关" : "不饮酒或未成年人请用无酒精饮料"}</em></div>
      ${blamePlayer?.isBot ? `<span class="punishment-done">免罚</span>` : blame?.id === me.id && !game.punishmentAccepted ? `<button id="accept-punishment" class="icon-button" type="button" title="我认罚">${icon("check", "我认罚")}</button>` : `<button id="cheer-button" class="icon-button" type="button" title="全场起哄" ${game.viewerCheered ? "disabled" : ""}>${icon("megaphone", "全场起哄")}</button>`}
    </section>
    <section class="ranking-list share-result-card">${ranking.map((item, index) => {
      const player = current.room.players.find(candidate => candidate.id === item.id)!;
      return `<div class="rank-row ${item.id === me.id ? "me" : ""}"><b>${index + 1}</b>${avatar(player?.avatar || 0)}<span>${escapeHtml(item.name)}${item.id === me.id ? "（你）" : ""}</span><strong>${item.score}<small>点</small></strong></div>`;
    }).join("")}</section>
    <footer class="result-actions">
      <div class="vote-progress"><span>${current.room.rematchVotes}/${current.room.rematchThreshold} 人想再来</span><i style="--progress:${Math.min(100, current.room.rematchVotes / current.room.rematchThreshold * 100)}%"></i></div>
      ${me.rematchVote ? (isHost && current.room.rematchVotes >= current.room.rematchThreshold ? `<button id="start-rematch" class="primary-button" type="button">${icon("play", "开始下一局")}<span>开始下一局</span></button>` : `<div class="host-waiting"><span class="pulse-dot"></span>已举手，等大家就位</div>`) : `<button id="vote-rematch" class="primary-button" type="button">${icon("rotate-ccw", "再来一局")}<span>再来一局</span></button>`}
      <button id="return-singing" class="secondary-button full" type="button">${icon("door-open", "继续唱歌")}<span>继续唱歌</span></button>
    </footer>
  </main>`;
}

function tutorialView() {
  const rows = [[12, 18], [25, 30, 33, 35, 38], [49, 54], [70]];
  const hand = [39, 55, 73];
  const forecast = tutorialSelected ? forecastCard(rows, tutorialSelected) : null;
  if (!tutorialStarted) {
    return `<div class="tutorial-modal tutorial-intro" role="dialog" aria-modal="true" aria-label="完整玩法说明">
      <button id="close-tutorial" class="icon-button" type="button" title="关闭教程">${icon("x", "关闭教程")}</button>
      <header class="tutorial-level-header"><span>第一次玩先看这里</span><strong>这局到底要干什么？</strong></header>
      <div class="tutorial-intro-art" aria-hidden="true"></div>
      <p class="tutorial-goal"><b>目标：</b>尽量不收牌，游戏结束时锅值最低的人获胜。</p>
      <section class="tutorial-rules">
        <div><b>1</b><span><strong>开局拿牌</strong><small>每人发5～8张手牌，每轮同时选1张，手牌出完就结算。</small></span></div>
        <div><b>2</b><span><strong>从小到大落牌</strong><small>所有人一起翻牌，系统按数字由小到大依次放置。</small></span></div>
        <div><b>3</b><span><strong>只能接在排尾右边</strong><small>牌会接到“比它小、而且数字最接近”的排尾后面。</small></span></div>
        <div><b>4</b><span><strong>第6张的人背锅</strong><small>每排最多5张；再放第6张，就收走前5张的全部锅值。</small></span></div>
      </section>
      <div class="tutorial-example"><b>例：</b>四排尾数是18、38、54、70。你出39，只能接在38右边，因为38是小于39且最接近它的排尾。</div>
      <div class="tutorial-special"><b>还有两点：</b>牌比四个排尾都小时，系统拿走当前张数最少的一排；每局一次“甩锅”会让牌最后落位，若仍爆排，锅点转给前一位落牌玩家。</div>
      <button id="tutorial-next" class="primary-button" type="button"><span>明白了，开始教学关</span></button>
    </div>`;
  }
  const guides = [
    { title: "先看哪排最危险", text: "第2排已经有5张、累计12锅。再进去一张就会收走整排。" },
    { title: "故意点一下 39", text: "选牌后会预估落点。先看看39为什么危险。" },
    { title: "换成安全的 55", text: "39会挤爆第2排。改选55，它当前会进入第3排。" },
    { title: "换回39，再按甩锅", text: "39仍会挤爆第2排，但甩锅后，12锅会转给本轮前一位落牌玩家。每局只能用一次。" }
  ];
  const guide = guides[tutorialStep];
  if (tutorialComplete) {
    return `<div class="tutorial-modal tutorial-level complete" role="dialog" aria-modal="true" aria-label="教学完成">
      <div class="tutorial-complete-art"><span class="result-emblem"></span></div>
      <span class="tutorial-kicker">教学关完成</span>
      <h2>你已经会避锅了</h2>
      <p>看锅值、看预计落点；躲不开时，用甩锅把锅点转给前一位。</p>
      <button id="finish-tutorial" class="primary-button" type="button"><span>进入包厢</span></button>
    </div>`;
  }
  return `<div class="tutorial-modal" role="dialog" aria-modal="true" aria-label="玩法教程">
    <button id="close-tutorial" class="icon-button" type="button" title="关闭教程">${icon("x", "关闭教程")}</button>
    <header class="tutorial-level-header"><span>教学关 · 1/1</span><strong>避开这一锅</strong></header>
    <section class="tutorial-board">
      <div class="tutorial-rows">${rows.map((row, rowIndex) => `<div class="tutorial-row ${forecast?.rowIndex === rowIndex ? "forecast-row" : ""} ${rowIndex === 1 && tutorialStep === 0 ? "danger-row" : ""}"><span>${rowIndex + 1}</span><div>${row.map(card => cardHtml(card, { compact: true })).join("")}${Array.from({ length: 5 - row.length }, () => `<i></i>`).join("")}</div><b>${rowPotValue(row)}锅<br><small>${row.length}/5</small></b></div>`).join("")}</div>
      <div class="tutorial-forecast">${forecast ? (forecast.willTakeRow ? (tutorialStep === 3 && tutorialDelay ? `甩锅成功：第${forecast.rowIndex + 1}排的${forecast.penaltyPoints}锅转给前一位` : `当前会收走第${forecast.rowIndex + 1}排 · ${forecast.penaltyPoints}锅`) : `预计进入第${forecast.rowIndex + 1}排 · 当前${forecast.currentRowPots}锅`) : "点击手牌后显示预计落点"}</div>
    </section>
    <section class="tutorial-hand">${hand.map(card => `<button class="number-card ${tutorialSelected === card ? "selected" : ""}" data-tutorial-card="${card}" type="button"><span class="card-number">${card}</span><small class="card-pot">锅 ${cardPotValue(card)}</small></button>`).join("")}</section>
    <section class="tutorial-guide"><span>0${tutorialStep + 1} / 04</span><h2>${guide.title}</h2><p>${guide.text}</p></section>
    ${tutorialStep === 3 ? `<button id="tutorial-delay" class="delay-toggle tutorial-delay ${tutorialDelay ? "active" : ""}" type="button" ${tutorialSelected !== 39 ? "disabled" : ""}><span class="delay-pot"></span><b>甩锅</b><small>${tutorialDelay ? "爆排锅点转给前一位" : "点一下，消耗本局机会"}</small></button>` : ""}
    <button id="tutorial-next" class="primary-button" type="button" ${tutorialStep === 1 || tutorialStep === 2 || (tutorialStep === 3 && (!tutorialDelay || tutorialSelected !== 39)) ? "disabled" : ""}><span>${tutorialStep === 0 ? "我看到了" : tutorialStep === 3 ? "确认出39并甩锅" : "按提示选择手牌"}</span></button>
  </div>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

function previewState(kind: string): ServerState {
  const players: PublicPlayer[] = Array.from({ length: 7 }, (_, index) => ({ id: `p${index}`, name: ["不粘锅", "阿梨", "小周", "Momo", "陈同学", "Kiki", "稳住哥"][index], avatar: index, connected: index !== 6, spectator: false, isHost: index === 0, timeoutCount: 0, rematchVote: index < 4, score: [0, 5, 1, 10, 5, 2, 6][index], submitted: index < 5 }));
  const aiMode = kind === "ai";
  if (aiMode) {
    players.splice(1, players.length - 1,
      { id: "bot-steady", name: "稳锅小周", avatar: 8, connected: true, spectator: false, isHost: false, isBot: true, timeoutCount: 0, rematchVote: false, score: 2, submitted: true },
      { id: "bot-chaos", name: "搞事阿梨", avatar: 9, connected: true, spectator: false, isHost: false, isBot: true, timeoutCount: 0, rematchVote: false, score: 6, submitted: false },
      { id: "bot-tricky", name: "后手Kiki", avatar: 10, connected: true, spectator: false, isHost: false, isBot: true, timeoutCount: 0, rematchVote: false, score: 3, submitted: true }
    );
  }
  const status = (["result", "winner", "ceremony-winner", "ceremony-blame", "ceremony-punishment"].includes(kind) ? "result" : kind === "penalty" ? "resolving" : ["game", "ai"].includes(kind) ? "playing" : "waiting") as RoomStatus;
  const config = aiMode ? { mode: "ai", label: "人机体验局", rounds: 6 } : { mode: "standard", label: "标准局", rounds: 5 };
  return { serverTime: Date.now(), room: { code: "KTV888", status, hostId: "p0", playerId: kind === "result" ? "p3" : "p0", activeCount: aiMode ? 1 : 7, connectedCount: aiMode ? 1 : 6, gameIndex: 2, players, recommendedMode: config, rematchThreshold: aiMode ? 1 : 5, rematchVotes: aiMode ? 0 : 4 }, game: status === "waiting" ? null : { config, roundIndex: status === "result" ? config.rounds : 2, rows: [[8, 14, 22], [27, 31, 40, 44, 48], [53, 61], [72, 79, 83, 91]], hand: [19, 35, 50, 67], selectedCard: status === "playing" ? null : 50, selectedDelayed: false, delayAvailable: true, deadline: Date.now() + 8000, submittedCount: aiMode ? 2 : 5, totalPlayers: aiMode ? 4 : 7, ranking: players.map(p => ({ id: p.id, name: p.name, score: p.score })).sort((a, b) => a.score - b.score), cheerCount: 4, viewerCheered: false, punishmentAccepted: false, lastResolution: status === "resolving" ? { placements: [
    { play: { playerId: "p0", playerName: "不粘锅", card: 19 }, rowIndex: 0, rowsAfter: [] },
    { play: { playerId: "p2", playerName: "小周", card: 50 }, rowIndex: 1, rowsAfter: [], penalty: { playerId: "p0", playerName: "不粘锅", sourcePlayerId: "p2", sourcePlayerName: "小周", points: 5, reason: "sixth-card", card: 50, rowIndex: 1 } }
  ], penalties: [{ playerId: "p0", playerName: "不粘锅", sourcePlayerId: "p2", sourcePlayerName: "小周", points: 5 }] } : undefined } };
}

function render() {
  if (preview && preview !== "home") state = previewState(preview);
  let html = !state ? homeView() : state.room.status === "waiting" ? waitingView(state) : state.room.status === "result" ? resultView(state) : gameView(state);
  if (tutorialOpen || preview === "tutorial") html += tutorialView();
  if (!connected && session && !preview) html += `<div class="connection-banner">${icon("wifi-off", "连接中断")}<span>连接中断，正在恢复牌局</span></div>`;
  if (errorMessage) html += `<div class="toast" role="alert">${escapeHtml(errorMessage)}</div>`;
  app.innerHTML = html;
  hydrateIcons();
  bindEvents();
  if (state?.room.status === "waiting") renderQr();
  manageCountdown();
}

async function renderQr() {
  const container = document.querySelector<HTMLDivElement>("#qr-code");
  if (!container || !state) return;
  const link = `${location.origin}${location.pathname}?join=${state.room.code}`;
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, link, { width: 128, margin: 1, color: { dark: "#151515", light: "#ffffff" } });
  container.replaceChildren(canvas);
}

function manageCountdown() {
  if (countdownTimer !== null) window.clearInterval(countdownTimer);
  if (state?.room.status !== "playing" || preview) return;
  countdownTimer = window.setInterval(() => {
    const element = document.querySelector("#countdown");
    if (element && state?.game) {
      const remaining = Math.max(0, Math.ceil((state.game.deadline - Date.now()) / 1000));
      element.textContent = String(remaining);
      element.classList.toggle("urgent", remaining <= 3);
      if (remaining === 3 && navigator.vibrate) navigator.vibrate(60);
    }
  }, 250);
}

function syncProfileInputs() {
  const input = document.querySelector<HTMLInputElement>("#profile-name");
  if (input) profile.name = input.value.trim() || profile.name;
}

function bindEvents() {
  document.querySelector("#avatar-picker")?.addEventListener("click", () => { profile.avatar = (profile.avatar + 1) % 12; syncProfileInputs(); render(); });
  document.querySelector("#create-room")?.addEventListener("click", () => { unlockAudio(); syncProfileInputs(); createRoom(); });
  document.querySelector("#join-room")?.addEventListener("click", () => { unlockAudio(); syncProfileInputs(); joinRoom(document.querySelector<HTMLInputElement>("#room-code")?.value || ""); });
  document.querySelector("#home-help")?.addEventListener("click", openTutorial);
  document.querySelector("#room-help")?.addEventListener("click", openTutorial);
  document.querySelector("#game-help")?.addEventListener("click", openTutorial);
  document.querySelector("#leave-room")?.addEventListener("click", leaveRoom);
  document.querySelector("#start-game")?.addEventListener("click", () => { playSound("confirm"); send("start_game"); });
  document.querySelector("#start-rematch")?.addEventListener("click", () => { playSound("confirm"); send("start_game"); });
  document.querySelector("#vote-rematch")?.addEventListener("click", () => send("rematch"));
  document.querySelector("#return-singing")?.addEventListener("click", () => { track("return_to_singing", { state: state?.room.status }); leaveRoom(); });
  document.querySelector("#share-room")?.addEventListener("click", async () => {
    const link = `${location.origin}${location.pathname}?join=${state?.room.code}`;
    await navigator.clipboard?.writeText(link);
    showError("邀请链接已复制");
  });
  document.querySelector("#sound-toggle")?.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("room-blame-king-sound", soundEnabled ? "on" : "off");
    if (soundEnabled) { playSound("confirm"); manageBgm(); } else stopBgm();
    render();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-card]").forEach(button => button.addEventListener("click", () => { selectedCard = Number(button.dataset.card); playSound("select"); render(); }));
  document.querySelector("#delay-toggle")?.addEventListener("click", () => { useDelay = !useDelay; playSound(useDelay ? "danger" : "select"); render(); });
  document.querySelector("#confirm-card")?.addEventListener("click", () => {
    if (!selectedCard) return;
    if (navigator.vibrate) navigator.vibrate(35);
    playSound("confirm");
    send("select_card", { card: selectedCard, delayed: useDelay });
  });
  document.querySelectorAll("#cheer-button, #ceremony-cheer").forEach(button => button.addEventListener("click", event => {
    playSound("cheer");
    if (navigator.vibrate) navigator.vibrate([60, 35, 60]);
    (event.currentTarget as HTMLElement).closest(".result-punishment")?.classList.add("cheered");
    if (!preview) send("cheer");
    track("ktv_punishment_cheered", { gameIndex: state?.room.gameIndex });
  }));
  document.querySelector("#accept-punishment")?.addEventListener("click", () => {
    playSound("confirm");
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    if (!preview) send("accept_punishment");
  });
  document.querySelector("#skip-ceremony")?.addEventListener("click", () => {
    clearResultCeremony();
    resultStage = "ranking";
    render();
  });
  document.querySelector("#close-tutorial")?.addEventListener("click", closeTutorial);
  document.querySelectorAll<HTMLButtonElement>("[data-tutorial-card]").forEach(button => button.addEventListener("click", () => {
    const card = Number(button.dataset.tutorialCard);
    if (tutorialStep === 1 && card !== 39) { showError("先点39，看看危险落点"); return; }
    if (tutorialStep === 2 && card !== 55) { showError("这一步换成55"); return; }
    if (tutorialStep === 3 && card !== 39) { showError("换回39，再用甩锅转移这12锅"); return; }
    tutorialSelected = card;
    if (tutorialStep === 1 || tutorialStep === 2) tutorialStep += 1;
    render();
  }));
  document.querySelector("#tutorial-delay")?.addEventListener("click", () => { tutorialDelay = !tutorialDelay; render(); });
  document.querySelector("#tutorial-next")?.addEventListener("click", () => {
    if (!tutorialStarted) tutorialStarted = true;
    else if (tutorialStep === 0) tutorialStep = 1;
    else if (tutorialStep === 3 && tutorialDelay) tutorialComplete = true;
    render();
  });
  document.querySelector("#finish-tutorial")?.addEventListener("click", finishTutorial);
}

if (!preview) {
  document.addEventListener("pointerdown", () => unlockAudio(), { once: true, capture: true });
  document.addEventListener("keydown", () => unlockAudio(), { once: true, capture: true });
}

if (preview) { connected = true; render(); }
else if (session) connect();
else render();

if (!preview) unlockAudio();
