-- Migration: Add 'local' and 'vkontakte' to provider CHECK constraint
-- Date: 2025-10-03
-- Description: SQLite doesn't support ALTER TABLE for CHECK constraints,
--              so we recreate users table with updated constraint

-- ==================== RECREATE USERS TABLE ====================

-- Step 1: Create new table with updated provider CHECK
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  -- Email (required for local, optional for OAuth)
  email TEXT,
  
  -- Password hash (Argon2id) - required for local users, NULL for OAuth
  password_hash TEXT,
  
  -- OAuth provider info (NULL for local users)
  provider TEXT CHECK(provider IS NULL OR provider IN ('local', 'google', 'yandex', 'vkontakte')),
  provider_id TEXT, -- sub/ident from OAuth provider
  
  -- Optional display name
  name TEXT,
  
  -- Role for RBAC (added in previous migration)
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  
  -- Constraints
  -- Local user: must have email, password_hash, provider='local'
  -- OAuth user: must have provider IN ('google','yandex','vkontakte'), provider_id, email optional
  CHECK(
    (provider = 'local' AND password_hash IS NOT NULL AND email IS NOT NULL) OR
    (provider IN ('google', 'yandex', 'vkontakte') AND provider_id IS NOT NULL) OR
    (provider IS NULL AND password_hash IS NOT NULL AND email IS NOT NULL)
  )
);

-- Step 2: Copy all existing users
INSERT INTO users_new 
  SELECT * FROM users;

-- Step 3: Drop old table
DROP TABLE users;

-- Step 4: Rename new table
ALTER TABLE users_new RENAME TO users;

-- Step 5: Recreate all indexes
CREATE UNIQUE INDEX idx_users_email_unique 
  ON users(email) WHERE provider = 'local' OR provider IS NULL;

CREATE UNIQUE INDEX idx_users_provider_unique
  ON users(provider, provider_id) WHERE provider IN ('google', 'yandex', 'vkontakte');

CREATE INDEX idx_users_email ON users(email) WHERE provider = 'local' OR provider IS NULL;

CREATE INDEX idx_users_provider_provider_id ON users(provider, provider_id) WHERE provider IN ('google', 'yandex', 'vkontakte');

CREATE INDEX idx_users_role ON users(role);

-- ==================== VERIFICATION ====================

SELECT 'Migration completed: provider constraint updated' AS status;

-- Show users by provider
SELECT provider, role, COUNT(*) as count 
FROM users 
GROUP BY provider, role;
