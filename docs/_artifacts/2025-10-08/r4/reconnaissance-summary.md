# R4 Block 1: Cache/Search Reconnaissance Summary

**Date**: 2025-10-08  
**Branch**: `ops/r4-vitrine-cache-relevance`

---

## Database Schema (deepagg.sqlite)

### Current Tables
- **searches**: `(q TEXT PK, ts INTEGER, total INTEGER, source TEXT)` + index on ts
- **search_rows**: `(q TEXT, ord INTEGER, row TEXT, PK(q,ord))` — denormalized search results
- **product_cache**: `(src TEXT, id TEXT, ts INTEGER, product TEXT, PK(src,id))` — individual product cache
- **products**: legacy table (same schema as product_cache)
- **users**, **sessions**, **orders**, **settings**: auth/order management

### Missing
- ❌ **No FTS5 table** for full-text search (bm25 ranking)
- ❌ **No vitrine-specific tables** (sections, pinned items, margin rules)
- ❌ **No indexes** on search results for filtering (in_stock, price_min/max, region)

---

## Cache Architecture

### Write-Through Pattern (`src/db/sql.mjs`)
```javascript
// Search cache (7-day TTL)
cacheSearch(db, q.toLowerCase(), rows, {source:'mouser|farnell|providers'});
readCachedSearch(db, q.toLowerCase(), TTL_SEARCH_MS);

// Product cache (unused — 0 products cached)
cacheProduct(db, src, id, product);
readCachedProduct(db, src, id, maxAgeMs);
```

**Key Findings**:
- ✅ Search cache active: **16 cached searches**, all 1 day old (source: `providers`)
- ❌ Product cache empty: **0 products** (never used in production)
- ✅ TTL: `7*24*60*60*1000` (7 days) for searches
- ⚠️ Cache invalidation: **timestamp-based** (no versioning, no cache busting)

### Current Search Flow (`src/api/search.mjs`)
1. **Check cache**: `readCachedSearch(db, q.toLowerCase(), TTL_SEARCH_MS)`
2. **If miss or fresh=1**: Live API call (Mouser → Farnell fallback)
3. **Write-through**: `cacheSearch(db, q.toLowerCase(), rows, {source})`
4. **Return**: `{ok:true, q, rows, meta:{source, total, cached:true|false}}`

**No cache-only API** — `/api/search` always allows live fallback

---

## Sample Cached Data

**Top 5 Recent Searches** (`cached-searches-sample.txt`):
```
q         | source    | total | days_old
----------|-----------|-------|----------
2n3904    | providers | 36    | 1
bc547     | providers | 48    | 1
1n4007    | providers | 60    | 1
ds1307    | providers | 47    | 1
lm358     | providers | 60    | 1
```

**Observations**:
- All searches use `source: providers` (not Mouser/Farnell)
- Total results: 36-60 items per query
- Cache age: 1 day (within 7-day TTL)
- Queries: Latin MPNs (no Cyrillic samples)

---

## Search Logic (`src/api/search.mjs`)

### Query Classification
```javascript
const isCyrillic = s => /[А-Яа-яЁё]/.test(s);
const isLikelyMPN = s => /^[A-Za-z0-9][A-Za-z0-9\-\._]{1,}$/i.test(s) && /\d/.test(s);
```

### Strategy
- **Cyrillic** → `farnellByKeyword()` (keyword search)
- **Latin MPN** → `mouserSearchByPartNumber()` → `farnellByMPN()` fallback
- **Latin keyword** → `mouserSearchByKeyword()` → `farnellByKeyword()` fallback

**No FTS or transliteration** — relies on external provider APIs

---

## Gap Analysis for R4

### ❌ Missing Components
1. **FTS5 table** with bm25 ranking (SQLite full-text search)
2. **Vitrine API** (`/api/vitrine/sections`, `/api/vitrine/list?section&q&filters`)
3. **RU→EN pipeline** (language detection + ICU transliteration)
4. **Cache metrics** (cache_hits, cache_misses, fts_queries_ms)
5. **Empty-state diagnostics** (why no results? cache vs live vs query issues)
6. **Admin controls** (pin/unpin items, margin rules, section management)

### ✅ Reusable Infrastructure
- `readCachedSearch()` / `cacheSearch()` functions (extend for vitrine)
- Prometheus metrics endpoint (extend with cache metrics)
- Admin auth middleware (RFC 7235 compliant)
- Diagnostics page (`/ui/diag.html` — link from empty-state UX)

---

## Next Steps (Block 2-9)

**Block 2**: Create vitrine API (cache-only, no live fallback)
**Block 3**: Add FTS5 table + bm25 ranking + sync triggers
**Block 4**: Implement RU→EN transliteration (ICU Any-Latin)
**Block 5**: Build empty-state UX with diagnostics
**Block 6**: Admin controls (pin/unpin, margins, RFC 7235)
**Block 7**: Extend Prometheus metrics (cache hits/misses, FTS timing)
**Block 8**: Verify network policy (ProxyAgent, p-queue)
**Block 9**: Create R4-REPORT.md + PR

---

**Artifacts**:
- `db-schema.sql` (106 lines)
- `grep-cache-search.txt` (168 lines)
- `cached-searches-sample.txt` (5 rows)
- This summary: `reconnaissance-summary.md`
