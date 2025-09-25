import express from 'express';
import dotenv from 'dotenv';
import { parseChipDip } from './parsers/chipdip.js';

// Загружаем переменные окружения из .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(express.json());

// Простой роут для проверки работоспособности
app.get('/', (req, res) => {
  res.send('Aggregator Server is running!');
});

// Тестовый роут для API
app.get('/api/product/test', (req, res) => {
  res.json({ message: 'Product API is working!' });
});

// Основной роут для парсинга
app.get('/api/product/:mpn', async (req, res) => {
  try {
    const { mpn } = req.params;
    
    // Базовая валидация MPN
    if (!mpn || mpn.trim().length === 0) {
      return res.status(400).json({ error: 'MPN is required' });
    }

    console.log(`Начинаем парсинг для MPN: ${mpn}`);
    
    // Используем реальный парсер
    const productData = await parseChipDip(mpn);
    
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

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Запускаем сервер
app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});