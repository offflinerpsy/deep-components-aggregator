// api/admin.products.js
// Admin CRUD endpoints for products management
// Protected by requireAdmin (session-based RBAC)

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { requireAdmin } from '../middleware/requireAdmin.js';

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

// Load and compile schema
const productSchema = JSON.parse(
  readFileSync(new URL('../schemas/admin.product.schema.json', import.meta.url), 'utf8')
);
const validateProduct = ajv.compile(productSchema);

// Helper: Get current user from session (fallback to 'admin' if not available)
const getCurrentUser = (req) => {
  return req.user?.email || req.headers['x-authenticated-user'] || 'admin';
};

// GET /api/admin/products - List all products (with pagination)
const listProductsHandler = (db) => {
  return (req, res) => {
    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const offset = (page - 1) * limit;

    const category = req.query.category || null;
    const featured = req.query.featured === '1' ? 1 : null;
    const active = req.query.active !== '0' ? 1 : null; // Default: show only active

    const whereClause = [];
    const params = [];

    if (category) {
      whereClause.push('category = ?');
      params.push(category);
    }
    if (featured !== null) {
      whereClause.push('is_featured = ?');
      params.push(featured);
    }
    if (active !== null) {
      whereClause.push('is_active = ?');
      params.push(active);
    }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const products = db.prepare(`
      SELECT * FROM products
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const totalStmt = db.prepare(`SELECT COUNT(*) as total FROM products ${where}`);
    const { total } = totalStmt.get(...params);

    res.json({
      ok: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  };
};

// GET /api/admin/products/:id - Get single product by ID
const getProductHandler = (db) => {
  return (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid product ID' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }

    res.json({ ok: true, product });
  };
};

// POST /api/admin/products - Create new product
const createProductHandler = (db, logger) => {
  return (req, res) => {
    const valid = validateProduct(req.body);

    if (!valid) {
      logger.warn('Product validation failed', { errors: validateProduct.errors });
      return res.status(400).json({
        ok: false,
        error: 'Validation failed',
        details: validateProduct.errors
      });
    }

    const data = req.body;
    const currentUser = getCurrentUser(req);
    const priceBreaksJson = data.price_breaks ? JSON.stringify(data.price_breaks) : null;

    const stmt = db.prepare(`
      INSERT INTO products (
        mpn, manufacturer, category, title, description_short, description_long,
        price_rub, price_breaks, stock, min_order_qty, packaging,
        image_url, datasheet_url, provider, provider_url, provider_sku,
        is_featured, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.mpn,
      data.manufacturer,
      data.category || null,
      data.title,
      data.description_short || null,
      data.description_long || null,
      data.price_rub || null,
      priceBreaksJson,
      data.stock || 0,
      data.min_order_qty || 1,
      data.packaging || null,
      data.image_url || null,
      data.datasheet_url || null,
      data.provider || null,
      data.provider_url || null,
      data.provider_sku || null,
      data.is_featured ? 1 : 0,
      data.is_active !== false ? 1 : 0,
      currentUser
    );

    if (result.changes === 0) {
      logger.error('Failed to create product: no rows affected');
      return res.status(500).json({ ok: false, error: 'Database error: no rows affected' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);

    if (!product) {
      logger.error('Product created but not found after insert', { rowid: result.lastInsertRowid });
      return res.status(500).json({ ok: false, error: 'Database error: product not retrievable' });
    }

    logger.info('Product created', { id: product.id, mpn: product.mpn, user: currentUser });
    res.status(201).json({ ok: true, product });
  };
};

// PUT /api/admin/products/:id - Update existing product
const updateProductHandler = (db, logger) => {
  return (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid product ID' });
    }

    const valid = validateProduct(req.body);

    if (!valid) {
      logger.warn('Product validation failed', { errors: validateProduct.errors });
      return res.status(400).json({
        ok: false,
        error: 'Validation failed',
        details: validateProduct.errors
      });
    }

    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }

    const data = req.body;
    const priceBreaksJson = data.price_breaks ? JSON.stringify(data.price_breaks) : null;

    const stmt = db.prepare(`
      UPDATE products SET
        mpn = ?,
        manufacturer = ?,
        category = ?,
        title = ?,
        description_short = ?,
        description_long = ?,
        price_rub = ?,
        price_breaks = ?,
        stock = ?,
        min_order_qty = ?,
        packaging = ?,
        image_url = ?,
        datasheet_url = ?,
        provider = ?,
        provider_url = ?,
        provider_sku = ?,
        is_featured = ?,
        is_active = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      data.mpn,
      data.manufacturer,
      data.category || null,
      data.title,
      data.description_short || null,
      data.description_long || null,
      data.price_rub || null,
      priceBreaksJson,
      data.stock || 0,
      data.min_order_qty || 1,
      data.packaging || null,
      data.image_url || null,
      data.datasheet_url || null,
      data.provider || null,
      data.provider_url || null,
      data.provider_sku || null,
      data.is_featured ? 1 : 0,
      data.is_active !== false ? 1 : 0,
      id
    );

    if (result.changes === 0) {
      logger.warn('Product update: no changes made', { id });
      return res.status(304).json({ ok: false, error: 'No changes made' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      logger.error('Product not found after update', { id });
      return res.status(500).json({ ok: false, error: 'Database error: product not retrievable' });
    }

    logger.info('Product updated', { id, mpn: product.mpn });
    res.json({ ok: true, product });
  };
};

// DELETE /api/admin/products/:id - Delete product
const deleteProductHandler = (db, logger) => {
  return (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid product ID' });
    }

    const product = db.prepare('SELECT mpn, manufacturer FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }

    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);

    if (result.changes === 0) {
      logger.warn('Product delete: no rows affected', { id });
      return res.status(500).json({ ok: false, error: 'Database error: no rows deleted' });
    }

    logger.info('Product deleted', { id, mpn: product.mpn, manufacturer: product.manufacturer });
    res.json({ ok: true, message: 'Product deleted successfully' });
  };
};

// Mount all routes with requireAdmin middleware
export function mountAdminProductRoutes(app, db, logger) {
  app.get('/api/admin/products', requireAdmin, listProductsHandler(db));
  app.get('/api/admin/products/:id', requireAdmin, getProductHandler(db));
  app.post('/api/admin/products', requireAdmin, createProductHandler(db, logger));
  app.put('/api/admin/products/:id', requireAdmin, updateProductHandler(db, logger));
  app.delete('/api/admin/products/:id', requireAdmin, deleteProductHandler(db, logger));

  logger.info('Admin product routes mounted');
}
