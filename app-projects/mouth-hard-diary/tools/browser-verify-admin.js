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
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(shot.data, "base64"));
}

(async () => {
  const chrome = findChrome();
  const debugPort = 9338;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mh-admin-chrome-"));
  const screenshotDir = path.resolve(__dirname, "..", "h5", "screenshots");
  let cdp;
  const child = spawn(chrome, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1120,900",
    "http://127.0.0.1:4327/admin.html"
  ], { stdio: "ignore" });

  try {
    const version = await waitForDebug(debugPort);
    const tabs = await getJson(`http://127.0.0.1:${debugPort}/json`);
    const page = tabs.find((tab) => tab.type === "page") || tabs[0];
    cdp = await cdpConnect(page.webSocketDebuggerUrl || version.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await waitFor(cdp, "document.querySelector('[data-stat=\"reports\"]')?.textContent !== '-'");
    await screenshot(cdp, path.join(screenshotDir, "admin.png"));

    const checks = await cdp.send("Runtime.evaluate", {
      expression: `({
        title: document.querySelector('h1')?.textContent || '',
        reports: document.querySelector('[data-stat="reports"]')?.textContent || '',
        events: document.querySelector('[data-stat="events"]')?.textContent || '',
        rows: document.querySelectorAll('.event-row').length,
        funnelRows: document.querySelectorAll('.funnel-row').length,
        launchText: document.querySelector('[data-launch-status]')?.textContent || '',
        launchChecks: document.querySelectorAll('.launch-check').length,
        launchCheckText: document.querySelector('[data-list="launch-checks"]')?.textContent || '',
        launchActionText: document.querySelector('[data-list="launch-actions"]')?.textContent || '',
        launchActionLinks: [...document.querySelectorAll('[data-list="launch-actions"] a')].map((a) => a.textContent),
        launchActionHrefs: [...document.querySelectorAll('[data-list="launch-actions"] a')].map((a) => a.getAttribute('href')),
        deliveryStatus: document.querySelector('[data-delivery-status]')?.textContent || '',
        deliveryCards: document.querySelectorAll('.delivery-card').length,
        deliveryText: document.querySelector('[data-list="delivery-audit"]')?.textContent || '',
        pencilStatus: document.querySelector('[data-pencil-status]')?.textContent || '',
        pencilSummaryText: document.querySelector('[data-list="pencil-summary"]')?.textContent || '',
        pencilAssetText: document.querySelector('[data-list="pencil-assets"]')?.textContent || '',
        pencilAssetCards: document.querySelectorAll('.pencil-asset-card').length,
        pencilOperatorHref: document.querySelector('.pencil-panel .panel-title a')?.getAttribute('href') || '',
        pencilSummaryLinks: [...document.querySelectorAll('[data-list="pencil-summary"] a')].map((a) => a.getAttribute('href')),
        decisionLabel: document.querySelector('[data-decision-label]')?.textContent || '',
        decisionCards: document.querySelectorAll('.decision-card').length,
        decisionText: document.querySelector('[data-list="decision-summary"]')?.textContent || '',
        samplingMeta: document.querySelector('[data-sampling-meta]')?.textContent || '',
        samplingCards: document.querySelectorAll('.sampling-card').length,
        samplingText: document.querySelector('[data-list="sampling-links"]')?.textContent || '',
        funnelText: document.querySelector('[data-list="funnel"]')?.textContent || '',
        variantText: document.querySelector('[data-list="variants"]')?.textContent || '',
        sourceText: document.querySelector('[data-list="sources"]')?.textContent || '',
        appInterestText: document.querySelector('[data-list="app-interests"]')?.textContent || '',
        leadText: document.querySelector('[data-list="leads"]')?.textContent || '',
        feedbackText: document.querySelector('[data-list="feedback"]')?.textContent || '',
        interviewText: document.querySelector('[data-list="interviews"]')?.textContent || '',
        interviewInputs: document.querySelectorAll('[data-form="interview"] input').length,
        exportButton: document.querySelector('[data-action="export"]')?.textContent || '',
        exportCsvButton: document.querySelector('[data-action="export-csv"]')?.textContent || '',
        exportStatus: document.querySelector('[data-export-status]')?.textContent || ''
      })`,
      returnByValue: true
    });

    const value = checks.result.value;
    if (!value.title.includes("\u5634\u786c\u65e5\u8bb0") || Number(value.reports) < 1 || Number(value.events) < 1) {
      throw new Error(`Unexpected admin state: ${JSON.stringify(value)}`);
    }
    if (!value.sourceText.includes("verify_data") && !value.sourceText.includes("unknown")) {
      throw new Error(`Source summary did not render: ${JSON.stringify(value)}`);
    }
    if (!value.sourceText.includes("\u5206\u4eab") || !value.sourceText.includes("\u7559\u8d44")) {
      throw new Error(`Source conversion rates did not render: ${JSON.stringify(value)}`);
    }
    if (!value.variantText.includes("\u62a5\u544a\u7387") || !value.variantText.includes("\u518d\u751f\u6210\u7387")) {
      throw new Error(`Variant conversion rates did not render: ${JSON.stringify(value)}`);
    }
    if (value.funnelRows < 4 || !value.funnelText.includes("\u751f\u6210\u6210\u529f")) {
      throw new Error(`Funnel summary did not render: ${JSON.stringify(value)}`);
    }
    if (!value.launchText.includes("\u5185\u90e8") && !value.launchText.includes("\u6b63\u5f0f")) {
      throw new Error(`Launch readiness did not render: ${JSON.stringify(value)}`);
    }
    if (value.launchChecks < 4) {
      throw new Error(`Launch readiness checks did not render: ${JSON.stringify(value)}`);
    }
    if (!value.launchCheckText.includes("\u89c6\u89c9\u98ce\u683c\u5df2\u786e\u8ba4") ||
      !value.launchCheckText.includes("Pencil .pen") ||
      !value.launchCheckText.includes("\u6700\u7ec8 Pencil")) {
      throw new Error(`Design launch gates did not render: ${JSON.stringify(value)}`);
    }
    if (!value.launchActionText.includes("style-approval.json") ||
      !value.launchActionText.includes(".pen") ||
      !value.launchActionText.includes("manifest")) {
      throw new Error(`Design launch actions did not render: ${JSON.stringify(value)}`);
    }
    if (!value.deliveryStatus.includes("/") ||
      value.deliveryCards < 12 ||
      !value.deliveryText.includes("\u7528\u6237\u753b\u50cf") ||
      !value.deliveryText.includes("Pencil .pen") ||
      !value.deliveryText.includes("H5") ||
      !value.deliveryText.includes("BLOCKED") ||
      !value.deliveryText.includes("style-approval.json")) {
      throw new Error(`Delivery audit panel did not render: ${JSON.stringify(value)}`);
    }
    if (!value.pencilStatus.includes("Pencil") ||
      !value.pencilSummaryText.includes("manifest") ||
      !value.pencilSummaryText.includes(".pen") ||
      !value.pencilAssetText.includes("source-home-bg-clean-image2.png") ||
      !value.pencilAssetText.includes("hero-report-collage.png") ||
      value.pencilAssetCards < 9 ||
      !value.pencilOperatorHref.includes("operator-pack.md") ||
      !value.pencilSummaryLinks.some((href) => href.includes("finalization-checklist.md"))) {
      throw new Error(`Pencil asset workbench did not render: ${JSON.stringify(value)}`);
    }
    if (!value.launchActionText.includes("\u4e0b\u4e00\u6b65") ||
      !value.launchActionText.includes("preflight") ||
      !value.launchActionText.includes("\u4e0a\u7ebf\u9884\u6f14") ||
      !value.launchActionText.includes("\u4ea4\u4ed8\u5ba1\u8ba1") ||
      !value.launchActionText.includes("\u76ee\u6807\u5ba1\u8ba1 JSON") ||
      !value.launchActionText.includes("Launch handoff") ||
      !value.launchActionText.includes("\u91c7\u6837\u94fe\u63a5\u5305") ||
      !value.launchActionText.includes("\u5b89\u5168 SOP") ||
      !value.launchActionText.includes("\u89c6\u89c9\u786e\u8ba4\u9875") ||
      !value.launchActionText.includes("\u786e\u8ba4\u8bb0\u5f55") ||
      !value.launchActionText.includes("\u786e\u8ba4\u8349\u7a3f\u6307\u5357") ||
      !value.launchActionText.includes("\u8d44\u4ea7\u7d22\u5f15") ||
      !value.launchActionText.includes("Pencil board spec") ||
      !value.launchActionText.includes("Pencil \u64cd\u4f5c\u5305") ||
      !value.launchActionText.includes("\u6700\u7ec8\u786e\u8ba4\u6e05\u5355") ||
      !value.launchActionText.includes("Pencil \u4ea4\u63a5\u5305") ||
      !value.launchActionText.includes("Pencil readiness") ||
      value.launchActionLinks.length < 18) {
      throw new Error(`Launch action handoff did not render: ${JSON.stringify(value)}`);
    }
    const linkChecks = await cdp.send("Runtime.evaluate", {
      expression: `Promise.all([...document.querySelectorAll('[data-list="launch-actions"] a')].map(async (a) => {
        const response = await fetch(new URL(a.getAttribute('href'), location.href).toString());
        return { label: a.textContent, status: response.status };
      }))`,
      awaitPromise: true,
      returnByValue: true
    });
    const linkValues = linkChecks.result.value || [];
    if (linkValues.length < 18 || linkValues.some((item) => item.status !== 200)) {
      throw new Error(`Launch action links are not reachable: ${JSON.stringify(linkValues)}`);
    }
    if (!value.decisionLabel || value.decisionCards < 4 || !value.decisionText.includes("App CTA") || !value.decisionText.includes("\u518d\u751f\u6210")) {
      throw new Error(`Decision summary did not render: ${JSON.stringify(value)}`);
    }
    if (!value.samplingMeta.includes("links") || value.samplingCards < 8 || !value.samplingText.includes("room_qr") || !value.samplingText.includes("seed_group")) {
      throw new Error(`Sampling links did not render: ${JSON.stringify(value)}`);
    }
    if (!value.appInterestText.includes("archive") && !value.appInterestText.includes("???")) {
      throw new Error(`App interest summary did not render: ${JSON.stringify(value)}`);
    }
    if (!value.leadText.includes("wechat") && !value.leadText.includes("???")) {
      throw new Error(`Lead summary did not render: ${JSON.stringify(value)}`);
    }
    if (!value.feedbackText.includes("accurate") && !value.feedbackText.includes("???")) {
      throw new Error(`Feedback summary did not render: ${JSON.stringify(value)}`);
    }
    if (!value.interviewText.includes("verify_user") && !value.interviewText.includes("???")) {
      throw new Error(`Interview summary did not render: ${JSON.stringify(value)}`);
    }
    if (value.interviewInputs < 5) {
      throw new Error(`Interview form did not render: ${JSON.stringify(value)}`);
    }
    if (!value.exportButton.includes("\u5bfc\u51fa\u6570\u636e") || !value.exportStatus) {
      throw new Error(`Admin export controls did not render: ${JSON.stringify(value)}`);
    }
    if (!value.exportCsvButton.includes("\u5bfc\u51fa\u8868\u683c")) {
      throw new Error(`Admin CSV export control did not render: ${JSON.stringify(value)}`);
    }

    const problems = cdp.events.filter((event) => {
      if (event.method === "Runtime.exceptionThrown") return true;
      if (event.method === "Log.entryAdded") return event.params?.entry?.level === "error";
      return false;
    });
    if (problems.length) throw new Error(`Admin console/runtime errors: ${JSON.stringify(problems.slice(0, 3))}`);

    console.log("admin browser verify ok");
    console.log(path.join(screenshotDir, "admin.png"));
  } finally {
    if (cdp) cdp.close();
    child.kill();
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
