# Provider Diagnostic Plan (2025-10-07)

Objective: Identify root causes of current multi-provider regressions (TME signature / fetch failures, DigiKey fetch failures, zero-row Mouser/Farnell via /api/search while coverage script shows data).

## Steps

1. Enable enhanced logging (DONE)
   - Added network failure logging in `src/utils/fetchWithRetry.mjs`.
   - Added TME request serialization logs in `src/integrations/tme/client.mjs`.

2. Run isolated TME diagnostic
   ```bash
   node scripts/diag-tme.mjs 2N3904 5
   ```
   Expected:
   - Step `search` with non-zero count.
   - Step `details` with products having `HasPrice: true` when PriceList present.
   Capture output to `docs/_artifacts/2025-10-07/tme-diag-2N3904.json` (redirect manually).

3. Compare orchestrator vs direct script
   - Trigger API: `/api/search?q=2N3904&fresh=1`
   - Inspect server logs for `[TME][Search]` and `[TME][GetProducts]` blocks.

4. DigiKey OAuth verification
   - Add temporary log of token acquisition status (NOT IMPLEMENTED YET).
   - If fetch errors persist, run an isolated keyword call script (pending).

5. Mouser/Farnell zero rows discrepancy
   - Verify `executeEnhancedSearch` primary vs alternative queries; log attempts / usedQuery already present.
   - Hypothesis: normalization modifies query ordering causing empty first attempt; need fallback across variants (already loops). Validate provider raw responses.

## Data to Collect

| Provider | Test Query | Expectation | Observed | Notes |
|----------|------------|-------------|----------|-------|
| TME | 2N3904 | Search>0, Details price | TBD | Signature mismatch? |
| DigiKey | 2N3904 | Products>0 | TBD | fetch failed |
| Mouser | 2N3904 | Parts>0 | TBD | 0 via API, >0 via script earlier |
| Farnell | 2N3904 | products>0 | TBD | 0 via API sometimes |

## Next Remediation Candidates

1. TME signature: confirm array parameter encoding: currently `SymbolList[0]=...` style. If mismatch persists, try `SymbolList[]=...` variant or explicit indexless array keys.
2. Reduce symbol batch size (test single symbol) to eliminate array ordering effect.
3. Increase fetch timeout to 9000ms temporarily if network latency suspected (not yet changed).
4. Add DigiKey token fetch logging (status code + truncated body).

## Exit Criteria

Restored successful Search + pricing enrichment for at least 2 test MPNs across all four providers with non-empty rows and no fetch failures.

---
Generated automatically as part of diagnostic workflow.
