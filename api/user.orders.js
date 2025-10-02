// api/user.orders.js
// User-specific order endpoints
// - GET /api/user/orders - List user's orders
// - GET /api/user/orders/:id - Get order details (with ownership check)

/**
 * Middleware: Require authentication
 * Guard against unauthenticated access
 */
export function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      ok: false,
      error: 'not_authenticated',
      message: 'Authentication required'
    });
  }
  
  next();
}

/**
 * GET /api/user/orders
 * List orders for the authenticated user
 * 
 * Query parameters:
 * - status: Filter by status (pending|processing|completed|cancelled)
 * - limit: Page size (default 50)
 * - offset: Pagination offset (default 0)
 */
export function listUserOrdersHandler(db, logger) {
  return async (req, res) => {
    const userId = req.user.id;
    const {
      status,
      limit = 50,
      offset = 0
    } = req.query;
    
    // Build query
    let sql = `
      SELECT 
        id, created_at, updated_at,
        mpn, manufacturer, qty,
        pricing_snapshot,
        dealer_links,
        status
      FROM orders
      WHERE user_id = ?
    `;
    const params = [userId];
    
    // Apply status filter
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    // Order by created_at DESC
    sql += ' ORDER BY created_at DESC';
    
    // Pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    // Execute query
    const orders = db.prepare(sql).all(...params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
    const countParams = [userId];
    
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    
    const { total } = db.prepare(countSql).get(...countParams);
    
    // Parse JSON fields
    const parsedOrders = orders.map(order => ({
      ...order,
      pricing_snapshot: JSON.parse(order.pricing_snapshot),
      dealer_links: order.dealer_links ? JSON.parse(order.dealer_links) : []
    }));
    
    logger.info({
      userId,
      filters: { status },
      count: parsedOrders.length,
      total
    }, 'User orders list requested');
    
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
 * GET /api/user/orders/:id
 * Get full order details with ownership check
 */
export function getUserOrderHandler(db, logger) {
  return async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Guard: Validate ID format (UUID)
    if (!id || id.length !== 36) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_id',
        message: 'Order ID must be a valid UUID'
      });
    }
    
    // Fetch order with ownership check
    const order = db.prepare(`
      SELECT * FROM orders 
      WHERE id = ? AND user_id = ?
    `).get(id, userId);
    
    // Guard: Order not found or not owned by user
    if (!order) {
      logger.warn({ userId, orderId: id }, 'User order access denied or not found');
      
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
      dealer_links: order.dealer_links ? JSON.parse(order.dealer_links) : [],
      meta: order.meta ? JSON.parse(order.meta) : null
    };
    
    logger.info({ userId, orderId: id }, 'User order details requested');
    
    res.json({
      ok: true,
      order: parsedOrder
    });
  };
}

/**
 * Mount user order routes to Express app
 * @param {Object} app - Express app instance
 * @param {Object} db - SQLite database instance
 * @param {Object} logger - Pino logger instance
 */
export function mountUserOrderRoutes(app, db, logger) {
  // Apply auth middleware to all user order routes
  app.get('/api/user/orders', requireAuth, listUserOrdersHandler(db, logger));
  app.get('/api/user/orders/:id', requireAuth, getUserOrderHandler(db, logger));
}

export default {
  requireAuth,
  listUserOrdersHandler,
  getUserOrderHandler,
  mountUserOrderRoutes
};
