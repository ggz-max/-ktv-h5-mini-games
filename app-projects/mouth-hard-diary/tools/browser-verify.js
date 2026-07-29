const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);

function findChrome() {
  const found = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Chrome or Edge executable not found");
  return found;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

async function waitForDebug(port) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      return await getJson(`http://127.0.0.1:${port}/json/version`);
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("Chrome debugging endpoint did not start");
}

function cdpConnect(wsUrl) {
  return new Promise((resolve, reject) => {
    const WebSocket = global.WebSocket;
    if (!WebSocket) {
      reject(new Error("Global WebSocket is unavailable in this Node runtime"));
      return;
    }

    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const events = [];

    ws.addEventListener("open", () => {
      resolve({
        events,
        send(method, params = {}) {
          const messageId = ++id;
          ws.send(JSON.stringify({ id: messageId, method, params }));
          return new Promise((res, rej) => {
            pending.set(messageId, { res, rej });
          });
        },
        close() {
          ws.close();
        }
      });
    });

    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { res, rej } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) rej(new Error(message.error.message));
        else res(message.result || {});
      } else if (message.method) {
        events.push(message);
      }
    });

    ws.addEventListener("error", reject);
  });
}

async function waitFor(cdp, expression, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: true
    });
    if (result.result && result.result.value) return true;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function waitForEventCount(eventName, minCount, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const summary = await getJson("http://127.0.0.1:4327/api/v1/admin/runtime-summary");
    if ((summary.eventCounts && summary.eventCounts[eventName] || 0) >= minCount) return true;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for event count: ${eventName} >= ${minCount}`);
}

async function click(cdp, selector) {
  await cdp.send("Runtime.evaluate", {
    expression: `document.querySelector(${JSON.stringify(selector)}).click()`
  });
}

async function screenshot(cdp, outputPath) {
  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true
  });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(shot.data, "base64"));
}

(async () => {
  const chrome = findChrome();
  const debugPort = 9337;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mh-chrome-"));
  const screenshotDir = path.resolve(__dirname, "..", "h5", "screenshots");

  const child = spawn(chrome, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=390,844",
    "http://127.0.0.1:4327/"
  ], { stdio: "ignore" });

  let cdp;
  try {
    const version = await waitForDebug(debugPort);
    const tabs = await getJson(`http://127.0.0.1:${debugPort}/json`);
    const page = tabs.find((tab) => tab.type === "page") || tabs[0];
    cdp = await cdpConnect(page.webSocketDebuggerUrl || version.webSocketDebuggerUrl);

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    await waitFor(cdp, "document.querySelector('[data-screen=\"home\"]').classList.contains('is-active')");
    await screenshot(cdp, path.join(screenshotDir, "home.png"));

    await waitFor(cdp, "document.querySelectorAll('[data-field=\"scene\"] .chip').length >= 8");
    await waitFor(cdp, "document.querySelectorAll('[data-field=\"style\"] .style-card').length >= 7");
    const beforeAttribution = await getJson("http://127.0.0.1:4327/api/v1/admin/runtime-summary");
    const beforeH5Events = beforeAttribution.sourceSummary?.h5_mvp?.events || 0;
    const beforeH5Reports = beforeAttribution.sourceSummary?.h5_mvp?.reports || 0;
    await click(cdp, "[data-action='start']");
    await waitFor(cdp, "document.querySelector('[data-screen=\"input\"]').classList.contains('is-active')");
    await click(cdp, ".input-form button[type='submit']");
    await waitFor(cdp, "document.querySelector('[data-screen=\"result\"]').classList.contains('is-active')", 8000);
    await screenshot(cdp, path.join(screenshotDir, "result.png"));
    await waitForEventCount("mh_generate_success", (beforeAttribution.eventCounts?.mh_generate_success || 0) + 1);

    const resultChecks = await cdp.send("Runtime.evaluate", {
      expression: `({
        title: document.querySelector('[data-report="title"]')?.textContent || '',
        quote: document.querySelector('[data-report="quote"]')?.textContent || '',
        buttons: [...document.querySelectorAll('.result-actions button')].map(b => b.textContent.trim()),
        shareButtons: document.querySelectorAll('[data-action="share"]').length,
        feedbackButtons: document.querySelectorAll('[data-action="feedback"]').length,
        feedbackPanels: document.querySelectorAll('.feedback-strip').length,
        rituals: document.querySelectorAll('[data-action="ritual"]').length,
        remixes: document.querySelectorAll('[data-action="remix"]').length,
        copyButtons: document.querySelectorAll('[data-action="copy"]').length,
        appButtons: document.querySelectorAll('[data-action="app"]').length,
        collectButtons: document.querySelectorAll('[data-action="collect"]').length,
        appScreens: document.querySelectorAll('[data-screen="app"]').length,
        active: document.querySelector('.screen.is-active')?.dataset.screen
      })`,
      returnByValue: true
    });

    const resultValue = resultChecks.result.value;
    if (resultValue.active !== "result" || !resultValue.title || !resultValue.quote ||
      resultValue.buttons.length !== 1 || resultValue.buttons[0] !== "保存海报" ||
      resultValue.rituals !== 0 || resultValue.remixes !== 0 ||
      resultValue.shareButtons !== 0 || resultValue.feedbackButtons !== 0 || resultValue.feedbackPanels !== 0 ||
      resultValue.copyButtons !== 0 || resultValue.appButtons !== 0 || resultValue.collectButtons !== 0 ||
      resultValue.appScreens !== 0) {
      throw new Error(`Unexpected result state: ${JSON.stringify(resultValue)}`);
    }
    const afterAttribution = await getJson("http://127.0.0.1:4327/api/v1/admin/runtime-summary");
    if ((afterAttribution.sourceSummary?.h5_mvp?.events || 0) <= beforeH5Events ||
      (afterAttribution.sourceSummary?.h5_mvp?.reports || 0) <= beforeH5Reports) {
      throw new Error(`Default attribution did not land in h5_mvp: ${JSON.stringify(afterAttribution.sourceSummary?.h5_mvp)}`);
    }

    const beforeSaveSummary = await getJson("http://127.0.0.1:4327/api/v1/admin/runtime-summary");
    await click(cdp, "[data-action='save']");
    await waitForEventCount("mh_save_click", (beforeSaveSummary.eventCounts?.mh_save_click || 0) + 1);
    const checks = await cdp.send("Runtime.evaluate", {
      expression: `({
        active: document.querySelector('.screen.is-active')?.dataset.screen
      })`,
      returnByValue: true
    });
    const value = checks.result.value;
    if (value.active !== "result") {
      throw new Error(`Unexpected page state: ${JSON.stringify(value)}`);
    }

    const consoleProblems = cdp.events.filter((event) => {
      if (event.method === "Runtime.exceptionThrown") return true;
      if (event.method === "Log.entryAdded") {
        const level = event.params && event.params.entry && event.params.entry.level;
        const url = event.params && event.params.entry && event.params.entry.url;
        const isPendingPencilAsset = url && url.endsWith("/assets/visuals/pencil-export/hero-report-collage.png");
        return level === "error" && !isPendingPencilAsset;
      }
      return false;
    });
    if (consoleProblems.length) {
      throw new Error(`Console/runtime errors: ${JSON.stringify(consoleProblems.slice(0, 3))}`);
    }

    console.log("browser verify ok");
    console.log(path.join(screenshotDir, "home.png"));
    console.log(path.join(screenshotDir, "result.png"));
  } finally {
    if (cdp) cdp.close();
    child.kill();
    await new Promise((resolve) => {
      child.once("exit", resolve);
      setTimeout(resolve, 800);
    });
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`warning: could not remove temp Chrome profile: ${userDataDir}`);
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
