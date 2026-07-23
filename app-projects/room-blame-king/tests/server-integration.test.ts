import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import test, { after, before } from "node:test";
import { WebSocket } from "ws";

const port = 4391;
const base = `http://127.0.0.1:${port}`;
let server: ChildProcess;

interface CreatedSession { code: string; playerId: string; sessionToken: string }

async function waitForHealth() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch { /* server starting */ }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("test server did not start");
}

async function post(path: string, body: unknown) {
  const response = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `request failed ${response.status}`);
  return data;
}

function connect(session: CreatedSession) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?room=${session.code}&player=${session.playerId}&token=${session.sessionToken}`);
  const states: any[] = [];
  ws.on("message", raw => { const message = JSON.parse(raw.toString()); if (message.type === "state") states.push(message); });
  return new Promise<{ ws: WebSocket; states: any[] }>((resolve, reject) => {
    ws.once("open", () => resolve({ ws, states }));
    ws.once("error", reject);
  });
}

async function waitUntil(predicate: () => boolean | Promise<boolean>, message: string, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(message);
}

function action(ws: WebSocket, actionName: string, payload: Record<string, unknown> = {}, requestId = crypto.randomUUID()) {
  ws.send(JSON.stringify({ action: actionName, requestId, ...payload }));
}

async function pollState(session: CreatedSession) {
  const response = await fetch(`${base}/api/rooms/${session.code}/state?player=${encodeURIComponent(session.playerId)}&token=${encodeURIComponent(session.sessionToken)}`);
  if (!response.ok) throw new Error(`poll state failed: ${response.status}`);
  return response.json();
}

async function httpAction(session: CreatedSession, actionName: string, payload: Record<string, unknown> = {}) {
  const response = await fetch(`${base}/api/rooms/${session.code}/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: actionName, requestId: crypto.randomUUID(), playerId: session.playerId, sessionToken: session.sessionToken, ...payload })
  });
  if (!response.ok) throw new Error(`HTTP action failed: ${response.status} ${await response.text()}`);
}

before(async () => {
  server = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), ROUND_SECONDS: "0.25", RESOLVE_DELAY_MS: "20", DATA_DIR: "output/verification/test-data" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForHealth();
});

after(() => server?.kill());

test("three websocket clients play, deduplicate, migrate host and rematch", async () => {
  const owner = await post("/api/rooms", { name: "房主", avatar: 0 }) as CreatedSession;
  const second = await post(`/api/rooms/${owner.code}/join`, { name: "玩家二", avatar: 1 }) as CreatedSession;
  const third = await post(`/api/rooms/${owner.code}/join`, { name: "玩家三", avatar: 2 }) as CreatedSession;
  const clients = await Promise.all([connect(owner), connect(second), connect(third)]);
  await waitUntil(() => clients.every(client => client.states.at(-1)?.room.connectedCount === 3), "clients did not synchronize");

  action(clients[0].ws, "start_game");
  await waitUntil(() => clients.every(client => client.states.at(-1)?.room.status === "playing"), "game did not start");
  assert.equal(clients[0].states.at(-1).game.hand.length, 6);
  assert.equal(clients[0].states.at(-1).room.players.some((player: any) => "hand" in player), false, "other hands leaked");

  for (const client of clients) {
    const card = client.states.at(-1).game.hand[0];
    const requestId = crypto.randomUUID();
    action(client.ws, "select_card", { card }, requestId);
    action(client.ws, "select_card", { card }, requestId);
  }
  await waitUntil(() => clients.some(client => client.states.some(item => item.room.status === "resolving")), "round did not resolve");

  clients[0].ws.close();
  await waitUntil(() => clients[1].states.at(-1)?.room.hostId === second.playerId, "host did not migrate");
  await waitUntil(() => clients[1].states.at(-1)?.room.status === "result", "game did not finish through timeout", 8000);

  action(clients[1].ws, "rematch");
  action(clients[2].ws, "rematch");
  const reconnectedOwner = await connect(owner);
  clients[0] = reconnectedOwner;
  await waitUntil(() => reconnectedOwner.states.at(-1)?.room.hostId === second.playerId, "owner reconnect changed host unexpectedly");
  await waitUntil(() => clients.every(client => client.states.at(-1)?.room.status === "result"), "result did not synchronize after reconnect");
  action(clients[1].ws, "cheer");
  await waitUntil(() => clients.every(client => client.states.at(-1)?.game.cheerCount === 1), "cheer count did not synchronize");
  assert.equal(clients[1].states.at(-1).game.viewerCheered, true);
  const blameId = clients[1].states.at(-1).game.ranking.at(-1).id;
  const blameIndex = [owner, second, third].findIndex(session => session.playerId === blameId);
  action(clients[blameIndex].ws, "accept_punishment");
  await waitUntil(() => clients.every(client => client.states.at(-1)?.game.punishmentAccepted), "punishment acceptance did not synchronize");
  action(reconnectedOwner.ws, "rematch");
  await waitUntil(() => clients[1].states.at(-1)?.room.rematchVotes === 3, "rematch votes did not synchronize");
  action(clients[1].ws, "start_game");
  await waitUntil(() => clients[1].states.at(-1)?.room.gameIndex === 2 && clients[1].states.at(-1)?.room.status === "playing", "second game did not start");
  clients.forEach(client => client.ws.close());
});

test("one human plays a complete ranked game against three strategic bots", async () => {
  const owner = await post("/api/rooms", { name: "练习生", avatar: 3 }) as CreatedSession;
  const client = await connect(owner);
  await waitUntil(() => client.states.length > 0, "practice client not connected");
  action(client.ws, "start_game");
  await waitUntil(() => client.states.at(-1)?.room.status === "playing", "AI game did not start");
  const firstCard = client.states.at(-1).game.hand[0];
  action(client.ws, "select_card", { card: firstCard, delayed: true });
  await waitUntil(() => client.states.some(state => state.room.status === "resolving" && state.game.roundIndex === 0), "delayed AI round did not resolve");
  const firstResolution = client.states.find(state => state.room.status === "resolving" && state.game.roundIndex === 0);
  assert.equal(firstResolution.game.delayAvailable, false);
  assert.equal(firstResolution.game.lastResolution.placements.at(-1).play.playerId, owner.playerId);
  await waitUntil(() => client.states.at(-1)?.room.status === "result", "practice did not auto-complete", 5000);
  const latest = client.states.at(-1);
  assert.equal(latest.game.config.mode, "ai");
  assert.equal(latest.game.ranking.length, 4);
  assert.equal(latest.room.players.filter((player: any) => player.isBot).length, 3);
  assert.ok(latest.room.players[0].timeoutCount >= 5);
  client.ws.close();
});

test("three polling-only clients can join, start and synchronize a round", async () => {
  const owner = await post("/api/rooms", { name: "轮询房主", avatar: 0 }) as CreatedSession;
  const second = await post(`/api/rooms/${owner.code}/join`, { name: "轮询二号", avatar: 1 }) as CreatedSession;
  const third = await post(`/api/rooms/${owner.code}/join`, { name: "轮询三号", avatar: 2 }) as CreatedSession;
  const sessions = [owner, second, third];
  await Promise.all(sessions.map(pollState));
  await httpAction(owner, "start_game");
  const playing = await Promise.all(sessions.map(pollState));
  assert.ok(playing.every(state => state.room.status === "playing"));
  assert.ok(playing.every(state => state.game.hand.length === 6));
  await Promise.all(sessions.map((session, index) => httpAction(session, "select_card", { card: playing[index].game.hand[0] })));
  await waitUntil(async () => (await pollState(owner)).room.status === "resolving", "polling round did not resolve");
  const resolved = await pollState(owner);
  assert.equal(resolved.game.totalPlayers, 3);
  assert.equal(resolved.game.lastResolution.placements.length, 3);
});

test("the ninth player spectates and fills a vacated slot next game", async () => {
  const owner = await post("/api/rooms", { name: "大包房主", avatar: 0 }) as CreatedSession;
  const sessions: CreatedSession[] = [owner];
  for (let index = 1; index < 9; index += 1) {
    sessions.push(await post(`/api/rooms/${owner.code}/join`, { name: `玩家${index + 1}`, avatar: index % 12 }) as CreatedSession);
  }
  const clients = await Promise.all(sessions.map(connect));
  await waitUntil(() => clients.every(client => client.states.length > 0) && clients[0].states.at(-1)?.room.players.filter((player: any) => player.connected).length === 9, "all clients did not connect");
  assert.equal(clients[8].states.at(-1).room.players.find((player: any) => player.id === sessions[8].playerId).spectator, true);

  clients[7].ws.close();
  await waitUntil(() => clients[0].states.at(-1)?.room.players.find((player: any) => player.id === sessions[7].playerId)?.connected === false, "vacated slot was not observed");
  action(clients[0].ws, "start_game");
  await waitUntil(() => clients[8].states.at(-1)?.room.status === "playing", "full game did not start");
  const promoted = clients[8].states.at(-1).room.players.find((player: any) => player.id === sessions[8].playerId);
  assert.equal(promoted.spectator, false);
  assert.equal(clients[8].states.at(-1).game.hand.length, 5);
  clients.forEach(client => client.ws.close());
});
