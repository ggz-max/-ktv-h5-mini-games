import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = (process.env.DEPLOYED_BASE_URL || "https://room-blame-king.tbox.ktvsky.com").replace(/\/$/, "");
const outputDir = path.resolve("output", "verification");
fs.mkdirSync(outputDir, { recursive: true });

const health = await fetch(`${base}/api/health`);
if (!health.ok) throw new Error(`deployed health failed: ${health.status}`);

const browser = await chromium.launch({ headless: true });
const contexts = await Promise.all(Array.from({ length: 3 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem("room-blame-king-tutorial-seen", "1"));
  return context;
}));
const pages = await Promise.all(contexts.map(context => context.newPage()));
const issues = [];
pages.forEach((page, index) => {
  page.on("console", message => { if (message.type() === "error") issues.push(`p${index + 1}: console ${message.text()}`); });
  page.on("pageerror", error => issues.push(`p${index + 1}: pageerror ${error.message}`));
  page.on("requestfailed", request => issues.push(`p${index + 1}: requestfailed ${request.url()} ${request.failure()?.errorText}`));
});

try {
  await pages[0].goto(base, { waitUntil: "networkidle" });
  await pages[0].locator("#profile-name").fill("公网房主");
  await pages[0].locator("#create-room").click();
  await pages[0].locator(".waiting-screen").waitFor();
  const code = (await pages[0].locator(".topbar strong").textContent()).trim();
  const qrSize = await pages[0].locator("#qr-code canvas").evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
  if (qrSize.width < 100 || qrSize.height < 100) issues.push(`QR canvas too small: ${JSON.stringify(qrSize)}`);

  for (let index = 1; index < pages.length; index += 1) {
    await pages[index].goto(`${base}/?join=${code}`, { waitUntil: "networkidle" });
    await pages[index].locator("#profile-name").fill(`扫码玩家${index + 1}`);
    await pages[index].locator("#join-room").click();
    await pages[index].locator(".waiting-screen").waitFor();
  }
  await pages[0].getByText("3 人在线").waitFor();
  await pages[0].locator("#start-game").click();
  await Promise.all(pages.map(page => page.locator(".game-screen").waitFor()));

  for (const page of pages) {
    await page.locator("[data-card]:not([disabled])").first().click();
    await page.locator("#confirm-card:not([disabled])").click();
  }
  await Promise.all(pages.map(page => page.locator(".resolution-overlay").waitFor({ timeout: 8000 })));

  const screenshot = path.join(outputDir, "deployed-three-player-round.png");
  await pages[0].screenshot({ path: screenshot, fullPage: false });
  const report = { generatedAt: new Date().toISOString(), base, health: await health.json(), roomCode: code, joinedPlayers: 3, synchronizedRound: true, qrCanvas: qrSize, screenshot, issues };
  fs.writeFileSync(path.join(outputDir, "deployed-report.json"), JSON.stringify(report, null, 2));
  if (issues.length) throw new Error(issues.join("\n"));
  console.log(`deployed verification passed: room ${code}, 3 players, synchronized round`);
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
}
