const http = require("http");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const port = 5325;
const debugPort = 9239;
const baseUrl = `http://127.0.0.1:${port}`;
const dataDir = path.join(os.tmpdir(), `ktv-personality-hydration-${Date.now()}`);
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const userDataDir = path.join(os.tmpdir(), `ktv-personality-hydration-profile-${Date.now()}`);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : "";
    const req = http.request(`${baseUrl}${pathname}`, {
      method,
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(data),
        "user-agent": "archive-hydration-verify"
      }
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk;
      });
      res.on("end", () => {
        let payload = {};
        try {
          payload = raw ? JSON.parse(raw) : {};
        } catch {
          payload = { raw };
        }
        resolve({ status: res.statusCode, payload });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function waitForHttp(url, timeout = 9000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        http.get(url, (res) => {
          res.resume();
          res.on("end", resolve);
        }).on("error", reject);
      });
      return true;
    } catch {
      await wait(160);
    }
  }
  return false;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
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

function send(ws, method, params = {}, timeout = 12000) {
  return new Promise((resolve, reject) => {
    send.id = (send.id || 0) + 1;
    const id = send.id;
    const timer = setTimeout(() => {
      ws.removeEventListener("message", onMessage);
      reject(new Error(`CDP timeout: ${method}`));
    }, timeout);
    const onMessage = (event) => {
      const raw = typeof event === "string" ? event : event.data;
      const message = JSON.parse(raw);
      if (message.id !== id) return;
      clearTimeout(timer);
      ws.removeEventListener("message", onMessage);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(ws, expression, timeout) {
  const result = await send(ws, "Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, timeout);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function rmEventually(target) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return;
    } catch {
      await wait(250);
    }
  }
}

async function main() {
  if (!fs.existsSync(edgePath)) throw new Error(`Microsoft Edge not found at ${edgePath}`);
  const member = `hydrate-${Date.now()}`;
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      KTV_DATA_DIR: dataDir
    },
    stdio: "ignore",
    windowsHide: true
  });

  let browser;
  try {
    if (!await waitForHttp(`${baseUrl}/api/health`)) throw new Error("Server did not start.");
    const profileWrite = await request("POST", `/api/singing-profile?member=${member}`, {
      profile: {
        source: "hydrate-profile",
        loveSongRatio: 0.95,
        pureLoveRatio: 0.92,
        hurtLoveRatio: 0.08,
        popSongRatio: 0.2,
        fastSongRatio: 0.08,
        chorusRatio: 0.16,
        skipRatio: 0.05
      }
    });
    if (profileWrite.status !== 200) throw new Error(`Profile write failed: ${JSON.stringify(profileWrite)}`);
    const firstRoll = await request("POST", `/api/persona/roll?member=${member}`, {});
    if (firstRoll.status !== 200 || firstRoll.payload.code !== "ROMEO") {
      throw new Error(`Expected server archive to contain ROMEO/LOVER: ${JSON.stringify(firstRoll)}`);
    }

    browser = spawn(edgePath, [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--disable-gpu",
      "--window-size=430,932",
      `${baseUrl}/?member=${member}&t=${Date.now()}#library`
    ], { stdio: "ignore", windowsHide: true });

    if (!await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`)) {
      throw new Error("Debug Edge did not start.");
    }
    const pages = await getJson(`http://127.0.0.1:${debugPort}/json`);
    const page = pages.find((item) => item.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    await send(ws, "Page.enable");
    await send(ws, "Runtime.enable");
    await send(ws, "Network.setCacheDisabled", { cacheDisabled: true });
    await evaluate(ws, "document.fonts ? document.fonts.ready : Promise.resolve()", 8000);
    await wait(1400);
    const result = await evaluate(ws, `({
      view: document.querySelector(".view.is-active")?.dataset.view || "",
      summary: document.querySelector('[data-bind="librarySummary"]')?.textContent || "",
      identity: document.querySelector('[data-bind="libraryIdentityLine"]')?.textContent || "",
      current: document.querySelector('[data-bind="archivePrimaryCode"]')?.textContent || "",
      collection: document.querySelector('[data-bind="collectionWallCount"]')?.textContent || "",
      quickActions: [...document.querySelectorAll(".library-quick-actions [data-mission-action]")]
        .map((node) => node.textContent.trim()),
      removedModules: {
        dailyQuest: Boolean(document.querySelector(".daily-quest")),
        replayMission: Boolean(document.querySelector(".replay-mission")),
        jumpNav: Boolean(document.querySelector(".library-jump-nav"))
      },
      owned: JSON.parse(localStorage.getItem("ktv-owned-codes") || "[]"),
      primary: localStorage.getItem("ktv-primary-persona") || "",
      profile: JSON.parse(localStorage.getItem("ktv-singing-profile") || "{}")
    })`, 10000);
    console.log(JSON.stringify(result, null, 2));
    if (result.view !== "library") throw new Error(`Expected library view: ${JSON.stringify(result)}`);
    if (!result.owned.includes("ROMEO") || result.primary !== "ROMEO") {
      throw new Error(`Expected hydrated ROMEO archive: ${JSON.stringify(result)}`);
    }
    if (!result.summary.includes("LOVER") || !result.identity.includes("LOVER")) {
      throw new Error(`Expected hydrated LOVER copy: ${JSON.stringify(result)}`);
    }
    if (result.collection !== "2/12") {
      throw new Error(`Expected hydrated collection: ${JSON.stringify(result)}`);
    }
    if (!result.quickActions.includes("生成分享图") || !result.quickActions.includes("继续测人格")) {
      throw new Error(`Expected lean library actions: ${JSON.stringify(result)}`);
    }
    if (Object.values(result.removedModules).some(Boolean)) {
      throw new Error(`Expected removed library modules to stay absent: ${JSON.stringify(result)}`);
    }
    if (result.profile.source !== "hydrate-profile") {
      throw new Error(`Expected hydrated singing profile: ${JSON.stringify(result)}`);
    }
    await send(ws, "Browser.close").catch(() => {});
  } finally {
    if (browser && !browser.killed) browser.kill();
    if (!server.killed) server.kill();
    await rmEventually(dataDir);
    await rmEventually(userDataDir);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
