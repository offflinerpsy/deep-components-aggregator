import test from 'ava';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { handleNewUser, linkGuestOrders, sendOrderEmail } from '../src/lib/order-helpers.mjs';

// Setup test database
function setupTestDb() {
  const db = new Database(':memory:');
  
  // Create tables
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      email_verified INTEGER DEFAULT 0
    );

    CREATE TABLE email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE orders (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      user_id TEXT,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_contact TEXT NOT NULL,
      mpn TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      qty INTEGER NOT NULL,
      pricing_snapshot TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE order_links (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  return db;
}

// Mock logger
const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {}
};

test('handleNewUser creates user and verification token', async t => {
  const db = setupTestDb();
  const email = 'test@example.com';
  const password = 'Test123!';
  const name = 'Test User';

  const { userId, token } = await handleNewUser(db, email, password, name, mockLogger);

  // Check user was created
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  t.is(user.email, email);
  t.is(user.name, name);
  t.is(user.email_verified, 0);

  // Check token was created
  const verifyToken = db.prepare('SELECT * FROM email_verification_tokens WHERE user_id = ?').get(userId);
  t.is(verifyToken.token, token);
  t.true(verifyToken.expires_at > Date.now());
});

test('linkGuestOrders links orders to user', async t => {
  const db = setupTestDb();
  
  // Create test user
  const userId = randomUUID();
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO users (id, created_at, updated_at, email, name)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, now, now, 'test@example.com', 'Test User');

  // Create some guest orders
  const orders = [
    { id: randomUUID(), email: 'test@example.com' },
    { id: randomUUID(), email: 'test@example.com' },
    { id: randomUUID(), email: 'other@example.com' }
  ];

  for (const order of orders) {
    db.prepare(`
      INSERT INTO orders (
        id, created_at, updated_at,
        customer_name, customer_email, customer_contact,
        mpn, manufacturer, qty,
        pricing_snapshot, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order.id,
      now,
      now,
      'Test Customer',
      order.email,
      '{"email":"' + order.email + '"}',
      'TEST123',
      'Test Corp',
      1,
      '{"final_price_rub":100}',
      'pending'
    );
  }

  // Link orders
  const linkedCount = await linkGuestOrders(db, userId, 'test@example.com', mockLogger);
  t.is(linkedCount, 2);

  // Check orders were linked
  const linkedOrders = db.prepare('SELECT * FROM orders WHERE user_id = ?').all(userId);
  t.is(linkedOrders.length, 2);

  // Check links were created
  const orderLinks = db.prepare('SELECT * FROM order_links WHERE user_id = ?').all(userId);
  t.is(orderLinks.length, 2);
});

test('sendOrderEmail queues correct template', async t => {
  const db = setupTestDb();
  
  const order = {
    id: randomUUID(),
    created_at: Date.now(),
    customer: {
      name: 'Test Customer',
      contact: {
        email: 'test@example.com'
      }
    },
    item: {
      mpn: 'TEST123',
      manufacturer: 'Test Corp',
      qty: 2
    },
    pricing_snapshot: {
      final_price_rub: 200
    }
  };

  // Test guest email
  const guestEmail = await sendOrderEmail(db, order, 'guest');
  t.is(guestEmail.templateName, 'order-confirmation-guest');

  // Test new user email
  const newUserEmail = await sendOrderEmail(db, order, 'new-user', 'test-token');
  t.is(newUserEmail.templateName, 'order-confirmation-new-user');
  t.true(newUserEmail.data.verifyUrl.includes('test-token'));

  // Test existing user email
  const existingEmail = await sendOrderEmail(db, order, 'existing');
  t.is(existingEmail.templateName, 'order-confirmation-existing');
});