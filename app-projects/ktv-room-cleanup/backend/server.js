const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createAnalyticsStore, renderAnalyticsPage } = require("./analytics");

const rootDir = path.resolve(__dirname, "..");
const config = require(path.join(rootDir, "shared", "game-config.json"));
const publicDir = path.join(rootDir, "dist");
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const scoresPath = path.join(dataDir, "scores.json");
const eventsPath = path.join(dataDir, "events.jsonl");
const analytics = createAnalyticsStore({ dataDir, legacyEventsPath: eventsPath });
const analyticsAdminToken = process.env.ANALYTICS_ADMIN_TOKEN || "";
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

fs.mkdirSync(dataDir, { recursive: true });

function readScores() {
  try {
    return JSON.parse(fs.readFileSync(scoresPath, "utf8"));
  } catch {
    return [];
  }
}

function writeScores(scores) {
  fs.writeFileSync(scoresPath, JSON.stringify(scores.slice(0, 30), null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-analytics-token"
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(html);
}

function hasAnalyticsAccess(req, url) {
  if (!analyticsAdminToken) return true;
  return url.searchParams.get("token") === analyticsAdminToken || req.headers["x-analytics-token"] === analyticsAdminToken;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("request body too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function normalizeScore(input) {
  const cleaned = Number(input.cleaned);
  const secondsLeft = Number(input.secondsLeft);
  const trayPressure = Number(input.trayPressure);
  const score = Number(input.score);
  const level = Number(input.level);
  const maxRoundSeconds = Math.max(config.roundSeconds || 90, ...(config.levels || []).map(item => Number(item.roundSeconds) || 0));

  return {
    id: crypto.randomUUID(),
    roomCode: String(input.roomCode || config.roomCode).slice(0, 12),
    level: Number.isFinite(level) ? Math.max(1, Math.min(99, Math.round(level))) : 1,
    cleaned: Number.isFinite(cleaned) ? Math.max(0, Math.min(30, cleaned)) : 0,
    secondsLeft: Number.isFinite(secondsLeft) ? Math.max(0, Math.min(maxRoundSeconds, secondsLeft)) : 0,
    trayPressure: Number.isFinite(trayPressure) ? Math.max(0, Math.min(100, trayPressure)) : 0,
    score: Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0,
    outcome: input.outcome === "win" ? "win" : "fail",
    createdAt: new Date().toISOString()
  };
}

async function handleRequest(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/config") {
    sendJson(res, 200, config);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/leaderboard") {
    sendJson(res, 200, { scores: readScores() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/score") {
    try {
      const score = normalizeScore(await readBody(req));
      const scores = [score, ...readScores()].sort((a, b) => b.score - a.score);
      writeScores(scores);
      sendJson(res, 201, { score, rank: scores.findIndex(item => item.id === score.id) + 1 });
    } catch {
      sendJson(res, 400, { error: "invalid score payload" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/event") {
    try {
      const event = await readBody(req);
      analytics.recordEvent(event);
      sendJson(res, 202, { ok: true });
    } catch {
      sendJson(res, 400, { error: "invalid event payload" });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/analytics/summary") {
    if (!hasAnalyticsAccess(req, url)) {
      sendJson(res, 403, { error: "forbidden" });
      return;
    }
    sendJson(res, 200, analytics.summary());
    return;
  }

  sendJson(res, 404, { error: "not found" });
}

function safeJoin(baseDir, pathname) {
  const decoded = decodeURIComponent(pathname);
  const target = path.join(baseDir, decoded === "/" ? "index.html" : decoded);
  return target.startsWith(baseDir) ? target : "";
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const file = safeJoin(publicDir, url.pathname);
  if (!file) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      fs.readFile(path.join(publicDir, "index.html"), (fallbackError, fallbackData) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, {
          "content-type": contentTypes[".html"],
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        });
        res.end(fallbackData);
      });
      return;
    }

    const ext = path.extname(file).toLowerCase();
    const isMutable = [".html", ".js", ".css", ".json"].includes(ext);
    res.writeHead(200, {
      "content-type": contentTypes[ext] || "application/octet-stream",
      "cache-control": isMutable ? "no-store" : "public, max-age=300",
      "x-content-type-options": "nosniff"
    });
    res.end(data);
  });
}

const port = Number(process.env.PORT || 4308);
const host = process.env.HOST || "127.0.0.1";
http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/admin/analytics") {
    if (!hasAnalyticsAccess(req, url)) {
      sendHtml(res, 403, "<!doctype html><meta charset=\"utf-8\"><title>Forbidden</title><p>Forbidden</p>");
      return;
    }
    sendHtml(res, 200, renderAnalyticsPage(analytics.summary()));
    return;
  }

  if (req.url.startsWith("/api/") || req.method === "OPTIONS") {
    handleRequest(req, res);
    return;
  }
  serveStatic(req, res);
}).listen(port, host, () => {
  console.log(`ktv-room-cleanup listening at http://${host}:${port}`);
});
