# SSE Contract Alignment — Live Search

Date: 2025-10-16

This document records the aligned contract between the Results page client and the server for /api/live/search.

Server events (source: server.js):
- event: search:start — data: { query: string, timestamp: number }
- event: provider:partial — data: { provider: string, count: number, elapsed?: number }
- event: provider:error — data: { provider: string, error: string, elapsed?: number }
- event: result — data: { rows: Array<ResultRow>, meta: {...} }
- event: done — data: "" (empty); heartbeat comments are sent periodically as ": ping"

Client handling (source: views/pages/results.ejs):
- search:start → set status to "Поиск начат..."
- provider:partial → update status with provider name and approximate count
- provider:error → surface provider-level error in status (non-blocking)
- result → treat payload as object with rows[] (or array fallback), replace in-memory results and render
- done → finalize UI, keep cache fallback if present

Non-buffering and format:
- Content-Type: text/event-stream; charset=utf-8
- X-Accel-Buffering: no (nginx anti-buffering)
- Events separated by double \n; heartbeats via comment lines

Notes:
- RU→EN badge now toggles client-side if original query contains Cyrillic. No server flag required.
- Cache endpoint /api/search continues to provide early "cache" results if available.
