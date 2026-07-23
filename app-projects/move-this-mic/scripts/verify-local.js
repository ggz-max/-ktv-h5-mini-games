const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const verificationDir = path.join(rootDir, "verification");
const webPort = Number(process.env.VERIFY_WEB_PORT || 15320);

fs.mkdirSync(verificationDir, { recursive: true });

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function request(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, response => {
        response.resume();
        response.on("end", () => resolve(response.statusCode));
      })
      .on("error", reject);
  });
}

async function waitFor(url) {
  for (let index = 0; index < 60; index += 1) {
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

async function dragItem(page, itemId) {
  const itemBox = await page.locator(`[data-item-id="${itemId}"]`).boundingBox();
  const tray = await page.evaluate(() => window.__moveThisMicDebug.getTrayCenter());
  if (!itemBox || !tray) throw new Error(`cannot drag ${itemId}`);

  const startX = itemBox.x + itemBox.width / 2;
  const startY = itemBox.y + itemBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move((startX + tray.x) / 2, (startY + tray.y) / 2, { steps: 6 });
  await page.mouse.move(tray.x, tray.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(110);
}

async function holdItem(page, itemId, holdMs) {
  const box = await page.locator(`[data-item-id="${itemId}"]`).boundingBox();
  if (!box) throw new Error(`cannot hold ${itemId}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(holdMs + 90);
  await page.mouse.up();
  await page.waitForTimeout(120);
}

async function alternateItem(page, itemId, count, partialCount = count) {
  const box = await page.locator(`[data-item-id="${itemId}"]`).boundingBox();
  if (!box) throw new Error(`cannot gesture ${itemId}`);
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const amplitude = 34;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  for (let index = 0; index < partialCount; index += 1) {
    await page.mouse.move(centerX + (index % 2 === 0 ? amplitude : -amplitude), centerY, { steps: 3 });
  }
  await page.mouse.up();
  await page.waitForTimeout(130);
}

async function traceItem(page, itemId) {
  const box = await page.locator(`[data-item-id="${itemId}"]`).boundingBox();
  if (!box) throw new Error(`cannot trace ${itemId}`);
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 5, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.94, y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(120);
}

async function pourItem(page, itemId, holdMs) {
  const box = await page.locator(`[data-item-id="${itemId}"]`).boundingBox();
  const tray = await page.evaluate(() => window.__moveThisMicDebug.getTrayCenter());
  if (!box || !tray) throw new Error(`cannot pour ${itemId}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(tray.x, tray.y, { steps: 12 });
  await page.waitForTimeout(holdMs + 100);
  await page.mouse.up();
  await page.waitForTimeout(130);
}

async function carryItem(page, itemId) {
  const box = await page.locator(`[data-item-id="${itemId}"]`).boundingBox();
  const gate = await page.evaluate(() => window.__moveThisMicDebug.getCarryGateCenter());
  const tray = await page.evaluate(() => window.__moveThisMicDebug.getTrayCenter());
  if (!box || !gate || !tray) throw new Error(`cannot carry ${itemId}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(gate.x, gate.y, { steps: 8 });
  await page.mouse.move(tray.x, tray.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(130);
}

async function rhythmItem(page, itemId, waitMs) {
  if (waitMs > 0) await page.waitForTimeout(waitMs + 25);
  await page.click(`[data-item-id="${itemId}"]`);
  await page.waitForTimeout(130);
}

async function performItem(page, itemId, action = null) {
  const spec = action || await page.evaluate(id => window.__moveThisMicDebug.getActionForItem(id), itemId);
  if (!spec) throw new Error(`missing action spec for ${itemId}`);
  if (spec.interaction === "hold") await holdItem(page, itemId, spec.holdMs);
  else if (spec.interaction === "scrub" || spec.interaction === "shake") await alternateItem(page, itemId, spec.gestureCount);
  else if (spec.interaction === "trace") await traceItem(page, itemId);
  else if (spec.interaction === "pour") await pourItem(page, itemId, spec.holdMs);
  else if (spec.interaction === "carry") await carryItem(page, itemId);
  else if (spec.interaction === "rhythm") await rhythmItem(page, itemId, spec.rhythmWaitMs);
  else await dragItem(page, itemId);
}

async function dragAvailableItem(page) {
  const action = await page.evaluate(() => window.__moveThisMicDebug.getAvailableAction());
  if (!action) return false;
  await performItem(page, action.id, action);
  return true;
}

async function clickBlockedItem(page) {
  const itemId = await page.evaluate(() => window.__moveThisMicDebug.getFirstBlockedItemId());
  if (!itemId) throw new Error("expected at least one blocked item");
  await page.click(`[data-item-id="${itemId}"]`);
  await page.waitForTimeout(140);
}

async function solveCurrentLevel(page) {
  for (let step = 0; step < 28; step += 1) {
    const screen = await page.evaluate(() => window.__moveThisMicDebug.getScreen());
    if (screen === "result") return;
    const state = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (state.transitionLocked) {
      await page.waitForTimeout(680);
      continue;
    }
    const moved = await dragAvailableItem(page);
    if (!moved) await page.waitForTimeout(150);
  }
  throw new Error("level did not reach result within action budget");
}

async function assertNoHorizontalOverflow(page) {
  const layout = await page.evaluate(() => ({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  if (layout.scrollWidth > layout.innerWidth + 1) throw new Error(`horizontal overflow: ${JSON.stringify(layout)}`);
}

async function assertGameLayout(page) {
  await assertNoHorizontalOverflow(page);
  const layout = await page.evaluate(() => {
    const board = document.querySelector("[data-board]")?.getBoundingClientRect();
    const tray = document.querySelector("[data-drop-zone]")?.getBoundingClientRect();
    return {
      boardBottom: board?.bottom || 0,
      trayTop: tray?.top || 0,
      boardHeight: board?.height || 0
    };
  });
  if (layout.boardBottom > layout.trayTop + 1) throw new Error(`board overlaps tray: ${JSON.stringify(layout)}`);
  if (layout.boardHeight < 340) throw new Error(`board too short: ${layout.boardHeight}`);
}

async function openLevel(page, index) {
  await page.evaluate(levelIndex => window.__moveThisMicDebug.openLevel(levelIndex), index);
  await page.waitForSelector("[data-screen='game']");
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
    if (!executablePath) throw new Error("Chrome or Edge executable not found");
    const browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const consoleErrors = [];
    const failedAssets = [];
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", response => {
      if (response.url().includes("/assets/") && response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`);
    });

    await page.goto(`http://127.0.0.1:${webPort}/`, { waitUntil: "networkidle" });
    await page.evaluate(() => window.__moveThisMicDebug.resetProgress());
    await page.waitForSelector("[data-screen='entry']");
    await page.screenshot({ path: path.join(verificationDir, "entry-v4.png"), fullPage: true });

    await page.click("[data-action='levels']");
    await page.waitForSelector("[data-screen='levels']");
    await assertNoHorizontalOverflow(page);
    const initialLevelState = await page.evaluate(() => ({
      unlocked: document.querySelectorAll("[data-level-index]").length,
      locked: document.querySelectorAll(".level-card.is-locked").length
    }));
    if (initialLevelState.unlocked !== 1 || initialLevelState.locked !== 8) {
      throw new Error(`unexpected initial unlock state: ${JSON.stringify(initialLevelState)}`);
    }
    await page.screenshot({ path: path.join(verificationDir, "level-select-initial-v4.png"), fullPage: true });

    await page.click('[data-level-index="0"]');
    await page.waitForSelector("[data-screen='game']");
    await assertGameLayout(page);
    await page.screenshot({ path: path.join(verificationDir, "game-level-1-v4.png"), fullPage: true });

    await clickBlockedItem(page);
    const wrongTapState = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (wrongTapState.mistakes !== 1) throw new Error(`expected one mistake, got ${wrongTapState.mistakes}`);
    if (wrongTapState.pressure !== 24) throw new Error(`expected pressure 24, got ${wrongTapState.pressure}`);
    if (wrongTapState.levelMoves !== 1) throw new Error(`wrong tap should consume one action, got ${wrongTapState.levelMoves}`);
    if (wrongTapState.timeLeft > 28.5) throw new Error(`expected time penalty, got ${wrongTapState.timeLeft}`);

    await solveCurrentLevel(page);
    const firstResult = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (!firstResult.success || firstResult.currentStars < 1) throw new Error("first level should succeed");
    if (firstResult.progress.unlockedLevel !== 1) throw new Error(`level 2 was not unlocked: ${JSON.stringify(firstResult.progress)}`);
    if (!firstResult.progress.bestMoves[0]) throw new Error("best move record was not saved");
    await page.screenshot({ path: path.join(verificationDir, "result-level-1-v4.png"), fullPage: true });

    await page.click("[data-action='next']");
    await page.waitForSelector("[data-screen='game']");
    await solveCurrentLevel(page);
    const secondResult = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (!secondResult.success || secondResult.progress.unlockedLevel !== 2) throw new Error("level 3 was not unlocked");

    await page.click("[data-action='levels']");
    await page.waitForSelector("[data-screen='levels']");
    const unlockedAfterTwo = await page.locator("[data-level-index]").count();
    if (unlockedAfterTwo !== 3) throw new Error(`expected three unlocked levels, got ${unlockedAfterTwo}`);
    await page.screenshot({ path: path.join(verificationDir, "level-select-progress-v4.png"), fullPage: true });

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("[data-screen='entry']");
    await page.click("[data-action='levels']");
    const unlockedAfterReload = await page.locator("[data-level-index]").count();
    if (unlockedAfterReload !== 3) throw new Error(`progress did not persist after reload: ${unlockedAfterReload}`);

    await page.evaluate(() => window.__moveThisMicDebug.unlockAll());

    await openLevel(page, 1);
    await dragItem(page, "cup");
    const fastRouteState = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (fastRouteState.committedRoute !== "fast") throw new Error(`fast route did not commit: ${fastRouteState.committedRoute}`);
    await dragItem(page, "glow");
    const switchedRouteState = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (switchedRouteState.committedRoute !== "safe" || switchedRouteState.routeSwitches !== 1) {
      throw new Error(`route switch was not recorded: ${JSON.stringify(switchedRouteState)}`);
    }
    if (switchedRouteState.pressure < 26) throw new Error(`route switch pressure did not apply: ${switchedRouteState.pressure}`);

    await openLevel(page, 3);
    const beforeHint = await page.evaluate(() => window.__moveThisMicDebug.getState());
    await page.click("[data-action='hint']");
    const afterHint = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (!afterHint.hintUsed || !afterHint.hintId) throw new Error(`hint was not activated: ${JSON.stringify(afterHint)}`);
    if (afterHint.timeLeft > beforeHint.timeLeft - 2.5) throw new Error(`hint time cost did not apply: ${beforeHint.timeLeft} -> ${afterHint.timeLeft}`);
    if (await page.locator(".board-item.is-hinted").count() !== 1) throw new Error("hinted item was not highlighted");

    const phoneBox = await page.locator('[data-item-id="phone"]').boundingBox();
    await page.mouse.move(phoneBox.x + phoneBox.width / 2, phoneBox.y + phoneBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(180);
    await page.mouse.up();
    const earlyHoldState = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (earlyHoldState.removedCount !== 0 || earlyHoldState.levelMoves !== 0) throw new Error("short hold should not remove the phone");

    await dragAvailableItem(page);
    const knotId = await page.locator('[data-interaction="scrub"][data-available="true"]').getAttribute("data-item-id");
    const knotAction = await page.evaluate(id => window.__moveThisMicDebug.getActionForItem(id), knotId);
    const beforeScrub = await page.evaluate(() => window.__moveThisMicDebug.getState());
    await alternateItem(page, knotId, knotAction.gestureCount, 2);
    const afterPartialScrub = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (!(afterPartialScrub.interactionProgress[knotId] > 0 && afterPartialScrub.interactionProgress[knotId] < 1)) {
      throw new Error(`partial scrub progress was not retained: ${JSON.stringify(afterPartialScrub.interactionProgress)}`);
    }
    if (afterPartialScrub.removedCount !== beforeScrub.removedCount) throw new Error("knot was removed before scrub completed");
    await page.screenshot({ path: path.join(verificationDir, "tough-knot-v4.png"), fullPage: true });
    await performItem(page, knotId, knotAction);
    const afterScrub = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (afterScrub.removedCount !== beforeScrub.removedCount + 1) throw new Error("knot was not removed after scrub completed");
    await performItem(page, "cable");
    const afterTrace = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (afterTrace.removedCount !== beforeScrub.removedCount + 2) throw new Error("cable trace did not complete");
    await solveCurrentLevel(page);
    const hintedResult = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (hintedResult.currentStars > 2) throw new Error(`hint should block three stars: ${hintedResult.currentStars}`);

    await openLevel(page, 3);
    await performItem(page, "dice");
    await performItem(page, "coaster");
    await performItem(page, "remote");
    await performItem(page, "phone");
    await page.click('[data-item-id="cable"]');
    const moveLimitResult = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (moveLimitResult.screen !== "result" || moveLimitResult.success || moveLimitResult.failureReason !== "moves") {
      throw new Error(`move limit did not fail the level: ${JSON.stringify(moveLimitResult)}`);
    }

    await openLevel(page, 4);
    const bonusId = await page.evaluate(() => window.__moveThisMicDebug.getFirstBonusAvailableItemId());
    const beforeBonus = await page.evaluate(() => window.__moveThisMicDebug.getState());
    await performItem(page, bonusId);
    const afterBonus = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (afterBonus.removedCount !== beforeBonus.removedCount + 1 || afterBonus.timeLeft < beforeBonus.timeLeft + 2.2) {
      throw new Error(`bonus time did not apply: ${beforeBonus.timeLeft} -> ${afterBonus.timeLeft}`);
    }
    const bucketBefore = afterBonus.removedCount;
    await performItem(page, "bucket");
    const bucketAfter = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (bucketAfter.removedCount !== bucketBefore + 1) throw new Error("bucket was not poured and removed");
    await page.screenshot({ path: path.join(verificationDir, "bonus-time-v4.png"), fullPage: true });

    await openLevel(page, 5);
    await page.click('[data-item-id="cup"]');
    const rejectedTapState = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (rejectedTapState.levelMoves !== 0 || rejectedTapState.removedCount !== 0) {
      throw new Error(`carry cup accepted a direct tap: ${JSON.stringify(rejectedTapState)}`);
    }
    await performItem(page, "cup");
    const carriedCupState = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (carriedCupState.removedCount !== 1) throw new Error("cup did not pass the carry gate");

    await openLevel(page, 5);
    const pressureBeforeRelief = await page.evaluate(() => window.__moveThisMicDebug.getState().pressure);
    const reliefId = await page.locator(".effect-flag.is-relief").evaluate(element => element.closest("[data-item-id]").dataset.itemId);
    await performItem(page, reliefId);
    const pressureAfterRelief = await page.evaluate(() => window.__moveThisMicDebug.getState().pressure);
    if (pressureBeforeRelief < 36 || pressureAfterRelief < 18 || pressureAfterRelief >= pressureBeforeRelief) {
      throw new Error(`pressure relief mismatch: ${pressureBeforeRelief} -> ${pressureAfterRelief}`);
    }

    await openLevel(page, 8);
    await performItem(page, "glow");
    await performItem(page, "shaker");
    const shakerState = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (!shakerState.interactionProgress.shaker || shakerState.removedCount !== 2) throw new Error("shaker gesture did not complete");

    await openLevel(page, 8);
    await assertGameLayout(page);
    const pressureBeforeTick = await page.evaluate(() => window.__moveThisMicDebug.getState().pressure);
    await page.waitForTimeout(700);
    const pressureAfterTick = await page.evaluate(() => window.__moveThisMicDebug.getState().pressure);
    if (pressureAfterTick <= pressureBeforeTick) throw new Error(`dynamic pressure did not rise: ${pressureBeforeTick} -> ${pressureAfterTick}`);
    await page.screenshot({ path: path.join(verificationDir, "final-level-v4.png"), fullPage: true });
    await solveCurrentLevel(page);
    const finalResult = await page.evaluate(() => window.__moveThisMicDebug.getState());
    if (!finalResult.success || !finalResult.progress.bestStars[8]) throw new Error(`final level record was not saved: ${JSON.stringify(finalResult)}`);

    await page.click("[data-action='share']");
    await page.waitForSelector("[data-screen='share']");
    await page.screenshot({ path: path.join(verificationDir, "share-v4.png"), fullPage: true });

    const compact = await browser.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1 });
    await compact.goto(`http://127.0.0.1:${webPort}/`, { waitUntil: "networkidle" });
    await compact.evaluate(() => window.__moveThisMicDebug.unlockAll());
    await compact.evaluate(() => window.__moveThisMicDebug.openLevel(7));
    await compact.waitForSelector("[data-screen='game']");
    await assertGameLayout(compact);
    await compact.screenshot({ path: path.join(verificationDir, "compact-level-8-v4.png"), fullPage: true });
    await compact.close();

    const image2Resources = await page.evaluate(() => performance.getEntriesByType("resource").filter(entry => entry.name.includes("/assets/image2/")).length);
    if (image2Resources < 12) throw new Error(`expected image2 sprites, got ${image2Resources} resources`);
    if (failedAssets.length) throw new Error(`asset failures: ${failedAssets.join("\n")}`);
    if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join("\n")}`);

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
