CREATE TABLE searches(
      q TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      total INTEGER NOT NULL,
      source TEXT NOT NULL
    );
CREATE TABLE search_rows(
      q TEXT NOT NULL,
      ord INTEGER NOT NULL,
      row TEXT NOT NULL,
      PRIMARY KEY(q,ord)
    );
CREATE TABLE products(
      src TEXT NOT NULL,
      id  TEXT NOT NULL,
      ts  INTEGER NOT NULL,
      product TEXT NOT NULL,
      PRIMARY KEY(src,id)
    );
CREATE INDEX idx_search_ts ON searches(ts);
CREATE TABLE product_cache(
      src TEXT NOT NULL,
      id  TEXT NOT NULL,
      ts  INTEGER NOT NULL,
      product TEXT NOT NULL,
      PRIMARY KEY(src,id)
    );
CREATE TABLE users (
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
CREATE UNIQUE INDEX idx_users_email_unique 
  ON users(email) WHERE provider IS NULL;
CREATE UNIQUE INDEX idx_users_provider_unique
  ON users(provider, provider_id) WHERE provider IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE provider IS NULL;
CREATE INDEX idx_users_provider_provider_id ON users(provider, provider_id) WHERE provider IS NOT NULL;
CREATE TABLE sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired INTEGER NOT NULL
);
CREATE INDEX idx_sessions_expired ON sessions(expired);
CREATE TABLE IF NOT EXISTS "orders" (
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
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON value
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_mpn ON orders(mpn);
CREATE INDEX idx_orders_user_id ON orders(user_id);
