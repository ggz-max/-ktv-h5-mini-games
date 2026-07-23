# Analytics

The app includes lightweight SQLite analytics without a third-party SDK.

- Dashboard: `/admin/analytics`
- JSON summary: `/api/analytics/summary`
- Default DB path: `backend/data/analytics.sqlite`
- Production data dir: `DATA_DIR=/app/backend/data`
- UV key: `visitorId` stored in browser `localStorage`
- Session key: `sessionId` stored in browser `sessionStorage`

Core event names:

- `reflex_entry_view`
- `reflex_level_select`
- `reflex_game_start`
- `reflex_game_finish`
- `reflex_result_share_click`
