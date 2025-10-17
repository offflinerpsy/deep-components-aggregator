/**
 * Settings API endpoints
 */

import { getPublicSettings, getSetting } from '../src/utils/settings.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

/**
 * Mount settings routes to Express app
 * @param {Object} app Express app
 */
export function mountSettingsRoutes(app) {
  // Public settings endpoint
  app.get('/api/settings/public', async (req, res) => {
    try {
      const settings = await getPublicSettings();
      res.json({ ok: true, settings });
    } catch (error) {
      console.error('Error getting public settings:', error);
      res.status(500).json({ ok: false, error: 'Failed to get settings' });
    }
  });

  // Get a specific public setting
  app.get('/api/settings/public/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await getSetting(key);

      if (setting === null) {
        return res.status(404).json({ ok: false, error: 'Setting not found' });
      }

      res.json({ ok: true, key, value: setting });
    } catch (error) {
      console.error(`Error getting setting ${req.params.key}:`, error);
      res.status(500).json({ ok: false, error: 'Failed to get setting' });
    }
  });

  // Admin-only endpoint to get any setting
  app.get('/api/admin/settings/:key', requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await getSetting(key);

      if (setting === null) {
        return res.status(404).json({ ok: false, error: 'Setting not found' });
      }

      res.json({ ok: true, key, value: setting });
    } catch (error) {
      console.error(`Error getting admin setting ${req.params.key}:`, error);
      res.status(500).json({ ok: false, error: 'Failed to get setting' });
    }
  });
}

export default { mountSettingsRoutes };



