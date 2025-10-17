// api/admin.notifications.js
// Admin notifications: list and mark as read

import { requireAdmin } from '../middleware/requireAdmin.js';

export function mountAdminNotificationsRoutes(app, db, logger) {
  // GET /api/admin/notifications?limit=20
  app.get('/api/admin/notifications', requireAdmin, (req, res) => {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20')));
    const rows = db.prepare(`
      SELECT id, created_at, type, payload, read_at
      FROM admin_notifications
      ORDER BY (read_at IS NULL) DESC, created_at DESC
      LIMIT ?
    `).all(limit);
    const items = rows.map(r => ({
      id: r.id,
      created_at: r.created_at,
      type: r.type,
      payload: JSON.parse(r.payload),
      read: r.read_at ? true : false
    }));
    res.json({ ok: true, items });
  });

  // PATCH /api/admin/notifications/:id/read { read: true }
  app.patch('/api/admin/notifications/:id/read', requireAdmin, (req, res) => {
    const { id } = req.params;
    if (!id || id.length < 8) {
      return res.status(400).json({ ok: false, error: 'invalid_id' });
    }
    const now = Date.now();
    const stmt = db.prepare('UPDATE admin_notifications SET read_at = ? WHERE id = ?');
    const info = stmt.run(now, id);
    if (info.changes === 0) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }
    res.json({ ok: true, id, read_at: now });
  });
}

export default { mountAdminNotificationsRoutes };
