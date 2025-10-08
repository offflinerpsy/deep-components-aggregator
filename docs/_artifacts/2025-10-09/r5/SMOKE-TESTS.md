# R5 Mission Pack — Smoke Tests

**Date**: 2025-10-09  
**Branch**: ops/r5-fts-ru-empty-metrics-pins

---

## Test 1: Cyrillic Search (транзистор → results)

**Command**:
```bash
curl -s 'http://localhost:9201/api/vitrine/list?q=транзистор&limit=3'
```

**Expected**:
- `ok: true`
- `meta.usedFts: true`
- `meta.queryNorm.hasCyrillic: true`
- `meta.queryNorm.normalized: "transistor"`
- `rows.length >= 1`

**Actual**:
```json
{
  "ok": true,
  "rows": [
    {
      "mpn": "NSVMUN5136T1G",
      "manufacturer": "onsemi",
      "title": "Digital Transistors Bias Resistor Transistor",
      "_fts_rank": -3.495537423998543
    },
    // ... 2 more results
  ],
  "meta": {
    "total": 3,
    "totalBeforeLimit": 73,
    "cached": true,
    "usedFts": true,
    "queryNorm": {
      "original": "транзистор",
      "hasCyrillic": true,
      "transliterated": "tranzistor",
      "normalized": "transistor",
      "allQueries": ["tranzistor", "transistor"],
      "tokens": ["transistor"]
    }
  }
}
```

**Status**: ✅ PASS

---

## Test 2: Empty-State Diagnostics

**Command**:
```bash
curl -s 'http://localhost:9201/api/search/reasons?q=abcdefghijklmnopqrstuvwxyz12345'
```

**Expected**:
- `ok: true`
- `warp_on: true` (WARP egress active)
- `cache_count: 0` (no matches)
- `providers_reachable.*: true` (all providers up)
- `advice: Array<string>` (suggestions for user)

**Actual**:
```json
{
  "ok": true,
  "warp_on": true,
  "providers_reachable": {
    "tme": true,
    "farnell": true,
    "digikey": true,
    "mouser": true
  },
  "cache_count": 0,
  "query_norm": {
    "original": "abcdefghijklmnopqrstuvwxyz12345",
    "hasCyrillic": false,
    "normalized": "abcdefghijklmnopqrstuvwxyz12345"
  },
  "advice": [
    "Попробуйте более общий запрос (например, \"транзистор\" вместо конкретного MPN)",
    "Попробуйте другие ключевые слова или проверьте написание",
    "Используйте диагностику сети: /ui/diag.html"
  ]
}
```

**Status**: ✅ PASS

---

## Test 3: Metrics Scrape (FTS/Cache)

**Command**:
```bash
# Generate activity
curl -s 'http://localhost:9201/api/vitrine/list?q=transistor&limit=5' > /dev/null
curl -s 'http://localhost:9201/api/vitrine/list?q=транзистор&limit=3' > /dev/null

# Scrape metrics
curl -s 'http://localhost:9201/api/metrics' | grep -E '(cache_hits|cache_misses|fts_queries|fts_query_duration)'
```

**Expected**:
- `cache_hits_total{source="vitrine"} >= 1`
- `fts_queries_total >= 1`
- `fts_query_duration_ms_bucket{le=...}` histogram buckets
- `Content-Type: text/plain; version=0.0.4; charset=utf-8`

**Actual**:
```
# HELP cache_hits_total Total number of cache hits
# TYPE cache_hits_total counter
cache_hits_total{source="vitrine",app="deep-aggregator",version="3.0.0"} 1
# HELP cache_misses_total Total number of cache misses
# TYPE cache_misses_total counter
# HELP fts_queries_total Total number of FTS5 queries executed
# TYPE fts_queries_total counter
fts_queries_total{app="deep-aggregator",version="3.0.0"} 1
# HELP fts_query_duration_ms FTS5 query duration in milliseconds
# TYPE fts_query_duration_ms histogram
fts_query_duration_ms_bucket{le="1",app="deep-aggregator",version="3.0.0"} 0
fts_query_duration_ms_bucket{le="5",app="deep-aggregator",version="3.0.0"} 1
fts_query_duration_ms_sum{app="deep-aggregator",version="3.0.0"} 3
fts_query_duration_ms_count{app="deep-aggregator",version="3.0.0"} 1
```

**Headers**:
```
HTTP/1.1 200 OK
Content-Type: text/plain; version=0.0.4; charset=utf-8
```

**Status**: ✅ PASS

---

## Test 4: Admin Pins (RFC 7235 Auth)

**Command**:
```bash
curl -I 'http://localhost:9201/api/admin/vitrine/pins'
```

**Expected**:
- HTTP 401 Unauthorized (no session/auth)
- `WWW-Authenticate: Bearer realm="Admin API"`

**Actual**:
```
HTTP/1.1 401 Unauthorized
X-Powered-By: Express
WWW-Authenticate: Bearer realm="Admin API"
Content-Type: application/json; charset=utf-8
Content-Length: 46
```

**Status**: ✅ PASS (RFC 7235 compliance verified)

---

## Test 5: Vitrine Pinned Products (Integration)

**Setup**:
1. Create user session (requires auth flow)
2. POST `/api/admin/vitrine/pins` with `{rowid: 1}`
3. GET `/api/vitrine/list?limit=10`
4. Verify first result has `_pinned: true`

**Status**: ⚠️ DEFERRED (requires full auth setup, out of scope for R5 smoke tests)

**Rationale**: 
- Admin auth requires user registration + session
- Pin functionality tested via direct database query in development
- Full E2E test belongs in R6 (integration tests)

---

## Summary

**Total Tests**: 4/4 automated  
**Passed**: 4/4 ✅  
**Failed**: 0  
**Deferred**: 1 (admin pins E2E, requires auth setup)

**Critical Paths Verified**:
- RU→EN normalization → FTS5 search ✅
- Empty-state diagnostics (WARP check + provider ping) ✅
- Prometheus metrics (cache/FTS counters + histograms) ✅
- RFC 7235 auth contracts (401 + WWW-Authenticate) ✅

**Next Steps**: Create PR with conventional commits, merge to main.
