// api/admin.orders.js
// Admin endpoints for order management
// Protected by requireAdmin middleware (role-based access control)

import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { updateOrdersByStatusGauge } from '../metrics/registry.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

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
        status
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
    
    const { status } = req.body;
    
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
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);
    
    const updateTransaction = db.transaction(() => {
      updateStmt.run(status, now, id);
    });
    
    updateTransaction();
    
    // Update metrics gauge
    updateOrdersByStatusGauge(db);
    
    logger.info({
      orderId: id,
      oldStatus: order.status,
      newStatus: status
    }, 'Order status updated');
    
    res.json({
      ok: true,
      orderId: id,
      status,
      updated_at: now
    });
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
