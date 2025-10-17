// api/admin.settings.js
// Admin endpoints for managing pricing policy in settings table

import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { settingsReadsTotal, settingsUpdatesTotal } from '../metrics/registry.js';

// AJV setup
const ajv = new Ajv({ allErrors: true, strict: true });
ajv.addFormat('email', {
  type: 'string',
  validate: (data) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data);
  }
});

// Load schema for PATCH body
const pricingSchema = JSON.parse(
  readFileSync(new URL('../schemas/pricing.settings.schema.json', import.meta.url), 'utf8')
);
const validatePricing = ajv.compile(pricingSchema);

// Load schema for notifications settings
const notificationsSchema = JSON.parse(
  readFileSync(new URL('../schemas/notifications.settings.schema.json', import.meta.url), 'utf8')
);
const validateNotifications = ajv.compile(notificationsSchema);

/**
 * GET /api/admin/settings/pricing
 * Returns current pricing policy from settings table
 */
export function getPricingSettingsHandler(db, logger) {
  return async (req, res) => {
    try {
      const row = db.prepare('SELECT value, updated_at FROM settings WHERE key = ?').get('pricing_policy');
      if (!row) {
        return res.status(404).json({ ok: false, error: 'not_found', message: 'pricing_policy not set' });
      }

      let policy;
      try {
        policy = JSON.parse(row.value);
      } catch (e) {
        logger.error({ err: e }, 'Invalid JSON in settings.pricing_policy');
        return res.status(500).json({ ok: false, error: 'config_error', message: 'Invalid pricing policy JSON' });
      }

      settingsReadsTotal.inc({ key: 'pricing_policy' });
      res.json({ ok: true, key: 'pricing_policy', policy, updated_at: row.updated_at });
    } catch (e) {
      logger.error({ err: e }, 'Failed to read pricing settings');
      res.status(500).json({ ok: false, error: 'server_error', message: e.message });
    }
  };
}

/**
 * PATCH /api/admin/settings/pricing
 * Body: { markup_percent: number >=0, markup_fixed_rub: number >=0 }
 */
export function patchPricingSettingsHandler(db, logger) {
  return async (req, res) => {
    // Validate body
    const valid = validatePricing(req.body);
    if (!valid) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        errors: validatePricing.errors.map(err => ({ field: err.instancePath || '(root)', message: err.message, params: err.params }))
      });
    }

    const { markup_percent, markup_fixed_rub } = req.body;
    const now = Date.now();
    const value = JSON.stringify({ markup_percent, markup_fixed_rub });

    try {
      const update = db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?');
      const insert = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)');

      const tx = db.transaction(() => {
        const info = update.run(value, now, 'pricing_policy');
        if (info.changes === 0) {
          insert.run('pricing_policy', value, now);
        }
      });
      tx();

      settingsUpdatesTotal.inc({ key: 'pricing_policy' });
      logger.info({ userId: req.user?.id, markup_percent, markup_fixed_rub }, 'Pricing policy updated');

      res.json({ ok: true, key: 'pricing_policy', policy: { markup_percent, markup_fixed_rub }, updated_at: now });
    } catch (e) {
      logger.error({ err: e }, 'Failed to update pricing settings');
      res.status(500).json({ ok: false, error: 'server_error', message: e.message });
    }
  };
}

/**
 * Mount admin settings routes
 */
export function mountAdminSettingsRoutes(app, db, logger) {
  app.get('/api/admin/settings/pricing', requireAdmin, getPricingSettingsHandler(db, logger));
  app.patch('/api/admin/settings/pricing', requireAdmin, patchPricingSettingsHandler(db, logger));

  // GET /api/admin/settings/notifications
  app.get('/api/admin/settings/notifications', requireAdmin, async (req, res) => {
    const row = db.prepare('SELECT value, updated_at FROM settings WHERE key = ?').get('notifications');
    if (!row) {
      return res.json({ ok: true, key: 'notifications', settings: { admin_notify_email: null }, updated_at: null });
    }
    let settings;
    try {
      settings = JSON.parse(row.value);
    } catch (e) {
      logger.error({ err: e }, 'Invalid JSON in settings.notifications');
      return res.status(500).json({ ok: false, error: 'config_error', message: 'Invalid notifications JSON' });
    }
    settingsReadsTotal.inc({ key: 'notifications' });
    res.json({ ok: true, key: 'notifications', settings, updated_at: row.updated_at });
  });

  // PATCH /api/admin/settings/notifications
  app.patch('/api/admin/settings/notifications', requireAdmin, async (req, res) => {
    const valid = validateNotifications(req.body);
    if (!valid) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        errors: validateNotifications.errors.map(err => ({ field: err.instancePath || '(root)', message: err.message, params: err.params }))
      });
    }

    const now = Date.now();
    const value = JSON.stringify({
      admin_notify_email: req.body.admin_notify_email ?? null
    });

    const update = db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?');
    const insert = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
    const tx = db.transaction(() => {
      const info = update.run(value, now, 'notifications');
      if (info.changes === 0) insert.run('notifications', value, now);
    });
    tx();
    settingsUpdatesTotal.inc({ key: 'notifications' });
    logger.info({ userId: req.user?.id }, 'Notifications settings updated');
    res.json({ ok: true, key: 'notifications', settings: JSON.parse(value), updated_at: now });
  });
}

export default {
  getPricingSettingsHandler,
  patchPricingSettingsHandler,
  mountAdminSettingsRoutes
};
