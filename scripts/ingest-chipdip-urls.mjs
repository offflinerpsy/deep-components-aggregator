#!/usr/bin/env node

/**
 * Скрипт для чанкового импорта URL'ов ChipDip
 *
 * Использование:
 * node scripts/ingest-chipdip-urls.mjs --glob "loads/urls/*.txt" --concurrency 4 --batch 100
 *
 * Опции:
 * --glob - паттерн для поиска файлов с URL'ами (по умолчанию "loads/urls/*.txt")
 * --concurrency - количество параллельных задач (по умолчанию 4)
 * --batch - размер пакета URL'ов (по умолчанию 100)
 * --limit - ограничение на количество обрабатываемых URL'ов (по умолчанию без ограничений)
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { glob } from 'glob';
import { nanoid } from 'nanoid';
import { fetchHtmlCached } from '../src/scrape/cache.mjs';
import { toCanon } from '../src/parsers/chipdip/product.mjs';
import { saveProduct } from '../src/core/store.mjs';
import { addScrapeTask, addParseTask } from '../src/live/queue.mjs';

// Парсинг аргументов командной строки
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return defaultValue;
  return args[index + 1] || defaultValue;
};

const globPattern = getArg('glob', 'loads/urls/*.txt');
const concurrency = parseInt(getArg('concurrency', '4'), 10);
const batchSize = parseInt(getArg('batch', '100'), 10);
const limit = parseInt(getArg('limit', '0'), 10); // 0 = без ограничений

// Создание директории для логов
const logsDir = path.resolve('logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch (error) {
  console.error(`Error creating logs directory: ${error.message}`);
}

// Файл для логирования
const logFile = path.join(logsDir, `ingest-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Функция для логирования
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} ${message}\n`;

  console.log(message);
  logStream.write(logMessage);
};

// Статистика
const stats = {
  totalFiles: 0,
  totalUrls: 0,
  processedUrls: 0,
  successUrls: 0,
  failedUrls: 0,
  skippedUrls: 0,
  startTime: Date.now()
};

// Функция для обработки одного URL
const processUrl = async (url) => {
  try {
    stats.processedUrls++;

    // Проверяем, является ли URL страницей продукта ChipDip
    if (!url.includes('chipdip.ru/product') && !url.includes('chipdip.ru/product0')) {
      log(`[SKIP] Not a ChipDip product URL: ${url}`);
      stats.skippedUrls++;
      return null;
    }

    // Получаем HTML страницы
    const scrapeTask = async () => {
      log(`[SCRAPE] Fetching ${url}`);
      return fetchHtmlCached(url);
    };

    const htmlResult = await addScrapeTask(scrapeTask, { url, id: nanoid(8) });

    if (!htmlResult.ok) {
      log(`[ERROR] Failed to fetch HTML for ${url}: ${htmlResult.status || htmlResult.error}`);
      stats.failedUrls++;
      return null;
    }

    // Парсим HTML в канонический формат
    const parseTask = async () => {
      log(`[PARSE] Parsing ${url}`);
      return toCanon({ url, html: htmlResult.html });
    };

    const product = await addParseTask(parseTask, { url, id: nanoid(8) });

    if (!product || (!product.mpn && !product.chipdip_id)) {
      log(`[ERROR] Failed to parse product data from ${url}`);
      stats.failedUrls++;
      return null;
    }

    // Сохраняем продукт
    const savedProduct = await saveProduct(product);

    if (savedProduct) {
      log(`[SUCCESS] Product saved: ${savedProduct.mpn || savedProduct.chipdip_id}`);
      stats.successUrls++;
      return savedProduct;
    } else {
      log(`[ERROR] Failed to save product for ${url}`);
      stats.failedUrls++;
      return null;
    }
  } catch (error) {
    log(`[ERROR] Exception processing ${url}: ${error.message}`);
    stats.failedUrls++;
    return null;
  }
};

// Функция для обработки пакета URL'ов
const processBatch = async (urls) => {
  log(`[BATCH] Processing batch of ${urls.length} URLs`);

  const results = await Promise.all(
    urls.map(url => processUrl(url).catch(error => {
      log(`[ERROR] Batch processing error for ${url}: ${error.message}`);
      stats.failedUrls++;
      return null;
    }))
  );

  return results.filter(Boolean);
};

// Функция для обработки файла с URL'ами
const processFile = async (filePath) => {
  log(`[FILE] Processing file: ${filePath}`);

  return new Promise((resolve, reject) => {
    try {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      let urls = [];
      let processed = 0;
      let limitReached = false;

      rl.on('line', async (line) => {
        // Пропускаем пустые строки и комментарии
        if (!line.trim() || line.trim().startsWith('#')) {
          return;
        }

        // Проверяем лимит
        if (limit > 0 && stats.totalUrls >= limit) {
          if (!limitReached) {
            log(`[LIMIT] Reached limit of ${limit} URLs`);
            limitReached = true;
          }
          return;
        }

        stats.totalUrls++;
        urls.push(line.trim());

        // Если накопили достаточно URL'ов, обрабатываем пакет
        if (urls.length >= batchSize) {
          rl.pause(); // Приостанавливаем чтение, пока обрабатываем пакет

          const batchUrls = urls;
          urls = [];

          try {
            await processBatch(batchUrls);
            processed += batchUrls.length;
            log(`[PROGRESS] Processed ${processed} URLs from ${filePath}`);
          } catch (error) {
            log(`[ERROR] Batch processing error: ${error.message}`);
          }

          rl.resume(); // Возобновляем чтение
        }
      });

      rl.on('close', async () => {
        // Обрабатываем оставшиеся URL'ы
        if (urls.length > 0) {
          try {
            await processBatch(urls);
            processed += urls.length;
            log(`[PROGRESS] Processed ${processed} URLs from ${filePath}`);
          } catch (error) {
            log(`[ERROR] Batch processing error: ${error.message}`);
          }
        }

        log(`[FILE] Finished processing file: ${filePath}, processed ${processed} URLs`);
        resolve(processed);
      });

      rl.on('error', (error) => {
        log(`[ERROR] Error reading file ${filePath}: ${error.message}`);
        reject(error);
      });
    } catch (error) {
      log(`[ERROR] Error processing file ${filePath}: ${error.message}`);
      reject(error);
    }
  });
};

// Основная функция
const main = async () => {
  try {
    log(`[START] Starting ChipDip URL ingestion`);
    log(`[CONFIG] Glob pattern: ${globPattern}, Concurrency: ${concurrency}, Batch size: ${batchSize}, Limit: ${limit || 'none'}`);

    // Находим файлы по паттерну
    const files = await glob(globPattern);
    stats.totalFiles = files.length;

    if (files.length === 0) {
      log(`[WARNING] No files found matching pattern: ${globPattern}`);
      return;
    }

    log(`[INFO] Found ${files.length} files matching pattern: ${globPattern}`);

    // Обрабатываем файлы последовательно
    for (const file of files) {
      await processFile(file);

      // Проверяем лимит
      if (limit > 0 && stats.totalUrls >= limit) {
        log(`[LIMIT] Reached limit of ${limit} URLs, stopping`);
        break;
      }
    }

    // Выводим итоговую статистику
    const duration = (Date.now() - stats.startTime) / 1000;
    log(`[FINISH] ChipDip URL ingestion completed in ${duration.toFixed(2)}s`);
    log(`[STATS] Total files: ${stats.totalFiles}`);
    log(`[STATS] Total URLs: ${stats.totalUrls}`);
    log(`[STATS] Processed URLs: ${stats.processedUrls}`);
    log(`[STATS] Successful URLs: ${stats.successUrls}`);
    log(`[STATS] Failed URLs: ${stats.failedUrls}`);
    log(`[STATS] Skipped URLs: ${stats.skippedUrls}`);
    log(`[STATS] Success rate: ${stats.processedUrls > 0 ? (stats.successUrls / stats.processedUrls * 100).toFixed(2) : 0}%`);

    // Закрываем лог
    logStream.end();
  } catch (error) {
    log(`[FATAL] ${error.message}`);
    logStream.end();
    process.exit(1);
  }
};

// Запускаем основную функцию
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  logStream.end();
  process.exit(1);
});
