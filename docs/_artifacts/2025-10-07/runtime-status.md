# Production Snapshot — 2025-10-07

- `api/health`: local instance not reachable at `127.0.0.1:3000`; produced offline snapshot with currency cache status using `data/rates.json`.
- `api/metrics`: extracted default Prometheus registry metrics via `/usr/bin/node -e "import('./metrics/registry.js')"` — all counters zero, histograms initialised.
- Providers configuration: sanitized `config/providers.mjs` — keys present but stored separately; no proxy configured.
- WARP proxy: CLI indicates `Status update: Disconnected (Manual Disconnection)` even after `connect`; captured output in `proxy/warp-status.txt`. Direct IP `2a03:6f02::dca8` recorded.
- No additional runtime services detected.
