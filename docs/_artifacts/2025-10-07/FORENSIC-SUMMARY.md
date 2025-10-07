# Forensic Summary: "Where Did TME/Farnell Keys Go?"

**Date**: October 7, 2025  
**Conclusion**: **Keys NEVER disappeared**

## Question Asked

> "Почему не работают другие апи кроме дигикей? они работали"  
> "Быстро выявить, где и когда 'улетели' ключи TME/Farnell"

## Answer

**Credentials were ALWAYS present** in `/etc/systemd/system/deep-agg.service.d/environment.conf`:

```bash
MOUSER_API_KEY=b1ade04e-2dd0-4bd9-b5b4-e51f252a0687
FARNELL_API_KEY=9bbb8z5zuutmrscx72fukhvr
TME_TOKEN=18745f2b94e785406561ef9bd83e9a0d0b941bb7a9f4b26327
TME_SECRET=d94ba92af87285b24da6
DIGIKEY_CLIENT_ID=EuDu1qV6gjLy83S6hgLi4HfrcfDFZfXi
DIGIKEY_CLIENT_SECRET=YPxzKgmLKpQ4GdN3
```

✅ **Verified**: `sudo systemctl show deep-agg --property=Environment` showed all keys loaded  
✅ **Verified**: `scripts/capture-raw-responses.mjs` successfully retrieved data from ALL 4 providers

## Real Problem

**Integration bug in `src/search/searchIntegration.mjs`**

### How We Found It

1. **Phase 2**: Isolated provider testing → ALL 4 APIs working ✅
2. **Phase 6**: `/api/search` endpoint → only DigiKey+Mouser returning results ❌
3. **Hypothesis 1**: Missing credentials → **DISPROVEN** (systemd env.conf had all keys)
4. **Debug session**: Added logging to `providerOrchestrator.mjs` → revealed `enhanced.result = {}` (empty object)
5. **Root cause**: `searchIntegration.mjs` response validation incomplete

### The Bug

**File**: `src/search/searchIntegration.mjs` lines 193-196, 213-216

```javascript
// BEFORE (incomplete validation)
const hasResults = result?.data?.SearchResults?.Parts?.length > 0 ||  // Mouser ✅
                  result?.data?.Products?.length > 0 ||                // DigiKey ✅
                  result?.data?.ProductList?.length > 0 ||             // TME ❌ WRONG PATH
                  result?.data?.products?.length > 0;                  // Farnell ❌ WRONG PATH
```

**Actual API structures**:
- **TME**: Returns `{data: {Data: {ProductList: [...]}}}` (capital D!)
- **Farnell**: Returns `{data: {keywordSearchReturn: {products: [...]}}}`

**Result**: API calls succeeded, but response validation failed → `enhanced.result` stayed `null` → orchestrator received 0 rows

### The Fix

```javascript
// AFTER (complete validation)
const hasResults = result?.data?.SearchResults?.Parts?.length > 0 ||  // Mouser
                  result?.data?.Products?.length > 0 ||                // DigiKey
                  result?.data?.Data?.ProductList?.length > 0 ||       // TME (capital D!)
                  result?.data?.ProductList?.length > 0 ||             // TME fallback
                  result?.data?.keywordSearchReturn?.products?.length > 0 ||  // Farnell keyword
                  result?.data?.premierFarnellProductSearchReturn?.products?.length > 0 ||  // Farnell MPN
                  result?.data?.products?.length > 0;                  // Farnell fallback
```

## Git Forensics (As Requested)

### Commands Run

```bash
# Check for credential changes
git log -S 'FARNELL' -p --all -- . | head -200
git log -S 'TME' -p --all -- . | head -200

# Check systemd unit
sudo systemctl cat deep-agg.service

# Check runtime environment
sudo systemctl show deep-agg --property=Environment
```

### Findings

1. **No commits removing/changing credentials** in repo history
2. **Credentials stored in systemd** (not in git) - correct practice ✅
3. **All environment variables loaded** at runtime ✅
4. **Last relevant change**: Refactoring to use `searchIntegration.mjs` wrapper (Phase 3 - Russian normalization)
   - This introduced the bug: new wrapper didn't know TME/Farnell response structures

## Evidence Trail

### Before Fix
```bash
curl "http://localhost:9201/api/search?q=2N3904"
# Result:
# mouser: 19 rows ✅
# digikey: 10 rows ✅
# tme: 0 rows ❌
# farnell: 0 rows ❌
```

### After Fix
```bash
curl "http://localhost:9201/api/search?q=2N3904"
# Result:
# mouser: 19 rows ✅
# digikey: 10 rows ✅
# tme: 9 rows ✅
# farnell: 16 rows ✅
# TOTAL: 45 rows
```

## Validation Tests

| MPN | Mouser | DigiKey | TME | Farnell | Total |
|-----|--------|---------|-----|---------|-------|
| 2N3904 | 19 | 10 | 9 | 16 | **45** |
| STM32F103C8T6 | 3 | 2 | 6 | 4 | **15** |
| DS12C887+ | 14 | 4 | 0 | 2 | **20** |

✅ **All 4 providers working**

## Timeline

- **Oct 2, 2025**: Credentials backed up to `.env.backup-1759361868` (user backup)
- **Oct 7, 2025 09:00**: SRX-FULL-BOOT started, Phase 2 completed (all credentials verified)
- **Oct 7, 2025 10:30**: Phase 6 discovery - TME/Farnell returning 0 rows
- **Oct 7, 2025 11:00**: Debug session - found `enhanced.result = {}` 
- **Oct 7, 2025 11:15**: Root cause identified - `searchIntegration.mjs` validation bug
- **Oct 7, 2025 11:20**: Fix applied, tested, committed (0f5362a)

## Answer to "Where Did Keys Go?"

**They didn't.** Keys were always in systemd environment file. The problem was:

1. Code refactoring (Russian normalization integration) introduced new validation layer
2. New layer only validated Mouser/DigiKey response structures
3. TME/Farnell succeeded but validation failed → looked like "missing credentials"
4. Isolated testing (capture scripts) bypassed validation → proved credentials worked

## Prevention

- [x] Fixed response validation to include all 4 provider structures
- [ ] Add integration tests for all provider response formats
- [ ] Document expected API structures in `docs/api-references/`
- [ ] Add TypeScript types for provider responses

## Artifacts

- `docs/_artifacts/2025-10-07/providers/raw/` - 12 files proving all APIs work
- `docs/_artifacts/2025-10-07/providers/final/all-providers-working.json` - Final proof
- `docs/_artifacts/2025-10-07/providers/ROOT-CAUSE-ANALYSIS.md` - Technical details
- Git commit: `0f5362a` - The fix

## Commit

```
0f5362a fix(search): add TME/Farnell response structures to hasResults validation
```

**Status**: ✅ RESOLVED - All 4 providers operational
