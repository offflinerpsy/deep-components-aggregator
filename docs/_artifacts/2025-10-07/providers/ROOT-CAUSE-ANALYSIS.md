# Root Cause Analysis: TME/Farnell "0 rows" Issue

**Date**: October 7, 2025
**Issue**: TME and Farnell providers returning 0 results despite valid credentials
**Status**: ✅ RESOLVED

## Timeline

1. **Phase 2 Complete**: All 4 provider credentials verified working in isolation (capture-raw-responses.mjs)
2. **Phase 6 Discovery**: `/api/search?q=2N3904` returns only DigiKey+Mouser results (TME/Farnell: 0 rows)
3. **Initial Hypothesis**: Missing credentials → **WRONG** (credentials present in systemd environment.conf)
4. **Debug Session**: Added logging to providerOrchestrator.mjs → revealed `enhanced.result = {}` (empty)
5. **Root Cause Found**: `searchIntegration.mjs` response validation incomplete

## Root Cause

**File**: `src/search/searchIntegration.mjs`
**Lines**: 193-196, 213-216
**Issue**: `hasResults` check only validated Mouser/DigiKey response structures

### Incorrect Code
```javascript
const hasResults = result?.data?.SearchResults?.Parts?.length > 0 ||  // Mouser ✅
                  result?.data?.Products?.length > 0 ||                // DigiKey ✅
                  result?.data?.ProductList?.length > 0 ||             // TME ❌ (wrong path)
                  result?.data?.products?.length > 0;                  // Farnell ❌ (wrong path)
```

### Actual API Structures
- **TME**: Returns `{data: {Data: {ProductList: [...]}}}` (capital D!)
- **Farnell**: Returns `{data: {keywordSearchReturn: {products: [...]}}}`

### Result
- TME/Farnell API calls succeeded ✅
- Response validation failed ❌
- `enhanced.result` set to `null` 
- Orchestrator received empty results

## Fix

Updated `searchIntegration.mjs` lines 193-196 and 213-216:

```javascript
const hasResults = result?.data?.SearchResults?.Parts?.length > 0 ||  // Mouser
                  result?.data?.Products?.length > 0 ||                // DigiKey
                  result?.data?.Data?.ProductList?.length > 0 ||       // TME (capital D!)
                  result?.data?.ProductList?.length > 0 ||             // TME fallback
                  result?.data?.keywordSearchReturn?.products?.length > 0 ||  // Farnell keyword
                  result?.data?.premierFarnellProductSearchReturn?.products?.length > 0 ||  // Farnell MPN
                  result?.data?.products?.length > 0;                  // Farnell fallback
```

## Validation

**Test Query**: `2N3904`

### Before Fix
```json
{
  "meta": {
    "providers": [
      {"provider": "mouser", "total": 19},
      {"provider": "digikey", "total": 10},
      {"provider": "tme", "total": 0},      ← BROKEN
      {"provider": "farnell", "total": 0}   ← BROKEN
    ]
  }
}
```

### After Fix
```json
{
  "meta": {
    "total": 45,
    "providers": [
      {"provider": "mouser", "total": 19, "elapsed_ms": 722},
      {"provider": "digikey", "total": 10, "elapsed_ms": 1331},
      {"provider": "tme", "total": 9, "elapsed_ms": 285},       ← WORKING
      {"provider": "farnell", "total": 16, "elapsed_ms": 938}   ← WORKING
    ]
  }
}
```

## Lessons Learned

1. **Provider isolation testing** (capture scripts) worked perfectly → proved credentials valid
2. **Integration layer bug** harder to spot → required debug logging
3. **Response structure documentation** critical → TME/Farnell structures not obvious
4. **Cache masking issues** → required explicit cache clearing for testing

## Prevention

- [ ] Add integration tests that verify all 4 provider response structures
- [ ] Document expected API response formats in `docs/api-references/`
- [ ] Add response structure validation to health checks
- [ ] Consider using TypeScript for compile-time type checking

## Files Changed

1. `src/search/searchIntegration.mjs` - Response validation logic (2 locations)
2. `src/search/providerOrchestrator.mjs` - Removed debug logging

## Artifacts

- `docs/_artifacts/2025-10-07/providers/raw/` - Raw API responses (12 files)
- `docs/_artifacts/2025-10-07/providers/final/all-providers-working.json` - Final proof
