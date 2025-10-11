# UI/UX R2 — Plan (no layout changes)

Branch: ops/ui-ux-r2

Invariants:
- Frontend talks to backend only via /api/* with Next rewrites (URL proxy)
- Live search via SSE: text/event-stream, UTF-8, messages separated by \n\n, optional : ping; anti-bufferization via X-Accel-Buffering: no
- Node outbound networking unified with Undici ProxyAgent + setGlobalDispatcher; NO_PROXY=127.0.0.1,localhost

Scope:
- /: submit to /results?q=...; tiny hint about Cyrillic support; show normalization badge on /results when queryNorm arrives
- /results: Live/Cache toggle, region grouping (min price + total stock), provider error badges, normalization badge
- /product/[mpn]: Hero + sticky buy-card; Specs/Offers/Docs; Offers pagination (25–50); safe fallbacks
- Diagnostics chip: reads /api/health and /api/metrics; green/amber/red

Artifacts:
- docs/_artifacts/ui-ux-r2/empty-states.md (exact strings + screenshots)
- docs/_artifacts/ui-ux-r2/product-datamap.md
- docs/_artifacts/ui-ux-r2/diag-chip-proof.md
- docs/_artifacts/ui-ux-r2/sse-ui-proof/* (gif/sequence + first N events)
- docs/_artifacts/ui-ux-r2/ui-smoke-results.md (PASS table + screenshots)

DoD:
- /results shows cache+live; SSE proven; errors as soft badges
- Region grouping visible; queryNorm badge when present
- /product fully wired with pagination; layout intact with sparse data
- All calls via /api/* rewrites; artifacts updated
