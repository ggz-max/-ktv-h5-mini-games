const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createAnalyticsStore, renderAnalyticsPage } = require("./analytics");

const rootDir = path.resolve(__dirname, "..");
const config = require(path.join(rootDir, "shared", "game-config.json"));
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const staticDir = process.env.STATIC_DIR || path.join(rootDir, "dist");
const scoresPath = path.join(dataDir, "scores.json");
const eventsPath = path.join(dataDir, "events.jsonl");
const analytics = createAnalyticsStore({ dataDir, legacyEventsPath: eventsPath });
const analyticsAdminToken = process.env.ANALYTICS_ADMIN_TOKEN || "";

fs.mkdirSync(dataDir, { recursive: true });

function readScores() {
  try {
    return JSON.parse(fs.readFileSync(scoresPath, "utf8"));
  } catch {
    return [];
  }
}

function writeScores(scores) {
  fs.writeFileSync(scoresPath, JSON.stringify(scores.slice(0, 50), null, 2));
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

function sendStatic(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml; charset=utf-8"
  };
  res.writeHead(200, {
    "content-type": types[extension] || "application/octet-stream",
    "cache-control": filePath.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache"
  });
  fs.createReadStream(filePath).pipe(res);
}

function serveApp(req, res, pathname) {
  if (!fs.existsSync(staticDir)) {
    sendJson(res, 503, { error: "static app not built" });
    return;
  }

  const decodedPath = decodeURIComponent(pathname);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const candidate = path.resolve(staticDir, relativePath);
  const indexPath = path.join(staticDir, "index.html");

  if (candidate.startsWith(staticDir) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    sendStatic(res, candidate);
    return;
  }

  if (req.method === "GET" && fs.existsSync(indexPath)) {
    sendStatic(res, indexPath);
    return;
  }

  sendJson(res, 404, { error: "not found" });
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

function ratingFor(score) {
  return config.ratings.reduce((current, item) => {
    return score >= item.minScore ? item.label : current;
  }, config.ratings[0].label);
}

function normalizeScore(input) {
  const score = Number(input.score);
  const accuracy = Number(input.accuracy);
  const maxCombo = Number(input.maxCombo);
  const slipCount = Number(input.slipCount);
  const coldValue = Number(input.coldValue);

  const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0;

  return {
    id: crypto.randomUUID(),
    roomCode: String(input.roomCode || config.roomCode).slice(0, 12),
    levelId: String(input.levelId || config.levels[0].id).slice(0, 40),
    score: normalizedScore,
    rating: ratingFor(normalizedScore),
    accuracy: Number.isFinite(accuracy) ? Math.max(0, Math.min(100, Math.round(accuracy))) : 0,
    maxCombo: Number.isFinite(maxCombo) ? Math.max(0, Math.min(999, Math.round(maxCombo))) : 0,
    slipCount: Number.isFinite(slipCount) ? Math.max(0, Math.min(999, Math.round(slipCount))) : 0,
    coldValue: Number.isFinite(coldValue) ? Math.max(0, Math.min(config.coldMax, Math.round(coldValue))) : 0,
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
      const recorded = analytics.recordEvent(event, { userAgent: req.headers["user-agent"] });
      sendJson(res, 202, { ok: true, id: recorded.id });
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

  if (req.method === "GET" && url.pathname === "/admin/analytics") {
    if (!hasAnalyticsAccess(req, url)) {
      sendHtml(res, 403, "<!doctype html><meta charset=\"utf-8\"><title>Forbidden</title><p>Forbidden</p>");
      return;
    }
    sendHtml(res, 200, renderAnalyticsPage(analytics.summary()));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "not found" });
    return;
  }

  serveApp(req, res, url.pathname);
}

const port = Number(process.env.PORT || 4310);
const host = process.env.HOST || "127.0.0.1";
http.createServer(handleRequest).listen(port, host, () => {
  console.log(`skip-song-reflex listening at http://${host}:${port}`);
});
