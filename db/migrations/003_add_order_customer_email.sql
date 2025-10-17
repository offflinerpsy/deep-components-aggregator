-- Add customer_email column to orders table
ALTER TABLE orders ADD COLUMN customer_email TEXT;
CREATE INDEX idx_orders_customer_email ON orders(customer_email);

-- Update existing orders with customer_email from contact JSON
UPDATE orders 
SET customer_email = json_extract(customer_contact, '$.email')
WHERE json_extract(customer_contact, '$.email') IS NOT NULL;

-- Add order_links table for guest order linking
CREATE TABLE order_links (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);