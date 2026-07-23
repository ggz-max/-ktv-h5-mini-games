const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "verification");
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });

  const consoleErrors = [];
  const requestFailures = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", request => {
    requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ""}`);
  });

  async function waitForImages() {
    await page.evaluate(async () => {
      const images = [...document.images];
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      }));
      await Promise.all(images.map(img => img.decode ? img.decode().catch(() => {}) : Promise.resolve()));
    });
  }

  const targetUrl = process.env.VERIFY_URL || "http://127.0.0.1:5308";
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await waitForImages();
  await page.screenshot({ path: path.join(outDir, "entry.png"), fullPage: true });

  const entryResult = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".level-card")];
    const levelList = document.querySelector(".level-list");
    const viewportHeight = window.innerHeight;
    return {
      entryRuleCount: document.querySelectorAll(".rule-strip span").length,
      levelCardCount: cards.length,
      visibleLevelCardCount: cards.filter(card => {
        const rect = card.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= viewportHeight && rect.left >= 0 && rect.right <= window.innerWidth;
      }).length,
      levelGridRows: new Set(cards.map(card => Math.round(card.getBoundingClientRect().top))).size,
      levelGridColumns: levelList ? getComputedStyle(levelList).gridTemplateColumns.split(" ").length : 0,
      selectedLevel: document.querySelector(".level-card.selected span")?.textContent || "",
      chapterStrip: document.querySelector(".chapter-strip")?.textContent || "",
      entryTitle: document.querySelector("h1")?.textContent || ""
    };
  });

  await page.locator("[data-level='11']").click();
  await page.waitForFunction(() => document.querySelector(".level-card.selected span")?.textContent === "12");
  const finalLevelResult = await page.evaluate(() => ({
    selectedLevelAfterClick: document.querySelector(".level-card.selected span")?.textContent || "",
    startButtonText: document.querySelector("[data-action='start']")?.textContent || ""
  }));

  await page.locator("[data-action='start']").click();
  await page.waitForSelector(".piece");
  await waitForImages();
  await page.screenshot({ path: path.join(outDir, "game.png"), fullPage: true });

  const gameResult = await page.evaluate(() => ({
    pieces: document.querySelectorAll(".piece").length,
    traySlots: document.querySelectorAll(".tray-slot").length,
    toolCount: document.querySelectorAll("[data-tool]").length,
    statCount: document.querySelectorAll(".round-stats div").length,
    homeActionCount: document.querySelectorAll("[data-action='home']").length,
    viewportHeight: window.innerHeight,
    documentHeight: document.documentElement.scrollHeight,
    phoneHeight: document.querySelector(".phone")?.getBoundingClientRect().height || 0,
    gameHeading: document.querySelector(".game-hud span")?.textContent || "",
    message: document.querySelector(".message")?.textContent || "",
    gameBrokenImages: [...document.images]
      .filter(img => !img.complete || img.naturalWidth === 0)
      .map(img => img.currentSrc || img.src)
  }));

  await page.locator("[data-action='home']").first().click();
  await page.waitForSelector(".level-list");
  const homeResult = await page.evaluate(() => ({
    returnedHomeTitle: document.querySelector("h1")?.textContent || "",
    selectedLevelAfterHome: document.querySelector(".level-card.selected span")?.textContent || "",
    homeBoardPieces: document.querySelectorAll(".piece").length
  }));

  await page.locator("[data-level='11']").click();
  await page.locator("[data-action='start']").click();
  await page.waitForSelector(".piece");

  await page.evaluate(() => window.endRound("fail", "slot_full"));
  await page.waitForSelector(".result-panel");
  await waitForImages();
  await page.screenshot({ path: path.join(outDir, "fail-result.png"), fullPage: true });

  const resultActionCount = await page.locator(".result-actions button").count();
  const resultHomeActionCount = await page.locator(".result-actions [data-action='home']").count();
  await page.locator("[data-action='share']").click();
  await page.waitForSelector(".poster");
  await waitForImages();
  await page.screenshot({ path: path.join(outDir, "share.png"), fullPage: true });

  const shareResult = await page.evaluate(({ resultActionCount, resultHomeActionCount }) => {
    const images = [...document.images].map(img => ({
      src: img.currentSrc || img.src,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    }));
    return {
      title: document.querySelector("h1")?.textContent || "",
      resultActionCount,
      resultHomeActionCount,
      shareHomeActionCount: document.querySelectorAll("[data-action='home']").length,
      posterExists: Boolean(document.querySelector(".poster")),
      copyChallengeExists: Boolean(document.querySelector("[data-action='copy']")),
      retrySameExists: Boolean(document.querySelector("[data-action='retry-same']")),
      brokenImages: images.filter(img => !img.complete || img.naturalWidth === 0),
      imageCount: images.length
    };
  }, { resultActionCount, resultHomeActionCount });

  const result = { ...entryResult, ...finalLevelResult, ...gameResult, ...homeResult, ...shareResult };

  await browser.close();

  if (consoleErrors.length) {
    throw new Error(`Console errors:\n${consoleErrors.join("\n")}`);
  }
  if (requestFailures.length) {
    throw new Error(`Request failures:\n${requestFailures.join("\n")}`);
  }
  if (result.entryRuleCount < 3) {
    throw new Error(`Expected 3 entry rules, got ${result.entryRuleCount}`);
  }
  if (result.levelCardCount !== 12 || result.selectedLevel !== "01") {
    throw new Error(`Expected default level 01 with 12 level cards, got ${result.selectedLevel}/${result.levelCardCount}`);
  }
  if (result.visibleLevelCardCount !== 12 || result.levelGridRows !== 3 || result.levelGridColumns !== 4) {
    throw new Error(`Expected a visible 4x3 level grid, got ${result.visibleLevelCardCount} cards / ${result.levelGridColumns} columns / ${result.levelGridRows} rows`);
  }
  if (!result.chapterStrip.includes("12")) {
    throw new Error(`Expected chapter strip to show 12 levels, got ${result.chapterStrip}`);
  }
  if (result.selectedLevelAfterClick !== "12" || !result.startButtonText.includes("12")) {
    throw new Error(`Expected selectable level 12, got ${result.selectedLevelAfterClick} / ${result.startButtonText}`);
  }
  if (!result.gameHeading.includes("12")) {
    throw new Error(`Expected game HUD to show level 12, got ${result.gameHeading}`);
  }
  if (result.homeActionCount < 1) {
    throw new Error("Expected in-game home action");
  }
  if (result.selectedLevelAfterHome !== "12" || result.homeBoardPieces !== 0) {
    throw new Error(`Expected home action to return to level picker, got level ${result.selectedLevelAfterHome} with ${result.homeBoardPieces} pieces`);
  }
  if (result.pieces < 30) {
    throw new Error(`Expected at least 30 board pieces on level 12, got ${result.pieces}`);
  }
  if (result.traySlots !== 7) {
    throw new Error(`Expected 7 tray slots, got ${result.traySlots}`);
  }
  if (result.toolCount < 2) {
    throw new Error(`Expected rescue tools, got ${result.toolCount}`);
  }
  if (result.statCount < 3) {
    throw new Error(`Expected round stats, got ${result.statCount}`);
  }
  if (result.documentHeight > result.viewportHeight + 24) {
    throw new Error(`Expected game screen to fit viewport, got ${result.documentHeight}px in ${result.viewportHeight}px viewport`);
  }
  if (result.gameBrokenImages.length) {
    throw new Error(`Broken game images:\n${JSON.stringify(result.gameBrokenImages, null, 2)}`);
  }
  if (result.resultActionCount < 5 || result.resultHomeActionCount < 1) {
    throw new Error(`Expected result rescue/share/home actions, got ${result.resultActionCount}/${result.resultHomeActionCount}`);
  }
  if (!result.posterExists || !result.copyChallengeExists || !result.retrySameExists || result.shareHomeActionCount < 1) {
    throw new Error("Expected share poster with copy challenge, same-seed retry, and home actions");
  }
  if (result.brokenImages.length) {
    throw new Error(`Broken images:\n${JSON.stringify(result.brokenImages, null, 2)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    route: targetUrl,
    viewport: "390x844",
    screenshots: [
      path.join(outDir, "entry.png"),
      path.join(outDir, "game.png"),
      path.join(outDir, "fail-result.png"),
      path.join(outDir, "share.png")
    ],
    result
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
