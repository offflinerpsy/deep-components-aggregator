-- Migration: Orders and Settings Tables
-- Date: 2025-10-02
-- Description: Creates orders table for customer orders and settings table for pricing policy

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  -- Customer information
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL, -- JSON: { email?, phone?, telegram? }
  
  -- Item information
  mpn TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK(qty >= 1),
  
  -- Pricing snapshot at order time
  pricing_snapshot TEXT NOT NULL, -- JSON: { base_price_rub, markup_percent, markup_fixed_rub, final_price_rub }
  
  -- Dealer links for quick access
  dealer_links TEXT, -- JSON: [{ dealer, url }]
  
  -- Order status with constraint
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'cancelled')),
  
  -- Optional metadata
  meta TEXT -- JSON: { comment? }
);

-- Create index on created_at for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Create index on mpn for searching by part number
CREATE INDEX IF NOT EXISTS idx_orders_mpn ON orders(mpn);

-- Create settings table for global configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON value
  updated_at INTEGER NOT NULL
);

-- Insert default pricing policy
INSERT OR IGNORE INTO settings (key, value, updated_at) 
VALUES (
  'pricing_policy',
  '{"markup_percent": 0.30, "markup_fixed_rub": 500}',
  strftime('%s', 'now') * 1000
);

-- Verify tables created
SELECT 'Migration completed successfully' AS status;
