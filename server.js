/**
 * Основной файл сервера
 * @module server
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRouter from './src/api/http.mjs';
import { liveSearchHandler } from './src/live/http.mjs';
import { buildIndex, loadIndex } from './src/core/search.mjs';
import { loadAllProducts } from './src/core/store.mjs';
import { refreshRates } from './src/currency/cbr.mjs';

// Получаем директорию текущего модуля
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем приложение Express
const app = express();
const PORT = process.env.PORT || 9201;

// Middleware для логирования запросов
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Middleware для обработки JSON
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.resolve(__dirname, 'public')));

// Serve files from data/files (for datasheets, etc.)
app.use('/files', express.static(path.resolve(__dirname, 'data/files')));
app.use('/pdfs', express.static(path.resolve(__dirname, 'data/files/pdf'))); // Specific for PDFs

// API routes
app.use('/api', apiRouter);

// Live search route
app.get('/api/live/search', liveSearchHandler);

// Redirect root to search UI
app.get('/', (req, res) => {
  res.redirect('/ui/search.html');
});

// Middleware для обработки 404
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Middleware для обработки ошибок
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Инициализация индекса поиска
async function ensureIndex() {
  try {
    console.log('[SERVER] Loading search index...');
    
    // Пытаемся загрузить индекс из файла
    const loaded = await loadIndex();
    
    // Если не удалось загрузить, строим новый
    if (!loaded) {
      console.log('[SERVER] Building search index from products...');
      const products = loadAllProducts();
      console.log(`[SERVER] Found ${products.length} products for indexing`);
      
      if (products.length > 0) {
        await buildIndex(products);
        console.log('[SERVER] Search index built successfully');
      } else {
        console.warn('[SERVER] No products found for indexing');
      }
    }
  } catch (error) {
    console.error('[SERVER] Error initializing search index:', error);
  }
}

// Обновление курсов валют
async function ensureRates() {
  try {
    console.log('[SERVER] Refreshing currency rates...');
    await refreshRates();
  } catch (error) {
    console.error('[SERVER] Error refreshing currency rates:', error);
  }
}

// Запускаем сервер
app.listen(PORT, async () => {
  console.log(`[SERVER] HTTP server running on port ${PORT}`);
  
  // Инициализируем индекс поиска
  await ensureIndex();
  
  // Обновляем курсы валют
  await ensureRates();
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('[SERVER] Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[SERVER] Received SIGTERM, shutting down...');
  process.exit(0);
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Необработанное исключение:`, error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Необработанный reject:`, reason);
});