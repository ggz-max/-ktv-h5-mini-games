const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const FUNNEL_TYPES = {
  home: ["cleanup_home_view"],
  start: ["cleanup_start_click"],
  finish: ["cleanup_game_end"],
  share: ["cleanup_share_click"]
};
const REPORT_FILTER = "(source IS NULL OR source NOT LIKE 'codex_%')";

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
      session_id TEXT,
      source TEXT,
      level_no INTEGER,
      room_code TEXT,
      screen TEXT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_type_created
      ON analytics_events(type, created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_session
      ON analytics_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_level
      ON analytics_events(level_no);
  `);

  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO analytics_events
      (id, type, session_id, source, level_no, room_code, screen, payload, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  importLegacyEvents(db, insertEvent, legacyEventsPath);

  function recordEvent(input) {
    const event = normalizeEvent(input);
    insertEvent.run(
      event.id,
      event.type,
      event.sessionId,
      event.source,
      event.levelNo,
      event.roomCode,
      event.screen,
      JSON.stringify(event.payload),
      event.createdAt
    );
    return event;
  }

  function summary() {
    const totalEvents = db.prepare(`SELECT COUNT(*) AS total FROM analytics_events WHERE ${REPORT_FILTER}`).get().total;
    const home = metricFor(db, FUNNEL_TYPES.home);
    const start = metricFor(db, FUNNEL_TYPES.start);
    const finish = metricFor(db, FUNNEL_TYPES.finish);
    const share = metricFor(db, FUNNEL_TYPES.share);
    const wins = metricFor(db, FUNNEL_TYPES.finish, "json_extract(payload, '$.outcome') = 'win'");
    const fails = metricFor(db, FUNNEL_TYPES.finish, "json_extract(payload, '$.outcome') = 'fail'");

    return {
      generatedAt: new Date().toISOString(),
      totalEvents,
      funnel: {
        homeUsers: home.users,
        startUsers: start.users,
        finishUsers: finish.users,
        shareUsers: share.users,
        startRate: rate(start.users, home.users),
        finishRate: rate(finish.users, start.users),
        shareRate: rate(share.users, finish.users)
      },
      outcomes: {
        winUsers: wins.users,
        failUsers: fails.users,
        winRate: rate(wins.users, finish.users)
      },
      byLevel: levelSummary(db),
      recentEvents: recentEvents(db)
    };
  }

  return { dbPath, recordEvent, summary };
}

function normalizeEvent(input = {}) {
  const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
  const levelNo = Number(payload.levelNo || payload.level || input.levelNo);

  return {
    id: compactString(input.id || crypto.randomUUID(), 80),
    type: compactString(input.type || "unknown", 64),
    sessionId: compactString(payload.sessionId || input.sessionId || "", 80) || null,
    source: compactString(payload.source || input.source || "", 80) || null,
    levelNo: Number.isFinite(levelNo) ? Math.max(1, Math.min(99, Math.round(levelNo))) : null,
    roomCode: compactString(payload.roomCode || input.roomCode || "", 24) || null,
    screen: compactString(payload.screen || input.screen || "", 32) || null,
    payload,
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
  const importMany = db.transaction(() => {
    for (const line of lines) {
      try {
        const event = normalizeEvent(JSON.parse(line));
        insertEvent.run(
          event.id,
          event.type,
          event.sessionId,
          event.source,
          event.levelNo,
          event.roomCode,
          event.screen,
          JSON.stringify(event.payload),
          event.createdAt
        );
      } catch {
        // Ignore malformed historical debug lines.
      }
    }
  });
  importMany();
}

function metricFor(db, types, extraWhere = "") {
  const placeholders = types.map(() => "?").join(", ");
  const where = [REPORT_FILTER, `type IN (${placeholders})`, extraWhere].filter(Boolean).join(" AND ");
  return db.prepare(`
    SELECT
      COUNT(*) AS events,
      COUNT(DISTINCT COALESCE(NULLIF(session_id, ''), id)) AS users
    FROM analytics_events
    WHERE ${where}
  `).get(...types);
}

function levelSummary(db) {
  return db.prepare(`
    SELECT
      level_no AS levelNo,
      COUNT(DISTINCT CASE WHEN type = 'cleanup_start_click' THEN COALESCE(NULLIF(session_id, ''), id) END) AS startUsers,
      COUNT(DISTINCT CASE WHEN type = 'cleanup_game_end' THEN COALESCE(NULLIF(session_id, ''), id) END) AS finishUsers,
      COUNT(DISTINCT CASE WHEN type = 'cleanup_game_end' AND json_extract(payload, '$.outcome') = 'win' THEN COALESCE(NULLIF(session_id, ''), id) END) AS winUsers,
      COUNT(DISTINCT CASE WHEN type = 'cleanup_game_end' AND json_extract(payload, '$.outcome') = 'fail' THEN COALESCE(NULLIF(session_id, ''), id) END) AS failUsers
    FROM analytics_events
    WHERE ${REPORT_FILTER} AND level_no IS NOT NULL
    GROUP BY level_no
    HAVING startUsers > 0 OR finishUsers > 0
    ORDER BY level_no
  `).all();
}

function recentEvents(db) {
  return db.prepare(`
    SELECT
      type,
      session_id AS sessionId,
      source,
      level_no AS levelNo,
      room_code AS roomCode,
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
    ["来到首页", data.funnel.homeUsers, "-"],
    ["点击开始", data.funnel.startUsers, `${data.funnel.startRate}%`],
    ["完成一局", data.funnel.finishUsers, `${data.funnel.finishRate}%`],
    ["点击分享", data.funnel.shareUsers, `${data.funnel.shareRate}%`]
  ];

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>包厢大扫除 - 数据看板</title>
    <style>
      :root { color: #f8fafc; background: #070910; font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
      body { margin: 0; padding: 24px; background: linear-gradient(180deg, #111827, #070910 46%); }
      main { width: min(960px, 100%); margin: 0 auto; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { margin: 0 0 20px; color: #9ca3af; }
      section { margin: 16px 0; padding: 16px; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; background: rgba(255,255,255,.05); }
      table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 8px; }
      th, td { padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,.08); text-align: left; }
      th { color: #fbbf24; font-size: 13px; }
      td strong { color: #22d3ee; font-size: 22px; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .metric { padding: 14px; border-radius: 10px; background: rgba(15,23,42,.72); }
      .metric span { display: block; color: #9ca3af; font-size: 13px; }
      .metric strong { display: block; margin-top: 6px; color: #fff; font-size: 26px; }
      @media (max-width: 720px) { body { padding: 14px; } .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <h1>包厢大扫除数据看板</h1>
      <p>更新时间：${escapeHtml(formatDate(data.generatedAt))}，当前为匿名 session 去重的轻量漏斗。</p>

      <section>
        <div class="grid">
          <div class="metric"><span>总事件数</span><strong>${data.totalEvents}</strong></div>
          <div class="metric"><span>通关人数</span><strong>${data.outcomes.winUsers}</strong></div>
          <div class="metric"><span>通关率</span><strong>${data.outcomes.winRate}%</strong></div>
        </div>
      </section>

      <section>
        <table>
          <thead><tr><th>漏斗节点</th><th>人数</th><th>相对上一环节</th></tr></thead>
          <tbody>${rows.map(([name, users, conversion]) => `<tr><td>${name}</td><td><strong>${users}</strong></td><td>${conversion}</td></tr>`).join("")}</tbody>
        </table>
      </section>

      <section>
        <table>
          <thead><tr><th>关卡</th><th>开始人数</th><th>完成人数</th><th>成功</th><th>失败</th></tr></thead>
          <tbody>${data.byLevel.map(level => `<tr><td>第 ${level.levelNo} 关</td><td>${level.startUsers}</td><td>${level.finishUsers}</td><td>${level.winUsers}</td><td>${level.failUsers}</td></tr>`).join("") || "<tr><td colspan=\"5\">暂无关卡数据</td></tr>"}</tbody>
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
