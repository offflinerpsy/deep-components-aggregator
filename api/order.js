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
    },
    {
      dealer: 'oemstrade',
      url: `https://www.oemstrade.com/search/${encodedMpn}`
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
    
    // Guard: Require authentication
    if (!req.user || !req.user.id) {
      ordersTotal.inc({ status: 'rejected' });
      logger.warn({ requestId }, 'Order creation attempt without authentication');
      
      return res.status(401).json({
        ok: false,
        error: 'not_authenticated',
        message: 'Authentication required to create orders'
      });
    }
    
    const userId = req.user.id;
    
    // Guard: Validate request body
    const valid = validateOrderRequest(req.body);
    if (!valid) {
      ordersTotal.inc({ status: 'rejected' });
      logger.warn({ requestId, userId, errors: validateOrderRequest.errors }, 'Order validation failed');
      
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
        user_id,
        customer_name, customer_contact,
        mpn, manufacturer, qty,
        pricing_snapshot, dealer_links,
        status, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertTransaction = db.transaction(() => {
      insertStmt.run(
        orderId,
        now,
        now,
        userId,
        customer.name,
        JSON.stringify(customer.contact),
        item.mpn,
        item.manufacturer,
        item.qty,
        JSON.stringify(finalPricing),
        JSON.stringify(dealerLinks),
        'pending',
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
      userId,
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
