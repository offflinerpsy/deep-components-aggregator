# Session: TME Pricing Coverage Fix

**Date**: 2025-10-07  
**Time**: 13:00 - 16:17 UTC  
**Status**: ✅ Major Progress - TME Search Working  
**Server**: Vultr 89.185.85.110

---

## Goal
Добить 4 провайдера в цене (complete pricing coverage for 4 providers)

---

## Completed Tasks

### 1. ✅ Initial Coverage Analysis
- Created `scripts/check-coverage.mjs` - automated test for 3 MPNs × 4 providers
- Test MPNs: 2N3904, STM32F103C8T6, LM358
- Identified TME has 0% pricing coverage (all providers returned data but TME had no prices)

### 2. ✅ Root Cause: TME 2-Step API Architecture
**Discovery**: TME API requires 2 calls for pricing:
- `/Products/Search` - Returns basic info (Symbol, Description) - NO pricing
- `/Products/GetProducts` - Returns full details with PriceList/InStock

**Implementation**:
- Updated `src/search/providerOrchestrator.mjs` runTME() function
- Added tmeGetProduct import and call after Search
- Fallback logic: Use Search results if GetProducts fails

### 3. ✅ Critical Infrastructure Fixes

**Problem 1: CRLF Line Endings**
- `.env` file had CRLF endings (`\r\n`) instead of LF
- TME tokens contained `\r` at end: `Token=...%250D`
- TME API rejected with `E_AUTHORIZATION_FAILED` (403)
- **Fix**: `sed -i 's/\r$//' .env`

**Problem 2: Wrong PORT**
- `.env` had `PORT=9201` (metrics port)
- Server listened on 9201 instead of 3000
- **Fix**: `sed -i 's/^PORT=.*/PORT=3000/' .env`

**Problem 3: Missing ENV Variables**
- `ecosystem.config.cjs` didn't include TME_TOKEN/TME_SECRET
- PM2 couldn't access credentials
- **Fix**: Added to env section:
```javascript
env: {
  TME_TOKEN: process.env.TME_TOKEN || '',
  TME_SECRET: process.env.TME_SECRET || '',
  DIGIKEY_CLIENT_ID: process.env.DIGIKEY_CLIENT_ID || '',
  DIGIKEY_CLIENT_SECRET: process.env.DIGIKEY_CLIENT_SECRET || ''
}
```

**Problem 4: Port Conflicts**
- Multiple zombie processes holding ports 3000/9201
- EADDRINUSE errors on restart
- **Fix**: `pkill -9 -f "node.*server.js"` before restart

---

## Current Status

### Coverage Test Results
```
2N3904:
  mouser  : 16 rows ✓ price/stock/breaks ₽1
  digikey : 0 rows  (OAuth invalid_client error)
  tme     : 8 rows  ✓ found BUT ✗ pricing=null
  farnell : 12 rows ✓ price/stock/breaks ₽2

STM32F103C8T6:
  mouser  : 3 rows  ✓ ₽274
  digikey : 2 rows  ✓ ₽285
  tme     : 6 rows  ✓ found BUT ✗ pricing=null
  farnell : 2 rows  ✓ ₽287

LM358:
  mouser  : 48 rows ✗ pricing=null (generic MPN issue)
  digikey : 10 rows ✓ ₽5
  tme     : 0 rows  (not found)
  farnell : 0 rows  (not found)
```

**Coverage**: 6/12 combinations have full pricing (50%)
- Target: 12/12 (100%)

---

## Current Issues

### 1. TME GetProducts Pricing Missing
**Symptom**: TME Search returns products, but normalized output has `price: null`

**Evidence**:
- GetProducts API called successfully (log shows signature generation)
- No error messages in logs
- Response likely arrives but isn't parsed correctly

**Hypothesis**:
- Response structure mismatch (Data.ProductList.PriceList)
- normTME() normalizer doesn't extract pricing
- providerOrchestrator fallback logic discards GetProducts data

**Next Steps**:
1. Add debug logging to see raw GetProducts response
2. Check normTME() handles PriceList array correctly
3. Verify providerOrchestrator merges GetProducts data with Search results

### 2. DigiKey OAuth Error
**Symptom**: `invalid_client` (401)
**Cause**: OAuth credentials expired or incorrect
**Priority**: Low (Mouser/Farnell cover most parts)

### 3. Mouser LM358 Generic MPN
**Symptom**: 48 rows returned but all without pricing
**Cause**: LM358 is generic part number, Mouser returns compatible parts without specific pricing
**Priority**: Low (expected behavior)

---

## Modified Files

1. `.env` - Fixed CRLF, changed PORT to 3000
2. `ecosystem.config.cjs` - Added TME/DigiKey env variables
3. `src/search/providerOrchestrator.mjs` - Added TME GetProducts integration
4. `src/integrations/tme/client.mjs` - Verified HMAC signature generation
5. `scripts/check-coverage.mjs` - Created coverage test script

---

## Server State

- **PM2 Status**: online
- **Port 3000**: ✅ Listening
- **Port 9201**: ✅ Metrics endpoint
- **Providers Configured**:
  - Mouser: ✅
  - TME: ✅ (Search working, GetProducts called but pricing not parsed)
  - Farnell: ✅
  - DigiKey: ❌ OAuth error

---

## Documentation Created

1. `docs/_artifacts/2025-10-07/go-live/PROVIDER-PRICING-COVERAGE-REPORT.md` (330+ lines)
   - Detailed analysis of TME 2-step API
   - Coverage matrix results
   - Root cause analysis
   - Fix implementation plan

2. `scripts/check-coverage.mjs`
   - Automated test for pricing coverage
   - 3 MPNs × 4 providers
   - Color-coded output (✓/✗)

---

## Next Session TODO

1. **Debug TME GetProducts Response**
   - Log raw response from GetProducts API
   - Verify Data.ProductList[0].PriceList structure
   - Check if normTME() extracts pricing correctly

2. **Fix normTME() if needed**
   - Ensure it handles PriceList array
   - Map TME price format to canonical format
   - Handle currency conversion (PLN → RUB)

3. **Verify providerOrchestrator merge logic**
   - Ensure GetProducts data replaces Search placeholders
   - Check that pricing/stock from GetProducts overrides Search nulls

4. **Target**: 100% pricing coverage (12/12)
   - 2N3904: 4/4 providers
   - STM32F103C8T6: 4/4 providers
   - LM358: 2/4 providers (acceptable - generic MPN)

---

## Commands for Next Session

```bash
# Resume work
cd /opt/deep-agg
pm2 logs deep-agg --lines 50

# Test TME manually
curl -s "http://localhost:3000/api/search?q=2N3904&fresh=1" | \
  jq '.meta.providers[] | select(.provider == "tme")'

# Run coverage test
node scripts/check-coverage.mjs

# Check server status
pm2 status
lsof -i:3000
```

---

## Key Learnings

1. **Always check line endings** - CRLF breaks API authentication
2. **PM2 env variables** must be explicitly passed in ecosystem.config.cjs
3. **TME API is 2-step** - Search for discovery, GetProducts for pricing
4. **Port conflicts** - Kill zombie processes before restart
5. **Coverage testing** - Automated scripts catch integration issues early

---

**Session saved**: 2025-10-07 16:17 UTC
