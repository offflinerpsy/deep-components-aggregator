# Production Runtime Status — 2025-10-06

## Executive Summary

**Server Status**: ✅ Running (PID 21327, port 9201)  
**Health Check**: ✅ OK (`/api/health` returns 200)  
**Deployment Source**: ❌ NOT a git repository  
**Active Providers**: DigiKey only (Mouser/TME/Farnell missing keys)  
**Critical Issues**: Empty pricing, null product fields, no metrics endpoint

---

## 1. Git & Deployment

**Finding**: `/opt/deep-agg` is **NOT a git repository**

```
Artifact: git-remote.txt
Result: "fatal: not a git repository"
```

**Impact**: Cannot verify deployment version or rollback  
**Recommendation**: Initialize git or deploy from version-controlled source

---

## 2. Environment Configuration

**Artifacts**: `env-extract.txt`

```
NO_PROXY=  
HTTP_PROXY=  
HTTPS_PROXY=  
```

**Finding**: Proxy env vars empty, but application uses internal WARP proxy at `http://127.0.0.1:25345`

**Provider Keys**:
- DigiKey: ✅ Configured (CLIENT_ID/SECRET present)
- Mouser: ❌ Missing
- TME: ❌ Missing
- Farnell: ❌ Missing

---

## 3. Runtime & Listeners

**Artifacts**: `port-9201.txt`, `node-procs.txt`, `systemd-hint.txt`

**Port 9201**: ✅ Listening (Node server PID 21327)  
**Process**: `/usr/bin/node server.js` (manual background start)  
**systemd Service**: ❌ None active (deep-aggregator.service points to non-existent `/root/aggregator-v2/`)

**Impact**: No auto-restart, no systemd logging integration  
**Recommendation**: Create proper systemd unit file

---

## 4. API Health & Routes

**Artifacts**: `health-after-start.json`, `routes-grep.txt`

**Health Endpoint**: ✅ OK

```json
{
  "status": "ok",
  "version": "3.2",
  "sources": {
    "mouser": "disabled",
    "tme": "disabled",
    "farnell": "disabled",
    "digikey": "ready"
  }
}
```

**Routes Inventory**:
- `/api/search` ✅
- `/api/product` ✅
- `/api/health` ✅
- `/api/order` ✅
- `/api/live/search` ✅
- `/metrics` ❌ 404

---

## 5. Search Functionality

**Artifacts**: `search-ds12c887.json`, `search-2n3904.json`

**Sample Result** (DS12C887+):

```json
{
  "id": "...",
  "mpn": null,                    ❌ NULL
  "title": null,                  ❌ NULL
  "manufacturer": "Analog Devices Inc./Maxim Integrated",
  "description": null,            ❌ NULL
  "package": null,
  "packaging": null,
  "regions": ["US"],
  "stock": 14969,
  "pricing": [],                  ❌ EMPTY
  "minPrice_rub": null,
  "currency": null,
  "source": "digikey",
  "datasheet": null,
  "image": null
}
```

**Critical**: DigiKey returns results, but:
1. `pricing` array is empty
2. `mpn`, `title`, `description` are null
3. Cannot display prices in ₽

**Cause**: DigiKey normalization pipeline (`normDigiKey`) fails to map fields correctly

---

## 6. Logs Analysis

**Artifacts**: `err-log-tail.txt`, `journal.txt`

**Errors Found**:
1. OAuth warnings (Google/Yandex/VK not configured) — LOW priority
2. Previous `EADDRINUSE` on port 9201 — RESOLVED (port now free)
3. No current errors in `logs/err.log` after restart

---

## 7. Proxy Status

**Artifacts**: `proxy-env.txt`, `ip-direct.txt`

**External IP**: `5.129.228.88` (server direct)  
**Proxy Mode**: WARP disabled at OS level, but app uses internal proxy `127.0.0.1:25345`

**Provider Check**:
- DigiKey via proxy: ✅ Works (HTTP 200, 10 results in 2699ms)
- Without proxy: DigiKey returns 403 (documented requirement)

**Timeout Policy**: ✅ Clients configured <9.5s (proxy-mode limit is 10s per Cloudflare docs)

---

## 8. Provider Coverage

**Artifact**: `providers/coverage-matrix.csv`

| Provider | Status  | PriceBreaks | Currency | Stock | Package | Description | Regions |
|----------|---------|-------------|----------|-------|---------|-------------|---------|
| DigiKey  | ✅ OK   | ❌ Empty    | ❌ N/A   | ✅ Yes| ❌ null | ❌ null     | ✅ Yes  |
| Mouser   | ❌ FAIL | —           | —        | —     | —       | —           | —       |
| TME      | ❌ FAIL | —           | —        | —     | —       | —           | —       |
| Farnell  | ❌ FAIL | —           | —        | —     | —       | —           | —       |

**Impact**: Single provider dependency, incomplete product data

---

## 9. Currency Feed (ЦБ РФ)

**Artifact**: `cbr-xml-head.txt`

**Status**: ✅ Accessible  
**Date**: 07.10.2025  
**Sample Rates**:
- USD: 83.0000 ₽
- EUR: 96.8345 ₽

**Finding**: CBR XML API works, but app does not display ₽ prices (see issue #5)

---

## 10. Metrics & Observability

**Artifact**: `metrics.txt`

**Finding**: `/metrics` endpoint returns **404**

**Impact**: No Prometheus metrics, cannot monitor:
- Request latency (p50/p95/p99)
- Error rates
- Provider health
- Cache hit rates

**Dependency**: `prom-client` already installed in `package.json`  
**Recommendation**: Implement metrics endpoint urgently

---

## Definition of Done — Checklist

✅ `git-remote.txt`, `git-head-*.txt` — Git status documented (NOT a repo)  
✅ `env-extract.txt` — Environment variables captured  
✅ `port-9201.txt`, `node-procs.txt`, `systemd-hint.txt` — Runtime state confirmed  
✅ `health-after-start.json` — Server healthy  
✅ `routes-grep.txt` — API routes inventory complete  
✅ `search-*.json` — Search tested (returns data, but incomplete)  
✅ `err-log-tail.txt`, `journal.txt` — Logs reviewed  
✅ `providers-check.json` + `coverage-matrix.csv` — Provider status clear  
✅ `proxy-env.txt`, `ip-direct.txt` — Proxy status documented  
✅ `cbr-xml-head.txt` — Currency feed accessible  
✅ `metrics.txt` — Metrics endpoint checked (404 — risk noted)  
❌ Visual regression tests — Not implemented (risk noted)

---

## Critical Next Steps

1. **Fix DigiKey normalization** → `pricing`/`mpn`/`title`/`description` must populate
2. **Implement `/metrics`** → Use prom-client for Prometheus integration
3. **Create systemd service** → Auto-restart, proper logging
4. **Configure missing providers** → Mouser/TME/Farnell API keys
5. **Initialize git** → Version control for deployment tracking
6. **Fix PATH** → Shell environment restoration

---

**Diagnostics Complete**: 2025-10-06  
**Artifacts Location**: `/opt/deep-agg/docs/_artifacts/2025-10-06/`
