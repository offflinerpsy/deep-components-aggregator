import express from 'express';
import dotenv from 'dotenv';
import productRouter from './api/routes/product.js';

// Загружаем переменные окружения из .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(express.json());

// Подключаем роутер продуктов
app.use('/api/product', productRouter);

// Простой роут для проверки работоспособности
app.get('/', (req, res) => {
  res.send('Aggregator Server is running!');
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