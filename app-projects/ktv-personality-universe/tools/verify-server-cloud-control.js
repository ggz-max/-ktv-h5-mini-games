const http = require("http");

const baseUrl = process.env.KTV_VERIFY_BASE || "http://127.0.0.1:8091";
const debugPort = 9233;
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const userDataDir = path.join(process.env.TEMP || process.cwd(), "ktv-personality-server-verify-profile");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(url, { headers }, (res) => {
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

async function waitForHttp(url, timeout = 7000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      await getJson(url);
      return true;
    } catch {
      await sleep(160);
    }
  }
  return false;
}

function send(ws, method, params = {}, timeout = 10000) {
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

async function main() {
  if (!fs.existsSync(edgePath)) throw new Error(`Microsoft Edge not found at ${edgePath}`);
  const healthReady = await waitForHttp(`${baseUrl}/api/health`);
  if (!healthReady) throw new Error(`Server is not ready: ${baseUrl}`);

  const browser = spawn(edgePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--window-size=430,932",
    `${baseUrl}/?reset=1&t=${Date.now()}#entry`
  ], { stdio: "ignore", windowsHide: true });

  try {
    const debugReady = await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
    if (!debugReady) throw new Error("Debug Edge did not start.");
    const pages = await getJson(`http://127.0.0.1:${debugPort}/json`);
    const page = pages.find((item) => item.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    await send(ws, "Page.enable");
    await send(ws, "Runtime.enable");
    await send(ws, "Network.enable");
    await send(ws, "Network.setCacheDisabled", { cacheDisabled: true });
    await send(ws, "Storage.clearDataForOrigin", {
      origin: baseUrl,
      storageTypes: "all"
    }).catch(() => {});
    await send(ws, "Page.navigate", { url: `${baseUrl}/?reset=1&t=${Date.now()}#entry` });
    await evaluate(ws, "document.fonts ? document.fonts.ready : Promise.resolve()", 8000);
    await sleep(900);
    const result = await evaluate(ws, `(
      async () => {
        window.__ktvDemo?.showView("entry", false);
        localStorage.setItem("ktv-singing-profile", JSON.stringify({
          source: "verify-history",
          loveSongRatio: 0.94,
          fastSongRatio: 0.1,
          chorusRatio: 0.12,
          skipRatio: 0.08
        }));
        await new Promise((resolve) => setTimeout(resolve, 300));
        await new Promise((resolve) => setTimeout(resolve, 150));
        return {
          titleHot: document.querySelector('[data-bind="entryTitleHot"]')?.textContent || "",
          cta: document.querySelector('[data-bind="entryCta"]')?.textContent || "",
          shareUrl: window.sharePlayUrl ? window.sharePlayUrl() : "",
          quotaHint: document.querySelector('[data-bind="quotaHint"]')?.textContent || "",
          remoteEvent: JSON.parse(localStorage.getItem("ktv-events") || "[]").some((event) => event.name === "remote_config_loaded"),
          pickEvent: JSON.parse(localStorage.getItem("ktv-events") || "[]").some((event) => event.name === "entry_view")
        };
      }
    )()`, 10000);
    await sleep(700);
    console.log(JSON.stringify(result, null, 2));
    if (!result.shareUrl.includes(baseUrl)) throw new Error(`shareUrl did not use server base: ${result.shareUrl}`);
    if (!result.remoteEvent) throw new Error("remote_config_loaded event missing");
    if (!result.quotaHint.includes("今日还可开")) throw new Error(`quota hint missing: ${result.quotaHint}`);
    await send(ws, "Browser.close").catch(() => {});
  } finally {
    if (!browser.killed) browser.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
