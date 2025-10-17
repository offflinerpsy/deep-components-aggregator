# API Contract — Digest (2025-10-16)

Based on `API-CONTRACT.md`:

- GET /api/health — runtime/latency/proxy/currency/cache
- GET /api/currency/rates — CBR rates with age
- GET /api/metrics — Prometheus 0.0.4 text
- GET /api/vitrine/sections, /api/vitrine/list — cache-backed
- GET /api/search?q=, fresh? — normalized RU→EN, meta.usedQueries
- GET /api/live/search?q= — SSE (double \n, : ping, X-Accel-Buffering: no)
- GET /api/product?mpn= — merged Mouser/TME/Farnell/DigiKey
- AdminJS and admin API under /admin and /api/admin/*

SSE: heartbeat every ~15s, events separated by double \n, anti-buffering headers present.
