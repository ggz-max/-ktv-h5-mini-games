const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const verificationDir = path.join(rootDir, "verification");
const port = Number(process.env.VERIFY_WEB_PORT || 15320);

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
  for (let index = 0; index < 40; index += 1) {
    try {
      const status = await request(url);
      if (status && status < 500) return;
    } catch {
      await wait(250);
    }
  }
  throw new Error(`server not ready: ${url}`);
}

async function main() {
  const viteCli = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");
  const web = spawn(process.execPath, [viteCli, "frontend", "--host", "127.0.0.1", "--port", String(port), "--strictPort", "--clearScreen=false"], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitFor(`http://127.0.0.1:${port}/`);
    const { chromium } = require("playwright-core");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const consoleErrors = [];
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(verificationDir, "home.png"), fullPage: true });
    await page.click("[data-action='levels']");
    await page.screenshot({ path: path.join(verificationDir, "levels.png"), fullPage: true });
    await page.click("[data-level-index='0']");
    await page.waitForSelector(".maze-svg", { timeout: 5000 });
    await page.screenshot({ path: path.join(verificationDir, "game-start.png"), fullPage: true });

    const counts = await page.evaluate(() => ({
      open: window.__arrowClearDebug.getOpenPathIds().length,
      blocked: window.__arrowClearDebug.getBlockedPathIds().length,
      total: window.__arrowClearDebug.getState().board.paths.length
    }));
    if (counts.total < 70) throw new Error(`maze is not dense enough: ${counts.total}`);
    if (counts.open < 2 || counts.open >= counts.total / 2) {
      throw new Error(`open path count is not puzzle-like: ${counts.open}/${counts.total}`);
    }
    if (counts.blocked < 20) throw new Error(`blocked path count too low: ${counts.blocked}`);

    const blockedResult = await page.evaluate(() => {
      const blocked = window.__arrowClearDebug.getBlockedPathIds()[0];
      return window.__arrowClearDebug.clickPath(blocked);
    });
    if (blockedResult !== "blocked") throw new Error(`blocked click should be rejected, got ${blockedResult}`);
    await page.waitForTimeout(120);
    const afterBlocked = await page.evaluate(() => window.__arrowClearDebug.getState());
    if (afterBlocked.cleared !== 0 || afterBlocked.mistakes !== 1) {
      throw new Error("blocked click changed clear state incorrectly");
    }
    await page.screenshot({ path: path.join(verificationDir, "game-blocked-click.png"), fullPage: true });

    const clearLimit = await page.evaluate(() => {
      const current = window.__arrowClearDebug.getState();
      return current.level.targetClears || current.board.paths.length;
    });
    for (let index = 0; index < clearLimit; index += 1) {
      const resultVisible = await page.locator(".result-screen").count();
      if (resultVisible) break;
      await page.evaluate(() => window.__arrowClearDebug.clickFirstOpenPath());
      await page.waitForTimeout(310);
    }

    await page.waitForSelector(".result-screen", { timeout: 5000 });
    await page.screenshot({ path: path.join(verificationDir, "result.png"), fullPage: true });
    const resultText = await page.locator("body").innerText();
    if (!resultText.includes("清线率") || !resultText.includes("误触次数")) {
      throw new Error("result metrics missing");
    }
    await page.click("[data-action='share']");
    await page.screenshot({ path: path.join(verificationDir, "share.png"), fullPage: true });
    const shareText = await page.locator("body").innerText();
    if (!shareText.includes("挑战文案") || !shareText.includes("复制发群文案")) {
      throw new Error("share screen missing");
    }
    if (consoleErrors.length) {
      throw new Error(`console errors: ${consoleErrors.join("\n")}`);
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
