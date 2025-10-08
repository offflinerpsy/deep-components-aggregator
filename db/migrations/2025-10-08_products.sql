-- 2025-10-08: Products table for admin-managed product catalog
-- Used for storing curated product data (e.g., featured items, manual overrides)

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Core product identity
  mpn TEXT NOT NULL,                    -- Manufacturer Part Number
  manufacturer TEXT NOT NULL,
  category TEXT,                        -- e.g., "Resistors", "ICs", "Capacitors"
  
  -- Descriptive fields
  title TEXT NOT NULL,
  description_short TEXT,
  description_long TEXT,
  
  -- Pricing (RUB - converted from provider data)
  price_rub REAL,                       -- Single price or minimum price
  price_breaks TEXT,                    -- JSON array: [{"qty":1,"price":100},...]
  
  -- Stock & availability
  stock INTEGER DEFAULT 0,
  min_order_qty INTEGER DEFAULT 1,
  packaging TEXT,                       -- "Tube", "Reel", "Cut Tape"
  
  -- Media
  image_url TEXT,
  datasheet_url TEXT,
  
  -- Provider info (ADMIN ONLY - never shown in UI)
  provider TEXT,                        -- "mouser", "digikey", "tme", "farnell"
  provider_url TEXT,                    -- Direct link to provider page
  provider_sku TEXT,                    -- Provider's internal SKU
  
  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,                      -- User email who created this
  
  -- Flags
  is_featured BOOLEAN DEFAULT 0,        -- Show in featured products
  is_active BOOLEAN DEFAULT 1,          -- Show in search results
  
  -- Constraints
  UNIQUE(mpn, manufacturer)             -- One entry per MPN+manufacturer combo
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_products_mpn ON products(mpn);
CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON products(manufacturer);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Full-text search (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  mpn,
  manufacturer,
  title,
  description_short,
  content=products,
  content_rowid=id
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS products_fts_insert AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, mpn, manufacturer, title, description_short)
  VALUES (new.id, new.mpn, new.manufacturer, new.title, new.description_short);
END;

CREATE TRIGGER IF NOT EXISTS products_fts_update AFTER UPDATE ON products BEGIN
  UPDATE products_fts 
  SET mpn = new.mpn,
      manufacturer = new.manufacturer,
      title = new.title,
      description_short = new.description_short
  WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS products_fts_delete AFTER DELETE ON products BEGIN
  DELETE FROM products_fts WHERE rowid = old.id;
END;

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS products_updated_at AFTER UPDATE ON products BEGIN
  UPDATE products SET updated_at = datetime('now') WHERE id = NEW.id;
END;
