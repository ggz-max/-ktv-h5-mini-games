const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { pathToFileURL } = require("url");
const { spawn, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const cardsDir = path.join(root, "docs", "sampling-cards");
const indexPath = path.join(cardsDir, "index.html");
const firstCardPath = path.join(cardsDir, "01-ktv_room_qr-report.html");
const screenshotDir = path.join(cardsDir, "screenshots");
const isWindows = process.platform === "win32";
const mojibake = /[\u9362\u9422\u71b8\u59e3\u93c3\u30e8\u7ecb\u5a09\u9225\u9435\u52ea\u9359\u6220\u6d93\u9428\u6dc7\u6fc6\u7035\u714e\u935a\u55d8\u8930\u64b3\u93c2\u56e9\u93c1\u6fb6\u6d98\u93c8\u6ec3\ufffd]/;

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
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const events = [];

    ws.addEventListener("open", () => resolve({
      events,
      send(method, params = {}) {
        const messageId = ++id;
        ws.send(JSON.stringify({ id: messageId, method, params }));
        return new Promise((res, rej) => pending.set(messageId, { res, rej }));
      },
      close() {
        ws.close();
      }
    }));

    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { res, rej } = pending.get(message.id);
        pending.delete(message.id);
        message.error ? rej(new Error(message.error.message)) : res(message.result || {});
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
    const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true });
    if (result.result && result.result.value) return true;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function screenshot(cdp, outputPath) {
  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true
  });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(shot.data, "base64"));
}

function killProcessTree(child) {
  if (!child || child.killed) return;
  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
  } else {
    child.kill("SIGKILL");
  }
}

async function navigate(cdp, filePath) {
  await cdp.send("Page.navigate", { url: pathToFileURL(filePath).toString() });
  await waitFor(cdp, "document.readyState === 'complete'");
}

(async () => {
  const chrome = findChrome();
  const debugPort = 9300 + Math.floor(Math.random() * 500);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mh-cards-chrome-"));
  const child = spawn(chrome, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=430,760",
    pathToFileURL(indexPath).toString()
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
      width: 430,
      height: 760,
      deviceScaleFactor: 2,
      mobile: false
    });

    await waitFor(cdp, "document.querySelectorAll('tbody tr').length === 8");
    const indexChecks = await cdp.send("Runtime.evaluate", {
      expression: `({
        title: document.querySelector('h1')?.textContent || '',
        text: document.body.textContent,
        links: [...document.querySelectorAll('a')].map((a) => a.getAttribute('href')),
        rows: document.querySelectorAll('tbody tr').length,
        hasUrl: document.body.textContent.includes('source=ktv')
      })`,
      returnByValue: true
    });
    const indexValue = indexChecks.result.value;
    if (indexValue.title !== "真实采样投放卡片" ||
      indexValue.rows !== 8 ||
      !indexValue.hasUrl ||
      !indexValue.text.includes("场景") ||
      mojibake.test(indexValue.text)) {
      throw new Error(`Sampling cards index did not render correctly: ${JSON.stringify(indexValue)}`);
    }
    await screenshot(cdp, path.join(screenshotDir, "index.png"));

    await navigate(cdp, firstCardPath);
    await waitFor(cdp, "document.querySelector('.card') && document.querySelector('h1')");
    const cardChecks = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const card = document.querySelector('.card');
        const rect = card.getBoundingClientRect();
        return {
          title: document.querySelector('h1')?.textContent || '',
          text: document.body.textContent,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          overflowX: document.documentElement.scrollWidth > window.innerWidth + 2
        };
      })()`,
      returnByValue: true
    });
    const cardValue = cardChecks.result.value;
    if (cardValue.title !== "发疯报告" ||
      !cardValue.text.includes("source: ktv") ||
      !cardValue.text.includes("匿名采样") ||
      !cardValue.text.includes("不收真实手机号、微信或身份信息") ||
      mojibake.test(cardValue.text) ||
      cardValue.width < 360 ||
      cardValue.height < 600 ||
      cardValue.overflowX) {
      throw new Error(`Sampling card did not render correctly: ${JSON.stringify(cardValue)}`);
    }
    await screenshot(cdp, path.join(screenshotDir, "01-ktv-room-report.png"));

    const problems = cdp.events.filter((event) => {
      if (event.method === "Runtime.exceptionThrown") return true;
      if (event.method === "Log.entryAdded") return event.params?.entry?.level === "error";
      return false;
    });
    if (problems.length) {
      throw new Error(`Sampling card console/runtime errors: ${JSON.stringify(problems.slice(0, 3))}`);
    }

    console.log("sampling cards browser verify ok");
    console.log(path.join(screenshotDir, "index.png"));
    console.log(path.join(screenshotDir, "01-ktv-room-report.png"));
  } finally {
    if (cdp) cdp.close();
    killProcessTree(child);
    await new Promise((resolve) => {
      child.once("exit", resolve);
      setTimeout(resolve, 800);
    });
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (error) {}
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
