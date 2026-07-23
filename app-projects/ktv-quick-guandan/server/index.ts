import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import { beats, comboLabel, dealHands, evaluateCombo, legalCombos, sortHand, upgradeForOrder, type Card, type Combo } from "../shared/game.ts";
import { chooseBotDecision } from "../shared/bot.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const dataDir = process.env.DATA_DIR || path.join(rootDir, "server", "data");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4342);
const turnMs = Number(process.env.TURN_MS || 20000);
fs.mkdirSync(dataDir, { recursive: true });

type Status = "waiting" | "playing" | "result";
interface Player { id: string; token: string; name: string; avatar: number; seat: number; bot: boolean; connected: boolean; ready: boolean; socket?: WebSocket; requests: Set<string> }
interface Game {
  level: number; levels: [number, number]; hands: Map<string, Card[]>; currentSeat: number; leaderId: string; lastPlayerId: string | null;
  currentCombo: Combo | null; passed: Set<string>; finishOrder: string[]; deadline: number; timer?: NodeJS.Timeout; startedAt: number;
  interaction?: { playerId: string; text: string; tone: "team" | "block" | "bomb" | "normal" };
  trickActions: Map<string, { combo?: Combo; passed: boolean }>;
  actionSerial: number; audioAction?: { serial: number; playerId: string; combo?: Combo; passed: boolean };
}
interface Room { code: string; hostId: string; status: Status; players: Player[]; game?: Game; gameIndex: number; lastActivity: number }

const rooms = new Map<string, Room>();
const botNames = ["稳牌阿宁", "炸弹小叶", "对家老周"];
const id = () => crypto.randomBytes(12).toString("base64url");
const roomCode = () => Array.from({ length: 6 }, () => "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"[crypto.randomInt(31)]).join("");
const safeName = (value: unknown) => String(value || "").trim().replace(/[<>]/g, "").slice(0, 12) || `牌友${crypto.randomInt(10, 99)}`;
const team = (player: Player) => player.seat % 2 as 0 | 1;
const bySeat = (room: Room, seat: number) => room.players.find(player => player.seat === seat)!;
const realPlayers = (room: Room) => room.players.filter(player => !player.bot);
const appendEvent = (event: string, room: Room, player?: Player, data: Record<string, unknown> = {}) => fs.appendFile(path.join(dataDir, "events.jsonl"), `${JSON.stringify({ event, at: new Date().toISOString(), room: room.code, gameIndex: room.gameIndex, playerId: player?.id, ...data })}\n`, () => undefined);

function publicState(room: Room, viewer: Player) {
  const game = room.game;
  return {
    type: "state", serverTime: Date.now(),
    room: { code: room.code, status: room.status, hostId: room.hostId, playerId: viewer.id, gameIndex: room.gameIndex, players: room.players.map(player => ({ id: player.id, name: player.name, avatar: player.avatar, seat: player.seat, team: team(player), bot: player.bot, connected: player.connected, ready: player.ready, cardCount: game?.hands.get(player.id)?.length ?? 0 })) },
    game: game ? {
      level: game.level, levels: game.levels, hand: sortHand(game.hands.get(viewer.id) || [], game.level), currentSeat: game.currentSeat,
      currentCombo: game.currentCombo ? { ...game.currentCombo, cards: game.currentCombo.cards.map(card => ({ ...card })) } : null,
      currentComboLabel: comboLabel(game.currentCombo), lastPlayerId: game.lastPlayerId, finishOrder: game.finishOrder, passedIds: [...game.passed], deadline: game.deadline,
      interaction: game.interaction,
      trickActions: [...game.trickActions.entries()].map(([playerId, action]) => ({ playerId, ...action })),
      audioAction: game.audioAction,
      canPass: Boolean(game.currentCombo && game.lastPlayerId !== viewer.id), legalHint: legalCombos(game.hands.get(viewer.id) || [], game.level, game.currentCombo)[0]?.cards.map(card => card.id) || [],
      result: room.status === "result" ? resultFor(room) : null
    } : null
  };
}

function send(player: Player, payload: unknown) { if (player.socket?.readyState === WebSocket.OPEN) player.socket.send(JSON.stringify(payload)); }
function broadcast(room: Room) { room.lastActivity = Date.now(); room.players.filter(p => !p.bot).forEach(player => send(player, publicState(room, player))); }

function nextActiveSeat(room: Room, from: number) {
  for (let offset = 1; offset <= 4; offset += 1) {
    const seat = (from + offset) % 4; const player = bySeat(room, seat);
    if (!room.game!.finishOrder.includes(player.id)) return seat;
  }
  return from;
}

function scheduleTurn(room: Room) {
  const game = room.game!; clearTimeout(game.timer); game.deadline = Date.now() + turnMs; broadcast(room);
  const current = bySeat(room, game.currentSeat);
  game.timer = setTimeout(() => autoPlay(room, current), current.bot ? 600 + crypto.randomInt(500) : turnMs + 30);
}

function autoPlay(room: Room, player: Player) {
  if (room.status !== "playing" || bySeat(room, room.game!.currentSeat).id !== player.id) return;
  const game = room.game!; const options = legalCombos(game.hands.get(player.id) || [], game.level, game.currentCombo);
  const hand = game.hands.get(player.id) || [];
  const lastPlayer = room.players.find(candidate => candidate.id === game.lastPlayerId);
  const teammateLeading = Boolean(game.currentCombo && lastPlayer && team(lastPlayer) === team(player));
  const teammate = room.players.find(candidate => candidate.id !== player.id && team(candidate) === team(player));
  const teammateHand = teammate ? game.hands.get(teammate.id) || [] : [];
  const opponents = room.players.filter(candidate => team(candidate) !== team(player) && !game.finishOrder.includes(candidate.id));
  const decision = chooseBotDecision({ hand, level: game.level, currentCombo: game.currentCombo, options, teammateLeading, teammateHand, opponentCardCounts: opponents.map(candidate => game.hands.get(candidate.id)?.length || 99) });

  if (decision.action === "pass") {
    game.interaction = { playerId: player.id, text: decision.reason === "yield-to-teammate" ? "搭档你走，我不要" : "这手压不住", tone: decision.reason === "yield-to-teammate" ? "team" : "normal" };
    applyPass(room, player, true); return;
  }

  const chosen = decision.combo;
  game.interaction = chosen.bombTier > 0
    ? { playerId: player.id, text: "这手得炸，不能放", tone: "bomb" }
    : decision.reason === "feed-teammate"
      ? { playerId: player.id, text: "搭档剩一张，送你走", tone: "team" }
    : decision.reason === "block-opponent"
      ? { playerId: player.id, text: "对面要跑了，我来拦", tone: "block" }
      : { playerId: player.id, text: "先把组合牌走掉", tone: "normal" };
  applyPlay(room, player, chosen.cards.map(card => card.id), true);
}

function finishIfNeeded(room: Room, player: Player) {
  const game = room.game!;
  if ((game.hands.get(player.id)?.length || 0) === 0 && !game.finishOrder.includes(player.id)) game.finishOrder.push(player.id);
  if (game.finishOrder.length >= 3) {
    const last = room.players.find(candidate => !game.finishOrder.includes(candidate.id))!; game.finishOrder.push(last.id);
    clearTimeout(game.timer); room.status = "result"; game.deadline = 0;
    const result = resultFor(room); game.levels[result.winner] = Math.min(14, game.levels[result.winner] + result.levels);
    realPlayers(room).forEach(p => p.ready = false);
    appendEvent("guandan_match_completed", room, undefined, { durationMs: Date.now() - game.startedAt, order: game.finishOrder, ...result }); broadcast(room); return true;
  }
  return false;
}

function resultFor(room: Room) {
  const order = room.game!.finishOrder.length === 4 ? room.game!.finishOrder : room.players.map(p => p.id);
  return upgradeForOrder(order, playerId => team(room.players.find(p => p.id === playerId)!));
}

function advance(room: Room, actor: Player) {
  const game = room.game!;
  const activeOthers = room.players.filter(p => !game.finishOrder.includes(p.id) && p.id !== game.lastPlayerId);
  if (game.currentCombo && activeOthers.every(p => game.passed.has(p.id))) {
    const lastPlayer = room.players.find(p => p.id === game.lastPlayerId)!;
    game.currentCombo = null; game.passed.clear(); game.trickActions.clear();
    const lead = game.finishOrder.includes(lastPlayer.id) ? room.players.find(p => team(p) === team(lastPlayer) && !game.finishOrder.includes(p.id)) : lastPlayer;
    game.currentSeat = lead?.seat ?? nextActiveSeat(room, actor.seat); game.leaderId = bySeat(room, game.currentSeat).id;
  } else game.currentSeat = nextActiveSeat(room, actor.seat);
  scheduleTurn(room);
}

function applyPlay(room: Room, player: Player, cardIds: string[], automatic = false) {
  const game = room.game!; if (room.status !== "playing" || bySeat(room, game.currentSeat).id !== player.id) throw new Error("还没轮到你");
  const hand = game.hands.get(player.id) || []; const selected = cardIds.map(cardId => hand.find(card => card.id === cardId)).filter(Boolean) as Card[];
  if (!selected.length || selected.length !== new Set(cardIds).size) throw new Error("请选择有效手牌");
  const combo = evaluateCombo(selected, game.level); if (!combo) throw new Error("这组牌不符合掼蛋牌型");
  if (!beats(combo, game.currentCombo)) throw new Error(`需要压过${comboLabel(game.currentCombo)}`);
  game.hands.set(player.id, hand.filter(card => !cardIds.includes(card.id))); game.currentCombo = combo; game.lastPlayerId = player.id; game.passed.clear(); game.leaderId = player.id;
  game.trickActions.set(player.id, { combo, passed: false });
  game.actionSerial += 1; game.audioAction = { serial: game.actionSerial, playerId: player.id, combo, passed: false };
  if (!player.bot) {
    const reactingBot = room.players.find(candidate => candidate.bot && team(candidate) === team(player));
    if (reactingBot && combo.bombTier > 0) game.interaction = { playerId: reactingBot.id, text: "搭档这炸弹漂亮", tone: "team" };
    else if (reactingBot && game.hands.get(player.id)!.length <= 5) game.interaction = { playerId: reactingBot.id, text: "你快走完了，我给你接风", tone: "team" };
  }
  appendEvent(automatic ? "guandan_timeout_auto_played" : "guandan_play_submitted", room, player, { combo: comboLabel(combo), size: combo.size, remaining: game.hands.get(player.id)!.length });
  if (finishIfNeeded(room, player)) return; advance(room, player);
}

function applyPass(room: Room, player: Player, automatic = false) {
  const game = room.game!; if (room.status !== "playing" || bySeat(room, game.currentSeat).id !== player.id) throw new Error("还没轮到你");
  if (!game.currentCombo || game.lastPlayerId === player.id) throw new Error("当前必须出牌");
  game.passed.add(player.id); game.trickActions.set(player.id, { passed: true }); game.actionSerial += 1; game.audioAction = { serial: game.actionSerial, playerId: player.id, passed: true }; appendEvent(automatic ? "guandan_timeout_passed" : "guandan_passed", room, player); advance(room, player);
}

function startGame(room: Room, requester: Player) {
  if (requester.id !== room.hostId) throw new Error("仅房主可开局");
  if (room.status === "playing") throw new Error("牌局已开始");
  while (room.players.length < 4) {
    const seat = room.players.length; room.players.push({ id: `bot-${id()}`, token: "", name: botNames[seat - realPlayers(room).length] || `人机${seat + 1}`, avatar: 6 + seat, seat, bot: true, connected: true, ready: true, requests: new Set() });
  }
  room.gameIndex += 1; const players = [...room.players].sort((a, b) => a.seat - b.seat); const levels = room.game?.levels || [2, 2] as [number, number]; const level = room.game ? levels[team(requester)] : 2;
  room.game = { level, levels, hands: dealHands(players.map(p => p.id)), currentSeat: 0, leaderId: players[0].id, lastPlayerId: null, currentCombo: null, passed: new Set(), trickActions: new Map(), finishOrder: [], deadline: 0, startedAt: Date.now(), actionSerial: 0 };
  room.status = "playing"; appendEvent("guandan_match_started", room, requester, { realPlayerCount: realPlayers(room).length, level }); scheduleTurn(room);
}

function action(room: Room, player: Player, message: any) {
  const requestId = String(message.requestId || ""); if (requestId && player.requests.has(requestId)) return; if (requestId) player.requests.add(requestId);
  if (message.action === "start_game") startGame(room, player);
  else if (message.action === "play") applyPlay(room, player, Array.isArray(message.cardIds) ? message.cardIds.map(String) : []);
  else if (message.action === "pass") applyPass(room, player);
  else if (message.action === "ready") { player.ready = true; appendEvent("guandan_rematch_ready", room, player); broadcast(room); }
  else throw new Error("未知操作");
}

function json(res: http.ServerResponse, status: number, data: unknown) { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(data)); }
function contentType(file: string) {
  return ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".wav": "audio/wav", ".mp3": "audio/mpeg" } as Record<string, string>)[path.extname(file)] || "application/octet-stream";
}
function body(req: http.IncomingMessage) { return new Promise<any>((resolve, reject) => { let raw = ""; req.on("data", chunk => raw += chunk); req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); } }); }); }
function session(room: Room, player: Player) { return { code: room.code, playerId: player.id, sessionToken: player.token }; }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/api/health") return json(res, 200, { ok: true, rooms: rooms.size });
    if (req.method === "POST" && url.pathname === "/api/rooms") {
      const input = await body(req); let code = roomCode(); while (rooms.has(code)) code = roomCode();
      const player: Player = { id: id(), token: id(), name: safeName(input.name), avatar: Number(input.avatar || 0) % 8, seat: 0, bot: false, connected: false, ready: false, requests: new Set() };
      const room: Room = { code, hostId: player.id, status: "waiting", players: [player], gameIndex: 0, lastActivity: Date.now() }; rooms.set(code, room); appendEvent("guandan_room_created", room, player); return json(res, 201, session(room, player));
    }
    const join = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/join$/);
    if (req.method === "POST" && join) {
      const room = rooms.get(join[1]); if (!room) return json(res, 404, { error: "房间不存在" }); if (realPlayers(room).length >= 4 || room.status === "playing") return json(res, 409, { error: "本桌已满或已开局" });
      const input = await body(req); const seat = [0,1,2,3].find(value => !room.players.some(p => p.seat === value))!;
      const player: Player = { id: id(), token: id(), name: safeName(input.name), avatar: Number(input.avatar || 0) % 8, seat, bot: false, connected: false, ready: false, requests: new Set() }; room.players.push(player); appendEvent("guandan_player_joined", room, player); return json(res, 200, session(room, player));
    }
    const state = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/state$/);
    if (req.method === "GET" && state) {
      const room = rooms.get(state[1]); const player = room?.players.find(p => p.id === url.searchParams.get("player") && p.token === url.searchParams.get("token")); if (!room || !player) return json(res, 404, { error: "会话不存在" }); return json(res, 200, publicState(room, player));
    }
    const roomAction = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/action$/);
    if (req.method === "POST" && roomAction) {
      const room = rooms.get(roomAction[1]); const input = await body(req);
      const player = room?.players.find(p => p.id === input.playerId && p.token === input.sessionToken);
      if (!room || !player) return json(res, 404, { error: "会话不存在" });
      action(room, player, input); return json(res, 200, publicState(room, player));
    }
    if (req.method === "GET" && !url.pathname.startsWith("/api") && !url.pathname.startsWith("/ws")) {
      const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1); const file = path.join(distDir, requested); const safe = path.resolve(file).startsWith(path.resolve(distDir));
      if (safe && fs.existsSync(file) && fs.statSync(file).isFile()) { res.writeHead(200, { "content-type": contentType(file) }); return fs.createReadStream(file).pipe(res); }
      const index = path.join(distDir, "index.html"); if (fs.existsSync(index)) { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return fs.createReadStream(index).pipe(res); }
    }
    json(res, 404, { error: "not found" });
  } catch (error) { json(res, 400, { error: error instanceof Error ? error.message : "请求失败" }); }
});

const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => { const url = new URL(req.url || "/", `http://${req.headers.host}`); if (url.pathname !== "/ws") return socket.destroy(); wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req)); });
wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`); const room = rooms.get(url.searchParams.get("room") || ""); const player = room?.players.find(p => p.id === url.searchParams.get("player") && p.token === url.searchParams.get("token"));
  if (!room || !player) return ws.close(1008, "invalid session"); player.socket = ws; player.connected = true; broadcast(room);
  ws.on("message", raw => { try { action(room, player, JSON.parse(raw.toString())); } catch (error) { send(player, { type: "error", message: error instanceof Error ? error.message : "操作失败" }); } });
  ws.on("close", () => { if (player.socket === ws) { player.connected = false; player.socket = undefined; if (room.hostId === player.id) room.hostId = realPlayers(room).find(p => p.connected)?.id || room.hostId; broadcast(room); } });
});

setInterval(() => { const cutoff = Date.now() - 2 * 60 * 60 * 1000; for (const [code, room] of rooms) if (room.lastActivity < cutoff) { clearTimeout(room.game?.timer); rooms.delete(code); } }, 60000).unref();
server.listen(port, host, () => console.log(`搭子掼蛋服务已启动：http://${host}:${port}`));
