## 🎯 PR #27: FTS5 bm25 Ranking + RU→EN Normalization + Diagnostics + Metrics + Admin Pins

**Mission Pack**: R5 (Blocks 0-9)  
**Branch**: `ops/r5-fts-ru-empty-metrics-pins`  
**Type**: feat (search, metrics, admin)

---

### 📊 Summary

This PR completes the **R5 Mission Pack**, delivering:
1. **FTS5 bm25 relevance ranking** with custom weights
2. **RU→EN search normalization** (GOST 7.79 + 33 electronics synonyms)
3. **Empty-state diagnostics** (WARP check, provider ping, advice)
4. **Cache/FTS Prometheus metrics** (hits, misses, queries, duration)
5. **Admin pin controls** (RFC 7235 auth, vitrine priority)

**Impact**: Users can now search in Russian (транзистор → transistor), get diagnostics when no results found, and admins can pin priority products.

---

### 🔧 CHANGES

#### Created Files (7)
1. **`db/migrations/0002_fts5_content_table.sql`** (95 lines)
   - FTS5 content-table mode: `content='search_rows'`, `content_rowid='rowid'`
   - Tokenizer: `unicode61 remove_diacritics 2 tokenchars '-._'`
   - Prefix index: `prefix='2 3 4'` (fast 2/3/4-char autocomplete)
   - Triggers: INSERT/UPDATE/DELETE auto-sync
   - Backfilled 619 existing rows

2. **`src/search/normalizeQuery.mjs`** (238 lines)
   - `hasCyrillic()`: Detect Cyrillic characters
   - `transliterateRuToEn()`: GOST 7.79 System B mapping
   - `applySynonyms()`: 33 electronics terms (RU/transliterated → EN)
   - `normalizeQuery()`: Main pipeline (detect → transliterate → synonym)

3. **`api/search-reasons.mjs`** (167 lines)
   - `GET /api/search/reasons?q=...`
   - Returns: `{warp_on, providers_reachable, cache_count, query_norm, advice}`
   - WARP check via `1.1.1.1/cdn-cgi/trace` (5s timeout)
   - Provider HEAD pings (TME/Farnell/Mouser/DigiKey, 8s timeout)

4. **`ui/empty.html`** (172 lines)
   - Empty-state UI with diagnostics widget
   - Fetches `/api/search/reasons` for user advice
   - Links to `/ui/diag.html` for network diagnostics

5. **`db/migrations/0003_vitrine_pins.sql`** (18 lines)
   - `vitrine_pins` table: `(rowid, pinned_at, pinned_by, notes)`
   - Index: `idx_vitrine_pins_pinned_at`

6. **`api/admin-vitrine.mjs`** (156 lines)
   - `POST /api/admin/vitrine/pins` (pin product)
   - `DELETE /api/admin/vitrine/pins/:rowid` (unpin)
   - `GET /api/admin/vitrine/pins` (list all pins)
   - RFC 7235: 401 + `WWW-Authenticate`, 403 for forbidden

7. **`docs/_artifacts/2025-10-09/r5/`** (25 files)
   - Reconnaissance, testing, verification artifacts
   - Reports: `R5-FINAL-REPORT.md`, `SMOKE-TESTS.md`, etc.

#### Modified Files (5)
1. **`src/db/sql.mjs`**
   - Removed old contentless FTS5 schema from `openDb()`
   - Simplified `cacheSearch()`: triggers handle FTS sync
   - Updated `searchCachedFts()`: content-table JOIN, bm25 weights `{limit, weights: [10,6,2,1]}`

2. **`api/vitrine.mjs`**
   - RU→EN normalization before FTS5 search
   - FTS query duration measurement
   - Cache hit/miss metrics recording
   - Pinned products prepended to results (`_pinned: true`)

3. **`src/api/search.mjs`**
   - RU→EN normalization for provider searches
   - Cache hit/miss metrics recording
   - `queryNorm` metadata in all responses

4. **`metrics/registry.js`**
   - `cacheHitsTotal{source}` counter
   - `cacheMissesTotal{source}` counter
   - `ftsQueriesTotal` counter
   - `ftsQueryDurationMs` histogram (1ms, 5ms, 10ms, 50ms, 100ms, 500ms, 1s, 5s)

5. **`server.js`**
   - Mounted `mountSearchReasons(app, {keys})`
   - Mounted `mountAdminVitrine(app)`

---

### ✅ VERIFY

#### FTS5 + bm25 Ranking
```bash
# Count transistor matches
sqlite3 var/db/deepagg.sqlite "SELECT COUNT(*) FROM search_rows_fts WHERE search_rows_fts MATCH 'transistor'"
# Result: 73

# Top 5 ranked by bm25
sqlite3 var/db/deepagg.sqlite <<EOF
SELECT 
  json_extract(sr.row, '$.mpn'),
  round(bm25(search_rows_fts,10,6,2,1),3)
FROM search_rows_fts
JOIN search_rows sr ON sr.rowid = search_rows_fts.rowid
WHERE search_rows_fts MATCH 'transistor'
ORDER BY bm25(search_rows_fts,10,6,2,1) ASC
LIMIT 5
EOF
# Result: NSVMUN5136T1G (-3.496), COM-00521 (-3.496), TBC547 (-3.352), ...
```

#### RU→EN Normalization
```bash
node -e "
import {normalizeQuery} from './src/search/normalizeQuery.mjs';
console.log(JSON.stringify(normalizeQuery('транзистор'), null, 2));
"
# Result:
# {
#   "original": "транзистор",
#   "hasCyrillic": true,
#   "transliterated": "tranzistor",
#   "normalized": "transistor",
#   "allQueries": ["tranzistor", "transistor"],
#   "tokens": ["transistor"]
# }
```

#### Cyrillic Search (E2E)
```bash
curl -s 'http://localhost:9201/api/vitrine/list?q=транзистор&limit=3' | jq '.meta.queryNorm.normalized, .rows[0].mpn'
# Result:
# "transistor"
# "NSVMUN5136T1G"
```

#### Empty-State Diagnostics
```bash
curl -s 'http://localhost:9201/api/search/reasons?q=nonexistentpart12345' | jq '{warp_on, cache_count, advice}'
# Result:
# {
#   "warp_on": true,
#   "cache_count": 0,
#   "advice": [
#     "Попробуйте более общий запрос...",
#     "Попробуйте другие ключевые слова...",
#     "Используйте диагностику сети: /ui/diag.html"
#   ]
# }
```

#### Prometheus Metrics
```bash
# Check Content-Type header
curl -I 'http://localhost:9201/api/metrics' | grep Content-Type
# Result: Content-Type: text/plain; version=0.0.4; charset=utf-8

# Check cache/FTS metrics
curl -s 'http://localhost:9201/api/metrics' | grep -E '(cache_hits|fts_queries_total)'
# Result:
# cache_hits_total{source="vitrine",app="deep-aggregator",version="3.0.0"} 1
# fts_queries_total{app="deep-aggregator",version="3.0.0"} 1
```

#### Admin Pins (RFC 7235)
```bash
curl -I 'http://localhost:9201/api/admin/vitrine/pins' | grep -E '(HTTP|WWW-Authenticate)'
# Result:
# HTTP/1.1 401 Unauthorized
# WWW-Authenticate: Bearer realm="Admin API"
```

---

### 📈 Performance

**FTS5 Query Performance** (from histogram):
- p50: < 5ms
- p95: < 10ms
- p99: < 50ms

**WARP Check**: 5s timeout  
**Provider Ping**: 8s timeout (per provider)

---

### 🔒 Security

- **RFC 7235 Compliance**: Admin endpoints return 401 + `WWW-Authenticate` header
- **No Secrets Leaked**: All API keys remain in environment variables
- **SQL Injection Safe**: All queries use prepared statements
- **No External Dependencies**: GOST 7.79 transliteration in pure JS

---

### 🧪 Testing

**Smoke Tests**: 4/4 passing
1. ✅ Cyrillic search (`транзистор` → 73 results)
2. ✅ Empty-state diagnostics (WARP check + provider ping)
3. ✅ Prometheus metrics (cache/FTS counters + histogram)
4. ✅ Admin pins RFC 7235 (401 + `WWW-Authenticate`)

**Artifacts**: 25 verification files in `docs/_artifacts/2025-10-09/r5/`

---

### 📚 Documentation

- **R5-FINAL-REPORT.md**: Complete mission report with all blocks
- **SMOKE-TESTS.md**: Test results and verification steps
- **ru-en-pipeline-report.md**: RU→EN normalization details
- **ru-en-integration-report.md**: API integration guide
- **reconnaissance-summary.md**: FTS5 investigation findings

---

### 🎓 Lessons Learned

1. **Content-table vs Contentless FTS5**: Content-table mode cleaner for JSON extraction (triggers vs manual sync)
2. **GOST 7.79 for Electronics**: `tokenchars '-._'` critical for MPN matching (1N4148, STM32F4)
3. **Synonym Priority**: English synonym > transliteration > original (FTS5 index contains English data)
4. **bm25 Weights**: `[10,6,2,1]` for `[mpn, manufacturer, title, description]` yields good relevance
5. **WARP Timeout**: 10s hard limit in proxy-mode → all external calls use `< 10s` timeouts
6. **RFC 7235**: 401 + `WWW-Authenticate` vs 403 (important for client retry logic)

---

### 🚀 Next Steps (Post-Merge)

After R5 merge, begin **R6 Mission Pack**:
- **Goal**: Search Go-Live Hardening (SLO, SSE streaming, provider orchestration)
- **Branch**: `ops/r6-search-golive-now`
- **Focus**: Infrastructure hardening (not features) — timeouts, metrics, degradation strategies

---

### ✅ Acceptance Criteria

- [x] FTS5 bm25 ranking with custom weights (10,6,2,1)
- [x] RU→EN normalization pipeline (GOST 7.79 + 33 synonyms)
- [x] Cyrillic search works (транзистор → 73 results)
- [x] Empty-state diagnostics endpoint (`/api/search/reasons`)
- [x] WARP egress check (`1.1.1.1/cdn-cgi/trace`)
- [x] Provider reachability checks (HEAD pings)
- [x] Cache/FTS Prometheus metrics (hits, misses, queries, duration)
- [x] Content-Type: `text/plain; version=0.0.4` (RFC compliance)
- [x] Admin pins API (POST/DELETE/GET with RFC 7235 auth)
- [x] Vitrine shows pinned products first
- [x] Smoke tests passing (4/4)
- [x] 25 verification artifacts saved

---

**Ready to Merge**: YES ✅  
**Blockers**: NONE  
**Breaking Changes**: NONE (backward compatible)
