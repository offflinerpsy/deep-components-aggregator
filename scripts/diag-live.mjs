#!/usr/bin/env node

/**
 * Скрипт для запуска диагностики живого поиска
 *
 * Использование:
 * node scripts/diag-live.mjs "LM317" --timeout 30000
 *
 * Опции:
 * --timeout - таймаут поиска в миллисекундах (по умолчанию 30000)
 * --output - директория для сохранения результатов (по умолчанию _diag)
 */

import fs from 'node:fs';
import path from 'node:path';
import { liveSearch } from '../src/live/search.mjs';
import { getUsageStats } from '../src/scrape/rotator.mjs';
import { getQueueStats } from '../src/live/queue.mjs';

// Парсинг аргументов командной строки
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return defaultValue;
  return args[index + 1] || defaultValue;
};

// Получаем запрос из первого аргумента
const query = args[0];
if (!query) {
  console.error('Необходимо указать поисковый запрос в качестве первого аргумента');
  console.error('Пример: node scripts/diag-live.mjs "LM317"');
  process.exit(1);
}

// Получаем опции
const timeout = parseInt(getArg('timeout', '30000'), 10);
const outputDir = getArg('output', '_diag');

// Создаем директорию для вывода
try {
  fs.mkdirSync(outputDir, { recursive: true });
} catch (error) {
  console.error(`Ошибка при создании директории ${outputDir}: ${error.message}`);
}

// Создаем директорию для текущего запуска
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(outputDir, timestamp);
try {
  fs.mkdirSync(runDir, { recursive: true });
} catch (error) {
  console.error(`Ошибка при создании директории ${runDir}: ${error.message}`);
}

// Создаем файл для логирования
const logFile = path.join(runDir, 'diag.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Функция для логирования
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} ${message}\n`;

  console.log(message);
  logStream.write(logMessage);
};

// Функция для сохранения объекта в JSON-файл
const saveJson = (filename, data) => {
  try {
    const filePath = path.join(runDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    log(`Сохранен файл: ${filePath}`);
  } catch (error) {
    log(`Ошибка при сохранении файла ${filename}: ${error.message}`);
  }
};

// Запускаем диагностику
log(`=== Диагностика живого поиска ===`);
log(`Запрос: "${query}"`);
log(`Таймаут: ${timeout}ms`);
log(`Директория вывода: ${runDir}`);

// Сохраняем начальное состояние
const initialUsageStats = getUsageStats();
saveJson('initial-usage-stats.json', initialUsageStats);

const initialQueueStats = getQueueStats();
saveJson('initial-queue-stats.json', initialQueueStats);

// Массив для хранения найденных товаров
const foundItems = [];

// Запускаем живой поиск
log(`Запуск живого поиска...`);
const startTime = Date.now();

liveSearch({
  query,
  timeout,

  onItem: (item) => {
    log(`[ITEM] Найден товар: ${item.mpn || item.title}`);
    foundItems.push(item);

    // Сохраняем каждый найденный товар отдельно
    saveJson(`item-${foundItems.length}.json`, item);
  },

  onNote: (note) => {
    log(`[NOTE] ${note.message}`);
  },

  onError: (error) => {
    log(`[ERROR] ${error.message}`);
  },

  onEnd: (result) => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    log(`=== Поиск завершен ===`);
    log(`Длительность: ${duration}ms`);
    log(`Найдено товаров: ${result.count}`);
    log(`Источник завершения: ${result.source}`);

    if (result.trace) {
      log(`Файл трассировки: ${result.trace}`);
    }

    // Сохраняем итоговое состояние
    const finalUsageStats = getUsageStats();
    saveJson('final-usage-stats.json', finalUsageStats);

    const finalQueueStats = getQueueStats();
    saveJson('final-queue-stats.json', finalQueueStats);

    // Сохраняем все найденные товары
    saveJson('all-items.json', foundItems);

    // Сохраняем итоговый результат
    saveJson('result.json', {
      query,
      timestamp: new Date().toISOString(),
      duration,
      itemsCount: foundItems.length,
      result
    });

    // Закрываем лог
    log(`Диагностика завершена. Результаты сохранены в ${runDir}`);
    logStream.end();

    // Выходим из процесса
    process.exit(0);
  }
}).catch((error) => {
  log(`[FATAL] ${error.message}`);

  // Сохраняем ошибку
  saveJson('error.json', {
    message: error.message,
    stack: error.stack
  });

  // Закрываем лог
  logStream.end();

  // Выходим из процесса с ошибкой
  process.exit(1);
});
