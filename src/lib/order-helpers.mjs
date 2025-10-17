import { randomUUID, randomBytes } from 'node:crypto';
import { queueTemplatedMail } from './mail-queue.mjs';
// Correct path to root-level config (src/lib -> ../../config)
import { hashPassword } from '../../config/passport.mjs';

export async function handleNewUser(db, email, password, name, logger) {
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Create user
  const now = Date.now();
  const userId = randomUUID();
  
  const tx = db.transaction(() => {
    // Insert user
    db.prepare(`
      INSERT INTO users (id, created_at, updated_at, email, password_hash, name, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(userId, now, now, email, passwordHash, name);

    // Generate verification token
    const token = randomBytes(32).toString('hex');
    const ttlMs = 24 * 60 * 60 * 1000; // 24 hours
    
    db.prepare(`
      INSERT INTO email_verification_tokens (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), userId, token, now + ttlMs);

    return { userId, token };
  });

  const result = tx();
  const token = result.token;
  
  logger.info({ userId }, 'Created new user during order');
  
  return { userId, token };
}

export async function linkGuestOrders(db, userId, email, logger) {
  // Find all guest orders with this email
  const orders = db.prepare(`
    SELECT id 
    FROM orders 
    WHERE customer_email = ? 
    AND user_id IS NULL
  `).all(email);

  if (orders.length === 0) {
    return 0;
  }

  // Link orders to user
  const now = Date.now();
  
  const tx = db.transaction(() => {
    for (const order of orders) {
      // Create link record
      db.prepare(`
        INSERT INTO order_links (id, order_id, user_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(randomUUID(), order.id, userId, now);

      // Update order
      db.prepare(`
        UPDATE orders 
        SET user_id = ?, updated_at = ?
        WHERE id = ?
      `).run(userId, now, order.id);
    }
  });

  tx();
  
  logger.info({ userId, count: orders.length }, 'Linked guest orders to user');
  
  return orders.length;
}

export async function sendOrderEmail(db, order, type, verifyToken = null) {
  const { customer, item, pricing_snapshot: pricing } = order;
  const baseUrl = process.env.BASE_URL || 'http://localhost:9201';
  
  const commonData = {
    orderId: order.id.slice(-8),
    customerName: customer.name,
    orderDate: new Date(order.created_at).toLocaleDateString('ru-RU'),
    mpn: item.mpn,
    manufacturer: item.manufacturer,
    quantity: item.qty,
    pricePerUnit: Math.round(pricing.final_price_rub / item.qty).toFixed(2),
    totalAmount: pricing.final_price_rub.toFixed(2),
    status: 'В обработке',
    baseUrl,
    customerEmail: customer.contact.email,
    supportEmail: 'zapros@prosnab.tech',
    supportPhone: '+7 (495) 123-45-67'
  };

  switch (type) {
    case 'guest': {
      const params = {
        to: customer.contact.email,
        subject: `Заказ №${order.id.slice(-8)} оформлен - Deep Components`,
        templateName: 'order-confirmation-guest',
        data: commonData
      };
      // Enqueue but return params for testability
      queueTemplatedMail(params);
      return params;
    }

    case 'new-user': {
      if (!verifyToken) return { error: 'verify_token_required' };
      const params = {
        to: customer.contact.email,
        subject: `Заказ оформлен - Подтвердите email - Deep Components`,
        templateName: 'order-confirmation-new-user',
        data: {
          ...commonData,
          verifyUrl: `${baseUrl}/auth/verify?token=${verifyToken}`
        }
      };
      queueTemplatedMail(params);
      return params;
    }

    case 'existing': {
      const params = {
        to: customer.contact.email,
        subject: `Заказ №${order.id.slice(-8)} оформлен - Deep Components`,
        templateName: 'order-confirmation-existing',
        data: commonData
      };
      queueTemplatedMail(params);
      return params;
    }

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}