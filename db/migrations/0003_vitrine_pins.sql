-- Migration: 0003_vitrine_pins.sql
-- Create vitrine_pins table for admin-pinned products
-- Pinned products appear at the top of vitrine list (priority sorting)

BEGIN TRANSACTION;

-- Create vitrine_pins table
CREATE TABLE IF NOT EXISTS vitrine_pins (
  rowid INTEGER PRIMARY KEY,
  pinned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  pinned_by TEXT,
  notes TEXT
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_vitrine_pins_pinned_at ON vitrine_pins(pinned_at DESC);

COMMIT;
