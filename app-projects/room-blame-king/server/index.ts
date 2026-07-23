import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import { MAX_ACTIVE_PLAYERS, dealGame, forecastCard, modeForPlayerCount, rankingFor, rematchThreshold, resolveRound, rowPotValue, type CardPlay, type ModeConfig, type RoundResolution } from "../shared/game.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const dataDir = process.env.DATA_DIR || path.join(rootDir, "server", "data");
const eventLogPath = path.join(dataDir, "events.jsonl");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4331);
const roundSecondsOverride = process.env.ROUND_SECONDS ? Number(process.env.ROUND_SECONDS) : null;
const resolveDelayOverride = process.env.RESOLVE_DELAY_MS ? Number(process.env.RESOLVE_DELAY_MS) : null;
const roomTtlMs = 2 * 60 * 60 * 1000;

fs.mkdirSync(dataDir, { recursive: true });

type RoomStatus = "waiting" | "playing" | "resolving" | "result";

interface Player {
  id: string;
  sessionToken: string;
  name: string;
  avatar: number;
  connected: boolean;
  spectator: boolean;
  joinedAt: number;
  lastSeenAt: number;
  timeoutCount: number;
  rematchVote: boolean;
  socket?: WebSocket;
  requestIds: Set<string>;
}

interface GameState {
  config: ModeConfig;
  roundIndex: number;
  rows: number[][];
  hands: Map<string, number[]>;
  systemHands: number[][];
  bots: BotPlayer[];
  scores: Map<string, number>;
  selections: Map<string, { card: number; delayed: boolean }>;
  delayAvailable: Map<string, boolean>;
  deadline: number;
  timer?: NodeJS.Timeout;
  nextRoundTimer?: NodeJS.Timeout;
  botTimers: NodeJS.Timeout[];
  lastResolution?: RoundResolution;
  cheers: Set<string>;
  punishmentAccepted: boolean;
  startedAt: number;
}

interface BotPlayer {
  id: string;
  name: string;
  avatar: number;
  strategy: "steady" | "chaos" | "tricky";
}

interface Room {
  code: string;
  roomToken: string;
  hostId: string;
  players: Map<string, Player>;
  status: RoomStatus;
  game?: GameState;
  createdAt: number;
  lastActivity: number;
  gameIndex: number;
}

const rooms = new Map<string, Room>();
const botTemplates: BotPlayer[] = [
  { id: "bot-steady", name: "稳锅小周", avatar: 8, strategy: "steady" },
  { id: "bot-chaos", name: "搞事阿梨", avatar: 9, strategy: "chaos" },
  { id: "bot-tricky", name: "后手Kiki", avatar: 10, strategy: "tricky" }
];

function randomId(bytes = 16) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function roomCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = Array.from({ length: 6 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
    if (!rooms.has(code)) return code;
  }
  throw new Error("unable to allocate room code");
}

function safeName(value: unknown) {
  const text = String(value || "").trim().replace(/[<>]/g, "").slice(0, 16);
  return text || `玩家${crypto.randomInt(10, 99)}`;
}

function appendEvent(event: string, room?: Room, player?: Player, properties: Record<string, unknown> = {}) {
  const payload = {
    event,
    occurredAt: new Date().toISOString(),
    roomCode: room?.code,
    playerId: player?.id,
    gameIndex: room?.gameIndex,
    mode: room?.game?.config.mode,
    roundIndex: room?.game?.roundIndex,
    ...properties
  };
  fs.appendFile(eventLogPath, `${JSON.stringify(payload)}\n`, () => undefined);
}

function activePlayers(room: Room) {
  return [...room.players.values()].filter(player => !player.spectator);
}

function connectedActivePlayers(room: Room) {
  return activePlayers(room).filter(player => player.connected);
}

function migrateHost(room: Room) {
  const current = room.players.get(room.hostId);
  if (current?.connected && !current.spectator) return;
  const next = [...room.players.values()].filter(player => player.connected).sort((a, b) => Number(a.spectator) - Number(b.spectator) || a.joinedAt - b.joinedAt)[0];
  if (next && next.id !== room.hostId) {
    next.spectator = false;
    room.hostId = next.id;
    appendEvent("host_migrated", room, next);
  }
}

function rebalanceRoster(room: Room, preferredIds?: Set<string>, preferredOnly = false) {
  const connected = [...room.players.values()].filter(player => player.connected);
  const preferred = connected.filter(player => preferredIds?.has(player.id));
  const currentActive = preferredOnly ? [] : connected.filter(player => !player.spectator && !preferredIds?.has(player.id));
  const waiting = preferredOnly ? [] : connected.filter(player => player.spectator && !preferredIds?.has(player.id));
  const selected = [...preferred, ...currentActive, ...waiting].slice(0, MAX_ACTIVE_PLAYERS);
  const selectedIds = new Set(selected.map(player => player.id));
  for (const player of room.players.values()) player.spectator = !selectedIds.has(player.id);
  return selected;
}

function publicPlayer(player: Player, room: Room) {
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    connected: player.connected,
    spectator: player.spectator,
    isHost: room.hostId === player.id,
    timeoutCount: player.timeoutCount,
    rematchVote: player.rematchVote,
    score: room.game?.scores.get(player.id) || 0,
    submitted: room.game?.selections.has(player.id) || false
  };
}

function publicBot(bot: BotPlayer, game: GameState) {
  return {
    id: bot.id,
    name: bot.name,
    avatar: bot.avatar,
    connected: true,
    spectator: false,
    isHost: false,
    isBot: true,
    timeoutCount: 0,
    rematchVote: false,
    score: game.scores.get(bot.id) || 0,
    submitted: game.selections.has(bot.id)
  };
}

function gameRanking(room: Room) {
  const game = room.game;
  if (!game) return [];
  return rankingFor([
    ...activePlayers(room).filter(player => game.scores.has(player.id)).map(player => ({ id: player.id, name: player.name, score: game.scores.get(player.id) || 0 })),
    ...game.bots.map(bot => ({ id: bot.id, name: bot.name, score: game.scores.get(bot.id) || 0 }))
  ]);
}

function roomView(room: Room, viewer: Player) {
  const activeCount = activePlayers(room).length;
  const connectedCount = connectedActivePlayers(room).length;
  const game = room.game;
  const ranking = gameRanking(room);
  const recommendation = modeForPlayerCount(Math.max(1, connectedCount));
  const recommendedMode = connectedCount <= 2
    ? { ...recommendation, mode: "ai", label: "人机体验局", rounds: 6, systemCardsPerRound: 0 }
    : recommendation;
  const viewerSelection = game?.selections.get(viewer.id);
  return {
    type: "state",
    serverTime: Date.now(),
    room: {
      code: room.code,
      status: room.status,
      hostId: room.hostId,
      playerId: viewer.id,
      activeCount,
      connectedCount,
      gameIndex: room.gameIndex,
      players: [
        ...[...room.players.values()].map(player => publicPlayer(player, room)),
        ...(game?.bots.map(bot => publicBot(bot, game)) || [])
      ],
      recommendedMode,
      rematchThreshold: rematchThreshold(Math.max(1, connectedCount)),
      rematchVotes: [...room.players.values()].filter(player => player.connected && player.rematchVote).length
    },
    game: game
      ? {
          config: game.config,
          roundIndex: game.roundIndex,
          rows: game.rows,
          hand: game.hands.get(viewer.id) || [],
          selectedCard: viewerSelection?.card || null,
          selectedDelayed: viewerSelection?.delayed || false,
          delayAvailable: game.delayAvailable.get(viewer.id) || false,
          deadline: game.deadline,
          submittedCount: game.selections.size,
          totalPlayers: game.hands.size,
          ranking,
          cheerCount: game.cheers.size,
          viewerCheered: game.cheers.has(viewer.id),
          punishmentAccepted: game.punishmentAccepted,
          lastResolution: room.status === "resolving" ? game.lastResolution : undefined
        }
      : null
  };
}

function send(player: Player, payload: unknown) {
  if (player.socket?.readyState === WebSocket.OPEN) player.socket.send(JSON.stringify(payload));
}

function broadcast(room: Room) {
  room.lastActivity = Date.now();
  migrateHost(room);
  for (const player of room.players.values()) send(player, roomView(room, player));
}

function randomCard(hand: number[]) {
  return hand[crypto.randomInt(hand.length)];
}

function chooseBotMove(game: GameState, bot: BotPlayer) {
  const hand = game.hands.get(bot.id) || [];
  const options = hand.map(card => ({ card, forecast: forecastCard(game.rows, card) }));
  if (!options.length) throw new Error(`bot ${bot.id} has no cards`);

  if (bot.strategy === "chaos") {
    options.sort((a, b) => {
      const aTrap = a.forecast.willTakeRow ? -1 : a.forecast.currentRowLength;
      const bTrap = b.forecast.willTakeRow ? -1 : b.forecast.currentRowLength;
      return bTrap - aTrap || a.forecast.penaltyPoints - b.forecast.penaltyPoints || a.card - b.card;
    });
  } else {
    options.sort((a, b) => a.forecast.penaltyPoints - b.forecast.penaltyPoints || a.forecast.currentRowPots - b.forecast.currentRowPots || a.card - b.card);
  }

  const chosen = options[0];
  const canDelay = game.delayAvailable.get(bot.id) || false;
  const delayed = canDelay && (bot.strategy === "tricky" ? chosen.forecast.currentRowLength >= 4 : chosen.forecast.penaltyPoints >= 6);
  return { card: chosen.card, delayed };
}

function maybeResolveWhenReady(room: Room) {
  const game = room.game;
  if (game && room.status === "playing" && game.selections.size >= game.hands.size) resolveCurrentRound(room);
}

function startRound(room: Room) {
  const game = room.game;
  if (!game) return;
  room.status = "playing";
  game.botTimers.forEach(clearTimeout);
  game.botTimers = [];
  game.selections.clear();
  game.lastResolution = undefined;
  const roundSeconds = roundSecondsOverride ?? (game.roundIndex === 0 ? 10 : 7);
  game.deadline = Date.now() + roundSeconds * 1000;
  clearTimeout(game.timer);
  game.timer = setTimeout(() => resolveCurrentRound(room), roundSeconds * 1000 + 50);
  appendEvent("round_started", room, undefined, { activePlayerCount: activePlayers(room).length });
  broadcast(room);
  game.bots.forEach((bot, index) => {
    const timer = setTimeout(() => {
      if (!room.game || room.status !== "playing" || room.game.roundIndex !== game.roundIndex || room.game.selections.has(bot.id)) return;
      const move = chooseBotMove(room.game, bot);
      room.game.selections.set(bot.id, move);
      if (move.delayed) room.game.delayAvailable.set(bot.id, false);
      appendEvent("bot_card_confirmed", room, undefined, { botId: bot.id, strategy: bot.strategy, card: move.card, delayed: move.delayed });
      broadcast(room);
      maybeResolveWhenReady(room);
    }, 450 + index * 380 + crypto.randomInt(0, 320));
    game.botTimers.push(timer);
  });
}

function finishGame(room: Room) {
  if (!room.game) return;
  room.status = "result";
  room.game.botTimers.forEach(clearTimeout);
  room.game.deadline = 0;
  for (const player of room.players.values()) player.rematchVote = false;
  appendEvent("round_completed", room, undefined, {
    durationMs: Date.now() - room.game.startedAt,
    activePlayerCount: activePlayers(room).length
  });
  broadcast(room);
}

function resolveCurrentRound(room: Room) {
  const game = room.game;
  if (!game || room.status !== "playing") return;
  clearTimeout(game.timer);
  game.botTimers.forEach(clearTimeout);
  game.botTimers = [];
  const plays: CardPlay[] = [];

  for (const player of activePlayers(room)) {
    const hand = game.hands.get(player.id) || [];
    if (hand.length === 0) continue;
    let move = game.selections.get(player.id);
    if (!move || !hand.includes(move.card)) {
      move = { card: randomCard(hand), delayed: false };
      game.selections.set(player.id, move);
      player.timeoutCount += 1;
      appendEvent("card_auto_played", room, player, { card: move.card });
    }
    plays.push({ playerId: player.id, playerName: player.name, card: move.card, delayed: move.delayed });
  }

  for (const bot of game.bots) {
    const hand = game.hands.get(bot.id) || [];
    if (!hand.length) continue;
    const move = game.selections.get(bot.id) || chooseBotMove(game, bot);
    game.selections.set(bot.id, move);
    if (move.delayed) game.delayAvailable.set(bot.id, false);
    plays.push({ playerId: bot.id, playerName: bot.name, card: move.card, delayed: move.delayed });
  }

  const resolution = resolveRound(game.rows, plays);
  game.rows = resolution.rows;
  game.lastResolution = resolution;
  for (const play of plays) {
    const hand = game.hands.get(play.playerId) || [];
    game.hands.set(play.playerId, hand.filter(card => card !== play.card));
  }
  for (const penalty of resolution.penalties) {
    game.scores.set(penalty.playerId, (game.scores.get(penalty.playerId) || 0) + penalty.points);
    appendEvent("penalty_triggered", room, room.players.get(penalty.playerId), {
      points: penalty.points,
      reason: penalty.reason,
      card: penalty.card,
      rowIndex: penalty.rowIndex,
      sourcePlayerId: penalty.sourcePlayerId,
      sourcePlayerName: penalty.sourcePlayerName
    });
  }

  room.status = "resolving";
  game.deadline = 0;
  appendEvent("round_resolved", room, undefined, { penalties: resolution.penalties.length });
  broadcast(room);

  clearTimeout(game.nextRoundTimer);
  game.nextRoundTimer = setTimeout(() => {
    if (!room.game || room.status !== "resolving") return;
    room.game.roundIndex += 1;
    if (room.game.roundIndex >= room.game.config.rounds) finishGame(room);
    else startRound(room);
  }, resolveDelayOverride ?? (resolution.penalties.length ? Math.min(2500, 1500 + game.hands.size * 120) : Math.min(1500, 850 + game.hands.size * 80)));
}

function startGame(room: Room, actor: Player) {
  if (actor.id !== room.hostId) throw new Error("only host can start");
  if (!actor.connected) throw new Error("host is offline");
  if (room.status === "playing" || room.status === "resolving") throw new Error("game already running");

  if (room.status === "result") {
    const votes = [...room.players.values()].filter(player => player.connected && player.rematchVote);
    const threshold = rematchThreshold(Math.max(1, connectedActivePlayers(room).length));
    if (votes.length < threshold) throw new Error("not enough rematch votes");
    const voterIds = new Set(votes.map(player => player.id));
    rebalanceRoster(room, voterIds, true);
  } else {
    rebalanceRoster(room);
  }

  const participants = connectedActivePlayers(room).slice(0, MAX_ACTIVE_PLAYERS);
  if (participants.length === 0) throw new Error("no active players");
  const bots = participants.length <= 2 ? botTemplates.slice(0, 4 - participants.length).map(bot => ({ ...bot })) : [];
  const participantIds = [...participants.map(player => player.id), ...bots.map(bot => bot.id)];
  const dealt = dealGame(participantIds);
  const config: ModeConfig = bots.length
    ? { ...dealt.config, mode: "ai", label: "人机体验局", systemCardsPerRound: 0 }
    : dealt.config;
  for (const player of room.players.values()) {
    player.timeoutCount = 0;
    player.rematchVote = false;
  }
  room.gameIndex += 1;
  room.game = {
    config,
    roundIndex: 0,
    rows: dealt.rows,
    hands: dealt.hands,
    systemHands: [],
    bots,
    scores: new Map(participantIds.map(playerId => [playerId, 0])),
    selections: new Map(),
    delayAvailable: new Map(participantIds.map(playerId => [playerId, true])),
    deadline: 0,
    botTimers: [],
    cheers: new Set(),
    punishmentAccepted: false,
    startedAt: Date.now()
  };
  appendEvent("game_started", room, actor, { humanPlayerCount: participants.length, botCount: bots.length, activePlayerCount: participantIds.length, mode: config.mode });
  startRound(room);
}

function selectCard(room: Room, player: Player, value: unknown, wantsDelay: unknown) {
  const game = room.game;
  const card = Number(value);
  if (!game || room.status !== "playing") throw new Error("round is not accepting cards");
  if (player.spectator) throw new Error("spectators cannot play");
  if (game.selections.has(player.id)) return;
  const hand = game.hands.get(player.id) || [];
  if (!hand.includes(card)) throw new Error("card is not in hand");
  const delayed = Boolean(wantsDelay) && Boolean(game.delayAvailable.get(player.id));
  game.selections.set(player.id, { card, delayed });
  if (delayed) game.delayAvailable.set(player.id, false);
  appendEvent("card_confirmed", room, player, { card, delayed, rowPotValue: rowPotValue(game.rows[forecastCard(game.rows, card).rowIndex]), remainingMs: Math.max(0, game.deadline - Date.now()) });
  broadcast(room);
  maybeResolveWhenReady(room);
}

function voteRematch(room: Room, player: Player) {
  if (room.status !== "result" || !player.connected) throw new Error("rematch unavailable");
  player.rematchVote = true;
  appendEvent("rematch_voted", room, player, { activePlayerCount: activePlayers(room).length });
  broadcast(room);
}

function cheerResult(room: Room, player: Player) {
  const game = room.game;
  if (!game || room.status !== "result" || !player.connected) throw new Error("cheer unavailable");
  game.cheers.add(player.id);
  appendEvent("result_cheered", room, player, { cheerCount: game.cheers.size });
  broadcast(room);
}

function acceptPunishment(room: Room, player: Player) {
  const game = room.game;
  if (!game || room.status !== "result" || !player.connected) throw new Error("punishment unavailable");
  const blame = gameRanking(room).at(-1);
  if (blame?.id !== player.id) throw new Error("only the last player can accept punishment");
  game.punishmentAccepted = true;
  appendEvent("punishment_accepted", room, player, { score: blame.score, cheerCount: game.cheers.size });
  broadcast(room);
}

function handleAction(room: Room, player: Player, message: any) {
  const requestId = String(message.requestId || "");
  if (requestId) {
    if (player.requestIds.has(requestId)) return;
    player.requestIds.add(requestId);
    if (player.requestIds.size > 100) player.requestIds.delete(player.requestIds.values().next().value as string);
  }
  switch (message.action) {
    case "update_profile":
      player.name = safeName(message.name);
      player.avatar = Math.max(0, Math.min(11, Number(message.avatar) || 0));
      appendEvent("profile_updated", room, player);
      broadcast(room);
      break;
    case "start_game":
      startGame(room, player);
      break;
    case "select_card":
      selectCard(room, player, message.card, message.delayed);
      break;
    case "rematch":
      voteRematch(room, player);
      break;
    case "cheer":
      cheerResult(room, player);
      break;
    case "accept_punishment":
      acceptPunishment(room, player);
      break;
    case "leave":
      player.connected = false;
      player.socket?.close();
      migrateHost(room);
      broadcast(room);
      break;
    default:
      throw new Error("unknown action");
  }
}

function readJson(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 256_000) reject(new Error("request body too large"));
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(error); }
    });
  });
}

function json(res: http.ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(payload));
}

function createPlayer(input: any): Player {
  return {
    id: randomId(10),
    sessionToken: randomId(24),
    name: safeName(input.name),
    avatar: Math.max(0, Math.min(11, Number(input.avatar) || 0)),
    connected: false,
    spectator: false,
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
    timeoutCount: 0,
    rematchVote: false,
    requestIds: new Set()
  };
}

async function apiRequest(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, { ok: true, rooms: rooms.size, now: Date.now() });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/rooms") {
    const input = await readJson(req);
    const player = createPlayer(input);
    const code = roomCode();
    const room: Room = {
      code,
      roomToken: randomId(24),
      hostId: player.id,
      players: new Map([[player.id, player]]),
      status: "waiting",
      createdAt: Date.now(),
      lastActivity: Date.now(),
      gameIndex: 0
    };
    rooms.set(code, room);
    appendEvent("room_created", room, player);
    json(res, 201, { code, playerId: player.id, sessionToken: player.sessionToken, roomToken: room.roomToken });
    return;
  }
  const joinMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/join$/);
  if (req.method === "POST" && joinMatch) {
    const room = rooms.get(joinMatch[1]);
    if (!room) { json(res, 404, { error: "房间不存在或已结束" }); return; }
    const input = await readJson(req);
    const player = createPlayer(input);
    player.spectator = activePlayers(room).length >= MAX_ACTIVE_PLAYERS || room.status === "playing" || room.status === "resolving";
    room.players.set(player.id, player);
    room.lastActivity = Date.now();
    appendEvent("player_joined", room, player, { joinOrder: room.players.size, spectator: player.spectator });
    json(res, 201, { code: room.code, playerId: player.id, sessionToken: player.sessionToken, spectator: player.spectator });
    broadcast(room);
    return;
  }
  const stateMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/state$/);
  if (req.method === "GET" && stateMatch) {
    const room = rooms.get(stateMatch[1]);
    const player = room?.players.get(String(url.searchParams.get("player") || ""));
    if (!room || !player || url.searchParams.get("token") !== player.sessionToken) { json(res, 401, { error: "房间会话无效" }); return; }
    player.lastSeenAt = Date.now();
    room.lastActivity = Date.now();
    if (!player.connected) {
      player.connected = true;
      appendEvent("player_poll_connected", room, player);
    }
    json(res, 200, roomView(room, player));
    return;
  }
  const actionMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/action$/);
  if (req.method === "POST" && actionMatch) {
    const room = rooms.get(actionMatch[1]);
    const input = await readJson(req);
    const player = room?.players.get(String(input.playerId || ""));
    if (!room || !player || input.sessionToken !== player.sessionToken) { json(res, 401, { error: "房间会话无效" }); return; }
    player.connected = true;
    player.lastSeenAt = Date.now();
    room.lastActivity = Date.now();
    try {
      handleAction(room, player, input);
      json(res, 202, { ok: true });
    } catch (error) {
      json(res, 409, { error: error instanceof Error ? error.message : "操作失败" });
    }
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/event") {
    const input = await readJson(req);
    appendEvent(String(input.event || "client_event"), undefined, undefined, input.properties || {});
    json(res, 202, { ok: true });
    return;
  }
  json(res, 404, { error: "not found" });
}

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".json": "application/json; charset=utf-8"
};

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const candidate = path.resolve(distDir, relative);
  const filePath = candidate.startsWith(distDir) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
    ? candidate : path.join(distDir, "index.html");
  if (!fs.existsSync(filePath)) { json(res, 503, { error: "app not built" }); return; }
  res.writeHead(200, { "content-type": mime[path.extname(filePath)] || "application/octet-stream", "cache-control": filePath.endsWith("index.html") ? "no-store" : "public, max-age=300" });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || host}`);
    if (url.pathname.startsWith("/api/")) await apiRequest(req, res, url);
    else serveStatic(req, res, url);
  } catch (error) {
    json(res, 400, { error: error instanceof Error ? error.message : "bad request" });
  }
});

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (socket, req) => {
  const url = new URL(req.url || "/ws", `http://${req.headers.host || host}`);
  const room = rooms.get(String(url.searchParams.get("room") || "").toUpperCase());
  const player = room?.players.get(String(url.searchParams.get("player") || ""));
  const token = url.searchParams.get("token");
  if (!room || !player || token !== player.sessionToken) {
    socket.close(1008, "invalid room session");
    return;
  }
  player.socket?.close(4001, "reconnected elsewhere");
  player.socket = socket;
  player.connected = true;
  player.lastSeenAt = Date.now();
  room.lastActivity = Date.now();
  appendEvent("player_connected", room, player);
  broadcast(room);

  socket.on("message", raw => {
    try {
      player.lastSeenAt = Date.now();
      const message = JSON.parse(raw.toString());
      handleAction(room, player, message);
      send(player, { type: "ack", requestId: message.requestId });
    } catch (error) {
      send(player, { type: "error", message: error instanceof Error ? error.message : "操作失败" });
    }
  });
  socket.on("close", () => {
    if (player.socket !== socket) return;
    player.connected = false;
    player.socket = undefined;
    appendEvent("player_disconnected", room, player);
    migrateHost(room);
    broadcast(room);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > roomTtlMs) {
      clearTimeout(room.game?.timer);
      clearTimeout(room.game?.nextRoundTimer);
      room.game?.botTimers.forEach(clearTimeout);
      for (const player of room.players.values()) player.socket?.close(1001, "room expired");
      rooms.delete(code);
      appendEvent("room_expired", room);
    }
  }
}, 60_000).unref();

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    let changed = false;
    for (const player of room.players.values()) {
      if (player.connected && !player.socket && now - player.lastSeenAt > 3000) {
        player.connected = false;
        changed = true;
        appendEvent("player_poll_disconnected", room, player);
      }
    }
    if (changed) {
      migrateHost(room);
      broadcast(room);
    }
  }
}, 1500).unref();

server.listen(port, host, () => {
  console.log(`room-blame-king server listening at http://${host}:${port}`);
});
