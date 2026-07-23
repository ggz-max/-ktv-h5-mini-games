const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const verificationDir = path.join(rootDir, "verification");
const apiPort = Number(process.env.VERIFY_API_PORT || 14311);
const webPort = Number(process.env.VERIFY_WEB_PORT || 15310);
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
  const api = spawn(process.execPath, ["backend/server.js"], {
    cwd: rootDir,
    env: { ...process.env, PORT: String(apiPort) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const web = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "frontend", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort", "--clearScreen=false"], {
    cwd: rootDir,
    env: { ...process.env, VITE_API_BASE: `http://127.0.0.1:${apiPort}` },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitFor(`http://127.0.0.1:${apiPort}/api/config`);
    await waitFor(`http://127.0.0.1:${webPort}/`);

    const { chromium } = require("playwright-core");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const consoleErrors = [];
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto(`http://127.0.0.1:${webPort}/`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(verificationDir, "entry.png"), fullPage: true });
    await page.waitForSelector("[data-level-index='0']");
    await page.screenshot({ path: path.join(verificationDir, "levels.png"), fullPage: true });
    await page.click("[data-level-index='0']");
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(verificationDir, "game.png"), fullPage: true });
    for (let index = 0; index < 8; index += 1) {
      await page.waitForFunction(() => {
        const track = document.querySelector("#track");
        const card = document.querySelector(".event-card");
        if (!track || !card) return false;
        const trackBox = track.getBoundingClientRect();
        const cardBox = card.getBoundingClientRect();
        const hitX = trackBox.left + trackBox.width / 2;
        const cardX = cardBox.left + cardBox.width / 2;
        return Math.abs(cardX - hitX) <= 20;
      }, null, { timeout: 5000 });
      const expectedButton = await page.locator(".event-card").first().getAttribute("data-expected-button");
      await page.click(`[data-button='${expectedButton}']`);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(31000);
    await page.screenshot({ path: path.join(verificationDir, "result.png"), fullPage: true });
    await page.click("[data-action='share']");
    await page.screenshot({ path: path.join(verificationDir, "share.png"), fullPage: true });

    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes("挑战文案") || !bodyText.includes("复制发群文案")) {
      throw new Error("expected share screen text not found");
    }
    const scoreText = await page.locator(".result-card .subtitle").last().innerText();
    const score = Number(scoreText.match(/得了 (\d+) 分/)?.[1] || 0);
    if (score <= 0) {
      throw new Error(`expected positive score, got ${score}`);
    }
    if (consoleErrors.length) {
      throw new Error(`console errors: ${consoleErrors.join("\\n")}`);
    }
    await browser.close();
    console.log(`Local verification screenshots written to ${verificationDir}`);
  } finally {
    api.kill("SIGTERM");
    web.kill("SIGTERM");
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
