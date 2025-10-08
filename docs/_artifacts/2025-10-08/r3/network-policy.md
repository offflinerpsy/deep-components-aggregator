# R3 Network & Provider Policy

## Global Proxy Configuration

**File**: `src/bootstrap/proxy.mjs`

```javascript
import { setGlobalDispatcher, ProxyAgent } from 'undici';

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

if (proxy && /^https?:\/\//.test(proxy)) {
  setGlobalDispatcher(new ProxyAgent({
    uri: proxy,
    connectTimeout: 2500,
    headersTimeout: 10_000  // 10s max per WARP proxy-mode limit
  }));
}
```

**Status**: ✅ Correct per Undici docs (`setGlobalDispatcher` is the recommended approach)

**WARP Compliance**:
- `headersTimeout: 10_000` (10s) — within WARP proxy-mode limit
- Respects `HTTPS_PROXY` env variable
- All `fetch()` calls automatically use the global proxy

**Reference**: https://undici.nodejs.org/#/docs/api/ProxyAgent

---

## Queue Configuration (p-queue)

**File**: `src/live/queue.mjs`

### Main Queue
```javascript
export const mainQueue = new PQueue({
  concurrency: 4,       // Max 4 tasks simultaneously
  intervalCap: 30,      // Max 30 tasks
  interval: 60 * 1000,  // per 60 seconds (1 minute)
  carryoverConcurrencyCount: true
});
```

### Scrape Queue
```javascript
export const scrapeQueue = new PQueue({
  concurrency: 2,       // Max 2 scraping tasks simultaneously
  intervalCap: 10,      // Max 10 scraping tasks
  interval: 60 * 1000,  // per 60 seconds (1 minute)
  carryoverConcurrencyCount: true
});
```

### Parse Queue
```javascript
export const parseQueue = new PQueue({
  concurrency: 8,       // Max 8 parsing tasks simultaneously (CPU-bound)
  carryoverConcurrencyCount: true
});
```

**Status**: ✅ Documented

**Reference**: https://github.com/sindresorhus/p-queue

---

## Provider Orchestrator

**File**: `src/search/providerOrchestrator.mjs`

```javascript
const CONCURRENCY = 4;  // Max 4 providers in parallel
const PROVIDER_TIMEOUT = 9500;  // 9.5s (within 10s WARP limit)

const queue = new PQueue({ concurrency: CONCURRENCY });
```

**WARP Compliance**:
- Provider timeout: 9.5s (< 10s WARP proxy-mode limit)
- All provider calls go through global Undici proxy
- No external calls bypass the proxy

**Reference**: Cloudflare WARP proxy-mode has 10s timeout per connection
https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/configure-warp/route-traffic/warp-architecture/

---

## Summary

| Component | Configuration | WARP Compliant |
|-----------|--------------|----------------|
| Global Proxy | `setGlobalDispatcher(new ProxyAgent(...))` | ✅ |
| Timeout (headers) | 10s | ✅ |
| Timeout (providers) | 9.5s | ✅ |
| Main Queue | concurrency=4, intervalCap=30/min | ✅ |
| Scrape Queue | concurrency=2, intervalCap=10/min | ✅ |
| Parse Queue | concurrency=8 (no interval limit) | ✅ |

**All network traffic from Node.js goes through the configured proxy when `HTTPS_PROXY` is set.**

**Generated**: 2025-10-08
