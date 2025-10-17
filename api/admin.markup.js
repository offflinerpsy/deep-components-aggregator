/**
 * Admin API for markup management
 * Управление наценкой через админку
 */

import { getMarkupPercentage, updateMarkupPercentage } from '../src/utils/markup.mjs';

export function mountAdminMarkupRoutes(app, { db, logger, requireAdmin }) {
  // GET /api/admin/markup - получить текущую наценку
  app.get('/api/admin/markup', requireAdmin, async (req, res) => {
    try {
      const markup = getMarkupPercentage();
      res.json({
        ok: true,
        markup_percentage: markup,
        message: `Текущая наценка: ${markup}%`
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to get markup percentage');
      res.status(500).json({
        ok: false,
        error: 'Failed to get markup percentage'
      });
    }
  });

  // POST /api/admin/markup - обновить наценку
  app.post('/api/admin/markup', requireAdmin, async (req, res) => {
    try {
      const { markup_percentage } = req.body;

      if (typeof markup_percentage !== 'number' || markup_percentage < 0 || markup_percentage > 1000) {
        return res.status(400).json({
          ok: false,
          error: 'Markup percentage must be a number between 0 and 1000'
        });
      }

      const success = updateMarkupPercentage(markup_percentage);

      if (success) {
        res.json({
          ok: true,
          markup_percentage,
          message: `Наценка обновлена: ${markup_percentage}%`
        });
      } else {
        res.status(500).json({
          ok: false,
          error: 'Failed to update markup percentage'
        });
      }
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to update markup percentage');
      res.status(500).json({
        ok: false,
        error: 'Failed to update markup percentage'
      });
    }
  });
}
