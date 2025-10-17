-- Migration: Order short code and admin notifications
-- Date: 2025-10-15

-- 1) Add order_code column to orders (short, human-friendly display code)
ALTER TABLE orders ADD COLUMN order_code TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);

-- 2) Admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  type TEXT NOT NULL, -- e.g., 'order_created'
  payload TEXT NOT NULL, -- JSON
  read_at INTEGER -- NULL if unread
);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read_at);

-- 3) Defaults for notification settings (if settings table exists)
INSERT OR IGNORE INTO settings (key, value, updated_at)
VALUES ('notifications', '{"admin_notify_email": null, "telegram_bot_token": null, "telegram_chat_id": null}', strftime('%s','now')*1000);

SELECT 'Migration completed: orders.order_code + admin_notifications' AS status;
