# R5 Block 1: FTS5 Reconnaissance Summary

**Date**: 2025-10-09  
**Branch**: `ops/r5-fts-ru-empty-metrics-pins`

---

## Current FTS5 Configuration (from R4)

### Schema
```sql
CREATE VIRTUAL TABLE search_rows_fts USING fts5(
  q UNINDEXED,
  ord UNINDEXED,
  mpn,
  manufacturer,
  title,
  description,
  content='',
  tokenize='porter unicode61'
)
```

### Key Findings

✅ **FTS5 enabled**: SQLite compiled with ENABLE_FTS5  
✅ **619 rows indexed**: Matches search_rows table  
❌ **Contentless mode** (`content=''`): Requires manual sync, UNINDEXED columns return NULL in SELECT  
❌ **No tokenchars config**: Default unicode61 doesn't preserve `-._` in MPNs (breaks `1N4148`, `SOT-223`)  
❌ **No prefix index**: No fast prefix search for MPN autocomplete  
❌ **Porter stemming**: Aggressive (breaks technical terms), unicode61 alone better for electronics

### `search_rows` Table Schema
- Columns: `q TEXT, ord INTEGER, row TEXT`
- PRIMARY KEY: `(q, ord)`
- Implicit `rowid`: Available for content-table JOIN

---

## Migration Plan (Block 2)

**Target Schema**:
```sql
CREATE VIRTUAL TABLE search_rows_fts USING fts5(
  mpn, manufacturer, title, description,
  content='search_rows',
  content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2 tokenchars '-._'",
  prefix='2 3 4'
);
```

**Why This Config**:
1. **content='search_rows'**: Auto-sync via triggers, JOIN by rowid
2. **tokenchars '-._'**: Preserve MPN structure (`1N4148`, `STM32F4`, `SOT-223`)
3. **remove_diacritics 2**: Normalize accented chars (café → cafe)
4. **prefix='2 3 4'**: Fast 2/3/4-char prefix search for autocomplete
5. **No porter**: Electronics terms need exact matching, not stemming

**Required Triggers**:
- `AFTER INSERT` → Insert into FTS5
- `AFTER DELETE` → Delete from FTS5
- `AFTER UPDATE` → Delete old + Insert new

**Extraction from `row` JSON**:
- Current `search_rows.row` is JSON blob
- Need to extract `mpn`, `manufacturer`, `title`, `description` in triggers
- Use SQLite JSON functions: `json_extract(row, '$.mpn')`

---

## Artifacts
- `fts-schema.sql` — Current FTS5 schema
- `fts-compile.txt` — SQLite compile options (FTS5 enabled)
- `fts-count-before.txt` — 619 rows indexed
- `search-rows-schema.txt` — Base table schema (q, ord, row)
- This summary: `reconnaissance-summary.md`

---

## Next Steps (Block 2)

1. Drop existing `search_rows_fts` table
2. Create new FTS5 with content-table config
3. Create 3 triggers (INSERT/DELETE/UPDATE) with JSON extraction
4. Backfill from existing `search_rows` data
5. Verify count matches (619 rows)
