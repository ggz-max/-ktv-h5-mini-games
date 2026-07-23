const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const verificationDir = path.join(rootDir, "verification");
const webPort = Number(process.env.VERIFY_WEB_PORT || 15316);
fs.mkdirSync(verificationDir, { recursive: true });

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    }).on("error", reject);
  });
}

async function waitFor(url) {
  for (let index = 0; index < 50; index += 1) {
    try {
      const status = await request(url);
      if (status && status < 500) return;
    } catch {
      await wait(200);
    }
  }
  throw new Error(`server not ready: ${url}`);
}

function findBrowserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}

async function holdAndRelease(page, holdMs) {
  const button = page.locator("[data-hold-button]");
  const box = await button.boundingBox();
  if (!box) throw new Error("hold button not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(Math.max(20, holdMs));
  await page.mouse.up();
}

async function main() {
  const web = spawn(process.execPath, [
    "node_modules/vite/bin/vite.js",
    "frontend",
    "--host",
    "127.0.0.1",
    "--port",
    String(webPort),
    "--strictPort",
    "--clearScreen=false"
  ], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitFor(`http://127.0.0.1:${webPort}/`);

    const { chromium } = require("playwright-core");
    const executablePath = findBrowserExecutable();
    const browser = await chromium.launch({
      headless: true,
      executablePath
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const consoleErrors = [];
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto(`http://127.0.0.1:${webPort}/`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-hold-button]");
    await page.screenshot({ path: path.join(verificationDir, "entry.png"), fullPage: true });

    for (let index = 0; index < 3; index += 1) {
      const holdMs = await page.evaluate(() => window.__microphoneJumpDebug.getChargeMsForNext());
      const beforePlayerBox = await page.locator("[data-player]").boundingBox();
      await holdAndRelease(page, holdMs);
      await page.waitForFunction(() => {
        const phase = window.__microphoneJumpDebug.getPhase();
        return phase === "jumping" || phase === "ready";
      }, null, { timeout: 800 });
      await page.waitForTimeout(120);
      const midPlayerBox = await page.locator("[data-player]").boundingBox();
      if (index === 0 && beforePlayerBox && midPlayerBox) {
        const moved = Math.abs(midPlayerBox.x - beforePlayerBox.x) > 6 || Math.abs(midPlayerBox.y - beforePlayerBox.y) > 6;
        if (!moved) throw new Error("player did not move visibly during jump");
        await page.waitForFunction(() => window.__microphoneJumpDebug.getPhase() === "scrolling", null, { timeout: 2500 });
        const scrollingState = await page.evaluate(() => window.__microphoneJumpDebug.getState());
        if (!scrollingState.previous) throw new Error("stage advance did not keep a previous platform while scrolling");
        await page.screenshot({ path: path.join(verificationDir, "stage-advance.png"), fullPage: true });
      }
      await page.waitForFunction(() => window.__microphoneJumpDebug.getPhase() === "ready", null, { timeout: 2500 });
    }

    await page.screenshot({ path: path.join(verificationDir, "game-after-jumps.png"), fullPage: true });

    await holdAndRelease(page, 20);
    await page.waitForSelector("[data-screen='result']", { timeout: 3000 });
    await page.screenshot({ path: path.join(verificationDir, "result.png"), fullPage: true });

    await page.waitForSelector("[data-action='retry']");
    await page.waitForSelector("[data-action='share']");
    await page.waitForSelector("[data-action='daily']");
    const hiddenResultActions = await page.evaluate(() => ({
      leaderboard: Boolean(document.querySelector("[data-action='leaderboard']")),
      assets: Boolean(document.querySelector("[data-action='assets']"))
    }));
    if (hiddenResultActions.leaderboard || hiddenResultActions.assets) {
      throw new Error("internal result actions should not be visible to users");
    }

    await page.click("[data-action='share']");
    await page.waitForSelector("[data-screen='share']");
    await page.screenshot({ path: path.join(verificationDir, "share.png"), fullPage: true });

    await page.waitForSelector("[data-share-text]");
    await page.waitForSelector("[data-action='copy']");

    await page.click("[data-action='result']");
    await page.waitForSelector("[data-screen='result']");
    await page.click("[data-action='daily']");
    await page.waitForSelector("[data-screen='daily']");
    await page.screenshot({ path: path.join(verificationDir, "daily.png"), fullPage: true });
    const score = await page.evaluate(() => window.__microphoneJumpDebug?.getScore?.() ?? 0);
    if (score <= 0) {
      throw new Error(`expected positive score, got ${score}`);
    }
    if (consoleErrors.length) {
      throw new Error(`console errors: ${consoleErrors.join("\\n")}`);
    }

    await browser.close();
    console.log(`Local verification screenshots written to ${verificationDir}`);
  } finally {
    web.kill("SIGTERM");
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
