const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const appDir = path.join(root, "www-room-lineup");
const appPort = 5322;
const debugPort = 9236;
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const userDataDir = path.join(process.env.TEMP || root, `ktv-personality-actions-profile-${Date.now()}`);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function waitForHttp(url, timeout = 7000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      await request(url);
      return true;
    } catch {
      await sleep(150);
    }
  }
  return false;
}

function startStaticServer() {
  const source = `
    const http=require('http'),fs=require('fs'),path=require('path');
    const root=${JSON.stringify(appDir)};
    const types={'.html':'text/html;charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
    http.createServer((req,res)=>{
      const url=new URL(req.url,'http://127.0.0.1');
      let file=path.join(root,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname));
      if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
      fs.readFile(file,(err,data)=>{
        if(err){res.writeHead(404);res.end('not found');return;}
        res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});
        res.end(data);
      });
    }).listen(${appPort},'127.0.0.1');
  `;
  return spawn(process.execPath, ["-e", source], { stdio: "ignore" });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

function send(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    send.id = (send.id || 0) + 1;
    const id = send.id;
    const onMessage = (event) => {
      const message = JSON.parse(typeof event === "string" ? event : event.data);
      if (message.id !== id) return;
      ws.removeEventListener("message", onMessage);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function rectCheck(rect, viewportHeight) {
  return rect && rect.top >= 0 && rect.bottom <= viewportHeight && rect.height > 0;
}

async function main() {
  if (!global.WebSocket) throw new Error("This check requires Node.js built-in WebSocket support.");
  const server = startStaticServer();
  const browser = spawn(chromePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--window-size=414,768",
    `http://127.0.0.1:${appPort}/?reset=1&persona=ECHO&owned=SPARK,ECHO#result`
  ], { stdio: "ignore" });

  try {
    if (!await waitForHttp(`http://127.0.0.1:${appPort}/`)) {
      throw new Error("Static server did not start.");
    }
    await sleep(1000);
    const pages = await getJson(`http://127.0.0.1:${debugPort}/json`);
    const page = pages.find((item) => item.type === "page");
    if (!page) throw new Error("No debuggable page found.");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    await send(ws, "Runtime.enable");
    await send(ws, "Page.enable");
    await sleep(900);

    const result = await send(ws, "Runtime.evaluate", {
      expression: `(() => {
        const h = window.innerHeight;
        const resultActions = document.querySelector(".result-actions");
        const resultButtons = [...document.querySelectorAll(".result-actions button")].map((button) => {
          const r = button.getBoundingClientRect();
          return { text: button.textContent.trim(), top: r.top, bottom: r.bottom, height: r.height };
        });
        return {
          viewportHeight: h,
          resultActionsPosition: getComputedStyle(resultActions).position,
          resultButtons
        };
      })()`,
      returnByValue: true
    });

    const value = result.result.value;
    const allVisible = value.resultButtons.every((rect) => rectCheck(rect, value.viewportHeight));

    const screenshotPath = path.join(appDir, "screenshots", "h5-actions-visible-check.png");
    await send(ws, "Page.captureScreenshot", { format: "png", captureBeyondViewport: false }).then((shot) => {
      fs.writeFileSync(screenshotPath, Buffer.from(shot.data, "base64"));
    });

    await send(ws, "Browser.close").catch(() => {});
    console.log(JSON.stringify({ ok: allVisible, screenshotPath, ...value }, null, 2));
    if (!allVisible) process.exit(1);
  } finally {
    server.kill();
    browser.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
