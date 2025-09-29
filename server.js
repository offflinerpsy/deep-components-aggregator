/**
 * Основной файл сервера Deep Components Aggregator
 */

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import apiRouter from './src/api/http.mjs';

// Создаем директорию для логов
const logsDir = path.resolve('logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Создаем поток для записи логов
const logStream = fs.createWriteStream(path.join(logsDir, 'server.log'), { flags: 'a' });

// Функция для логирования
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
};

// Обработчик необработанных исключений
process.on('uncaughtException', (error) => {
  log(`Необработанное исключение: ${error.message}`);
  log(error.stack);
});

// Обработчик необработанных отклонений промисов
process.on('unhandledRejection', (error) => {
  log(`Необработанное отклонение промиса: ${error.message}`);
  log(error.stack);
});

// Создаем приложение Express
const app = express();

// Настройка CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Логирование запросов
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// Обработка ошибок JSON
app.use(express.json({
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

// Статические файлы
app.use(express.static('public'));

// API роутер
app.use('/api', apiRouter);

// Обработчик 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Обработчик ошибок
app.use((error, req, res, next) => {
  log(`Ошибка: ${error.message}`);
  log(error.stack);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message
  });
});

// Запуск сервера
const port = process.env.PORT || 9201;

const server = app.listen(port, () => {
  log(`HTTP ${port}`);
});

// Graceful shutdown
const shutdown = () => {
  log('Получен сигнал завершения работы');
  
  server.close(() => {
    log('HTTP сервер остановлен');
    logStream.end();
    process.exit(0);
  });
  
  // Принудительное завершение через 10 секунд
  setTimeout(() => {
    log('Принудительное завершение');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);