-- Migration: add status_comment/status_history to orders, email verification tables
-- Date: 2025-10-14

BEGIN TRANSACTION;

-- Orders: status_comment and status_history (JSON string)
ALTER TABLE orders ADD COLUMN status_comment TEXT NULL;
ALTER TABLE orders ADD COLUMN status_history TEXT NULL; -- JSON array of {ts,status,comment,admin_id}

-- Users: email_verified flag
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,           -- uuid
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,   -- ms epoch
  used_at INTEGER NULL
);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_verification_tokens(token);

COMMIT;
