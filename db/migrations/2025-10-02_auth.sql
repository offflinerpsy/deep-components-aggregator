-- Migration: Authentication & User Management
-- Date: 2025-10-02
-- Description: Creates users table for authentication (email+password and OAuth), 
--              sessions table for express-session SQLite store,
--              adds user_id FK to orders table

-- ==================== USERS TABLE ====================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  -- Email (required for local, optional for OAuth)
  email TEXT,
  
  -- Password hash (Argon2id) - required for local users, NULL for OAuth
  password_hash TEXT,
  
  -- OAuth provider info (NULL for local users)
  provider TEXT CHECK(provider IS NULL OR provider IN ('google', 'yandex')),
  provider_id TEXT, -- sub/ident from OAuth provider
  
  -- Optional display name
  name TEXT,
  
  -- Constraints
  -- Local user: must have email, password_hash, no provider
  -- OAuth user: must have provider, provider_id, email is optional
  CHECK(
    (provider IS NULL AND password_hash IS NOT NULL AND email IS NOT NULL) OR
    (provider IS NOT NULL AND provider_id IS NOT NULL)
  )
);

-- Unique email only for local users (OAuth can have duplicate/null emails)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique 
  ON users(email) WHERE provider IS NULL;

-- Unique provider+provider_id pair for OAuth users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_unique
  ON users(provider, provider_id) WHERE provider IS NOT NULL;

-- Index on email for login lookups (only for local users)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE provider IS NULL;

-- Index for OAuth provider lookups
CREATE INDEX IF NOT EXISTS idx_users_provider_provider_id ON users(provider, provider_id) WHERE provider IS NOT NULL;

-- ==================== SESSIONS TABLE ====================

-- Session store for express-session + connect-sqlite3
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired INTEGER NOT NULL
);

-- Index for session cleanup/expiration queries
CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);

-- ==================== ORDERS TABLE UPDATE ====================

-- Add user_id foreign key to existing orders table
-- Using PRAGMA foreign_keys to ensure FK constraint is enforced

-- First, check if column already exists (idempotent migration)
-- If orders table doesn't have user_id, we need to recreate it with FK

-- Step 1: Create new orders table with user_id and FK
CREATE TABLE IF NOT EXISTS orders_new (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  -- User relationship (nullable for backward compatibility)
  user_id TEXT,
  
  -- Customer information (kept for anonymous orders or additional data)
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  
  -- Item information
  mpn TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK(qty >= 1),
  
  -- Pricing snapshot at order time
  pricing_snapshot TEXT NOT NULL,
  
  -- Dealer links for quick access
  dealer_links TEXT,
  
  -- Order status (matching UI expectations: pending, processing, completed, cancelled)
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'cancelled')),
  
  -- Optional metadata
  meta TEXT,
  
  -- Foreign key to users
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Step 2: Copy existing orders data to new table with status mapping
-- Map old statuses: new->pending, in_progress->processing, done->completed
INSERT OR IGNORE INTO orders_new 
  (id, created_at, updated_at, user_id, customer_name, customer_contact, 
   mpn, manufacturer, qty, pricing_snapshot, dealer_links, status, meta)
SELECT 
  id, created_at, updated_at, 
  NULL as user_id, -- existing orders have no user
  customer_name, customer_contact,
  mpn, manufacturer, qty, pricing_snapshot, dealer_links, 
  CASE status
    WHEN 'new' THEN 'pending'
    WHEN 'in_progress' THEN 'processing'
    WHEN 'done' THEN 'completed'
    ELSE status -- 'cancelled' stays same
  END as status,
  meta
FROM orders;

-- Step 3: Drop old table and rename new one
DROP TABLE IF EXISTS orders;
ALTER TABLE orders_new RENAME TO orders;

-- Step 4: Recreate indexes on orders table
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_mpn ON orders(mpn);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- ==================== VERIFICATION ====================

-- Enable foreign key enforcement
PRAGMA foreign_keys = ON;

-- Verify tables created
SELECT 'Migration completed: auth tables created' AS status;

-- Show table counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'sessions' as table_name, COUNT(*) as count FROM sessions
UNION ALL
SELECT 'orders' as table_name, COUNT(*) as count FROM orders;
