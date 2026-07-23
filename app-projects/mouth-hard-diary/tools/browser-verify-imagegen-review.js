const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { pathToFileURL } = require("url");
const { spawn, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reviewPath = path.join(root, "designs", "imagegen-review.html");
const screenshotPath = path.join(root, "designs", "screenshots", "imagegen-review.png");
const isWindows = process.platform === "win32";

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
        try { resolve(JSON.parse(data)); } catch (error) { reject(error); }
      });
    }).on("error", reject);
  });
}

async function waitForDebug(port) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try { return await getJson(`http://127.0.0.1:${port}/json/version`); } catch (error) {}
    await new Promise((resolve) => setTimeout(resolve, 150));
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
      close() { ws.close(); }
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

(async () => {
  if (!fs.existsSync(reviewPath)) throw new Error(`Review page missing: ${reviewPath}`);
  const chrome = findChrome();
  const debugPort = 9400 + Math.floor(Math.random() * 500);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mh-imagegen-review-"));
  const child = spawn(chrome, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1180,1400",
    pathToFileURL(reviewPath).toString()
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

    await waitFor(cdp, "document.readyState === 'complete'");
    await waitFor(cdp, "[...document.images].length === 6 && [...document.images].every((img) => img.complete && img.naturalWidth > 0)");
    await screenshot(cdp, screenshotPath);

    const checks = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const images = [...document.images].map((img) => ({
          src: img.getAttribute('src'),
          alt: img.getAttribute('alt'),
          width: img.naturalWidth,
          height: img.naturalHeight
        }));
        const firstCard = document.querySelector('.asset-card');
        const rect = firstCard?.getBoundingClientRect();
        return {
          title: document.querySelector('h1')?.textContent || '',
          text: document.body.textContent || '',
          cardCount: document.querySelectorAll('.asset-card').length,
          imageCount: images.length,
          images,
          firstCardWidth: rect ? Math.round(rect.width) : 0,
          bodyWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth
        };
      })()`,
      returnByValue: true
    });
    const value = checks.result.value;
    if (!value.title.includes("嘴硬日记视觉确认") ||
      !value.text.includes("深夜便利贴 + 霓虹批注") ||
      !value.text.includes("必须先导入 Pencil") ||
      !value.text.includes("当前推荐") ||
      !value.text.includes("source-sticker-sheet-image2.png") ||
      !value.text.includes("Pencil 导出目标") ||
      !value.text.includes("export/hero-report-collage") ||
      !value.text.includes("确认问题") ||
      !value.text.includes("这个方向是否成立") ||
      !value.text.includes("npm run style:approval-draft") ||
      value.cardCount !== 6 ||
      value.imageCount !== 6 ||
      value.firstCardWidth < 260 ||
      value.bodyWidth > value.viewportWidth + 2 ||
      /[\u9362\u5a23\u68e3\u95c7\u943a\u9359\u7ec9\u5a34\u20ac\ufffd]/.test(value.text)) {
      throw new Error(`Imagegen review did not render correctly: ${JSON.stringify(value)}`);
    }
    const brokenImages = value.images.filter((image) => !image.width || !image.height || !image.src.includes("pencil-source/images/"));
    if (brokenImages.length) {
      throw new Error(`Imagegen review images did not load: ${JSON.stringify(brokenImages)}`);
    }

    const problems = cdp.events.filter((event) => {
      if (event.method === "Runtime.exceptionThrown") return true;
      if (event.method === "Log.entryAdded") return event.params?.entry?.level === "error";
      return false;
    });
    if (problems.length) {
      throw new Error(`Imagegen review console/runtime errors: ${JSON.stringify(problems.slice(0, 3))}`);
    }

    console.log("imagegen review browser verify ok");
    console.log(screenshotPath);
  } finally {
    if (cdp) cdp.close();
    killProcessTree(child);
    await new Promise((resolve) => {
      child.once("exit", resolve);
      setTimeout(resolve, 800);
    });
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (error) {}
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
