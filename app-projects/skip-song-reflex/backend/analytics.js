const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const FUNNEL_TYPES = {
  entry: ["reflex_entry_view"],
  level: ["reflex_level_select"],
  start: ["reflex_game_start"],
  finish: ["reflex_game_finish"],
  share: ["reflex_result_share_click"]
};

const REPORT_FILTER = "(source IS NULL OR source NOT LIKE 'codex%') AND type NOT LIKE 'verify_%'";

function createAnalyticsStore({ dataDir, legacyEventsPath }) {
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = process.env.ANALYTICS_DB_PATH || path.join(dataDir, "analytics.sqlite");
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 3000;

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      visitor_id TEXT,
      session_id TEXT,
      source TEXT,
      level_id TEXT,
      level_index INTEGER,
      room_code TEXT,
      screen TEXT,
      payload TEXT NOT NULL,
      user_agent TEXT,
      referrer TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_type_created
      ON analytics_events(type, created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_visitor
      ON analytics_events(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_session
      ON analytics_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_level
      ON analytics_events(level_id, level_index);
  `);

  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO analytics_events
      (id, type, visitor_id, session_id, source, level_id, level_index, room_code, screen, payload, user_agent, referrer, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  importLegacyEvents(db, insertEvent, legacyEventsPath);

  function recordEvent(input, context = {}) {
    const event = normalizeEvent(input, context);
    insertEvent.run(
      event.id,
      event.type,
      event.visitorId,
      event.sessionId,
      event.source,
      event.levelId,
      event.levelIndex,
      event.roomCode,
      event.screen,
      JSON.stringify(event.payload),
      event.userAgent,
      event.referrer,
      event.createdAt
    );
    return event;
  }

  function summary() {
    const totals = db.prepare(`
      SELECT
        COUNT(*) AS totalEvents,
        COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), NULLIF(session_id, ''), id)) AS uniqueVisitors,
        COUNT(DISTINCT COALESCE(NULLIF(session_id, ''), id)) AS sessions
      FROM analytics_events
      WHERE ${REPORT_FILTER}
    `).get();

    const entry = metricFor(db, FUNNEL_TYPES.entry);
    const level = metricFor(db, FUNNEL_TYPES.level);
    const start = metricFor(db, FUNNEL_TYPES.start);
    const finish = metricFor(db, FUNNEL_TYPES.finish);
    const share = metricFor(db, FUNNEL_TYPES.share);

    return {
      generatedAt: new Date().toISOString(),
      dbPath,
      totalEvents: totals.totalEvents,
      uniqueVisitors: totals.uniqueVisitors,
      sessions: totals.sessions,
      pageViews: entry.events,
      funnel: {
        entryUsers: entry.users,
        levelUsers: level.users,
        startUsers: start.users,
        finishUsers: finish.users,
        shareUsers: share.users,
        levelRate: rate(level.users, entry.users),
        startRate: rate(start.users, level.users || entry.users),
        finishRate: rate(finish.users, start.users),
        shareRate: rate(share.users, finish.users)
      },
      byLevel: levelSummary(db),
      recentEvents: recentEvents(db)
    };
  }

  return { dbPath, recordEvent, summary };
}

function normalizeEvent(input = {}, context = {}) {
  const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
  const levelIndex = Number(payload.levelIndex ?? payload.index ?? input.levelIndex);

  return {
    id: compactString(input.id || crypto.randomUUID(), 80),
    type: compactString(input.type || "unknown", 64),
    visitorId: compactString(payload.visitorId || input.visitorId || "", 96) || null,
    sessionId: compactString(payload.sessionId || input.sessionId || "", 96) || null,
    source: compactString(payload.source || input.source || "", 80) || null,
    levelId: compactString(payload.levelId || input.levelId || "", 48) || null,
    levelIndex: Number.isFinite(levelIndex) ? Math.max(0, Math.min(99, Math.round(levelIndex))) : null,
    roomCode: compactString(payload.roomCode || input.roomCode || "", 24) || null,
    screen: compactString(payload.screen || input.screen || "", 32) || null,
    payload,
    userAgent: compactString(context.userAgent || input.userAgent || "", 200) || null,
    referrer: compactString(payload.referrer || input.referrer || "", 300) || null,
    createdAt: compactString(input.createdAt || new Date().toISOString(), 40)
  };
}

function compactString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function importLegacyEvents(db, insertEvent, legacyEventsPath) {
  const count = db.prepare("SELECT COUNT(*) AS total FROM analytics_events").get().total;
  if (count > 0 || !legacyEventsPath || !fs.existsSync(legacyEventsPath)) return;

  const lines = fs.readFileSync(legacyEventsPath, "utf8").split(/\r?\n/).filter(Boolean);
  db.exec("BEGIN");
  try {
    for (const line of lines) {
      try {
        const event = normalizeEvent(JSON.parse(line));
        insertEvent.run(
          event.id,
          event.type,
          event.visitorId,
          event.sessionId,
          event.source,
          event.levelId,
          event.levelIndex,
          event.roomCode,
          event.screen,
          JSON.stringify(event.payload),
          event.userAgent,
          event.referrer,
          event.createdAt
        );
      } catch {
        // Ignore malformed historical debug lines.
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function metricFor(db, types, extraWhere = "") {
  const placeholders = types.map(() => "?").join(", ");
  const where = [REPORT_FILTER, `type IN (${placeholders})`, extraWhere].filter(Boolean).join(" AND ");
  return db.prepare(`
    SELECT
      COUNT(*) AS events,
      COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), NULLIF(session_id, ''), id)) AS users
    FROM analytics_events
    WHERE ${where}
  `).get(...types);
}

function levelSummary(db) {
  return db.prepare(`
    SELECT
      level_id AS levelId,
      level_index AS levelIndex,
      COUNT(DISTINCT CASE WHEN type = 'reflex_level_select' THEN COALESCE(NULLIF(visitor_id, ''), NULLIF(session_id, ''), id) END) AS levelUsers,
      COUNT(DISTINCT CASE WHEN type = 'reflex_game_start' THEN COALESCE(NULLIF(visitor_id, ''), NULLIF(session_id, ''), id) END) AS startUsers,
      COUNT(DISTINCT CASE WHEN type = 'reflex_game_finish' THEN COALESCE(NULLIF(visitor_id, ''), NULLIF(session_id, ''), id) END) AS finishUsers,
      COUNT(DISTINCT CASE WHEN type = 'reflex_result_share_click' THEN COALESCE(NULLIF(visitor_id, ''), NULLIF(session_id, ''), id) END) AS shareUsers
    FROM analytics_events
    WHERE ${REPORT_FILTER} AND level_id IS NOT NULL
    GROUP BY level_id, level_index
    HAVING levelUsers > 0 OR startUsers > 0 OR finishUsers > 0 OR shareUsers > 0
    ORDER BY level_index, level_id
  `).all();
}

function recentEvents(db) {
  return db.prepare(`
    SELECT
      type,
      visitor_id AS visitorId,
      session_id AS sessionId,
      source,
      level_id AS levelId,
      level_index AS levelIndex,
      screen,
      created_at AS createdAt
    FROM analytics_events
    WHERE ${REPORT_FILTER}
    ORDER BY created_at DESC
    LIMIT 20
  `).all();
}

function rate(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function renderAnalyticsPage(data) {
  const rows = [
    ["进入页面", data.funnel.entryUsers, `${data.pageViews} PV`, "-"],
    ["选择关卡", data.funnel.levelUsers, "-", `${data.funnel.levelRate}%`],
    ["开始游戏", data.funnel.startUsers, "-", `${data.funnel.startRate}%`],
    ["完成一局", data.funnel.finishUsers, "-", `${data.funnel.finishRate}%`],
    ["点击分享", data.funnel.shareUsers, "-", `${data.funnel.shareRate}%`]
  ];

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>切歌别手滑 - 数据看板</title>
    <style>
      :root { color: #f8fafc; background: #070910; font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
      body { margin: 0; padding: 24px; background: linear-gradient(180deg, #111827, #070910 48%); }
      main { width: min(980px, 100%); margin: 0 auto; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { margin: 0 0 20px; color: #9ca3af; }
      section { margin: 16px 0; padding: 16px; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; background: rgba(255,255,255,.05); }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,.08); text-align: left; }
      th { color: #22d3ee; font-size: 13px; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
      .metric { padding: 14px; border-radius: 10px; background: rgba(15,23,42,.78); }
      .metric span { display: block; color: #9ca3af; font-size: 13px; }
      .metric strong { display: block; margin-top: 6px; color: #fff; font-size: 26px; }
      code { color: #fde68a; }
      @media (max-width: 720px) { body { padding: 14px; } .grid { grid-template-columns: 1fr 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <h1>切歌别手滑数据看板</h1>
      <p>更新时间：${escapeHtml(formatDate(data.generatedAt))}。UV 按 localStorage visitorId 去重，会话按 sessionStorage sessionId 去重。</p>

      <section>
        <div class="grid">
          <div class="metric"><span>UV</span><strong>${data.uniqueVisitors}</strong></div>
          <div class="metric"><span>Sessions</span><strong>${data.sessions}</strong></div>
          <div class="metric"><span>PV</span><strong>${data.pageViews}</strong></div>
          <div class="metric"><span>Events</span><strong>${data.totalEvents}</strong></div>
        </div>
      </section>

      <section>
        <table>
          <thead><tr><th>漏斗节点</th><th>UV</th><th>补充</th><th>转化率</th></tr></thead>
          <tbody>${rows.map(([name, users, extra, conversion]) => `<tr><td>${name}</td><td><strong>${users}</strong></td><td>${extra}</td><td>${conversion}</td></tr>`).join("")}</tbody>
        </table>
      </section>

      <section>
        <table>
          <thead><tr><th>关卡</th><th>选择</th><th>开始</th><th>完成</th><th>分享</th></tr></thead>
          <tbody>${data.byLevel.map(level => `<tr><td><code>${escapeHtml(level.levelId)}</code></td><td>${level.levelUsers}</td><td>${level.startUsers}</td><td>${level.finishUsers}</td><td>${level.shareUsers}</td></tr>`).join("") || "<tr><td colspan=\"5\">暂无关卡数据</td></tr>"}</tbody>
        </table>
      </section>
    </main>
  </body>
</html>`;
}

function formatDate(value) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

module.exports = {
  createAnalyticsStore,
  renderAnalyticsPage
};
