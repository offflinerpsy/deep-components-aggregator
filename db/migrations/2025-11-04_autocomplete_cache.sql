-- Migration: 2025-11-04_autocomplete_cache
-- Purpose: Cache autocomplete suggestions to reduce API calls and improve response time
-- TTL: 3600 seconds (1 hour) for popular queries

CREATE TABLE IF NOT EXISTS autocomplete_cache (
  query TEXT PRIMARY KEY,        -- Normalized query (same as used in orchestrator)
  results TEXT NOT NULL,         -- JSON array of SuggestRow[] with mpn, title, manufacturer, source
  created_at INTEGER NOT NULL,   -- Unix timestamp (milliseconds)
  ttl INTEGER NOT NULL DEFAULT 3600  -- Time-to-live in seconds (default 1 hour)
);

-- Index for cleanup of expired entries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_autocomplete_cache_expiry 
ON autocomplete_cache(created_at);

-- Verify table created
SELECT 'autocomplete_cache table created successfully' AS status;
