import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { WebSocket } from "ws";

const root = process.cwd();
const outputDir = path.join(root, "output", "verification");
const port = 4392;
const base = `http://127.0.0.1:${port}`;
fs.mkdirSync(outputDir, { recursive: true });

const server = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), ROUND_SECONDS: "2", RESOLVE_DELAY_MS: "180", DATA_DIR: path.join(outputDir, "browser-data") },
  stdio: ["ignore", "pipe", "pipe"]
});
let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
server.stderr.on("data", chunk => { serverOutput += chunk.toString(); });

async function waitForHealth() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 60));
  }
  throw new Error(`verification server did not start\n${serverOutput}`);
}

async function waitUntil(predicate, message, timeout = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 60));
  }
  throw new Error(message);
}

function requestId() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

async function joinBot(code, name, avatar) {
  const response = await fetch(`${base}/api/rooms/${code}/join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, avatar }) });
  const session = await response.json();
  if (!response.ok) throw new Error(session.error || "bot join failed");
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?room=${session.code}&player=${session.playerId}&token=${session.sessionToken}`);
  const bot = { ws, states: [] };
  ws.on("message", raw => { const message = JSON.parse(raw.toString()); if (message.type === "state") bot.states.push(message); });
  await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  return bot;
}

function botAction(bot, action, payload = {}) {
  bot.ws.send(JSON.stringify({ action, requestId: requestId(), ...payload }));
}

async function visualAudit(page) {
  return page.evaluate(() => {
    const horizontal = [...document.querySelectorAll("button,input,h1,h2,h3,p,strong,span")]
      .filter(element => {
        if (element.classList.contains("sr-only")) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const unintendedTextOverflow = style.textOverflow !== "ellipsis" && element.scrollWidth > element.clientWidth + 3;
        return rect.width > 0 && (rect.left < -2 || rect.right > window.innerWidth + 2 || unintendedTextOverflow);
      })
      .slice(0, 12)
      .map(element => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 40), rect: element.getBoundingClientRect().toJSON() }));
    return { horizontalOverflow: horizontal, bodyWidth: document.body.scrollWidth, viewportWidth: window.innerWidth };
  });
}

await waitForHealth();
const browser = await chromium.launch({ headless: true });
const issues = [];
const screenshots = [];

try {
  const cases = [
    ["home", "home", { width: 390, height: 844 }],
    ["waiting", "waiting", { width: 390, height: 844 }],
    ["tutorial", "tutorial", { width: 390, height: 844 }],
    ["tutorial-desktop", "tutorial", { width: 1280, height: 900 }],
    ["game", "game", { width: 390, height: 844 }],
    ["ai-game", "ai", { width: 390, height: 844 }],
    ["penalty", "penalty", { width: 390, height: 844 }],
    ["result-blame", "result", { width: 390, height: 844 }],
    ["result-winner", "winner", { width: 390, height: 844 }],
    ["ceremony-winner", "ceremony-winner", { width: 390, height: 844 }],
    ["ceremony-blame", "ceremony-blame", { width: 390, height: 844 }],
    ["ceremony-punishment", "ceremony-punishment", { width: 390, height: 844 }],
    ["ceremony-punishment-small", "ceremony-punishment", { width: 360, height: 680 }],
    ["ceremony-blame-desktop", "ceremony-blame", { width: 1280, height: 800 }],
    ["android-game", "game", { width: 360, height: 800 }],
    ["desktop-game", "game", { width: 1280, height: 800 }]
  ];

  for (const [name, preview, viewport] of cases) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("console", message => { if (message.type() === "error") issues.push(`${name}: console ${message.text()}`); });
    page.on("pageerror", error => issues.push(`${name}: pageerror ${error.message}`));
    page.on("requestfailed", request => issues.push(`${name}: requestfailed ${request.url()} ${request.failure()?.errorText}`));
    page.on("response", response => { if (response.status() >= 400) issues.push(`${name}: HTTP ${response.status()} ${response.url()}`); });
    await page.goto(`${base}/?preview=${preview}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    const output = path.join(outputDir, `${name}.png`);
    const buffer = await page.screenshot({ path: output, fullPage: false });
    if (buffer.length < 50_000) issues.push(`${name}: screenshot unexpectedly small (${buffer.length} bytes)`);
    const audit = await visualAudit(page);
    if (audit.bodyWidth > audit.viewportWidth + 2) issues.push(`${name}: body horizontal overflow ${audit.bodyWidth}/${audit.viewportWidth}`);
    if (audit.horizontalOverflow.length) issues.push(`${name}: element overflow ${JSON.stringify(audit.horizontalOverflow)}`);
    screenshots.push(output);
    if (["home", "waiting", "game", "android-game", "desktop-game"].includes(name) && await page.locator("#sound-toggle").count() !== 1) issues.push(`${name}: sound toggle missing`);
    if (["result-blame", "result-winner"].includes(name)) {
      if (await page.locator(".result-punishment").count() !== 1) issues.push(`${name}: KTV punishment missing`);
      const expectedAction = name === "result-blame" ? "#accept-punishment" : "#cheer-button";
      if (await page.locator(expectedAction).count() !== 1) issues.push(`${name}: result interaction missing`);
    }
    if (name === "ceremony-winner" && await page.locator(".ceremony-winner").count() !== 1) issues.push(`${name}: winner reveal missing`);
    if (name.startsWith("ceremony-blame") && await page.locator(".ceremony-blame .ceremony-avatar").count() !== 1) issues.push(`${name}: blame reveal missing`);
    if (name.startsWith("ceremony-punishment")) {
      if (await page.locator(".punishment-draw").count() !== 1) issues.push(`${name}: punishment draw missing`);
      if (await page.locator("#ceremony-cheer").count() !== 1) issues.push(`${name}: synchronized cheer action missing`);
    }
    await context.close();
  }

  const bgmContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await bgmContext.addInitScript(() => localStorage.setItem("room-blame-king-tutorial-seen", "1"));
  const bgmPage = await bgmContext.newPage();
  await bgmPage.goto(base, { waitUntil: "networkidle" });
  await bgmPage.locator("#profile-name").click();
  await bgmPage.waitForFunction(() => document.documentElement.dataset.bgm === "playing");
  await bgmPage.locator("#sound-toggle").click();
  await bgmPage.waitForFunction(() => !document.documentElement.dataset.bgm);
  await bgmContext.close();

  const legacyContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await legacyContext.addInitScript(() => {
    localStorage.setItem("room-blame-king-tutorial-seen", "1");
    Object.defineProperty(Crypto.prototype, "randomUUID", { value: undefined, configurable: true });
  });
  const legacyPage = await legacyContext.newPage();
  legacyPage.on("pageerror", error => issues.push(`legacy-webview: pageerror ${error.message}`));
  await legacyPage.goto(base, { waitUntil: "networkidle" });
  await legacyPage.locator("#profile-name").fill("内嵌兼容验收");
  await legacyPage.locator("#create-room").click();
  await legacyPage.locator(".waiting-screen").waitFor();
  await legacyPage.locator("#start-game").click();
  await legacyPage.locator(".game-screen").waitFor();
  if (await legacyPage.locator(".bot-strip > span").count() !== 3) issues.push("legacy-webview: AI players missing after start");
  await legacyContext.close();

  const tutorialContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const tutorialPage = await tutorialContext.newPage();
  await tutorialPage.goto(`${base}/?preview=tutorial`, { waitUntil: "networkidle" });
  await tutorialPage.locator("#tutorial-next").click();
  const tutorialGuidedStep = path.join(outputDir, "tutorial-guided-step.png");
  await tutorialPage.screenshot({ path: tutorialGuidedStep, fullPage: false });
  screenshots.push(tutorialGuidedStep);
  await tutorialPage.locator("#tutorial-next").click();
  await tutorialPage.locator('[data-tutorial-card="39"]').click();
  await tutorialPage.locator('[data-tutorial-card="55"]').click();
  await tutorialPage.locator('[data-tutorial-card="39"]').click();
  await tutorialPage.locator("#tutorial-delay").click();
  const tutorialTransfer = path.join(outputDir, "tutorial-transfer.png");
  await tutorialPage.screenshot({ path: tutorialTransfer, fullPage: false });
  screenshots.push(tutorialTransfer);
  await tutorialPage.locator("#tutorial-next").click();
  await tutorialPage.getByText("教学关完成").waitFor();
  const tutorialComplete = path.join(outputDir, "tutorial-complete.png");
  await tutorialPage.screenshot({ path: tutorialComplete, fullPage: false });
  screenshots.push(tutorialComplete);
  await tutorialContext.close();

  const aiContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await aiContext.addInitScript(() => localStorage.setItem("room-blame-king-tutorial-seen", "1"));
  const aiPage = await aiContext.newPage();
  aiPage.on("console", message => { if (message.type() === "error") issues.push(`ai-flow: console ${message.text()}`); });
  aiPage.on("pageerror", error => issues.push(`ai-flow: pageerror ${error.message}`));
  aiPage.on("requestfailed", request => issues.push(`ai-flow: requestfailed ${request.url()} ${request.failure()?.errorText}`));
  await aiPage.goto(base, { waitUntil: "networkidle" });
  await aiPage.locator("#profile-name").fill("人机验收员");
  await aiPage.locator("#create-room").click();
  await aiPage.locator(".waiting-screen").waitFor();
  await aiPage.locator("#start-game").click();
  await aiPage.locator(".game-screen").waitFor();
  await aiPage.locator(".bot-strip > span").first().waitFor();
  await aiPage.locator("[data-card]:not([disabled])").first().click();
  await aiPage.locator("#delay-toggle").click();
  const aiDecision = path.join(outputDir, "real-ai-decision.png");
  await aiPage.screenshot({ path: aiDecision, fullPage: false });
  screenshots.push(aiDecision);
  await aiPage.locator("#confirm-card").click();
  await waitUntil(async () => {
    if (await aiPage.locator(".result-screen").count()) return true;
    const selectable = aiPage.locator("[data-card]:not([disabled])");
    if (await selectable.count()) {
      await selectable.first().click();
      const confirm = aiPage.locator("#confirm-card:not([disabled])");
      if (await confirm.count()) await confirm.click();
    }
    return false;
  }, "single-player AI flow did not reach result", 25000);
  await aiPage.locator("#skip-ceremony").click();
  await aiPage.locator(".ranking-list").waitFor();
  const aiResult = path.join(outputDir, "real-ai-result.png");
  await aiPage.screenshot({ path: aiResult, fullPage: false });
  screenshots.push(aiResult);
  const aiRankRows = await aiPage.locator(".rank-row").count();
  if (aiRankRows !== 4) issues.push(`ai-flow: expected 4 ranked players, got ${aiRankRows}`);
  await aiContext.close();

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem("room-blame-king-tutorial-seen", "1"));
  const page = await context.newPage();
  page.on("console", message => { if (message.type() === "error") issues.push(`flow: console ${message.text()}`); });
  page.on("pageerror", error => issues.push(`flow: pageerror ${error.message}`));
  page.on("requestfailed", request => issues.push(`flow: requestfailed ${request.url()} ${request.failure()?.errorText}`));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator("#profile-name").fill("验收房主");
  await page.locator("#create-room").click();
  await page.locator(".waiting-screen").waitFor();
  const code = (await page.locator(".topbar strong").textContent()).trim();
  const bots = await Promise.all([joinBot(code, "自动玩家A", 1), joinBot(code, "自动玩家B", 2)]);
  await page.getByText("3 人在线").waitFor();
  await page.locator("#start-game").click();
  await page.locator(".game-screen").waitFor();

  await waitUntil(async () => {
    if (await page.locator(".result-screen").count()) return true;
    for (const bot of bots) {
      const latest = bot.states.at(-1);
      if (latest?.room.status === "playing" && !latest.game.selectedCard && latest.game.hand.length) botAction(bot, "select_card", { card: latest.game.hand[0] });
    }
    const selectable = page.locator("[data-card]:not([disabled])");
    if (await selectable.count()) {
      await selectable.first().click();
      const confirm = page.locator("#confirm-card:not([disabled])");
      if (await confirm.count()) await confirm.click();
    }
    return false;
  }, "real three-player flow did not reach result", 20000);

  await page.locator("#skip-ceremony").click();
  await page.locator(".ranking-list").waitFor();

  const realResult = path.join(outputDir, "real-flow-result.png");
  await page.screenshot({ path: realResult, fullPage: false });
  screenshots.push(realResult);
  await page.locator("#vote-rematch").click();
  bots.forEach(bot => botAction(bot, "rematch"));
  await page.locator("#start-rematch").waitFor();
  await page.locator("#start-rematch").click();
  await page.locator(".game-screen").waitFor();
  const secondGame = path.join(outputDir, "real-flow-second-game.png");
  await page.screenshot({ path: secondGame, fullPage: false });
  screenshots.push(secondGame);
  bots.forEach(bot => bot.ws.close());
  await context.close();

  const report = { generatedAt: new Date().toISOString(), base, screenshots, issues, realFlow: { aiGameCompleted: true, aiRankedPlayers: 4, roomCode: code, firstGameCompleted: true, secondGameStarted: true } };
  fs.writeFileSync(path.join(outputDir, "browser-report.json"), JSON.stringify(report, null, 2));
  if (issues.length) throw new Error(`browser verification found ${issues.length} issue(s):\n${issues.join("\n")}`);
  console.log(`browser verification passed; ${screenshots.length} screenshots; second game started`);
} finally {
  await browser.close();
  server.kill();
}
