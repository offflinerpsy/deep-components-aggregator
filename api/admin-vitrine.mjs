/**
 * Admin Vitrine API — Pin/Unpin Products
 *
 * POST /api/admin/vitrine/pins — Pin product to top of vitrine
 * DELETE /api/admin/vitrine/pins/:rowid — Unpin product
 * GET /api/admin/vitrine/pins — List all pinned products
 *
 * **Authentication**: Requires admin role (RFC 7235)
 * **Authorization**: 401 + WWW-Authenticate if not authenticated, 403 if authenticated but not admin
 */

import { openDb } from '../src/db/sql.mjs';

/**
 * Middleware: Require admin authentication (RFC 7235)
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function requireAdmin(req, res, next) {
  // Check if user is authenticated
  if (!req.user || !req.session || !req.session.userId) {
    // Not authenticated → 401 + WWW-Authenticate (RFC 7235)
    res.status(401)
      .set('WWW-Authenticate', 'Bearer realm="Admin API"')
      .json({ ok: false, error: 'Authentication required' });
    return;
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    // Authenticated but not admin → 403 (RFC 7235)
    res.status(403).json({ ok: false, error: 'Admin access required' });
    return;
  }

  next();
}

/**
 * POST /api/admin/vitrine/pins
 * Pin a product to top of vitrine
 *
 * Body: { rowid: number, notes?: string }
 */
function pinProduct(req, res) {
  const { rowid, notes } = req.body;

  if (!rowid || typeof rowid !== 'number') {
    res.status(400).json({ ok: false, error: 'Missing or invalid rowid' });
    return;
  }

  const db = openDb();

  // Check if product exists in search_rows
  const product = db.prepare('SELECT rowid FROM search_rows WHERE rowid = ?').get(rowid);
  if (!product) {
    res.status(404).json({ ok: false, error: 'Product not found' });
    return;
  }

  // Check if already pinned
  const existing = db.prepare('SELECT rowid FROM vitrine_pins WHERE rowid = ?').get(rowid);
  if (existing) {
    res.status(409).json({ ok: false, error: 'Product already pinned' });
    return;
  }

  // Insert pin
  const pinned_by = req.user.email || req.user.username || req.session.userId;
  db.prepare(`
    INSERT INTO vitrine_pins (rowid, pinned_by, notes)
    VALUES (?, ?, ?)
  `).run(rowid, pinned_by, notes || null);

  res.json({ ok: true, rowid, pinned_at: Math.floor(Date.now() / 1000) });
}

/**
 * DELETE /api/admin/vitrine/pins/:rowid
 * Unpin a product
 */
function unpinProduct(req, res) {
  const rowid = parseInt(req.params.rowid, 10);

  if (isNaN(rowid)) {
    res.status(400).json({ ok: false, error: 'Invalid rowid' });
    return;
  }

  const db = openDb();

  // Check if pinned
  const existing = db.prepare('SELECT rowid FROM vitrine_pins WHERE rowid = ?').get(rowid);
  if (!existing) {
    res.status(404).json({ ok: false, error: 'Product not pinned' });
    return;
  }

  // Delete pin
  db.prepare('DELETE FROM vitrine_pins WHERE rowid = ?').run(rowid);

  res.json({ ok: true, rowid });
}

/**
 * GET /api/admin/vitrine/pins
 * List all pinned products
 */
function listPins(req, res) {
  const db = openDb();

  const pins = db.prepare(`
    SELECT
      vp.rowid,
      vp.pinned_at,
      vp.pinned_by,
      vp.notes,
      sr.row as product
    FROM vitrine_pins vp
    JOIN search_rows sr ON sr.rowid = vp.rowid
    ORDER BY vp.pinned_at DESC
  `).all();

  const parsed = pins.map(p => ({
    rowid: p.rowid,
    pinned_at: p.pinned_at,
    pinned_by: p.pinned_by,
    notes: p.notes,
    product: JSON.parse(p.product)
  }));

  res.json({ ok: true, pins: parsed });
}

/**
 * Mount admin vitrine routes
 */
export default function mountAdminVitrine(app) {
  app.post('/api/admin/vitrine/pins', requireAdmin, pinProduct);
  app.delete('/api/admin/vitrine/pins/:rowid', requireAdmin, unpinProduct);
  app.get('/api/admin/vitrine/pins', requireAdmin, listPins);
}
