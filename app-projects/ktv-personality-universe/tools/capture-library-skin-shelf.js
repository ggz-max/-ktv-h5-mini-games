const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const appDir = path.join(root, "www-room-lineup");
const port = 5317;
const debugPort = 9231;
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const userDataDir = path.join(process.env.TEMP || root, "ktv-personality-cdp-profile");
const screenshotPath = path.join(appDir, "screenshots", "h5-library-skin-shelf-check.png");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function request(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      res.on("end", resolve);
    });
    req.on("error", reject);
  });
}

async function waitForHttp(url, timeout = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await request(url);
      return true;
    } catch {
      await wait(180);
    }
  }
  return false;
}

function send(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    send.id = (send.id || 0) + 1;
    const id = send.id;
    const onMessage = (event) => {
      const raw = typeof event === "string" ? event : event.data;
      const message = JSON.parse(raw);
      if (message.id !== id) return;
      ws.removeEventListener("message", onMessage);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  if (!global.WebSocket) {
    throw new Error("This check requires Node.js with built-in WebSocket support.");
  }
  if (!fs.existsSync(edgePath)) {
    throw new Error(`Microsoft Edge not found at ${edgePath}`);
  }

  const serverProcess = spawn(process.execPath, ["-e", `
      const http=require('http'),fs=require('fs'),path=require('path');
      const root=${JSON.stringify(appDir)};
      const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json; charset=utf-8'};
      http.createServer((req,res)=>{
        const url=new URL(req.url,'http://127.0.0.1');
        let file=path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
        if(!file.startsWith(root)){res.writeHead(403); res.end('forbidden'); return;}
        fs.readFile(file,(err,data)=>{ if(err){res.writeHead(404); res.end('not found'); return;} res.writeHead(200, {'content-type':types[path.extname(file)]||'application/octet-stream'}); res.end(data); });
      }).listen(${port}, '127.0.0.1');
    `], { stdio: "ignore", windowsHide: true });
  const becameReady = await waitForHttp(`http://127.0.0.1:${port}/index.html`, 6000);
  if (!becameReady) throw new Error("Local static server did not start.");

  const targetUrl = `http://127.0.0.1:${port}/?reset=1&persona=ROMEO&owned=SPARK,ROMEO&bonus=2&t=${Date.now()}#library`;
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--hide-scrollbars",
    "--disable-gpu",
    "--window-size=430,932",
    targetUrl
  ], { stdio: "ignore", windowsHide: true });

  try {
    const debugReady = await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`, 8000);
    if (!debugReady) throw new Error("Debug Edge did not start.");
    const pages = await getJson(`http://127.0.0.1:${debugPort}/json`);
    const page = pages.find((item) => item.type === "page");
    if (!page) throw new Error("No debuggable page found.");

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
      origin: `http://127.0.0.1:${port}`,
      storageTypes: "all"
    }).catch(() => {});
    await send(ws, "Emulation.setDeviceMetricsOverride", {
      width: 430,
      height: 932,
      deviceScaleFactor: 2,
      mobile: true
    });
    await send(ws, "Page.navigate", { url: targetUrl });
    await send(ws, "Runtime.evaluate", {
      expression: "document.fonts ? document.fonts.ready : Promise.resolve()",
      awaitPromise: true
    });
    await send(ws, "Runtime.evaluate", {
      expression: `(
        async () => {
          localStorage.clear();
          localStorage.setItem("ktv-owned-codes", JSON.stringify(["SPARK", "ROMEO", "ECHO", "DROP"]));
          localStorage.setItem("ktv-scan-count", "1");
          localStorage.setItem("ktv-persona-index", "2");
          localStorage.setItem("ktv-preferred-code", "ROMEO");
          await new Promise((resolve) => setTimeout(resolve, 400));
          if (window.__ktvDemo) {
            window.__ktvDemo.renderPersona();
            window.__ktvDemo.showView("library", false);
          }
          else location.hash = "#library";
        }
      )()`,
      awaitPromise: true
    });
    await wait(900);

    const diagnostics = await send(ws, "Runtime.evaluate", {
      expression: `(
        () => ({
          view: document.querySelector(".view.is-active")?.dataset.view,
          shelfCards: document.querySelectorAll(".skin-shelf-grid article").length,
          shelfOwned: document.querySelectorAll(".skin-shelf-grid article.is-owned").length,
          ownedCode: document.querySelector(".owned-skin-body h3")?.textContent || "",
          ownedCodeMetrics: (() => {
            const node = document.querySelector(".owned-skin-body h3");
            return node ? {
              scrollWidth: node.scrollWidth,
              clientWidth: node.clientWidth,
              fontSize: getComputedStyle(node).fontSize
            } : null;
          })(),
          ownedCodeOverflows: (() => {
            const node = document.querySelector(".owned-skin-body h3");
            return node ? node.scrollWidth > node.clientWidth : true;
          })(),
          brokenImages: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src),
          bodyHeight: document.body.scrollHeight,
          viewportHeight: window.innerHeight
        })
      )()`,
      returnByValue: true
    });

    const shot = await send(ws, "Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true
    });
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    fs.writeFileSync(screenshotPath, Buffer.from(shot.data, "base64"));
    console.log(JSON.stringify({ ...diagnostics.result.value, screenshotPath }, null, 2));
    await send(ws, "Browser.close").catch(() => {});
  } finally {
    browser.kill();
    if (serverProcess) serverProcess.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
