# Mission Pack R0 — Repository Recon Inventory (2025-10-08)

## Overview
- Mission scope: capture current implementation evidence for SSE live search, RU content aggregation, currency conversion, admin pricing CRUD, provider wiring, proxy/WARP usage, Prometheus metrics, and supporting artifacts.
- Source tree snapshot: see `tree.txt` (repo root + `src/`) generated at 2025-10-08T18:55Z.
- Command log artifacts stored in `docs/_artifacts/2025-10-08/recon/`.

## SSE Live Search
- HTTP layer mounts SSE endpoint in multiple entry points:
  - `server.js` line ~399: `app.get('/api/live/search', async (req, res) => …)` (captured in `grep-live-search.txt`).
  - `api/live-search.mjs` + `src/api/http.mjs` register identical route for modular servers.
- Streaming proof captured in `live-1N4148.sse` (copied from latest smoke run) showing `event: search:start`, `event: result`, `event: done` with Central Bank RUB rates payload.
- `src/live/orchestrator.mjs` excerpt in `grep-core.txt` demonstrates provider rotation with concurrency guard (`pLimit(4)`) and SSE emission via `emit({ type: 'item', … })`.

## RU Content + Provider Aggregation
- `src/services/orchestrator.js` orchestrates RU suppliers (`parseChipDip`, `parsePromelec`, `parsePlatan`, `parseElectronshik`, `parseElitan`) and OEMsTrade fallback; AJV schema `ruCanonSchema` validates payload (see `grep-core.txt`).
- Provider registry located in `config/providers.mjs` enumerates API credentials and proxy configuration fields; currently contains SCRAPERAPI and ScrapingBee keys plus proxy placeholders (empty HTTP/HTTPS proxy strings).
- Live search pipeline writes canonicalized offers via `insertProduct` and `upsertOffer` (see `src/live/orchestrator.mjs`).

## Currency Conversion
- Currency logic consolidated in `src/currency.js` (`convertToBase`, `convertFromBase`, rate caching). Excerpt stored in `grep-core.txt`.
- `data/rates.json` holds cached Central Bank rates; update scripts available in `scripts/refresh-rates.mjs`.

## Admin Pricing CRUD
- `api/admin.settings.js` exposes `GET /api/admin/settings/pricing` and `PATCH /api/admin/settings/pricing` guarded by `requireAdmin` middleware. Uses AJV validation against `schemas/pricing.settings.schema.json`, metrics counters `settingsReadsTotal` / `settingsUpdatesTotal`, and writes to SQLite `settings` table.
- Middleware enforcement via `middleware/requireAdmin.js` (requires `req.user?.role === 'admin'`).

## Metrics & Observability
- `metrics/registry.js` registers Prometheus counters/gauges for HTTP, search, cache, settings, and provider calls; default label `app=deep-aggregator, version=3.0.0`.
- `/api/metrics` endpoint expected per canon (handler `server.js` line ~547 and `api/http.mjs`).

## Proxy / WARP Hooks
- Provider config includes proxy env placeholders and is referenced by scripts (e.g. `scripts/setup-warp-proxy.sh`, `scripts/debug_warp_wireproxy.py`).
- System-level expectations captured in `docs/PROJECT_CANON.md` §8 (warp-bridge service, `/etc/default/deep-agg`).

## Artifact Index
| Artifact | Purpose |
| --- | --- |
| `tree.txt` | Directory listing of repo root and `src/` modules |
| `grep-live-search.txt` | SSE route references across server/http modules |
| `grep-core.txt` | Key excerpts: live orchestrator, RU orchestrator, currency converter, provider registry |
| `live-1N4148.sse` | Captured SSE response stream for query `1N4148` |

## Gaps / Notes
- Sensitive keys in `config/providers.mjs` are committed in cleartext; confirm they are non-production or rotate before sharing artifacts.
- No local evidence yet for WARP systemd status or environment files—covered in next server-state block.
- Metrics endpoint functionality assumed from route definitions; runtime verification pending (requires server launch or CI smoke run).
