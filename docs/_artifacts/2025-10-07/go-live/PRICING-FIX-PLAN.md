#!/usr/bin/env node
/**
 * Provider Pricing Coverage Fix
 * 
 * PROBLEMS IDENTIFIED:
 * 1. TME: Search API returns basic info only (no PriceList/InStock)
 *    - Need to call GetProducts API for each Symbol to get full details
 * 2. Mouser: Some products return without PriceBreaks (search result vs detail)
 *    - Need to verify normalizer handles missing PriceBreaks gracefully
 * 3. Provider selection: Orchestrator picks by original currency price, not RUB-converted
 *    - Need to update primary selection logic to use min_price_rub
 * 
 * FIX STRATEGY:
 * Phase 1: Update TME orchestrator to call GetProducts after Search
 * Phase 2: Verify Mouser normalizer handles missing PriceBreaks
 * Phase 3: Update orchestrator primary selection to use RUB prices
 * Phase 4: Add caching for TME GetProducts calls (performance)
 */

console.log(`
═══════════════════════════════════════════════
  PROVIDER PRICING COVERAGE FIX PLAN
═══════════════════════════════════════════════

CURRENT STATE (from coverage test):
  2N3904:
    ✓ Mouser:  16 rows | price: ✓ | rub: 1₽
    ✓ DigiKey: 9 rows  | price: ✓ | rub: 2₽
    ✗ TME:     8 rows  | price: ✗ | rub: —
    ✓ Farnell: 12 rows | price: ✓ | rub: 2₽

  STM32F103C8T6:
    ✓ Mouser:  3 rows  | price: ✓ | rub: 274₽
    ✓ DigiKey: 2 rows  | price: ✓ | rub: 285₽
    ✗ TME:     6 rows  | price: ✗ | rub: —
    ✓ Farnell: 2 rows  | price: ✓ | rub: 287₽

  LM358:
    ✗ Mouser:  48 rows | price: ✗ | rub: —
    ✓ DigiKey: 10 rows | price: ✓ | rub: 5₽
    ✗ TME:     0 rows  | price: ✗ | rub: —
    ✗ Farnell: 0 rows  | price: ✗ | rub: —

ROOT CAUSES:
  TME Issue:
    - Search API (Products/Search.json) returns ProductList with:
      { Symbol, Producer, Description, Photo }
    - But PriceList and InStock are NULL
    - Need GetProducts.json call to get full details

  Mouser Issue:
    - LM358 has 48 results but zero pricing
    - Likely generic MPN matching many package variants
    - Each variant may require individual product detail call
    - OR: Search API doesn't return PriceBreaks for broad queries

FIXES REQUIRED:

[1] src/search/providerOrchestrator.mjs - runTME()
    - After tmeSearchProducts(), extract Symbol list
    - Call tmeGetProduct() for top N results (limit 10 for performance)
    - Map GetProducts response to normTME()
    - Add error handling for API failures

[2] src/integrations/mouser/normalize.mjs - normMouser()
    - Already handles missing PriceBreaks gracefully (returns null prices)
    - No changes needed - working as designed

[3] src/search/providerOrchestrator.mjs - combineProviderResults()
    - Update primary selection logic:
      BEFORE: Compare min_price (original currency)
      AFTER:  Compare min_price_rub (RUB-converted)
    - Ensures fair provider selection regardless of currency

[4] Caching (optional performance optimization)
    - TME GetProducts calls expensive (HMAC signature + roundtrip)
    - Add 1-hour cache for GetProducts responses
    - Key: tme:product:{symbol}
    - Reduces latency for repeated searches

VERIFICATION:
  After fix, re-run coverage test:
    node scripts/check-coverage.mjs

  Expected results:
    - TME: All rows have price_breaks, min_price, stock
    - Mouser: LM358 still may have some rows without pricing (API design)
    - Primary selection: Uses RUB prices for fair comparison

ARTIFACTS:
  - docs/_artifacts/2025-10-07/go-live/PRICING-FIX-PLAN.md (this file)
  - src/search/providerOrchestrator.mjs (updated)
  - docs/_artifacts/2025-10-07/go-live/coverage-after-fix.txt (results)
`);
