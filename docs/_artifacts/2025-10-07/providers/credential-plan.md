# Provider Credential Plan — 2025-10-07

## Required credentials
- Digi-Key: `DIGIKEY_CLIENT_ID`, `DIGIKEY_CLIENT_SECRET`
- Mouser: `MOUSER_API_KEY`
- Farnell (element14/Avnet): `FARNELL_API_KEY`, optional `FARNELL_REGION`
- TME: `TME_TOKEN`, `TME_SECRET`

# Provider Credential Plan — 2025-10-07 (UPDATED)

## Current state — After Testing

### ✅ DigiKey — WORKING
- **Credentials**: `DIGIKEY_CLIENT_ID`, `DIGIKEY_CLIENT_SECRET` ✅ Present in `.env`
- **Status**: OAuth successful через WARP proxy (127.0.0.1:25345)
- **Coverage**: 3/3 test MPNs (DS12C887+, 2N3904, STM32F103C8T6) ✅
- **Raw responses**: `docs/_artifacts/2025-10-07/providers/raw/digikey-*.json` ✅
- **API**: Product Information v4
- **Region**: US, GLOBAL
- **Notes**: StandardPricing в ProductVariations[0], требует proxy для OAuth

### ❌ Mouser — NO CREDENTIALS
- **Status**: `MOUSER_API_KEY` отсутствует
- **How to obtain**: https://www.mouser.com/api-search/
- **API**: Search API
- **Region**: US

### ❌ TME — NO CREDENTIALS  
- **Status**: `TME_TOKEN`, `TME_SECRET` отсутствуют
- **How to obtain**: https://developers.tme.eu/
- **API**: REST API
- **Region**: EU (Poland)

## Actions to obtain credentials
1. **Internal secrets vault** → check company secret manager for the four providers; if present, sync into deployment environment and update `/etc/environment` + systemd unit overrides.
2. **Provider console** → request/refresh API keys:
   - Digi-Key: https://developer.digikey.com/ (OAuth client credentials).
   - Mouser: https://api.mouser.com/ (API key request form).
   - Farnell: https://www.element14.com/community/docs/DOC-84563/l/farnell-element14-apis
   - TME: https://developers.tme.eu/en/
3. **CI secrets** → ensure GitHub Actions (or equivalent) has encrypted secrets populated; propagate to prod deployment pipeline.
4. **Local dev** → once retrieved, set via `.env.local` (ignored by git) and restart `deep-agg.service` for server to pick them up.

## Interim fallback (while credentials pending)
- Use cached artifacts from `docs/_artifacts/2025-10-07/srx-03-prices/raw/` for normalization and UI smoke tests.
- Stub provider clients to return `{ ok: false, error: 'credentials missing' }` early (already happening) to avoid hitting external endpoints.
- For regression tests, build fixtures based on cached responses under `tests/providers/__fixtures__/` (to be added) so downstream pipelines can run without live calls.

## Next steps
- Assign owner to chase each provider key (see project tracker ticket `SRX-03-PRICES`).
- After keys provisioned, update `/etc/systemd/system/deep-agg.service.d/override.conf` with `Environment=` entries and run `systemctl daemon-reload && systemctl restart deep-agg`.
- Re-run `docs/scripts/fetch-providers.mjs` (to be created) to regenerate raw snapshots with live data and refresh `coverage-matrix.json`.
