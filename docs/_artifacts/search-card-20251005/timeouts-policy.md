# HTTP Timeout Policy
# Date: 2025-10-05
# Requirement: All outgoing HTTP requests MUST have timeout ≤ 9.5 seconds

## Rationale
**Cloudflare WARP proxy-mode has ~10s hard timeout limit** (official documentation):
https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/configure-warp/warp-modes/

Client-side timeouts MUST be < 9.5s to:
1. Leave headroom for network latency
2. Avoid WARP daemon killing connections at 10s boundary
3. Ensure graceful error handling before forced disconnect

## Current State (AUDIT)

### ✅ COMPLIANT Files
| File | Timeout | Status |
|------|---------|--------|
| `src/utils/fetchWithRetry.mjs` | 7000ms | ✅ Good (WARP limit - 3s) |

### ❌ NON-COMPLIANT Files
| File | Current | Required | Line |
|------|---------|----------|------|
| `src/currency/currencyConverter.js` | 10000ms | ≤9500ms | 48 |
| `src/services/net.js` | 10000ms | ≤9500ms | 4 |

### ⚠️ UNCHECKED (Playwright/Browser)
| File | Timeout | Notes |
|------|---------|-------|
| `src/services/fetcher.js` | Not specified | Playwright page.goto() - uses default |
| `src/scout/providers/elitan.mjs` | 30000ms | Browser operation (acceptable for rendering) |
| `src/live/snapshot.mjs` | 45000ms | Browser operation (acceptable for rendering) |

**Note:** Browser timeouts (Playwright) are separate from HTTP fetch - WARP proxy only affects `fetch`/`undici` calls.

## Required Changes

### 1. currencyConverter.js (Line 48)
**Current:**
```javascript
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
```

**Required:**
```javascript
const timeoutId = setTimeout(() => controller.abort(), 9500); // 9.5s (WARP limit)
```

### 2. net.js (Line 4)
**Current:**
```javascript
const DEFAULT_TIMEOUT = 10000;
```

**Required:**
```javascript
const DEFAULT_TIMEOUT = 9500; // WARP proxy has ~10s limit, use 9.5s
```

## Verification Method
After changes deployed:

1. **Code Audit:**
```bash
grep -rn "setTimeout.*[0-9]\{4,\}" src/ | grep -v "// Browser" | awk -F: '{print $1":"$2": "$3}'
```

2. **Runtime Test (with WARP enabled):**
```javascript
// Test timeout enforcement
const start = Date.now();
try {
  await fetch('http://httpbin.org/delay/15'); // Intentional 15s delay
} catch (err) {
  console.log(`Aborted after ${Date.now() - start}ms`); // Should be ~9500ms
}
```

3. **Production Monitoring:**
```bash
# Check for timeout errors in logs
ssh root@5.129.228.88 "journalctl -u deep-aggregator -n 1000 | grep -i timeout"
```

## Retry Strategy (fetchWithRetry.mjs)
Current implementation: **2 retries with exponential backoff**
- Attempt 1: Timeout at 7s
- Retry 1 (+500ms delay): Timeout at 7s
- Retry 2 (+1500ms delay): Timeout at 7s
- **Total max time:** 7s + 0.5s + 7s + 1.5s + 7s = **23s**

This is acceptable because:
- Individual request timeout < 9.5s ✅
- Aggregate retry time doesn't violate WARP limit (each attempt is independent)
- User gets response or failure within ~23s worst case

## API-Specific Considerations

### Mouser API
Typical response time: 1-3s
Timeout: 7s (fetchWithRetry) ✅

### DigiKey OAuth
Token endpoint: 2-5s
Timeout: 7s (fetchWithRetry) ✅

### Farnell REST API
Search: 3-6s
Timeout: 7s (fetchWithRetry) ✅

### TME Products API
Batch requests: 2-4s
Timeout: 7s (fetchWithRetry) ✅

### CBR Currency Rates
Daily XML: 0.5-2s
Timeout: **10s → 9.5s** ⚠️ REQUIRES FIX

## References
1. Cloudflare WARP Modes: https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/configure-warp/warp-modes/
2. Node.js Undici Timeouts: https://undici.nodejs.org/#/?id=requestoptions
3. AbortController (Timeout Pattern): https://developer.mozilla.org/en-US/docs/Web/API/AbortController

## Acceptance Criteria
- [ ] All HTTP fetch calls use timeout ≤ 9500ms
- [ ] `currencyConverter.js` updated to 9500ms
- [ ] `net.js` DEFAULT_TIMEOUT updated to 9500ms
- [ ] Code audit confirms no 10s+ timeouts in fetch operations
- [ ] Documentation updated with WARP timeout rationale
