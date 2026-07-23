const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const rootDir = path.resolve(__dirname, "..");
const port = Number(process.env.VERIFY_API_PORT || 14310);
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "skip-song-reflex-api-"));

function request(method, pathname, payload) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : "";
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: pathname,
      method,
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body)
      }
    }, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.end(body);
  });
}

async function waitForServer() {
  for (let index = 0; index < 30; index += 1) {
    try {
      const result = await request("GET", "/api/config");
      if (result.status === 200) return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  throw new Error("server did not start");
}

async function main() {
  const child = spawn(process.execPath, ["backend/server.js"], {
    cwd: rootDir,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForServer();
    const config = await request("GET", "/api/config");
    if (!config.body.events || !config.body.levels) throw new Error("config response invalid");
    const unsupported = config.body.events.find(event => !["cut", "grab", "rescue"].includes(event.button));
    if (unsupported) throw new Error(`unsupported event button from API: ${unsupported.id}:${unsupported.button}`);

    const score = await request("POST", "/api/score", {
      levelId: "level-01",
      score: 980,
      accuracy: 88,
      maxCombo: 9,
      slipCount: 2,
      coldValue: 24
    });
    if (score.status !== 201 || !score.body.score || !score.body.rank) throw new Error("score response invalid");

    const event = await request("POST", "/api/event", {
      type: "reflex_entry_view",
      payload: {
        visitorId: "verify_uv_1",
        sessionId: "verify_session_1",
        source: "verify_api",
        screen: "levels",
        levelId: "level-01",
        levelIndex: 0,
        ok: true
      }
    });
    if (event.status !== 202) throw new Error("event response invalid");

    const summary = await request("GET", "/api/analytics/summary");
    if (summary.status !== 200 || summary.body.uniqueVisitors < 1 || summary.body.pageViews < 1) {
      throw new Error("analytics summary invalid");
    }

    console.log("skip-song-reflex API verification passed");
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once("exit", resolve));
      child.kill("SIGTERM");
      await exited;
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
