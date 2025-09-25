import express from 'express';
import { parseChipDip } from '../../parsers/chipdip.js';

const router = express.Router();

// Добавляем отладочный роут
router.get('/test', (req, res) => {
  res.json({ message: 'Product router is working!' });
});

/**
 * GET /api/product/:mpn
 * Получает информацию о продукте по его MPN
 */
router.get('/:mpn', async (req, res) => {
  console.log('Получен запрос на парсинг:', req.params.mpn);
  
  try {
    const { mpn } = req.params;
    
    // Базовая валидация MPN
    if (!mpn || mpn.trim().length === 0) {
      return res.status(400).json({ error: 'MPN is required' });
    }

    console.log(`Начинаем парсинг для MPN: ${mpn}`);
    
    // Возвращаем тестовые данные вместо реального парсинга
    const productData = {
      title: `Тестовый товар ${mpn}`,
      description: 'Тестовое описание',
      images: ['https://example.com/image.jpg'],
      technical_specs: {
        'Тест': 'Значение'
      }
    };
    
    console.log('Парсинг завершен успешно');
    res.status(200).json(productData);
  } catch (error) {
    console.error('Error fetching product data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data',
      details: error.message 
    });
  }
});

export default router;