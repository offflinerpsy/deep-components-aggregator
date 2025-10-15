# Final Report — Search Normalization & Cache Policy (2025-10-15)

## Summary
- Live search is always the primary source.
- Normalization (RU→EN) engaged for provider queries via orchestrator; endpoint uses normalized primary for cache key.
- Cache is used only for technical data enrichment and as fallback (tech-only). Prices are never returned from cache.

## Changes
- server.js
  - Added normalization usage for cache key (`processSearchQuery` → `selectSearchStrategy` → `primaryNorm`).
  - Removed "return cache instead of live" branch; cache only assists or serves tech-only fallback.
  - Cache writes under normalized key; fallback strips pricing and stock fields.

## Verification
- Health: 200 OK — providers configured; currency ok.
- Latin search (resistor): 200 OK, 60 results.
- Cyrillic search (транзистор): 200 OK, 45 results; Mouser rejects Cyrillic (InvalidCharacters), but normalization yields DigiKey/TME/Farnell results. Used queries include `transistor`, `tranzistor`.

## Artifacts
- health.json — docs/_artifacts/2025-10-15/health.json
- search-resistor.json — docs/_artifacts/2025-10-15/search-resistor.json
- search-tranzistor.json — docs/_artifacts/2025-10-15/search-tranzistor.json

## Notes
- SSE live search (`/api/live/search`) uses the same orchestrator and benefits from normalization; it does not read cache.
- Cache DB remains a store of full rows (including price), but API never returns price from cache: fallback strips price/stock fields to enforce policy.

## Definition of Done
- [x] Normalization is applied in live search and cache flow.
- [x] Default search is live; cache used only for tech-only fallback.
- [x] Prices are never returned from cache.
- [x] Artifacts captured and committed.
