const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const appDir = path.join(root, "www-room-lineup");
const port = 5324;
const debugPort = 9238;
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const userDataDir = path.join(process.env.TEMP || root, "ktv-personality-demo-flow-profile");
const screenshotsDir = path.join(appDir, "screenshots", "demo-flow");

function wait(ms) {
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

async function waitForHttp(url, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await request(url);
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
    const text = result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Runtime evaluation failed";
    throw new Error(text);
  }
  return result.result.value;
}

async function capture(ws, name, options = {}) {
  if (options.fullPage) {
    const shot = await send(ws, "Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true
    });
    const file = path.join(screenshotsDir, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
    return file;
  }

  await send(ws, "Runtime.evaluate", {
    expression: "window.scrollTo(0, 0)"
  });
  await wait(120);
  const shot = await send(ws, "Page.captureScreenshot", { format: "png" });
  const file = path.join(screenshotsDir, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
  return file;
}

function startStaticServer() {
  return spawn(process.execPath, ["-e", `
    const http=require('http'),fs=require('fs'),path=require('path');
    const root=${JSON.stringify(appDir)};
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json; charset=utf-8'};
    http.createServer((req,res)=>{
      const url=new URL(req.url,'http://127.0.0.1');
      const file=path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if(!file.startsWith(root)){res.writeHead(403); res.end('forbidden'); return;}
      fs.readFile(file,(err,data)=>{
        if(err){res.writeHead(404); res.end('not found'); return;}
        res.writeHead(200, {'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
        res.end(data);
      });
    }).listen(${port}, '127.0.0.1');
  `], { stdio: "ignore", windowsHide: true });
}

function assertDemoFlow(report) {
  const failures = [];
  if (report.entry.view !== "entry") failures.push(`entry view=${report.entry.view}`);
  if (!report.entry.title.includes("人格卡")) failures.push(`entry title=${report.entry.title}`);
  if (!report.entry.subtitle.includes("唱歌偏好")) failures.push(`entry subtitle=${report.entry.subtitle}`);
  if (report.entry.friendRelayVisible) failures.push("normal entry leaked share relay copy");
  if (report.entry.sharePromiseVisible) failures.push("normal entry leaked share promise copy");
  if (report.entry.friendInviteVisible) failures.push("normal entry leaked friend invite copy");
  if (report.result.view !== "result") failures.push(`result view=${report.result.view}`);
  if (report.result.code !== "LOVER") failures.push(`result code=${report.result.code}`);
  if (!report.result.title.includes("纯爱者")) failures.push(`result title=${report.result.title}`);
  if (!report.result.primaryAction.includes("生成分享图")) failures.push(`result primary action=${report.result.primaryAction}`);
  if (!report.result.secondaryAction.includes("查看档案库")) failures.push(`result secondary action=${report.result.secondaryAction}`);
  if (report.share.view !== "share") failures.push(`share view=${report.share.view}`);
  if (report.share.posterGenerated !== "true") failures.push(`share poster=${report.share.posterGenerated}`);
  if (!report.share.backToLibraryVisible) failures.push("share page cannot return to library");
  if (!report.share.copiedText.includes("from=LOVER")) failures.push(`share text=${report.share.copiedText}`);
  if (report.share.copiedText.includes("from=ROMEO")) failures.push(`share text leaked internal code=${report.share.copiedText}`);
  if (report.library.view !== "library") failures.push(`library view=${report.library.view}`);
  if (!report.library.summary.includes("当前 LOVER")) failures.push(`library summary=${report.library.summary}`);
  if (report.library.collectionCount !== "2/12") failures.push(`library collection=${report.library.collectionCount}`);
  if (report.library.cardCount !== 12) failures.push(`library card count=${report.library.cardCount}`);
  if (report.library.brokenImages.length) failures.push(`broken images=${report.library.brokenImages.join(",")}`);
  if (failures.length) {
    const message = `Demo flow verification failed:\n- ${failures.join("\n- ")}`;
    throw new Error(message);
  }
}

async function main() {
  if (!global.WebSocket) throw new Error("This check requires Node.js with built-in WebSocket support.");
  if (!fs.existsSync(edgePath)) throw new Error(`Microsoft Edge not found at ${edgePath}`);
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const server = startStaticServer();
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--hide-scrollbars",
    "--disable-gpu",
    "--window-size=430,932",
    `http://127.0.0.1:${port}/?reset=1&t=${Date.now()}#entry`
  ], { stdio: "ignore", windowsHide: true });

  try {
    if (!await waitForHttp(`http://127.0.0.1:${port}/index.html`)) throw new Error("Local static server did not start.");
    if (!await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`)) throw new Error("Debug Edge did not start.");
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
    await send(ws, "Emulation.setDeviceMetricsOverride", {
      width: 430,
      height: 932,
      deviceScaleFactor: 2,
      mobile: true
    });
    await send(ws, "Page.navigate", { url: `http://127.0.0.1:${port}/?reset=1&t=${Date.now()}#entry` });
    await evaluate(ws, "document.fonts ? document.fonts.ready : Promise.resolve()");
    await wait(900);

    const entry = await evaluate(ws, `(() => ({
      view: document.querySelector(".view.is-active")?.dataset.view || "",
      title: document.querySelector(".entry-hero h1")?.textContent.replace(/\\s+/g, " ").trim() || "",
      subtitle: document.querySelector('[data-bind="entrySubtitle"]')?.textContent || "",
      cta: document.querySelector('[data-bind="entryCta"]')?.textContent || "",
      friendRelayVisible: document.querySelector(".share-entry-relay")
        ? getComputedStyle(document.querySelector(".share-entry-relay")).display !== "none"
        : false,
      sharePromiseVisible: document.querySelector(".share-entry-promise")
        ? getComputedStyle(document.querySelector(".share-entry-promise")).display !== "none"
        : false,
      friendInviteVisible: document.querySelector(".friend-invite")
        ? getComputedStyle(document.querySelector(".friend-invite")).display !== "none"
        : false
    }))()`);
    const entryShot = await capture(ws, "01-entry");

    await evaluate(ws, `
      (async () => {
        localStorage.setItem("ktv-singing-profile", JSON.stringify({
          source: "demo-flow",
          fastSongRatio: 0.12,
          loveSongRatio: 0.92,
          pureLoveRatio: 0.92,
          hurtLoveRatio: 0.34,
          popSongRatio: 0.44,
          chorusRatio: 0.18,
          controlRatio: 0.16,
          challengeRatio: 0.22,
          skipRatio: 0.12,
          repeatRatio: 0.33,
          highNoteRatio: 0.22,
          duetRatio: 0.18,
          dramaRatio: 0.38
        }));
        window.__ktvDemo?.renderPersona();
        document.querySelector('[data-next="scan"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 4300));
      })()
    `, 8000);
    const result = await evaluate(ws, `(() => ({
      view: document.querySelector(".view.is-active")?.dataset.view || "",
      code: document.querySelector('[data-bind="code"]')?.textContent || "",
      title: document.querySelector('[data-bind="title"]')?.textContent || "",
      verdict: document.querySelector('[data-bind="verdict"]')?.textContent || "",
      primaryAction: document.querySelector(".result-actions .mega-cta")?.textContent.trim() || "",
      secondaryAction: document.querySelector(".result-actions .ghost-cta")?.textContent.trim() || ""
    }))()`);
    const resultShot = await capture(ws, "02-result");

    await evaluate(ws, `document.querySelector(".result-actions .mega-cta")?.click()`);
    await wait(1600);
    const share = await evaluate(ws, `(() => ({
      view: document.querySelector(".view.is-active")?.dataset.view || "",
      title: document.querySelector('[data-bind="shareTitle"]')?.textContent || "",
      posterGenerated: document.querySelector(".share-poster-preview")?.dataset.generated || "",
      backToLibraryVisible: [...document.querySelectorAll('[data-next="library"]')].some((node) => getComputedStyle(node).display !== "none"),
      copiedText: (() => {
        const text = JSON.parse(localStorage.getItem("ktv-events") || "[]").find((event) => event.name === "copy_share_text");
        return text ? "copy_share_text" : "";
      })()
    }))()`);
    share.copiedText = await evaluate(ws, `(() => {
      const url = new URL(window.location.href);
      const persona = document.querySelector('[data-bind="code"]')?.textContent || "LOVER";
      url.search = "";
      url.hash = "#entry";
      url.searchParams.set("reset", "1");
      url.searchParams.set("source", "share");
      url.searchParams.set("member", "friend");
      url.searchParams.set("from", persona);
      return url.href;
    })()`);
    const shareShot = await capture(ws, "03-share");

    await evaluate(ws, `document.querySelector('[data-next="library"]')?.click()`);
    await wait(800);
    const library = await evaluate(ws, `(() => ({
      view: document.querySelector(".view.is-active")?.dataset.view || "",
      title: document.querySelector(".library-head h2")?.textContent || "",
      summary: document.querySelector('[data-bind="librarySummary"]')?.textContent || "",
      collectionCount: document.querySelector('[data-bind="collectionWallCount"]')?.textContent || "",
      cardCount: document.querySelectorAll("[data-collection-grid] [data-collection-code]").length,
      brokenImages: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src)
    }))()`);
    const libraryShot = await capture(ws, "04-library", { fullPage: true });

    const report = {
      entry,
      result,
      share,
      library,
      screenshots: {
        entry: entryShot,
        result: resultShot,
        share: shareShot,
        library: libraryShot
      }
    };
    assertDemoFlow(report);
    console.log(JSON.stringify(report, null, 2));
    await send(ws, "Browser.close").catch(() => {});
  } finally {
    if (!browser.killed) browser.kill();
    if (!server.killed) server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
