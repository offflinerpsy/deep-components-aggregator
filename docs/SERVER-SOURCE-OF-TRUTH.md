# Server Source of Truth — R2 Final

This document locks ports, roles, and process policy for the deployment.

## Ports & Roles
- Backend (Express): 127.0.0.1:9201 — single source of data. Not exposed publicly; only via frontend rewrites.
- Frontend (Next.js / v0): 127.0.0.1:3000 — the only frontend. No 3001 experiments.

## Frontend→Backend Contract
- All calls from UI strictly via `/api/*` rewrites on Next.js. No direct backend URLs in client code.
- SSR results: `/api/vitrine/list`.
- Live search: `/api/live/search?q=…` (SSE).

## SSE Canon
- Headers: `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`.
- Message format: events separated by double-newline `\n\n`, heartbeat as `: ping`.
- Reverse proxy: disable buffering (add `X-Accel-Buffering: no` or `proxy_buffering off` on SSE location).

## Global Proxy (Node, Undici)
- Single global dispatcher per process: `ProxyAgent` + `setGlobalDispatcher`.
- Respect `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY=127.0.0.1,localhost,::1`.

## PM2 Policy
- Start backend on 9201: `pm2 start server.js --name deep-agg -- --port 9201` (or use `ecosystem.config.cjs`).
- Start frontend on 3000 (Next.js): `pm2 start "npm run start -- -p 3000" --name deep-v0`.
- Persist: `pm2 save` and `pm2 startup` (systemd unit generated).

## Verification
- Health parity: `curl -s 127.0.0.1:9201/api/health` equals `curl -s 127.0.0.1:3000/api/health`.
- Live SSE: `curl -N -H 'Accept: text/event-stream' "http://127.0.0.1:3000/api/live/search?q=LM317T"` shows events with `\n\n` separation.

## Artifacts
- Frontend repo keeps R2 proofs in `docs/_artifacts/ui-ux-r2/`: screenshots/*.png, sse-ui-proof/stream-ui.txt, ui-smoke-results.md, diag-chip-proof.md.
