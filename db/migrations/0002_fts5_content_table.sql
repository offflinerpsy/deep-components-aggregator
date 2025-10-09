-- Migration: Rebuild FTS5 with content-table mode
-- Date: 2025-10-09
-- Purpose: Fix R4 contentless mode issue, add tokenchars for MPNs, enable prefix search

BEGIN;

-- Drop old contentless FTS5 table
DROP TABLE IF EXISTS search_rows_fts;

-- Create new FTS5 table with content-table mode
-- - content='search_rows': Auto-sync with base table via triggers
-- - tokenchars '-._': Preserve MPN structure (1N4148, STM32F4, SOT-223)
-- - remove_diacritics 2: Normalize accented characters
-- - prefix='2 3 4': Enable fast 2/3/4-char prefix search for autocomplete
CREATE VIRTUAL TABLE search_rows_fts USING fts5(
  mpn,
  manufacturer,
  title,
  description,
  content='search_rows',
  content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2 tokenchars '-._'",
  prefix='2 3 4'
);

-- Trigger: AFTER INSERT on search_rows
-- Extract JSON fields and insert into FTS5
CREATE TRIGGER IF NOT EXISTS search_rows_ai AFTER INSERT ON search_rows BEGIN
  INSERT INTO search_rows_fts(rowid, mpn, manufacturer, title, description)
  VALUES (
    new.rowid,
    COALESCE(json_extract(new.row, '$.mpn'), ''),
    COALESCE(json_extract(new.row, '$.manufacturer'), ''),
    COALESCE(json_extract(new.row, '$.title'), ''),
    COALESCE(json_extract(new.row, '$.description_short'), json_extract(new.row, '$.description'), '')
  );
END;

-- Trigger: AFTER DELETE on search_rows
-- Remove from FTS5 using 'delete' command
CREATE TRIGGER IF NOT EXISTS search_rows_ad AFTER DELETE ON search_rows BEGIN
  INSERT INTO search_rows_fts(search_rows_fts, rowid, mpn, manufacturer, title, description)
  VALUES(
    'delete',
    old.rowid,
    COALESCE(json_extract(old.row, '$.mpn'), ''),
    COALESCE(json_extract(old.row, '$.manufacturer'), ''),
    COALESCE(json_extract(old.row, '$.title'), ''),
    COALESCE(json_extract(old.row, '$.description_short'), json_extract(old.row, '$.description'), '')
  );
END;

-- Trigger: AFTER UPDATE on search_rows
-- Delete old + Insert new (FTS5 doesn't support UPDATE directly)
CREATE TRIGGER IF NOT EXISTS search_rows_au AFTER UPDATE ON search_rows BEGIN
  -- Delete old row
  INSERT INTO search_rows_fts(search_rows_fts, rowid, mpn, manufacturer, title, description)
  VALUES(
    'delete',
    old.rowid,
    COALESCE(json_extract(old.row, '$.mpn'), ''),
    COALESCE(json_extract(old.row, '$.manufacturer'), ''),
    COALESCE(json_extract(old.row, '$.title'), ''),
    COALESCE(json_extract(old.row, '$.description_short'), json_extract(old.row, '$.description'), '')
  );
  -- Insert new row
  INSERT INTO search_rows_fts(rowid, mpn, manufacturer, title, description)
  VALUES (
    new.rowid,
    COALESCE(json_extract(new.row, '$.mpn'), ''),
    COALESCE(json_extract(new.row, '$.manufacturer'), ''),
    COALESCE(json_extract(new.row, '$.title'), ''),
    COALESCE(json_extract(new.row, '$.description_short'), json_extract(new.row, '$.description'), '')
  );
END;

-- Backfill: Populate FTS5 from existing search_rows data
-- This inserts all existing rows using the same JSON extraction logic
INSERT INTO search_rows_fts(rowid, mpn, manufacturer, title, description)
SELECT
  rowid,
  COALESCE(json_extract(row, '$.mpn'), ''),
  COALESCE(json_extract(row, '$.manufacturer'), ''),
  COALESCE(json_extract(row, '$.title'), ''),
  COALESCE(json_extract(row, '$.description_short'), json_extract(row, '$.description'), '')
FROM search_rows;

COMMIT;
