const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const FUNNEL_EVENTS = {
  home: "mh_home_view",
  start: "mh_start_click",
  submit: "mh_text_submit",
  success: "mh_generate_success",
  share: "mh_share_click",
  save: "mh_save_click"
};

function createAnalyticsStore({ dataDir, legacyEventsPath }) {
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = process.env.ANALYTICS_DB_PATH || path.join(dataDir, "analytics.sqlite");
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 3000;

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      visitor_id TEXT,
      session_id TEXT,
      source TEXT,
      campaign TEXT,
      channel TEXT,
      entry_variant TEXT,
      report_id TEXT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_event_created
      ON analytics_events(event, created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_visitor
      ON analytics_events(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_session
      ON analytics_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_source
      ON analytics_events(source);
  `);

  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO analytics_events
      (id, event, visitor_id, session_id, source, campaign, channel, entry_variant, report_id, payload, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  importLegacyEvents(db, insertEvent, legacyEventsPath);

  function recordEvent(input) {
    const event = normalizeEvent(input);
    insertEvent.run(
      event.id,
      event.event,
      event.visitorId,
      event.sessionId,
      event.source,
      event.campaign,
      event.channel,
      event.entryVariant,
      event.reportId,
      JSON.stringify(event.payload),
      event.createdAt
    );
    return event;
  }

  function summary() {
    const totalEvents = scalar(db, "SELECT COUNT(*) FROM analytics_events");
    const totalUv = uvFor(db);
    const todayUv = uvFor(db, "date(created_at) = date('now')");
    const home = metricFor(db, FUNNEL_EVENTS.home);
    const start = metricFor(db, FUNNEL_EVENTS.start);
    const submit = metricFor(db, FUNNEL_EVENTS.submit);
    const success = metricFor(db, FUNNEL_EVENTS.success);
    const share = metricFor(db, FUNNEL_EVENTS.share);
    const save = metricFor(db, FUNNEL_EVENTS.save);

    return {
      dbPath,
      totalEvents,
      totalUv,
      todayUv,
      funnelUv: {
        home: home.uv,
        start: start.uv,
        submit: submit.uv,
        success: success.uv,
        share: share.uv,
        save: save.uv,
        startRate: rate(start.uv, home.uv),
        submitRate: rate(submit.uv, start.uv),
        successRate: rate(success.uv, submit.uv),
        shareRate: rate(share.uv, success.uv),
        saveRate: rate(save.uv, success.uv)
      },
      eventUv: eventUvSummary(db),
      sourceUv: sourceUvSummary(db)
    };
  }

  return { dbPath, recordEvent, summary };
}

function normalizeEvent(input = {}) {
  const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
  return {
    id: compactString(input.id || crypto.randomUUID(), 80),
    event: compactString(input.event || input.type || "unknown", 80),
    visitorId: compactString(input.visitorId || payload.visitorId || "", 96) || null,
    sessionId: compactString(input.sessionId || payload.sessionId || "", 96) || null,
    source: compactString(payload.source || input.source || "", 80) || null,
    campaign: compactString(payload.campaign || input.campaign || "", 80) || null,
    channel: compactString(payload.channel || input.channel || "", 80) || null,
    entryVariant: compactString(payload.entryVariant || input.entryVariant || "", 80) || null,
    reportId: compactString(payload.reportId || input.reportId || "", 80) || null,
    payload,
    createdAt: compactString(input.receivedAt || input.createdAt || new Date().toISOString(), 40)
  };
}

function compactString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function importLegacyEvents(db, insertEvent, legacyEventsPath) {
  const count = scalar(db, "SELECT COUNT(*) FROM analytics_events");
  if (count > 0 || !legacyEventsPath || !fs.existsSync(legacyEventsPath)) return;

  const lines = fs.readFileSync(legacyEventsPath, "utf8").split(/\r?\n/).filter(Boolean);
  db.exec("BEGIN");
  try {
    for (const line of lines) {
      try {
        const event = normalizeEvent(JSON.parse(line));
        insertEvent.run(
          event.id,
          event.event,
          event.visitorId,
          event.sessionId,
          event.source,
          event.campaign,
          event.channel,
          event.entryVariant,
          event.reportId,
          JSON.stringify(event.payload),
          event.createdAt
        );
      } catch {
        // Ignore malformed historical rows.
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function scalar(db, sql, ...params) {
  const row = db.prepare(sql).get(...params);
  return Number(Object.values(row || { value: 0 })[0] || 0);
}

function uvFor(db, extraWhere = "") {
  const where = extraWhere ? `WHERE ${extraWhere}` : "";
  return scalar(db, `
    SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), NULLIF(session_id, ''), id)) AS uv
    FROM analytics_events
    ${where}
  `);
}

function metricFor(db, eventName) {
  return db.prepare(`
    SELECT
      COUNT(*) AS events,
      COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), NULLIF(session_id, ''), id)) AS uv
    FROM analytics_events
    WHERE event = ?
  `).get(eventName);
}

function eventUvSummary(db) {
  return db.prepare(`
    SELECT
      event,
      COUNT(*) AS events,
      COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), NULLIF(session_id, ''), id)) AS uv
    FROM analytics_events
    GROUP BY event
    ORDER BY events DESC
    LIMIT 30
  `).all();
}

function sourceUvSummary(db) {
  return db.prepare(`
    SELECT
      COALESCE(NULLIF(source, ''), 'unknown') AS source,
      COUNT(*) AS events,
      COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), NULLIF(session_id, ''), id)) AS uv
    FROM analytics_events
    GROUP BY COALESCE(NULLIF(source, ''), 'unknown')
    ORDER BY uv DESC, events DESC
    LIMIT 30
  `).all();
}

function rate(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}

module.exports = {
  createAnalyticsStore
};
