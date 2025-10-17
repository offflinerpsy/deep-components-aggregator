// api/admin.pages.mjs
// Admin CRUD endpoints for static pages (about, delivery, contacts)
import { requireAdmin } from '../middleware/requireAdmin.js';

// Simple console logger as fallback
const defaultLogger = {
  info: (data, message) => console.log(`[INFO] ${message}`, data),
  warn: (data, message) => console.warn(`[WARN] ${message}`, data),
  error: (data, message) => console.error(`[ERROR] ${message}`, data)
};

export function mountAdminPagesRoutes(app, db, logger = defaultLogger) {
  // List pages
  app.get('/api/admin/pages', requireAdmin, (req, res) => {
    const rows = db.prepare('SELECT id, slug, title, is_published, position, sort_order, updated_at FROM static_pages ORDER BY sort_order ASC, slug ASC').all();
    res.json({ ok: true, pages: rows });
  });

  // Get page by id
  app.get('/api/admin/pages/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'invalid_id' });
    const row = db.prepare('SELECT id, slug, title, content, meta_description, is_published, position, sort_order, updated_at FROM static_pages WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, page: row });
  });

  // Patch page (title/content/meta/is_published/position/sort_order)
  app.patch('/api/admin/pages/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'invalid_id' });

    const { title, content, meta_description, is_published, position, sort_order } = req.body || {};
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM static_pages WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ ok: false, error: 'not_found' });

    // Validate position if provided
    if (position && !['header', 'footer', 'both'].includes(position)) {
      return res.status(400).json({ ok: false, error: 'invalid_position', message: 'Position must be one of: header, footer, both' });
    }

    // Validate sort_order if provided
    if (sort_order !== undefined && (!Number.isFinite(parseInt(sort_order, 10)) || parseInt(sort_order, 10) < 0)) {
      return res.status(400).json({ ok: false, error: 'invalid_sort_order', message: 'Sort order must be a non-negative number' });
    }

    const stmt = db.prepare(`
      UPDATE static_pages
      SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        meta_description = COALESCE(?, meta_description),
        is_published = COALESCE(?, is_published),
        position = COALESCE(?, position),
        sort_order = COALESCE(?, sort_order),
        updated_at = ?
      WHERE id = ?
    `);

    const info = stmt.run(
      title ?? null,
      content ?? null,
      meta_description ?? null,
      (typeof is_published === 'boolean' ? (is_published ? 1 : 0) : null),
      position ?? null,
      (sort_order !== undefined ? parseInt(sort_order, 10) : null),
      now,
      id
    );

    if (info.changes === 0) return res.status(200).json({ ok: true, updated: 0 });
    res.json({ ok: true, updated: info.changes, updated_at: now });
  });

  // POST /api/admin/pages — create new page
  app.post('/api/admin/pages', requireAdmin, (req, res) => {
    const { slug, title, content, meta_description, is_published, position, sort_order } = req.body || {};
    if (!slug || !title || !content) {
      return res.status(400).json({ ok: false, error: 'missing_required_fields' });
    }

    // Validate position if provided
    const validPosition = position || 'footer'; // Default to footer if not specified
    if (!['header', 'footer', 'both'].includes(validPosition)) {
      return res.status(400).json({ ok: false, error: 'invalid_position', message: 'Position must be one of: header, footer, both' });
    }

    // Validate sort_order
    const validSortOrder = sort_order !== undefined ? parseInt(sort_order, 10) : 100; // Default to 100 if not specified
    if (isNaN(validSortOrder) || validSortOrder < 0) {
      return res.status(400).json({ ok: false, error: 'invalid_sort_order', message: 'Sort order must be a non-negative number' });
    }

    // Normalize slug (lowercase, no spaces, only alphanumeric and hyphens)
    const normalizedSlug = slug.toLowerCase().trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Check if slug already exists
    const existing = db.prepare('SELECT id FROM static_pages WHERE slug = ?').get(normalizedSlug);
    if (existing) {
      return res.status(400).json({ ok: false, error: 'duplicate_slug', message: 'A page with this slug already exists' });
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO static_pages (slug, title, content, meta_description, is_published, position, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      normalizedSlug,
      title,
      content,
      meta_description || '',
      is_published ? 1 : 0,
      validPosition,
      validSortOrder,
      now,
      now
    );
    logger.info({ slug: normalizedSlug, user: req.user?.id }, 'Static page created');
    res.json({ ok: true, id: info.lastInsertRowid, slug: normalizedSlug });
  });

  // DELETE /api/admin/pages/:id — delete page
  app.delete('/api/admin/pages/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'invalid_id' });
    const stmt = db.prepare('DELETE FROM static_pages WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes === 0) return res.status(404).json({ ok: false, error: 'not_found' });
    logger.info({ id, user: req.user?.id }, 'Static page deleted');
    res.json({ ok: true, deleted: info.changes });
  });
}

export default { mountAdminPagesRoutes };