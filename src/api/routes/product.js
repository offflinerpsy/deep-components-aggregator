import express from 'express';
import { parseChipDip } from '../../parsers/chipdip.js';

const router = express.Router();

/**
 * GET /api/product/:mpn
 * Получает информацию о продукте по его MPN
 */
router.get('/:mpn', async (req, res) => {
  try {
    const { mpn } = req.params;
    
    // Базовая валидация MPN
    if (!mpn || mpn.trim().length === 0) {
      return res.status(400).json({ error: 'MPN is required' });
    }

    const productData = await parseChipDip(mpn);
    res.status(200).json(productData);
  } catch (error) {
    console.error('Error fetching product data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

export default router;
