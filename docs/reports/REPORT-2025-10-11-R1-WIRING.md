# UI⇆API WIRING — R1 Closeout

- Backend API contract finalized with live captures: see `API-CONTRACT.md` and `docs/_artifacts/ui-wire-r1/api-captures/*`.
- SSE proof captured and trimmed to first 100 lines: `docs/_artifacts/ui-wire-r1/sse-proof/headers.txt`, `stream.txt`.
- Next.js rewrites proven via double curl (backend vs frontend PORT=3001): headers and bodies recorded in frontend repo `docs/_artifacts/ui-wire-r1/rewrites-proof/*`.
- Proxy standard: Node HTTP unified via Undici setGlobalDispatcher + ProxyAgent; ensure `NO_PROXY=127.0.0.1,localhost`.
- Smokes: backend + UI smokes documented in respective `ui-smoke-results.md`.

DoD: All UI calls go through `/api/*` and are proxied to Express; SSE conforms to MDN; results and product pages render without layout changes.
