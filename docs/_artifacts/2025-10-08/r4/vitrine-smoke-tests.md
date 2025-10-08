# Vitrine API — Smoke Test Results

**Date**: 2025-10-08  
**Endpoint Base**: `http://127.0.0.1:9201/api/vitrine`

---

## ✅ Test 1: GET /sections

**Request**:
```bash
curl "http://127.0.0.1:9201/api/vitrine/sections"
```

**Response** (`smoke-vitrine-sections.json`):
```json
{
  "ok": true,
  "sections": [
    {
      "id": "providers",
      "label": "providers",
      "count": 16,
      "items": 619
    }
  ]
}
```

**Result**: ✅ PASS — 1 section (providers) with 16 cached searches, 619 total items

---

## ✅ Test 2: GET /list (no filters)

**Request**:
```bash
curl "http://127.0.0.1:9201/api/vitrine/list?limit=3"
```

**Response** (`smoke-vitrine-list.json`):
- `total`: 3
- `totalBeforeLimit`: 619
- `cached`: true
- Sample row: `2N3904` transistor (Farnell, stock=5510, min_price_rub=2)

**Result**: ✅ PASS — Returns 619 items from cache, limit works

---

## ✅ Test 3: Text Search Filter (q=transistor)

**Request**:
```bash
curl "http://127.0.0.1:9201/api/vitrine/list?q=transistor&limit=2"
```

**Response** (`smoke-vitrine-filter-q.json`):
- `total`: 2
- `totalBeforeLimit`: 126
- Filters: `q=transistor`, `limit=2`

**Result**: ✅ PASS — Text search matches 126 items in title/description/mpn/manufacturer

---

## ✅ Test 4: In-Stock Filter (in_stock=1)

**Request**:
```bash
curl "http://127.0.0.1:9201/api/vitrine/list?in_stock=1&limit=5"
```

**Response** (`smoke-vitrine-filter-stock.json`):
- `total`: 5
- `totalBeforeLimit`: 445
- Filters: `inStock=true`

**Result**: ✅ PASS — 445 items with stock > 0

---

## ✅ Test 5: Price Range Filter + Sort (price_min=1, price_max=5, sort=price_asc)

**Request**:
```bash
curl "http://127.0.0.1:9201/api/vitrine/list?price_min=1&price_max=5&limit=5&sort=price_asc"
```

**Response** (`smoke-vitrine-filter-price.json`):
- `total`: 5
- `totalBeforeLimit`: 154
- Filters: `priceMin=1`, `priceMax=5`, `sort=price_asc`
- First item price: 1 RUB

**Result**: ✅ PASS — 154 items in 1-5 RUB range, sorted ascending

---

## Summary

| Test | Endpoint | Result |
|------|----------|--------|
| 1 | GET /sections | ✅ PASS (1 section, 619 items) |
| 2 | GET /list (no filters) | ✅ PASS (619 total, limit works) |
| 3 | GET /list?q=transistor | ✅ PASS (126 matches) |
| 4 | GET /list?in_stock=1 | ✅ PASS (445 in-stock items) |
| 5 | GET /list?price_min=1&price_max=5&sort=price_asc | ✅ PASS (154 items, sorted) |

**All 5 tests PASSING** ✅

---

## Code Changes

**Created**:
- `api/vitrine.mjs` — Cache-only vitrine API (175 lines)

**Modified**:
- `server.js` — Added vitrine route mounting (2 lines)

**Fixes Applied**:
1. Text search now checks `title`, `description`, `description_short` fields
2. Price filter/sort uses `min_price_rub` (not `price_rub`)

---

## Next Steps

**Block 3**: Add FTS5 table for bm25 relevance ranking (currently using substring match)
**Block 4**: Implement RU→EN transliteration for Cyrillic queries
**Block 5**: Build empty-state diagnostics UX
