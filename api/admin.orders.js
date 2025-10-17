// api/admin.orders.js
// Admin endpoints for order management
// Protected by requireAdmin middleware (role-based access control)

import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { updateOrdersByStatusGauge } from '../metrics/registry.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { createOrderNotification } from '../src/utils/notifications.js';
import { dispatchNotification } from '../src/notifications/dispatcher.js';

// Initialize AJV
const ajv = new Ajv({ allErrors: true, strict: true });

// Load and compile update schema
const orderUpdateSchema = JSON.parse(
  readFileSync(new URL('../schemas/order.update.schema.json', import.meta.url), 'utf8')
);
const validateOrderUpdate = ajv.compile(orderUpdateSchema);

/**
 * GET /api/admin/orders - List orders with filters
 * Query params:
 * - status: Filter by status (pending|processing|completed|cancelled)
 * - q: Search by MPN or manufacturer
 * - from: Start date (timestamp)
 * - to: End date (timestamp)
 * - limit: Page size (default 50)
 * - offset: Pagination offset (default 0)
 */
export function listOrdersHandler(db, logger) {
  return async (req, res) => {
    const {
      status,
      q,
      from,
      to,
      limit = 50,
      offset = 0
    } = req.query;

    // Build query
    let sql = `
      SELECT
        id, created_at, updated_at,
        customer_name,
        mpn, manufacturer, qty,
        pricing_snapshot,
        status,
        order_code
      FROM orders
      WHERE 1=1
    `;
    const params = [];

    // Apply filters
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (q) {
      sql += ' AND (mpn LIKE ? OR manufacturer LIKE ? OR customer_name LIKE ?)';
      const searchPattern = `%${q}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (from) {
      sql += ' AND created_at >= ?';
      params.push(parseInt(from));
    }

    if (to) {
      sql += ' AND created_at <= ?';
      params.push(parseInt(to));
    }

    // Order by created_at DESC
    sql += ' ORDER BY created_at DESC';

    // Pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    // Execute query
    const orders = db.prepare(sql).all(...params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const countParams = [];

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    if (q) {
      countSql += ' AND (mpn LIKE ? OR manufacturer LIKE ? OR customer_name LIKE ?)';
      const searchPattern = `%${q}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (from) {
      countSql += ' AND created_at >= ?';
      countParams.push(parseInt(from));
    }

    if (to) {
      countSql += ' AND created_at <= ?';
      countParams.push(parseInt(to));
    }

    const { total } = db.prepare(countSql).get(...countParams);

    // Parse JSON fields
    const parsedOrders = orders.map(order => ({
      ...order,
      pricing_snapshot: JSON.parse(order.pricing_snapshot)
    }));

    logger.info({
      filters: { status, q, from, to },
      count: parsedOrders.length,
      total
    }, 'Admin orders list requested');

    res.json({
      ok: true,
      orders: parsedOrders,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parsedOrders.length < total
      }
    });
  };
}

/**
 * GET /api/admin/orders/:id - Get order details
 */
export function getOrderHandler(db, logger) {
  return async (req, res) => {
    const { id } = req.params;

    // Guard: Validate ID format (UUID)
    if (!id || id.length !== 36) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_id',
        message: 'Order ID must be a valid UUID'
      });
    }

    // Fetch full order
    const order = db.prepare(`
      SELECT * FROM orders WHERE id = ?
    `).get(id);

    // Guard: Order not found
    if (!order) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Order not found'
      });
    }

    // Parse JSON fields
    const parsedOrder = {
      ...order,
      customer_contact: JSON.parse(order.customer_contact),
      pricing_snapshot: JSON.parse(order.pricing_snapshot),
      dealer_links: JSON.parse(order.dealer_links),
      meta: order.meta ? JSON.parse(order.meta) : null
    };

    logger.info({ orderId: id }, 'Admin order details requested');

    res.json({
      ok: true,
      order: parsedOrder
    });
  };
}

/**
 * PATCH /api/admin/orders/:id - Update order status
 * Body: { status: "pending"|"processing"|"completed"|"cancelled" }
 */
export function updateOrderHandler(db, logger) {
  return async (req, res) => {
    const { id } = req.params;

    // Guard: Validate ID format
    if (!id || id.length !== 36) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_id',
        message: 'Order ID must be a valid UUID'
      });
    }

    // Guard: Validate request body
  const valid = validateOrderUpdate(req.body);
    if (!valid) {
      logger.warn({ orderId: id, errors: validateOrderUpdate.errors }, 'Order update validation failed');

      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        errors: validateOrderUpdate.errors.map(err => ({
          field: err.instancePath || 'status',
          message: err.message,
          params: err.params
        }))
      });
    }

  const { status, comment } = req.body;

    // Guard: Check order exists
    const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Order not found'
      });
    }

    // Update order status
    const now = Date.now();
    const updateStmt = db.prepare(`
      UPDATE orders
      SET status = ?, updated_at = ?, status_comment = ?, status_history = ?
      WHERE id = ?
    `);

    // Build new history entry
    const nowIso = new Date(now).toISOString();
    const current = db.prepare('SELECT status_history, customer_email, customer_contact, order_code FROM orders WHERE id = ?').get(id);
    const historyArr = Array.isArray(current?.status_history) ? current.status_history : (() => {
      try { return current?.status_history ? JSON.parse(current.status_history) : []; } catch { return []; }
    })();
    const entry = { ts: nowIso, status, comment: comment || null, admin_id: req.user?.id || null };
    const newHistory = JSON.stringify([ ...historyArr, entry ]);

    const updateTransaction = db.transaction(() => {
      updateStmt.run(status, now, (comment || null), newHistory, id);
    });

    updateTransaction();

    // Update metrics gauge
    updateOrdersByStatusGauge(db);

    logger.info({
      orderId: id,
      oldStatus: order.status,
      newStatus: status
    }, 'Order status updated');

    // Create notification for order status change
    try {
      const statusLabels = {
        pending: 'Новый',
        processing: 'В обработке',
        completed: 'Завершён',
        cancelled: 'Отменён'
      };

      const statusLabel = statusLabels[status] || status;
      const title = `Заказ ${current?.order_code || id}: ${statusLabel}`;
      let message = `Статус заказа изменён на "${statusLabel}"`;
      if (comment) {
        message += `\nКомментарий: ${comment}`;
      }

      // Create in-app notification
      const dbNotification = await createOrderNotification({
        orderId: id,
        orderCode: current?.order_code || id,
        title,
        message,
        priority: status === 'cancelled' ? 'high' : 'normal'
      });

      // Dispatch notification to configured channels
      await dispatchNotification({
        title,
        message,
        type: 'order',
        payload: {
          orderId: id,
          orderCode: current?.order_code || id,
          status,
          previousStatus: order.status,
          comment: comment || null
        },
        priority: status === 'cancelled' ? 'high' : 'normal'
      }, {
        storeInDb: false, // Already stored above
        channelOptions: {
          email: {
            to: current?.customer_email // Send to customer if available
          }
        }
      });
    } catch (notifyError) {
      logger.warn({ err: notifyError }, 'Failed to create order notification');
    }

    // Notify customer via email if we have email (promise-based, no try/catch)
    const customerEmail = current?.customer_email || null;
    if (customerEmail) {
      const subject = `Статус заказа ${current?.order_code || ''}: ${status}`.trim();
      const lines = [
        `Ваш заказ ${current?.order_code || id} обновлён: ${status}`,
        comment ? `Комментарий: ${comment}` : null
      ].filter(Boolean);
      const html = `<p>${lines.join('<br/>')}</p>`;
      const text = lines.join('\n');
      import('../src/lib/mailer.mjs')
        .then(({ sendMail }) => sendMail({ to: customerEmail, subject, html, text }))
        .then((r) => { if (!r || !r.ok) { logger && logger.warn && logger.warn({ email: customerEmail, status: r?.status }, 'Email notify failed'); } })
        .catch((err) => { logger && logger.warn && logger.warn({ err: err && err.message ? err.message : String(err) }, 'Email notify error'); });
    }

    res.json({ ok: true, orderId: id, status, updated_at: now, comment: comment || null });
  };
}

/**
 * Mount admin routes to Express app
 * @param {Object} app - Express app instance
 * @param {Object} db - SQLite database instance
 * @param {Object} logger - Pino logger instance
 */
export function mountAdminRoutes(app, db, logger) {
  // Apply requireAdmin middleware to ALL admin routes
  app.get('/api/admin/orders', requireAdmin, listOrdersHandler(db, logger));
  app.get('/api/admin/orders/:id', requireAdmin, getOrderHandler(db, logger));
  app.patch('/api/admin/orders/:id', requireAdmin, updateOrderHandler(db, logger));
}

export default {
  listOrdersHandler,
  getOrderHandler,
  updateOrderHandler,
  mountAdminRoutes
};
