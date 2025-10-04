-- Migration: Add user roles for RBAC
-- Date: 2025-10-03
-- Description: Adds role column to users table for admin/user access control

-- Add role column (default: 'user', admin must be set manually)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' 
  CHECK(role IN ('user', 'admin'));

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Verification
SELECT 'Migration completed: role column added' AS status;

-- Show user count by role
SELECT role, COUNT(*) as count FROM users GROUP BY role;
