# Orders Backend Audit — Single File (All Code & Paths)

Date: 2025-10-02
Owner: Deep Aggregator Backend
Scope: Minimal viable Orders contour with strict validation, metrics, rate-limit, and admin endpoints

---

## Executive Summary

This document consolidates everything added/changed to implement the Orders backend MVP as requested:
- Public order creation: POST /api/order with strict AJV validation and express-rate-limit
- Admin operations: list, get details, update status (behind Nginx Basic Auth)
- Prometheus metrics: counters, gauge, histogram exposed via /api/metrics
- SQLite schema and migration, plus a migration runner
- Documentation for API and Operations (Nginx, Prometheus, rate-limit env, backup)

All code is embedded below with file paths and full content. Acceptance criteria mapping is included at the end.

---

## How to Run (Windows PowerShell)

- Prerequisites: Node.js 18+, Git, SQLite3 (optional, useful for inspection), internet access for vendor APIs if used
- Apply DB migration:
  - Node runner: node scripts/apply_migration.mjs
  - Or use sqlite3 directly: sqlite3 var/db/deepagg.sqlite < db/migrations/2025-10-02_orders.sql
- Start server: node server.js
- Test health: GET http://localhost:9201/api/health
- Create order: POST http://localhost:9201/api/order (use a JSON file for -d @file to avoid PowerShell quoting issues)
- Admin list: GET http://localhost:9201/api/admin/orders (via Nginx with Basic Auth)
- Metrics: GET http://localhost:9201/api/metrics

Notes for PowerShell:
- Prefer file-based POST bodies: curl.exe -s -X POST ... -d "@test-order.json" -H "Content-Type: application/json"
- Or use Invoke-WebRequest/Invoke-RestMethod with -InFile/-Body and -ContentType application/json

---

## Architecture Overview

- Server: Node.js + Express (ES Modules)
- DB: SQLite via better-sqlite3 (sync, transactions)
- Validation: AJV + ajv-formats (strict, additionalProperties: false)
- Rate limiting: express-rate-limit (per-IP; configurable via env)
- Metrics: prom-client (orders_total, orders_by_status gauge, order_create_duration_seconds histogram, etc.)
- Auth for admin: Nginx Basic Auth at proxy layer (documented in Operations)

---

## Endpoints

Public:
- POST /api/order — Create a new order (rate-limited)

Admin (protected by Nginx Basic Auth):
- GET /api/admin/orders — List with filters (status, q, from, to, pagination)
- GET /api/admin/orders/:id — Full order details
- PATCH /api/admin/orders/:id — Update status

Platform:
- GET /api/metrics — Prometheus metrics text format
- GET /api/health — Service health and feature flags

---

## File Inventory (created/modified)

- api/order.js — Public order creation handler (AJV, DB insert, metrics)
- api/admin.orders.js — Admin list/details/status update handlers; mounts routes
- middleware/rateLimiter.js — Rate-limiter for POST /api/order and general API
- metrics/registry.js — Prometheus registry, counters, gauges, histograms; helpers
- schemas/order.request.schema.json — Strict request schema for POST /api/order
- schemas/order.update.schema.json — Strict schema for admin PATCH status
- db/migrations/2025-10-02_orders.sql — Orders + settings tables, indexes, seed pricing policy
- scripts/apply_migration.mjs — Migration runner with verification output
- docs/API.md — API reference for Orders module
- docs/OPERATIONS.md — Nginx Basic Auth, Prometheus, rate-limit env, backup
- server.js — Integrated metrics endpoint, orders API, admin routes, gauge init

---

## Code Listings (full content with paths)

### api/order.js

```javascript
// api/order.js
// POST /api/order - Create new order with validation

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ordersTotal, orderCreateDuration, updateOrdersByStatusGauge } from '../metrics/registry.js';

// Initialize AJV with formats (email, etc.)
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

// Load and compile schemas
const orderRequestSchema = JSON.parse(
  readFileSync(new URL('../schemas/order.request.schema.json', import.meta.url), 'utf8')
);
const validateOrderRequest = ajv.compile(orderRequestSchema);

/**
 * Generate dealer links for quick access to supplier websites
 * @param {string} mpn - Manufacturer Part Number
 * @param {string} manufacturer - Manufacturer name
 * @returns {Array} Array of dealer links
 */
function generateDealerLinks(mpn, manufacturer) {
  const encodedMpn = encodeURIComponent(mpn);
  const encodedMfr = encodeURIComponent(manufacturer);
  
  return [
    {
      dealer: 'mouser',
      url: `https://www.mouser.com/ProductDetail/?q=${encodedMpn}`
    },
    {
      dealer: 'digikey',
      url: `https://www.digikey.com/en/products/result?keywords=${encodedMpn}`
    },
    {
      dealer: 'tme',
      url: `https://www.tme.eu/en/katalog/?search=${encodedMpn}`
    },
    {
      dealer: 'farnell',
      url: `https://www.farnell.com/search?st=${encodedMpn}`
    }
  ];
}

/**
 * Calculate final price based on pricing policy
 * @param {number} basePrice - Base price in RUB
 * @param {Object} policy - Pricing policy { markup_percent, markup_fixed_rub }
 * @returns {Object} Calculated pricing snapshot
 */
function calculatePricing(basePrice, policy) {
  const markupPercent = policy.markup_percent || 0;
  const markupFixed = policy.markup_fixed_rub || 0;
  
  const finalPrice = Math.ceil(basePrice * (1 + markupPercent) + markupFixed);
  
  return {
    base_price_rub: basePrice,
    markup_percent: markupPercent,
    markup_fixed_rub: markupFixed,
    final_price_rub: finalPrice
  };
}

/**
 * POST /api/order handler
 * Creates new order with validation and database insert
 * @param {Object} db - SQLite database instance
 * @param {Function} logger - Pino logger instance
 * @returns {Function} Express handler
 */
export function createOrderHandler(db, logger) {
  return async (req, res) => {
    const startTime = process.hrtime.bigint();
    const requestId = req.id || randomUUID();
    
    // Guard: Validate request body
    const valid = validateOrderRequest(req.body);
    if (!valid) {
      ordersTotal.inc({ status: 'rejected' });
      logger.warn({ requestId, errors: validateOrderRequest.errors }, 'Order validation failed');
      
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        errors: validateOrderRequest.errors.map(err => ({
          field: err.instancePath || err.params?.missingProperty || 'body',
          message: err.message,
          params: err.params
        }))
      });
    }
    
    const { customer, item, pricing_snapshot, meta } = req.body;
    
    // Guard: Check at least one contact method
    const hasContact = customer.contact.email || customer.contact.phone || customer.contact.telegram;
    if (!hasContact) {
      ordersTotal.inc({ status: 'rejected' });
      logger.warn({ requestId }, 'No contact method provided');
      
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        errors: [{ field: 'customer.contact', message: 'At least one contact method is required' }]
      });
    }
    
    // Generate order ID
    const orderId = randomUUID();
    const now = Date.now();
    
    // Get pricing policy from settings
    const pricingPolicy = db.prepare('SELECT value FROM settings WHERE key = ?').get('pricing_policy');
    if (!pricingPolicy) {
      logger.error({ requestId }, 'Pricing policy not found in database');
      ordersTotal.inc({ status: 'rejected' });
      
      return res.status(500).json({
        ok: false,
        error: 'configuration_error',
        message: 'Pricing policy not configured'
      });
    }
    
    const policy = JSON.parse(pricingPolicy.value);
    
    // Calculate pricing if not provided
    let finalPricing = pricing_snapshot;
    if (!finalPricing) {
      // Default base price if not provided (should come from frontend product data)
      const basePrice = 1000; // Placeholder, should be from product API
      finalPricing = calculatePricing(basePrice, policy);
      logger.info({ requestId, orderId, calculated: true }, 'Pricing calculated from policy');
    }
    
    // Generate dealer links
    const dealerLinks = generateDealerLinks(item.mpn, item.manufacturer);
    
    // Insert order into database (transaction)
    const insertStmt = db.prepare(`
      INSERT INTO orders (
        id, created_at, updated_at,
        customer_name, customer_contact,
        mpn, manufacturer, qty,
        pricing_snapshot, dealer_links,
        status, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertTransaction = db.transaction(() => {
      insertStmt.run(
        orderId,
        now,
        now,
        customer.name,
        JSON.stringify(customer.contact),
        item.mpn,
        item.manufacturer,
        item.qty,
        JSON.stringify(finalPricing),
        JSON.stringify(dealerLinks),
        'new',
        meta ? JSON.stringify(meta) : null
      );
    });
    
    insertTransaction();
    
    // Record metrics
    const endTime = process.hrtime.bigint();
    const durationSeconds = Number(endTime - startTime) / 1e9;
    
    ordersTotal.inc({ status: 'accepted' });
    orderCreateDuration.observe(durationSeconds);
    updateOrdersByStatusGauge(db); // Update gauge after creation
    
    // Log success (NO PII - only technical fields)
    logger.info({
      requestId,
      orderId,
      mpn: item.mpn,
      manufacturer: item.manufacturer,
      qty: item.qty,
      durationMs: Math.round(durationSeconds * 1000)
    }, 'Order created successfully');
    
    // Return order ID
    res.status(201).json({
      ok: true,
      orderId
    });
  };
}

export default createOrderHandler;
```

---

### api/admin.orders.js

```javascript
// api/admin.orders.js
// Admin endpoints for order management
// Protected by Nginx Basic Auth (see docs/OPERATIONS.md)

import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { updateOrdersByStatusGauge } from '../metrics/registry.js';

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
 * - status: Filter by status (new|in_progress|done|cancelled)
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
 * Body: { status: "new"|"in_progress"|"done"|"cancelled" }
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
  app.get('/api/admin/orders', listOrdersHandler(db, logger));
  app.get('/api/admin/orders/:id', getOrderHandler(db, logger));
  app.patch('/api/admin/orders/:id', updateOrderHandler(db, logger));
}

export default {
  listOrdersHandler,
  getOrderHandler,
  updateOrderHandler,
  mountAdminRoutes
};
```

---

### middleware/rateLimiter.js

```javascript
// middleware/rateLimiter.js
// Rate limiting middleware for POST /api/order

import rateLimit from 'express-rate-limit';
import { rateLimitHits } from '../metrics/registry.js';

/**
 * Create rate limiter for order creation
 * Limits number of order requests per IP address
 * Configuration from environment variables:
 * - ORDER_RATE_LIMIT_WINDOW_MS: Time window in ms (default: 60000 = 1 minute)
 * - ORDER_RATE_LIMIT_MAX: Max requests per window (default: 10)
 */
export function createOrderRateLimiter() {
  const windowMs = parseInt(process.env.ORDER_RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
  const max = parseInt(process.env.ORDER_RATE_LIMIT_MAX) || 10; // 10 requests
  
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    
    // Custom error response
    handler: (req, res) => {
      // Record metric
      rateLimitHits.inc({ endpoint: '/api/order' });
      
      res.status(429).json({
        ok: false,
        error: 'rate_limit',
        message: `Too many order requests. Please try again later.`,
        retry_after: Math.ceil(windowMs / 1000)
      });
    },
    
    // Skip rate limiting for specific IPs (optional)
    skip: (req) => {
      const trustedIPs = (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean);
      return trustedIPs.includes(req.ip);
    },
    
    // Custom key generator (use IP address)
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    }
  });
}

/**
 * Create general API rate limiter (for all endpoints)
 * More permissive than order-specific limiter
 */
export function createGeneralRateLimiter() {
  const windowMs = parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
  const max = parseInt(process.env.API_RATE_LIMIT_MAX) || 100; // 100 requests
  
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    
    handler: (req, res) => {
      rateLimitHits.inc({ endpoint: 'general' });
      
      res.status(429).json({
        ok: false,
        error: 'rate_limit',
        message: 'Too many requests. Please try again later.',
        retry_after: Math.ceil(windowMs / 1000)
      });
    },
    
    skip: (req) => {
      // Skip admin endpoints (protected by Nginx Basic Auth anyway)
      if (req.path.startsWith('/api/admin/')) return true;
      
      // Skip metrics endpoint
      if (req.path === '/api/metrics') return true;
      
      // Skip health check
      if (req.path === '/api/health') return true;
      
      const trustedIPs = (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean);
      return trustedIPs.includes(req.ip);
    },
    
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    }
  });
}

export default {
  createOrderRateLimiter,
  createGeneralRateLimiter
};
```

---

### metrics/registry.js

```javascript
// metrics/registry.js
// Prometheus metrics registry for Deep Aggregator

import { register, Counter, Gauge, Histogram } from 'prom-client';

// Configure default labels
register.setDefaultLabels({
  app: 'deep-aggregator',
  version: '3.0.0'
});

// ==================== ORDERS METRICS ====================

/**
 * Counter: Total orders created
 * Labels: status (accepted|rejected)
 */
export const ordersTotal = new Counter({
  name: 'orders_total',
  help: 'Total number of order requests',
  labelNames: ['status'],
  registers: [register]
});

/**
 * Gauge: Current number of orders by status
 * Labels: status (new|in_progress|done|cancelled)
 */
export const ordersByStatus = new Gauge({
  name: 'orders_by_status',
  help: 'Current number of orders in each status',
  labelNames: ['status'],
  registers: [register]
});

/**
 * Histogram: Order creation duration in seconds
 * Buckets: 0.01s, 0.05s, 0.1s, 0.5s, 1s, 2s, 5s
 */
export const orderCreateDuration = new Histogram({
  name: 'order_create_duration_seconds',
  help: 'Duration of order creation in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// ==================== HTTP METRICS ====================

/**
 * Counter: Total HTTP requests
 * Labels: method, path, status_code
 */
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [register]
});

/**
 * Histogram: HTTP request duration in seconds
 * Labels: method, path
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// ==================== API SOURCES METRICS ====================

/**
 * Counter: Total API calls to external sources
 * Labels: source (mouser|digikey|tme|farnell), status (success|error)
 */
export const apiCallsTotal = new Counter({
  name: 'api_calls_total',
  help: 'Total number of API calls to external sources',
  labelNames: ['source', 'status'],
  registers: [register]
});

/**
 * Histogram: API call duration in seconds
 * Labels: source
 */
export const apiCallDuration = new Histogram({
  name: 'api_call_duration_seconds',
  help: 'Duration of API calls to external sources in seconds',
  labelNames: ['source'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// ==================== CACHE METRICS ====================

/**
 * Counter: Cache operations
 * Labels: operation (hit|miss), type (search|product)
 */
export const cacheOperations = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'type'],
  registers: [register]
});

// ==================== RATE LIMIT METRICS ====================

/**
 * Counter: Rate limit hits
 * Labels: endpoint
 */
export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint'],
  registers: [register]
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Update ordersByStatus gauge from database
 * @param {Object} db - SQLite database instance
 */
export function updateOrdersByStatusGauge(db) {
  if (!db) return;
  
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM orders 
    GROUP BY status
  `).all();

  // Reset all gauges to 0 first
  ['new', 'in_progress', 'done', 'cancelled'].forEach(status => {
    ordersByStatus.set({ status }, 0);
  });

  // Set actual counts
  statusCounts.forEach(row => {
    ordersByStatus.set({ status: row.status }, row.count);
  });
}

/**
 * Get metrics in Prometheus format
 * @returns {Promise<string>} Metrics in text format
 */
export async function getMetrics() {
  return register.metrics();
}

/**
 * Get metrics content type
 * @returns {string} Content-Type header value
 */
export function getMetricsContentType() {
  return register.contentType;
}

/**
 * Clear all metrics (for testing)
 */
export function clearMetrics() {
  register.clear();
}

export default {
  register,
  ordersTotal,
  ordersByStatus,
  orderCreateDuration,
  httpRequestsTotal,
  httpRequestDuration,
  apiCallsTotal,
  apiCallDuration,
  cacheOperations,
  rateLimitHits,
  updateOrdersByStatusGauge,
  getMetrics,
  getMetricsContentType,
  clearMetrics
};
```

---

### schemas/order.request.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://deep-agg.com/schemas/order.request.json",
  "title": "Order Request Schema",
  "description": "JSON Schema for POST /api/order request validation",
  "type": "object",
  "required": ["customer", "item"],
  "additionalProperties": false,
  "properties": {
    "customer": {
      "type": "object",
      "required": ["name", "contact"],
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": "string",
          "minLength": 2,
          "maxLength": 128,
          "description": "Customer full name or company name"
        },
        "contact": {
          "type": "object",
          "additionalProperties": false,
          "minProperties": 1,
          "properties": {
            "email": {
              "type": "string",
              "format": "email",
              "description": "Email address in RFC 5322 format"
            },
            "phone": {
              "type": "string",
              "pattern": "^\\+[1-9]\\d{1,14}$",
              "description": "Phone number in E.164 format (e.g., +79161234567)"
            },
            "telegram": {
              "type": "string",
              "pattern": "^@[a-zA-Z0-9_]{5,32}$",
              "description": "Telegram username starting with @ (e.g., @username)"
            }
          },
          "description": "At least one contact method is required"
        }
      }
    },
    "item": {
      "type": "object",
      "required": ["mpn", "manufacturer", "qty"],
      "additionalProperties": false,
      "properties": {
        "mpn": {
          "type": "string",
          "minLength": 1,
          "maxLength": 64,
          "description": "Manufacturer Part Number"
        },
        "manufacturer": {
          "type": "string",
          "minLength": 1,
          "maxLength": 128,
          "description": "Manufacturer name"
        },
        "qty": {
          "type": "integer",
          "minimum": 1,
          "description": "Quantity to order"
        }
      }
    },
    "pricing_snapshot": {
      "type": "object",
      "required": ["base_price_rub", "markup_percent", "markup_fixed_rub", "final_price_rub"],
      "additionalProperties": false,
      "properties": {
        "base_price_rub": {
          "type": "number",
          "minimum": 0,
          "description": "Base price from supplier in RUB"
        },
        "markup_percent": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Markup as decimal (e.g., 0.30 for 30%)"
        },
        "markup_fixed_rub": {
          "type": "number",
          "minimum": 0,
          "description": "Fixed markup in RUB"
        },
        "final_price_rub": {
          "type": "number",
          "minimum": 0,
          "description": "Final calculated price in RUB"
        }
      },
      "description": "Pricing snapshot at order creation time (optional, will be calculated if not provided)"
    },
    "meta": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "comment": {
          "type": "string",
          "maxLength": 500,
          "description": "Optional customer comment"
        }
      },
      "description": "Optional metadata"
    }
  }
}
```

---

### schemas/order.update.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://deep-agg.com/schemas/order.update.json",
  "title": "Order Update Schema",
  "description": "JSON Schema for PATCH /api/admin/orders/:id request validation",
  "type": "object",
  "required": ["status"],
  "additionalProperties": false,
  "properties": {
    "status": {
      "type": "string",
      "enum": ["new", "in_progress", "done", "cancelled"],
      "description": "Order status (new → in_progress → done/cancelled)"
    }
  }
}
```

---

### db/migrations/2025-10-02_orders.sql

```sql
-- Migration: Orders and Settings Tables
-- Date: 2025-10-02
-- Description: Creates orders table for customer orders and settings table for pricing policy

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  -- Customer information
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL, -- JSON: { email?, phone?, telegram? }
  
  -- Item information
  mpn TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK(qty >= 1),
  
  -- Pricing snapshot at order time
  pricing_snapshot TEXT NOT NULL, -- JSON: { base_price_rub, markup_percent, markup_fixed_rub, final_price_rub }
  
  -- Dealer links for quick access
  dealer_links TEXT, -- JSON: [{ dealer, url }]
  
  -- Order status with constraint
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'in_progress', 'done', 'cancelled')),
  
  -- Optional metadata
  meta TEXT -- JSON: { comment? }
);

-- Create index on created_at for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Create index on mpn for searching by part number
CREATE INDEX IF NOT EXISTS idx_orders_mpn ON orders(mpn);

-- Create settings table for global configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON value
  updated_at INTEGER NOT NULL
);

-- Insert default pricing policy
INSERT OR IGNORE INTO settings (key, value, updated_at) 
VALUES (
  'pricing_policy',
  '{"markup_percent": 0.30, "markup_fixed_rub": 500}',
  strftime('%s', 'now') * 1000
);

-- Verify tables created
SELECT 'Migration completed successfully' AS status;
```

---

### scripts/apply_migration.mjs

```javascript
// Apply database migration
import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'var');
const dbPath = join(DATA_DIR, 'db', 'deepagg.sqlite');
const migrationPath = join(__dirname, '..', 'db', 'migrations', '2025-10-02_orders.sql');

console.log('\n📦 Applying Database Migration');
console.log('='.repeat(50));
console.log(`📄 Database: ${dbPath}`);
console.log(`📜 Migration: ${migrationPath}`);

// Ensure database directory exists
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  console.log(`\n📁 Created directory: ${dbDir}`);
}

const db = Database(dbPath);
const migration = readFileSync(migrationPath, 'utf-8');

try {
  db.exec(migration);
  console.log('\n✅ Migration applied successfully');
  
  // Verify tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('orders', 'settings')").all();
  console.log(`\n📋 Created tables:`);
  tables.forEach(t => console.log(`   - ${t.name}`));
  
  // Verify indexes
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_orders%'").all();
  console.log(`\n🔍 Created indexes:`);
  indexes.forEach(i => console.log(`   - ${i.name}`));
  
  // Verify pricing policy
  const policy = db.prepare("SELECT value FROM settings WHERE key='pricing_policy'").get();
  console.log(`\n💰 Default pricing policy:`);
  console.log(`   ${JSON.stringify(JSON.parse(policy.value), null, 2)}`);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Database ready for Orders Backend\n');
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
```

---

### docs/API.md

````markdown
# API Documentation: Orders Module

## Overview
The Orders API provides endpoints for creating customer orders and managing them through an admin interface. All endpoints return JSON responses.

**Base URL:** `http://5.129.228.88:9201`

---

## Table of Contents
- [Public Endpoints](#public-endpoints)
  - [POST /api/order](#post-apiorder)
- [Admin Endpoints (Protected)](#admin-endpoints-protected)
  - [GET /api/admin/orders](#get-apiadminorders)
  - [GET /api/admin/orders/:id](#get-apiadminordersid)
  - [PATCH /api/admin/orders/:id](#patch-apiadminordersid)
- [Metrics Endpoint](#metrics-endpoint)
  - [GET /api/metrics](#get-apimetrics)
- [Error Responses](#error-responses)

---

## Public Endpoints

### POST /api/order

**Description:** Create a new customer order

**Rate Limiting:** 10 requests per minute per IP (configurable)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "customer": {
    "name": "string (2-128 chars)",
    "contact": {
      "email": "user@example.com (optional, RFC 5322 format)",
      "phone": "+79161234567 (optional, E.164 format)",
      "telegram": "@username (optional, 5-32 chars)"
    }
  },
  "item": {
    "mpn": "string (1-64 chars, manufacturer part number)",
    "manufacturer": "string (1-128 chars)",
    "qty": integer (>= 1)
  },
  "pricing_snapshot": {
    "base_price_rub": number (>= 0, optional)",
    "markup_percent": number (0-1, optional)",
    "markup_fixed_rub": number (>= 0, optional)",
    "final_price_rub": number (>= 0, optional)"
  },
  "meta": {
    "comment": "string (max 500 chars, optional)"
  }
}
```

**Important Notes:**
- **At least ONE contact method** is required (email, phone, or telegram)
- `pricing_snapshot` is optional; if not provided, pricing will be calculated from `settings.pricing_policy`
- All fields follow `additionalProperties: false` — extra fields will cause validation errors

**Example Request (Minimal):**
```json
{
  "customer": {
    "name": "Иван Петров",
    "contact": {
      "email": "ivan.petrov@example.com"
    }
  },
  "item": {
    "mpn": "ATMEGA328P-PU",
    "manufacturer": "Microchip",
    "qty": 10
  }
}
```

**Example Request (Full):**
```json
{
  "customer": {
    "name": "ООО \"Электроника Плюс\"",
    "contact": {
      "email": "orders@electronics-plus.ru",
      "phone": "+79161234567",
      "telegram": "@electronics_plus"
    }
  },
  "item": {
    "mpn": "ATMEGA328P-PU",
    "manufacturer": "Microchip Technology",
    "qty": 100
  },
  "pricing_snapshot": {
    "base_price_rub": 250.00,
    "markup_percent": 0.30,
    "markup_fixed_rub": 500,
    "final_price_rub": 825
  },
  "meta": {
    "comment": "Срочный заказ, требуется до пятницы"
  }
}
```

**Success Response (201 Created):**
```json
{
  "ok": true,
  "orderId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (400 Bad Request - Validation Failed):**
```json
{
  "ok": false,
  "error": "validation_error",
  "errors": [
    {
      "field": "customer.name",
      "message": "must be string",
      "params": { "type": "string" }
    },
    {
      "field": "item.qty",
      "message": "must be >= 1",
      "params": { "comparison": ">=", "limit": 1 }
    }
  ]
}
```

**Error Response (429 Too Many Requests):**
```json
{
  "ok": false,
  "error": "rate_limit",
  "message": "Too many order requests. Please try again later.",
  "retry_after": 60
}
```

---

## Admin Endpoints (Protected)

**Authentication:** HTTP Basic Auth (configured in Nginx)

**How to authenticate:**
```bash
curl -u admin:password http://5.129.228.88:9201/api/admin/orders
```

**Unauthorized Response (401):**
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Basic realm="Admin Area"
```

---

### GET /api/admin/orders

**Description:** Get paginated list of orders with filtering

**Query Parameters:**
- `status` (optional): Filter by status (`new`, `in_progress`, `done`, `cancelled`)
- `q` (optional): Search by MPN, manufacturer, or customer name (partial match)
- `from` (optional): Start date (Unix timestamp in milliseconds)
- `to` (optional): End date (Unix timestamp in milliseconds)
- `limit` (optional): Page size (default: 50, max: 200)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```bash
GET /api/admin/orders?status=new&limit=10&offset=0
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
```

**Success Response (200 OK):**
```json
{
  "ok": true,
  "orders": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": 1696204800000,
      "updated_at": 1696204800000,
      "customer_name": "Иван Петров",
      "mpn": "ATMEGA328P-PU",
      "manufacturer": "Microchip",
      "qty": 10,
      "pricing_snapshot": {
        "base_price_rub": 250,
        "markup_percent": 0.3,
        "markup_fixed_rub": 500,
        "final_price_rub": 825
      },
      "status": "new"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

---

### GET /api/admin/orders/:id

**Description:** Get full details of a specific order

**Path Parameters:**
- `id`: Order UUID

**Example Request:**
```bash
GET /api/admin/orders/550e8400-e29b-41d4-a716-446655440000
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
```

**Success Response (200 OK):**
```json
{
  "ok": true,
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": 1696204800000,
    "updated_at": 1696204800000,
    "customer_name": "Иван Петров",
    "customer_contact": {
      "email": "ivan.petrov@example.com",
      "phone": "+79161234567",
      "telegram": "@ivan_petrov"
    },
    "mpn": "ATMEGA328P-PU",
    "manufacturer": "Microchip Technology",
    "qty": 10,
    "pricing_snapshot": {
      "base_price_rub": 250,
      "markup_percent": 0.3,
      "markup_fixed_rub": 500,
      "final_price_rub": 825
    },
    "dealer_links": [
      {
        "dealer": "mouser",
        "url": "https://www.mouser.com/ProductDetail/?q=ATMEGA328P-PU"
      },
      {
        "dealer": "digikey",
        "url": "https://www.digikey.com/en/products/result?keywords=ATMEGA328P-PU"
      },
      {
        "dealer": "tme",
        "url": "https://www.tme.eu/en/katalog/?search=ATMEGA328P-PU"
      },
      {
        "dealer": "farnell",
        "url": "https://www.farnell.com/search?st=ATMEGA328P-PU"
      }
    ],
    "status": "new",
    "meta": {
      "comment": "Срочный заказ"
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "ok": false,
  "error": "not_found",
  "message": "Order not found"
}
```

**Error Response (400 Bad Request - Invalid ID):**
```json
{
  "ok": false,
  "error": "invalid_id",
  "message": "Order ID must be a valid UUID"
}
```

---

### PATCH /api/admin/orders/:id

**Description:** Update order status

**Path Parameters:**
- `id`: Order UUID

**Request Headers:**
```
Content-Type: application/json
Authorization: Basic <credentials>
```

**Request Body:**
```json
{
  "status": "new" | "in_progress" | "done" | "cancelled"
}
```

**Status Transitions:**
```
new → in_progress → done
new → cancelled
in_progress → cancelled
in_progress → done
```

**Example Request:**
```bash
PATCH /api/admin/orders/550e8400-e29b-41d4-a716-446655440000
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
Content-Type: application/json

{
  "status": "in_progress"
}
```

**Success Response (200 OK):**
```json
{
  "ok": true,
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in_progress",
  "updated_at": 1696208400000
}
```

**Error Response (400 Bad Request - Validation):**
```json
{
  "ok": false,
  "error": "validation_error",
  "errors": [
    {
      "field": "status",
      "message": "must be equal to one of the allowed values",
      "params": {
        "allowedValues": ["new", "in_progress", "done", "cancelled"]
      }
    }
  ]
}
```

---

## Metrics Endpoint

### GET /api/metrics

**Description:** Prometheus-compatible metrics endpoint

**Authentication:** Optional (can be protected by Nginx Basic Auth)

**Response Format:** Prometheus text-based format

**Example Request:**
```bash
GET /api/metrics
```

**Example Response:**
```
# HELP orders_total Total number of order requests
# TYPE orders_total counter
orders_total{status="accepted",app="deep-aggregator",version="3.0.0"} 127
orders_total{status="rejected",app="deep-aggregator",version="3.0.0"} 8

# HELP orders_by_status Current number of orders in each status
# TYPE orders_by_status gauge
orders_by_status{status="new",app="deep-aggregator",version="3.0.0"} 23
orders_by_status{status="in_progress",app="deep-aggregator",version="3.0.0"} 12
orders_by_status{status="done",app="deep-aggregator",version="3.0.0"} 87
orders_by_status{status="cancelled",app="deep-aggregator",version="3.0.0"} 5

# HELP order_create_duration_seconds Duration of order creation in seconds
# TYPE order_create_duration_seconds histogram
order_create_duration_seconds_bucket{le="0.01"} 15
order_create_duration_seconds_bucket{le="0.05"} 98
order_create_duration_seconds_bucket{le="0.1"} 125
order_create_duration_seconds_bucket{le="+Inf"} 127
order_create_duration_seconds_sum 8.432
order_create_duration_seconds_count 127
```

---

## Error Responses

### Standard Error Format
```json
{
  "ok": false,
  "error": "error_code",
  "message": "Human-readable message"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `validation_error` | 400 | Request body failed JSON Schema validation |
| `invalid_id` | 400 | Invalid order ID format (not a UUID) |
| `rate_limit` | 429 | Too many requests, rate limit exceeded |
| `not_found` | 404 | Order not found by ID |
| `configuration_error` | 500 | Server configuration issue (e.g., missing pricing policy) |

### Validation Error Details

Validation errors include an `errors` array with detailed information:

```json
{
  "ok": false,
  "error": "validation_error",
  "errors": [
    {
      "field": "customer.contact",
      "message": "At least one contact method is required",
      "params": {}
    }
  ]
}
```

**Common Validation Fields:**
- `customer.name`: String length (2-128 chars)
- `customer.contact.email`: RFC 5322 email format
- `customer.contact.phone`: E.164 phone format (+countrycode...)
- `customer.contact.telegram`: Must start with `@` (5-32 chars)
- `item.mpn`: String (1-64 chars)
- `item.manufacturer`: String (1-128 chars)
- `item.qty`: Integer >= 1
- `meta.comment`: String (max 500 chars)

---

## Testing Examples

### Create Order (curl)
```bash
curl -X POST http://5.129.228.88:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Test User",
      "contact": {"email": "test@example.com"}
    },
    "item": {
      "mpn": "ATMEGA328P-PU",
      "manufacturer": "Microchip",
      "qty": 5
    }
  }'
```

### List Orders (curl with auth)
```bash
curl -u admin:password \
  "http://5.129.228.88:9201/api/admin/orders?status=new&limit=5"
```

### Update Order Status (curl)
```bash
curl -X PATCH \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' \
  http://5.129.228.88:9201/api/admin/orders/550e8400-e29b-41d4-a716-446655440000
```

### JavaScript (Fetch API)
```javascript
// Create order
const response = await fetch('http://5.129.228.88:9201/api/order', {
  method: 'POST',
  headers: { 'Content-Type: 'application/json' },
  body: JSON.stringify({
    customer: {
      name: 'Иван Петров',
      contact: { email: 'ivan@example.com' }
    },
    item: {
      mpn: 'ATMEGA328P-PU',
      manufacturer: 'Microchip',
      qty: 10
    }
  })
});

const data = await response.json();
console.log('Order ID:', data.orderId);
```

---

**API Version:** 3.0  
**Last Updated:** 2025-10-02  
**Maintainer:** Backend Team
````

---

### docs/OPERATIONS.md

````markdown
# Operations Guide: Deep Aggregator Orders Module

## Table of Contents
- [Database Migrations](#database-migrations)
- [Nginx Basic Auth Setup](#nginx-basic-auth-setup)
- [Prometheus Metrics](#prometheus-metrics)
- [Rate Limiting Configuration](#rate-limiting-configuration)
- [Backup and Recovery](#backup-and-recovery)

---

## Database Migrations

### Location
`db/migrations/2025-10-02_orders.sql`

### Running Migration

**On Development:**
```bash
cd /path/to/aggregator-v2
sqlite3 cache.json < db/migrations/2025-10-02_orders.sql
```

**On Production Server (5.129.228.88):**
```bash
ssh root@5.129.228.88
cd /opt/deep-agg
sqlite3 cache.json < db/migrations/2025-10-02_orders.sql
```

### Verify Migration
```bash
sqlite3 cache.json "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('orders', 'settings');"
# Expected output:
# orders
# settings

sqlite3 cache.json "SELECT key FROM settings WHERE key='pricing_policy';"
# Expected output:
# pricing_policy
```

### Rollback (if needed)
```sql
-- CAUTION: This will delete all orders!
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS settings;
```

---

## Nginx Basic Auth Setup

### Overview
Admin endpoints (`/api/admin/*`) are protected by HTTP Basic Authentication at the Nginx level. This prevents unauthorized access without implementing complex auth logic in the application.

### Create Password File

**1. Install htpasswd utility (if not installed):**
```bash
# Ubuntu/Debian
sudo apt-get install apache2-utils

# CentOS/RHEL
sudo yum install httpd-tools
```

**2. Create password file:**
```bash
sudo mkdir -p /etc/nginx
sudo htpasswd -c /etc/nginx/.htpasswd admin
# Enter password when prompted (minimum 8 characters recommended)
```

**3. Add more users (optional):**
```bash
sudo htpasswd /etc/nginx/.htpasswd manager
```

**4. Verify file permissions:**
```bash
sudo chmod 644 /etc/nginx/.htpasswd
ls -l /etc/nginx/.htpasswd
# Expected: -rw-r--r-- root root
```

### Nginx Configuration

**Location:** `/etc/nginx/sites-available/deep-agg` (or your config file)

**Add Basic Auth block for admin endpoints:**
```nginx
server {
    listen 9201;
    server_name 5.129.228.88;
    
    # ... existing configuration ...
    
    # Public endpoints (no auth required)
    location /api/search {
        proxy_pass http://127.0.0.1:9201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /api/product {
        proxy_pass http://127.0.0.1:9201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /api/order {
        proxy_pass http://127.0.0.1:9201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # PROTECTED: Admin endpoints require authentication
    location /api/admin/ {
        auth_basic "Admin Area";
        auth_basic_user_file /etc/nginx/.htpasswd;
        
        proxy_pass http://127.0.0.1:9201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Metrics endpoint (optional: can also be protected)
    location /api/metrics {
        # Uncomment to protect metrics:
        # auth_basic "Metrics Access";
        # auth_basic_user_file /etc/nginx/.htpasswd;
        
        proxy_pass http://127.0.0.1:9201;
        proxy_set_header Host $host;
    }
}
```

**Reload Nginx:**
```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### Test Authentication

**Without credentials (should return 401):**
```bash
curl -i http://5.129.228.88:9201/api/admin/orders
# Expected: HTTP/1.1 401 Unauthorized
```

**With credentials (should return 200):**
```bash
curl -u admin:your_password http://5.129.228.88:9201/api/admin/orders
# Expected: HTTP/1.1 200 OK
```

---

## Prometheus Metrics

### Endpoint
`GET /api/metrics`

Returns metrics in Prometheus text-based format.

### Available Metrics

#### Orders Module Metrics
```
# Counter: Total orders created
orders_total{status="accepted"}
orders_total{status="rejected"}

# Gauge: Current orders by status
orders_by_status{status="new"}
orders_by_status{status="in_progress"}
orders_by_status{status="done"}
orders_by_status{status="cancelled"}

# Histogram: Order creation duration
order_create_duration_seconds_bucket{le="0.01"}
order_create_duration_seconds_bucket{le="0.05"}
order_create_duration_seconds_bucket{le="0.1"}
order_create_duration_seconds_sum
order_create_duration_seconds_count
```

#### HTTP Metrics
```
# Counter: Total HTTP requests
http_requests_total{method="GET",path="/api/search",status_code="200"}

# Histogram: HTTP request duration
http_request_duration_seconds{method="POST",path="/api/order"}
```

#### Rate Limiting Metrics
```
# Counter: Rate limit hits
rate_limit_hits_total{endpoint="/api/order"}
```

### Prometheus Configuration

**Add scrape target to `prometheus.yml`:**
```yaml
scrape_configs:
  - job_name: 'deep-aggregator'
    scrape_interval: 15s
    static_configs:
      - targets: ['5.129.228.88:9201']
    metrics_path: '/api/metrics'
    
    # If metrics endpoint is protected:
    basic_auth:
      username: 'admin'
      password: 'your_password'
```

**Reload Prometheus:**
```bash
curl -X POST http://localhost:9090/-/reload
# Or restart Prometheus service
```

### Test Metrics Endpoint
```bash
curl http://5.129.228.88:9201/api/metrics

# Expected output (sample):
# HELP orders_total Total number of order requests
# TYPE orders_total counter
# orders_total{status="accepted",app="deep-aggregator",version="3.0.0"} 42
# orders_total{status="rejected",app="deep-aggregator",version="3.0.0"} 3
# 
# HELP orders_by_status Current number of orders in each status
# TYPE orders_by_status gauge
# orders_by_status{status="new",app="deep-aggregator",version="3.0.0"} 15
# orders_by_status{status="in_progress",app="deep-aggregator",version="3.0.0"} 8
# orders_by_status{status="done",app="deep-aggregator",version="3.0.0"} 17
# orders_by_status{status="cancelled",app="deep-aggregator",version="3.0.0"} 2
```

---

## Rate Limiting Configuration

### Environment Variables

Add to `.env` file:

```bash
# Order endpoint rate limiting
ORDER_RATE_LIMIT_WINDOW_MS=60000  # 1 minute
ORDER_RATE_LIMIT_MAX=10           # 10 requests per minute per IP

# General API rate limiting
API_RATE_LIMIT_WINDOW_MS=60000    # 1 minute
API_RATE_LIMIT_MAX=100            # 100 requests per minute per IP

# Whitelist IPs (comma-separated, no spaces)
RATE_LIMIT_WHITELIST=127.0.0.1,::1
```

### Adjust Limits

**For production (stricter):**
```bash
ORDER_RATE_LIMIT_MAX=5     # 5 orders per minute
API_RATE_LIMIT_MAX=50      # 50 API calls per minute
```

**For development (permissive):**
```bash
ORDER_RATE_LIMIT_MAX=100
API_RATE_LIMIT_MAX=1000
```

**Restart server after changing `.env`:**
```bash
cd /opt/deep-agg
pkill -f 'node.*server.js'
nohup node server.js > logs/out.log 2> logs/err.log &
```

### Test Rate Limiting

**Bash script to test:**
```bash
#!/bin/bash
# Test rate limit by sending 15 requests rapidly

ENDPOINT="http://5.129.228.88:9201/api/order"

for i in {1..15}; do
  echo "Request $i:"
  curl -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{
      "customer": {
        "name": "Test User",
        "contact": {"email": "test@example.com"}
      },
      "item": {
        "mpn": "TEST-001",
        "manufacturer": "Test Corp",
        "qty": 1
      }
    }' \
    | jq -r '.error // "ok"'
  echo ""
  sleep 0.5
done
```

**Expected behavior:**
- First 10 requests: `ok` (201 Created)
- Requests 11-15: `rate_limit` (429 Too Many Requests)

---

## Backup and Recovery

### Database Backup

**Create backup script (`/opt/deep-agg/backup_db.sh`):**
```bash
#!/bin/bash
BACKUP_DIR="/opt/deep-agg/backups"
DB_FILE="/opt/deep-agg/cache.json"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
cp "$DB_FILE" "$BACKUP_DIR/cache_${TIMESTAMP}.json"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "cache_*.json" -mtime +7 -delete

echo "Backup created: cache_${TIMESTAMP}.json"
```

**Add to crontab (daily at 2 AM):**
```bash
crontab -e
# Add line:
0 2 * * * /opt/deep-agg/backup_db.sh >> /opt/deep-agg/logs/backup.log 2>&1
```

### Restore from Backup
```bash
cd /opt/deep-agg
# Stop server
pkill -f 'node.*server.js'

# Restore backup
cp backups/cache_20251002_020000.json cache.json

# Restart server
nohup node server.js > logs/out.log 2> logs/err.log &
```

### Export Orders to JSON

**For reporting or migration:**
```bash
sqlite3 cache.json <<EOF
.mode json
.output orders_export.json
SELECT * FROM orders;
.quit
EOF
```

---

## Troubleshooting

### Check if orders table exists
```bash
sqlite3 cache.json "SELECT COUNT(*) FROM orders;"
```

### View recent orders
```bash
sqlite3 cache.json "SELECT id, mpn, status, datetime(created_at/1000, 'unixepoch') as created FROM orders ORDER BY created_at DESC LIMIT 10;"
```

### Check pricing policy
```bash
sqlite3 cache.json "SELECT value FROM settings WHERE key='pricing_policy';"
```

### Reset orders_by_status gauge
```bash
# Restart server to recalculate from database
pkill -f 'node.*server.js'
cd /opt/deep-agg
nohup node server.js > logs/out.log 2> logs/err.log &
```

---

## Security Checklist

- [ ] Nginx Basic Auth configured for `/api/admin/*`
- [ ] `.htpasswd` file has correct permissions (644)
- [ ] Strong passwords (minimum 12 characters)
- [ ] Rate limiting enabled on `/api/order`
- [ ] Database backups scheduled (cron job)
- [ ] Logs rotated (logrotate configured)
- [ ] Firewall rules allow only port 9201
- [ ] HTTPS enabled (if using domain name)
- [ ] Environment variables in `.env` (not committed to git)

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-02  
**Maintainer:** DevOps Team
````

---

### server.js (integrations + orders wiring + metrics)

```javascript
// Deep Components Aggregator - CLEAN REWRITE
// v3.1 - With TME, Mouser, Farnell support + Orders Backend

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Database
import { openDb, readCachedSearch, cacheSearch, readCachedProduct, cacheProduct } from './src/db/sql.mjs';

// Mouser
import { mouserSearchByKeyword, mouserSearchByPartNumber } from './src/integrations/mouser/client.mjs';
import { normMouser } from './src/integrations/mouser/normalize.mjs';

// Farnell
import { farnellByMPN, farnellByKeyword } from './src/integrations/farnell/client.mjs';
import { normFarnell } from './src/integrations/farnell/normalize.mjs';

// TME
import { tmeSearchProducts, tmeGetProduct } from './src/integrations/tme/client.mjs';
import { normTME } from './src/integrations/tme/normalize.mjs';

// DigiKey
import { digikeyGetProduct, digikeySearch } from './src/integrations/digikey/client.mjs';
import { normDigiKey } from './src/integrations/digikey/normalize.mjs';

// Currency
import { toRUB } from './src/currency/toRUB.mjs';

// Product data merging
import { mergeProductData } from './src/utils/mergeProductData.mjs';

// Orders Backend
import { createOrderHandler } from './api/order.js';
import { mountAdminRoutes } from './api/admin.orders.js';
import { createOrderRateLimiter, createGeneralRateLimiter } from './middleware/rateLimiter.js';
import { getMetrics, getMetricsContentType, updateOrdersByStatusGauge } from './metrics/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🚀 Deep Components Aggregator v3.1');
console.log('='.repeat(50));

const app = express();

// JSON body parser for Orders API
app.use(express.json({ limit: '1mb' }));

const db = openDb();

// Simple console logger (can be replaced with Pino)
const logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || '')
};

// Initialize orders gauges
updateOrdersByStatusGauge(db);

const keys = {
  mouser: process.env.MOUSER_API_KEY || '',
  farnell: process.env.FARNELL_API_KEY || '',
  farnellRegion: process.env.FARNELL_REGION || 'uk.farnell.com',
  tmeToken: process.env.TME_TOKEN || '',
  tmeSecret: process.env.TME_SECRET || '',
  digikeyClientId: process.env.DIGIKEY_CLIENT_ID || '',
  digikeyClientSecret: process.env.DIGIKEY_CLIENT_SECRET || ''
};

console.log('\n📋 API Configuration:');
console.log(`   Mouser: ${keys.mouser ? '✅ Configured' : '❌ Missing'}`);
console.log(`   TME: ${keys.tmeToken && keys.tmeSecret ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Farnell: ${keys.farnell ? '✅ Configured' : '❌ Missing'}`);
console.log(`   DigiKey: ${keys.digikeyClientId && keys.digikeyClientSecret ? '✅ Configured' : '❌ Missing'}`);

// Static files with proper MIME types
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
  }
}));
app.use('/ui', express.static(path.join(__dirname, 'ui'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// Serve index.html for root
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.1',
    ts: Date.now(),
    sources: {
      mouser: keys.mouser ? 'ready' : 'disabled',
      tme: (keys.tmeToken && keys.tmeSecret) ? 'ready' : 'disabled',
      farnell: keys.farnell ? 'ready' : 'disabled',
      digikey: (keys.digikeyClientId && keys.digikeyClientSecret) ? 'ready' : 'disabled'
    },
    features: {
      orders: 'enabled',
      metrics: 'enabled'
    }
  });
});

// Prometheus metrics endpoint
app.get('/api/metrics', async (req, res) => {
  res.setHeader('Content-Type', getMetricsContentType());
  const metrics = await getMetrics();
  res.send(metrics);
});

// Orders API (with rate limiting)
const orderRateLimiter = createOrderRateLimiter();
app.post('/api/order', orderRateLimiter, createOrderHandler(db, logger));

// Admin API (protected by Nginx Basic Auth at proxy level)
mountAdminRoutes(app, db, logger);

// Digi-Key server-only endpoints (to ensure calls go through server IP)
app.get('/api/digikey/keyword', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ ok: false, error: 'q required' });
    if (!keys.digikeyClientId || !keys.digikeyClientSecret) {
      return res.status(503).json({ ok: false, error: 'DigiKey creds missing' });
    }
    const result = await digikeySearch({
      clientId: keys.digikeyClientId,
      clientSecret: keys.digikeyClientSecret,
      keyword: q,
      limit: Number(req.query.limit || 10)
    });
    const products = result?.data?.Products || result?.data?.Products?.Items || result?.data?.Items || [];
    res.json({ ok: true, status: result.status, count: products.length, raw: result.data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/digikey/details', async (req, res) => {
  try {
    const dkpn = String(req.query.dkpn || req.query.part || '').trim();
    if (!dkpn) return res.status(400).json({ ok: false, error: 'dkpn required' });
    if (!keys.digikeyClientId || !keys.digikeyClientSecret) {
      return res.status(503).json({ ok: false, error: 'DigiKey creds missing' });
    }
    const result = await digikeyGetProduct({
      clientId: keys.digikeyClientId,
      clientSecret: keys.digikeyClientSecret,
      partNumber: dkpn
    });
    res.json({ ok: true, status: result.status, raw: result.data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Digi-Key self-test (server-only). Optional simple token gate via env DIGIKEY_SELFTEST_TOKEN
app.get('/api/digikey/selftest', async (req, res) => {
  try {
    const expected = process.env.DIGIKEY_SELFTEST_TOKEN;
    if (expected && String(req.query.token || '') !== String(expected)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    if (!keys.digikeyClientId || !keys.digikeyClientSecret) {
      return res.status(503).json({ ok: false, error: 'DigiKey creds missing' });
    }
    const q = String(req.query.q || 'M83513/19-E01NW');
    const result = await digikeySearch({
      clientId: keys.digikeyClientId,
      clientSecret: keys.digikeyClientSecret,
      keyword: q,
      limit: 1
    });
    const products = result?.data?.Products || result?.data?.Items || [];
    res.json({ ok: true, status: result.status, count: products.length, sample: products[0] ? {
      ManufacturerPartNumber: products[0].ManufacturerPartNumber,
      Description: products[0].Description,
      ParametersCount: Array.isArray(products[0].Parameters) ? products[0].Parameters.length : undefined
    } : null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const startTime = Date.now();
    
    console.log(`\n🔍 Search: "${q}"`);
    
    if (!q) {
      return res.json({ ok: true, q, rows: [], meta: { source: 'none', total: 0 } });
    }

    // Check cache
    const TTL = 7 * 24 * 60 * 60 * 1000;
    const cached = readCachedSearch(db, q.toLowerCase(), TTL);
    if (cached && req.query.fresh !== '1') {
      console.log(`📦 Cache HIT: ${cached.rows.length} rows from ${cached.meta.source}`);
      return res.json({ ok: true, q, rows: cached.rows, meta: { ...cached.meta, cached: true } });
    }

    let rows = [];
    let source = 'none';

    // STEP 1: Try Mouser (ALWAYS keyword search first)
    if (keys.mouser) {
      try {
        console.log('   → Mouser: keyword search...');
        const result = await mouserSearchByKeyword({ apiKey: keys.mouser, q });
        const parts = result?.data?.SearchResults?.Parts || [];
        
        if (parts.length > 0) {
          rows = parts.map(normMouser);
          source = 'mouser';
          console.log(`   ✅ Mouser: ${parts.length} results`);
        } else {
          console.log(`   ⚠️  Mouser: 0 results`);
        }
      } catch (error) {
        console.log(`   ❌ Mouser error: ${error.message}`);
      }
    }

    // STEP 2: Try Digi-Key (server-side v4) if Mouser failed
    if (rows.length === 0 && keys.digikeyClientId && keys.digikeyClientSecret) {
      try {
        console.log('   → Digi-Key: keyword search...');
        const result = await digikeySearch({
          clientId: keys.digikeyClientId,
          clientSecret: keys.digikeyClientSecret,
          keyword: q,
          limit: 25
        });

        const products = result?.data?.Products || result?.data?.Items || [];
        if (products.length > 0) {
          rows = products.map(normDigiKey).filter(Boolean);
          source = 'digikey';
          console.log(`   ✅ Digi-Key: ${products.length} results`);
        } else {
          console.log('   ⚠️  Digi-Key: 0 results');
        }
      } catch (error) {
        console.log(`   ❌ Digi-Key error: ${error.message}`);
      }
    }

    // STEP 3: Try TME if still nothing
    if (rows.length === 0 && keys.tmeToken && keys.tmeSecret) {
      try {
        console.log('   → TME: searching...');
        const result = await tmeSearchProducts({
          token: keys.tmeToken,
          secret: keys.tmeSecret,
          q
        });
        
        const products = result?.data?.ProductList || [];
        if (products.length > 0) {
          rows = products.map(normTME);
          source = 'tme';
          console.log(`   ✅ TME: ${products.length} results`);
        } else {
          console.log(`   ⚠️  TME: 0 results`);
        }
      } catch (error) {
        console.log(`   ❌ TME error: ${error.message}`);
      }
    }

  // STEP 4: Try Farnell as last resort
    if (rows.length === 0 && keys.farnell) {
      try {
        console.log('   → Farnell: keyword search...');
        const result = await farnellByKeyword({
          apiKey: keys.farnell,
          region: keys.farnellRegion,
          q,
          limit: 25
        });
        
        const products = result?.data?.products || [];
        if (products.length > 0) {
          rows = products.map(p => normFarnell(p, keys.farnellRegion));
          source = 'farnell';
          console.log(`   ✅ Farnell: ${products.length} results`);
        } else {
          console.log(`   ⚠️  Farnell: 0 results`);
        }
      } catch (error) {
        console.log(`   ❌ Farnell error: ${error.message}`);
      }
    }

    // Cache results
    if (rows.length > 0) {
      cacheSearch(db, q.toLowerCase(), rows, { source });
    }

    const elapsed = Date.now() - startTime;
    console.log(`⏱️  Completed in ${elapsed}ms: ${rows.length} results from ${source}\n`);

    res.json({ ok: true, q, rows, meta: { source, total: rows.length, cached: false, elapsed } });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Product endpoint - Queries ALL 3 APIs in parallel and merges results
app.get('/api/product', async (req, res) => {
  try {
    const mpn = String(req.query.mpn || req.query.id || '').trim();

    console.log(`\n📦 Product Request: ${mpn}`);

    if (!mpn) {
      return res.status(400).json({ ok: false, code: 'bad_params', message: 'Missing mpn parameter' });
    }

    // Check cache (use mpn as key regardless of source)
    const TTL = 30 * 24 * 60 * 60 * 1000;
    const cached = readCachedProduct(db, 'merged', mpn, TTL);
    if (cached) {
      console.log('   📦 Cache HIT');
      return res.json({ ok: true, product: cached, meta: { cached: true } });
    }

    const clean = s => (s || '').toString().trim();

    console.log('   🔄 Fetching from ALL sources in parallel...');

    // Parallel requests to all 3 APIs
    const results = await Promise.allSettled([
      // Mouser
      keys.mouser ? (async () => {
        try {
          const result = await mouserSearchByKeyword({ apiKey: keys.mouser, q: mpn, records: 1 });
          const p = result?.data?.SearchResults?.Parts?.[0];
          if (!p) return null;

          console.log('   ✅ Mouser: Found');

          // Parse Mouser data - GET ALL FIELDS!
          const technical_specs = {};
          
          // 1. ProductAttributes (primary specs)
          (p.ProductAttributes || []).forEach(a => {
            const k = clean(a.AttributeName);
            const v = clean(a.AttributeValue);
            if (k && v) technical_specs[k] = v;
          });

          // 2. ALL main product fields as specs
          const allFields = {
            'Manufacturer': p.Manufacturer,
            'Product Category': p.Category,
            'Description': p.Description,
            'Mouser Part Number': p.MouserPartNumber,
            'Manufacturer Part Number': p.ManufacturerPartNumber,
            'RoHS Status': p.ROHSStatus,
            'Lifecycle Status': p.LifecycleStatus,
            'Availability': p.Availability,
            'In Stock': p.AvailabilityInStock,
            'Factory Stock': p.FactoryStock,
            'Lead Time': p.LeadTime,
            'Minimum Order Quantity': p.Min,
            'Order Multiple': p.Mult,
            'Standard Pack Qty': p.StandardCost,
            'Package': p.Package,
            'Packaging': p.Packaging,
            'Reeling': p.Reeling ? 'Yes' : null,
            'Product URL': p.ProductDetailUrl,
            'Datasheet URL': p.DataSheetUrl,
            'Series': p.Series,
            'Weight': p.Weight,
            'Package Dimensions': p.PackageDimensions
          };

          for (const [key, value] of Object.entries(allFields)) {
            const val = clean(value);
            if (val && val !== '0' && val !== 'null' && val !== 'undefined' && val !== 'No' && val !== 'false' && !technical_specs[key]) {
              technical_specs[key] = val;
            }
          }

          // 3. Product Compliance (RoHS, REACH, etc)
          (p.ProductCompliance || []).forEach(c => {
            const k = clean(c.ComplianceName);
            const v = clean(c.ComplianceValue);
            if (k && v) technical_specs[k] = v;
          });
          
          // 4. AlternatePackaging info
          if (p.AlternatePackagings && p.AlternatePackagings.length > 0) {
            technical_specs['Alternate Packaging Available'] = 'Yes';
          }
          
          // 5. SuggestedReplacement if exists
          if (p.SuggestedReplacement) {
            technical_specs['Suggested Replacement'] = clean(p.SuggestedReplacement);
          }
          
          // 6. UnitWeightKg if exists
          if (p.UnitWeightKg) {
            technical_specs['Unit Weight'] = `${p.UnitWeightKg} kg`;
          }

          console.log(`   📊 Mouser specs extracted: ${Object.keys(technical_specs).length}`);

          // Mouser API returns 24+ specs - no scraping needed!
          const images = [];
          if (clean(p.ImagePath)) images.push(clean(p.ImagePath));
          if (clean(p.ImageURL) && clean(p.ImageURL) !== clean(p.ImagePath)) images.push(clean(p.ImageURL));

          const datasheets = [];
          if (clean(p.DataSheetUrl)) datasheets.push(clean(p.DataSheetUrl));
          (p.ProductDocuments || []).forEach(doc => {
            if (clean(doc.DocumentUrl)) datasheets.push(clean(doc.DocumentUrl));
          });

          const pricing = (p.PriceBreaks || []).map(pb => ({
            qty: Number(pb.Quantity) || 1,
            price: clean(pb.Price),
            currency: pb.Currency || 'USD',
            price_rub: toRUB(Number((pb.Price || '').match(/[\d.,]+/)?[0]?.replace(',', '.') || 0), pb.Currency || 'USD')
          }));

          return {
            mpn: clean(p.ManufacturerPartNumber),
            manufacturer: clean(p.Manufacturer),
            title: clean(p.Description),
            description: clean(p.Description),
            photo: clean(p.ImagePath || p.ImageURL),
            images,
            datasheets: [...new Set(datasheets)],
            technical_specs,
            pricing,
            availability: { 
              inStock: Number(clean(p.AvailabilityInStock)) || Number((clean(p.Availability) || '').match(/\d+/)?[0]) || 0, 
              leadTime: clean(p.LeadTime) 
            },
            regions: ['US'],
            package: clean(p.Package),
            packaging: clean(p.Packaging),
            vendorUrl: clean(p.ProductDetailUrl),
            source: 'mouser'
          };
        } catch (error) {
          console.log('   ❌ Mouser: Error -', error.message);
          return null;
        }
      })() : Promise.resolve(null),

      // TME
      (keys.tmeToken && keys.tmeSecret) ? (async () => {
        try {
          console.log('   → TME: Searching for', mpn);
          const result = await tmeSearchProducts({ 
            token: keys.tmeToken, 
            secret: keys.tmeSecret, 
            query: mpn,
            country: 'PL',
            language: 'EN'
          });
          
          // TME returns { Status: 'OK', Data: { ProductList: [...] } }
          const tmeData = result?.data?.Data || result?.data;  // Handle both cases
          const products = tmeData?.ProductList || [];
          
          console.log('   🔍 TME response:', JSON.stringify({
            status: result?.status,
            hasData: !!result?.data,
            productCount: products.length,
            firstProduct: products[0]?.Symbol || 'none'
          }));
          
          if (products.length === 0) {
            console.log('   ⚠️  TME: No products in ProductList');
            return null;
          }

          // Find exact match by OriginalSymbol (manufacturer part number)
          let p = products.find(prod => 
            prod.OriginalSymbol && prod.OriginalSymbol.toUpperCase() === mpn.toUpperCase()
          );
          
          // Fallback: try Symbol field
          if (!p) {
            p = products.find(prod => 
              prod.Symbol && prod.Symbol.toUpperCase() === mpn.toUpperCase()
            );
          }
          
          // If no exact match found, skip TME result
          if (!p) {
            console.log('   ⚠️  TME: No exact match for', mpn, '(found', products.length, 'related products)');
            return null;
          }

          console.log('   ✅ TME: Found exact match', p.Symbol, '(OriginalSymbol:', p.OriginalSymbol, ')');

          const technical_specs = {};
          (p.Parameters || []).forEach(param => {
            const k = clean(param.ParameterName);
            const v = clean(param.ParameterValue);
            if (k && v) technical_specs[k] = v;
          });

          const images = (p.Photo || '').split(';').map(clean).filter(Boolean);
          const datasheets = [];
          if (clean(p.DocumentUrl)) datasheets.push(clean(p.DocumentUrl));

          const pricing = (p.PriceList || []).map(pb => ({
            qty: pb.Amount || 1,
            price: pb.PriceValue,
            currency: pb.PriceCurrency || 'EUR',
            price_rub: toRUB(pb.PriceValue, pb.PriceCurrency || 'EUR')
          }));

          return {
            mpn: clean(p.Symbol),
            manufacturer: clean(p.Producer),
            title: clean(p.Description),
            description: clean(p.Description),
            photo: images[0] || '',
            images,
            datasheets,
            technical_specs,
            pricing,
            availability: { inStock: Number(p.InStock) || 0, leadTime: clean(p.DeliveryTime) },
            regions: ['PL', 'EU'],
            package: '',
            packaging: '',
            vendorUrl: `https://www.tme.eu/en/details/${mpn}/`,
            source: 'tme'
          };
        } catch (error) {
          console.log('   ❌ TME: Error -', error.message);
          return null;
        }
      })() : Promise.resolve(null),

      // Farnell
      keys.farnell ? (async () => {
        try {
          console.log('   → Farnell: Searching for', mpn);
          const result = await farnellByMPN({ apiKey: keys.farnell, region: keys.farnellRegion, q: mpn, limit: 1 });
          
          console.log('   🔍 Farnell raw response status:', result?.status);
          
          // Farnell API returns: { premierFarnellPartNumberReturn: { numberOfResults, products: [...] } }
          const returnData = result?.data?.premierFarnellPartNumberReturn || result?.data;
          const products = returnData?.products || [];
          
          console.log('   🔍 Farnell result:', JSON.stringify({ 
            hasData: !!result?.data,
            hasReturn: !!returnData,
            numberOfResults: returnData?.numberOfResults || 0,
            productCount: products.length
          }));
          
          const p = products[0];
          if (!p) {
            console.log('   ⚠️  Farnell: No product found');
            return null;
          }

          console.log('   ✅ Farnell: Found');

          const technical_specs = {};
          (p.attributes || []).forEach(a => {
            const k = clean(a.attributeLabel || a.name);
            const v = clean(a.attributeValue || a.value);
            if (k && v) technical_specs[k] = v;
          });

          const images = [];
          const mainImg = p.image ? `https://uk.farnell.com${p.image.baseName}` : '';
          if (mainImg) images.push(mainImg);
          if (p.images?.small && p.images.small !== mainImg) images.push(p.images.small);
          if (p.images?.medium && p.images.medium !== mainImg) images.push(p.images.medium);

          const datasheets = (p.datasheets || []).map(d => clean(d.url || d)).filter(Boolean);

          const pricing = (p.prices || []).map(pb => ({
            qty: pb.from || 1,
            price: pb.cost || pb.price,
            currency: 'GBP',
            price_rub: toRUB(Number(pb.cost || pb.price), 'GBP')
          }));

          return {
            mpn: clean(p.translatedManufacturerPartNumber || p.manufacturerPartNumber),
            manufacturer: clean(p.brandName || p.vendorName),
            title: clean(p.displayName),
            description: clean(p.displayName || p.longDescription),
            photo: mainImg,
            images,
            datasheets,
            technical_specs,
            pricing,
            availability: { inStock: Number(p.stock) || 0, leadTime: clean(p.leadTime) },
            regions: ['UK', 'EU'],
            package: '',
            packaging: '',
            vendorUrl: clean(p.productUrl),
            source: 'farnell'
          };
        } catch (error) {
          console.log('   ❌ Farnell: Error -', error.message);
          return null;
        }
      })() : Promise.resolve(null),

      // DigiKey
      (keys.digikeyClientId && keys.digikeyClientSecret) ? (async () => {
        console.log('   🔍 DigiKey: Starting search...');
        try {
          const result = await digikeyGetProduct({ 
            clientId: keys.digikeyClientId, 
            clientSecret: keys.digikeyClientSecret, 
            partNumber: mpn 
          });
          
          console.log(`   🔍 DigiKey: Got response, status=${result?.status}`);
          const p = result?.data?.Product || result?.data?.Products?.[0];
          if (!p) {
            console.log('   ⚠️  DigiKey: No product found in response');
            return null;
          }

          console.log('   ✅ DigiKey: Found', p.ManufacturerProductNumber || p.ManufacturerPartNumber);

          // Extract ALL technical specs from Parameters
          const technical_specs = {};
          (p.Parameters || []).forEach(param => {
            const k = clean(param.ParameterText || param.Parameter);
            const v = clean(param.ValueText || param.Value);
            if (k && v) technical_specs[k] = v;
          });

          // Add main product fields as specs
          const mainFields = {
            'Manufacturer': p.Manufacturer?.Name,
            'Product Category': p.Category?.Name,
            'Series': p.Series,
            'Product Status': p.ProductStatus,
            'Base Product Number': p.BaseProductNumber,
            'Manufacturer Lead Weeks': p.ManufacturerLeadWeeks,
            'Normally Stocking': p.NormallyStocking ? 'Yes' : 'No',
            'End Of Life': p.EndOfLife ? 'Yes' : 'No',
            'Discontinued': p.Discontinued ? 'Yes' : 'No',
            'NCNR': p.Ncnr ? 'Yes' : 'No'
          };

          for (const [key, value] of Object.entries(mainFields)) {
            const val = clean(value);
            if (val && val !== '0' && val !== 'null' && val !== 'undefined' && val !== 'No' && val !== 'false' && !technical_specs[key]) {
              technical_specs[key] = val;
            }
          }

          // Extract images
          const images = [];
          if (clean(p.PhotoUrl)) images.push(clean(p.PhotoUrl));
          if (clean(p.PrimaryPhoto)) images.push(clean(p.PrimaryPhoto));
          if (p.MediaLinks && Array.isArray(p.MediaLinks)) {
            p.MediaLinks.forEach(media => {
              if (media.MediaType === 'Image' && clean(media.Url)) {
                images.push(clean(media.Url));
              }
            });
          }

          // Extract datasheets
          const datasheets = [];
          if (clean(p.DatasheetUrl)) datasheets.push(clean(p.DatasheetUrl));
          if (clean(p.PrimaryDatasheet)) datasheets.push(clean(p.PrimaryDatasheet));
          if (p.MediaLinks && Array.isArray(p.MediaLinks)) {
            p.MediaLinks.forEach(media => {
              if (media.MediaType === 'Datasheet' && clean(media.Url)) {
                datasheets.push(clean(media.Url));
              }
            });
          }

          // Get pricing from first ProductVariation (if exists) or StandardPricing
          let pricing = [];
          if (p.ProductVariations && p.ProductVariations.length > 0) {
            const firstVariation = p.ProductVariations[0];
            pricing = (firstVariation.StandardPricing || []).map(pb => ({
              qty: pb.BreakQuantity || 1,
              price: pb.UnitPrice,
              currency: 'USD',
              price_rub: toRUB(Number(pb.UnitPrice), 'USD')
            }));
          } else if (p.StandardPricing) {
            pricing = (p.StandardPricing || []).map(pb => ({
              qty: pb.BreakQuantity || 1,
              price: pb.UnitPrice,
              currency: pb.Currency || 'USD',
              price_rub: toRUB(Number(pb.UnitPrice), pb.Currency || 'USD')
            }));
          }

          // Get availability from first variation or main product
          let inStock = 0;
          let minQty = 1;
          if (p.ProductVariations && p.ProductVariations.length > 0) {
            const firstVariation = p.ProductVariations[0];
            inStock = Number(firstVariation.QuantityAvailableforPackageType) || 0;
            minQty = Number(firstVariation.MinimumOrderQuantity) || 1;
          } else {
            inStock = Number(p.QuantityAvailable) || 0;
          }

          console.log(`   📊 DigiKey specs extracted: ${Object.keys(technical_specs).length}`);

          return {
            mpn: clean(p.ManufacturerProductNumber || p.ManufacturerPartNumber),
            manufacturer: clean(p.Manufacturer?.Name),
            title: clean(p.Description?.ProductDescription || p.ProductDescription),
            description: clean(p.Description?.DetailedDescription || p.DetailedDescription || p.Description?.ProductDescription),
            photo: images[0] || '',
            images,
            datasheets: [...new Set(datasheets)],
            technical_specs,
            pricing,
            availability: { 
              inStock, 
              leadTime: clean(p.ManufacturerLeadWeeks),
              minQty
            },
            regions: ['US', 'Global'],
            package: clean(p.Packaging?.Name),
            packaging: clean(p.StandardPackage),
            vendorUrl: clean(p.ProductUrl),
            source: 'digikey'
          };
        } catch (error) {
          console.log('   ❌ DigiKey: Error -', error.message);
          return null;
        }
      })() : Promise.resolve(null)
    ]);

    // Extract successful results
    const [mouserResult, tmeResult, farnellResult, digikeyResult] = results.map(r => 
      r.status === 'fulfilled' ? r.value : null
    );

    console.log(`   📊 Results: Mouser=${!!mouserResult}, TME=${!!tmeResult}, Farnell=${!!farnellResult}, DigiKey=${!!digikeyResult}`);

    // Merge data from all sources
    const product = mergeProductData(mouserResult, tmeResult, farnellResult, digikeyResult);

    if (!product) {
      return res.status(404).json({ 
        ok: false, 
        code: 'not_found',
        message: 'Product not found in any source' 
      });
    }

    console.log(`   ✅ Merged product with ${Object.keys(product.technical_specs || {}).length} specs`);

    // Cache merged result
    cacheProduct(db, 'merged', mpn, product);

    res.json({ 
      ok: true, 
      product,
      meta: { 
        cached: false,
        sources: product.sources 
      } 
    });
  } catch (error) {
    console.error('❌ Product endpoint error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Image Proxy endpoint - proxies images to bypass hotlinking protection
app.get('/api/image', async (req, res) => {
  try {
    const url = String(req.query.url || '').trim();
    
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ ok: false, code: 'bad_url' });
    }
    
    console.log(`🖼️  Image Proxy: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.mouser.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    
    if (!response.ok) {
      console.log(`   ❌ Image fetch failed: ${response.status}`);
      // Return placeholder instead of error
      res.status(404).send('Image not found');
      return;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    
    console.log(`   ✅ Image served: ${buffer.byteLength} bytes`);
    
    // Set headers for image
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('❌ Image proxy error:', error);
    res.status(500).send('Image proxy error');
  }
});

// PDF Proxy endpoint - downloads PDF and serves it (caches on server)
app.get('/api/pdf', async (req, res) => {
  try {
    const url = String(req.query.url || '').trim();
    
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ ok: false, code: 'bad_url' });
    }
    
    console.log(`📄 PDF Proxy: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || 'application/pdf';
    const buffer = await response.arrayBuffer();
    
    // Set headers for PDF display/download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.send(Buffer.from(buffer));
    
    console.log(`   ✅ PDF served: ${buffer.byteLength} bytes`);
    
  } catch (error) {
    console.error('❌ PDF proxy error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = Number(process.env.PORT || 9201);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ Server Started');
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/health`);
  console.log(`📊 Metrics: http://localhost:${PORT}/api/metrics`);
  console.log(`📦 Orders: POST http://localhost:${PORT}/api/order`);
  console.log(`🔐 Admin: http://localhost:${PORT}/api/admin/orders`);
  console.log('='.repeat(50) + '\n');
});

server.on('error', (error) => {
  console.error('\n❌ Server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n❌ Unhandled rejection:', reason);
  process.exit(1);
});
```

---

## Acceptance Criteria Mapping

- JSON Schemas exist and enforce additionalProperties: false — Done (schemas/order.request.schema.json, schemas/order.update.schema.json)
- POST /api/order with AJV, metrics, and DB insert — Done (api/order.js); rejects invalid payloads; requires contact method
- Rate limit POST /api/order with JSON 429 — Done (middleware/rateLimiter.js) using env vars; metrics via rate_limit_hits_total
- Admin list/details and PATCH status — Done (api/admin.orders.js), with validation and gauge refresh
- Metrics endpoint returns valid Prometheus text — Done (metrics/registry.js, server.js); async getMetrics awaited
- Gauge orders_by_status updates on create and status change — Done (updateOrdersByStatusGauge called in both paths; initialized in server.js)
- Nginx Basic Auth documented for /api/admin/* — Done (docs/OPERATIONS.md)
- Migration creates tables/indexes and seeds pricing policy — Done (db/migrations/2025-10-02_orders.sql); runner script included
- Documentation for API and Operations — Done (docs/API.md, docs/OPERATIONS.md)

---

## Notes & Next Steps

- Pricing base price currently uses a placeholder if snapshot not provided; in production wire from product/pricing APIs on the client side or server fetch.
- Consider adding Pino logger and centralized error middleware for broader API routes; Orders flow already uses guard returns without try/catch.
- Optionally protect /api/metrics with Basic Auth via Nginx if exposed to the internet.

---

End of file.
