/**
 * Скрипт для обработки большого файла с URL ChipDip
 * и разбиения на удобные чанки или сохранения в базу данных
 *
 * Использование:
 * node scripts/process-urls.mjs <input-file> <output-dir> [--chunk-size=1000] [--format=txt|json|sqlite]
 *
 * Пример:
 * node scripts/process-urls.mjs /path/to/big-file.txt /path/to/output/dir --chunk-size=1000 --format=json
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Получаем аргументы командной строки
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Использование: node process-urls.mjs <input-file> <output-dir> [--chunk-size=1000] [--format=txt|json|sqlite]');
  process.exit(1);
}

const inputFile = args[0];
const outputDir = args[1];

// Парсим опции
let chunkSize = 1000;
let format = 'txt';

for (let i = 2; i < args.length; i++) {
  const arg = args[i];

  if (arg.startsWith('--chunk-size=')) {
    chunkSize = parseInt(arg.split('=')[1], 10);

    if (isNaN(chunkSize) || chunkSize <= 0) {
      console.error('Ошибка: размер чанка должен быть положительным числом');
      process.exit(1);
    }
  } else if (arg.startsWith('--format=')) {
    format = arg.split('=')[1].toLowerCase();

    if (!['txt', 'json', 'sqlite'].includes(format)) {
      console.error('Ошибка: формат должен быть txt, json или sqlite');
      process.exit(1);
    }
  }
}

// Проверяем существование входного файла
if (!fs.existsSync(inputFile)) {
  console.error(`Ошибка: файл ${inputFile} не существует`);
  process.exit(1);
}

// Создаем выходную директорию, если она не существует
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Функция для извлечения ID продукта из URL
function extractProductId(url) {
  const match = url.match(/\/product0?\/([A-Za-z0-9-]+)/);
  return match ? match[1] : null;
}

// Функция для создания хеша URL
function createUrlHash(url) {
  return createHash('md5').update(url).digest('hex');
}

// Функция для обработки URL в формате TXT
async function processTxt(inputFile, outputDir, chunkSize) {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let urls = [];
  let chunkIndex = 0;
  let totalUrls = 0;

  console.log(`Обработка файла ${inputFile} в формате TXT...`);

  for await (const line of rl) {
    const url = line.trim();

    if (url && url.includes('chipdip.ru')) {
      urls.push(url);
      totalUrls++;

      if (urls.length >= chunkSize) {
        const chunkFile = path.join(outputDir, `chipdip-chunk-${chunkIndex}.txt`);
        fs.writeFileSync(chunkFile, urls.join('\n'), 'utf8');

        console.log(`Записан чанк ${chunkIndex} (${urls.length} URL) в файл ${chunkFile}`);

        urls = [];
        chunkIndex++;
      }
    }
  }

  // Записываем оставшиеся URL
  if (urls.length > 0) {
    const chunkFile = path.join(outputDir, `chipdip-chunk-${chunkIndex}.txt`);
    fs.writeFileSync(chunkFile, urls.join('\n'), 'utf8');

    console.log(`Записан чанк ${chunkIndex} (${urls.length} URL) в файл ${chunkFile}`);
  }

  console.log(`Обработка завершена. Всего обработано ${totalUrls} URL, создано ${chunkIndex + 1} чанков.`);
}

// Функция для обработки URL в формате JSON
async function processJson(inputFile, outputDir, chunkSize) {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let products = [];
  let chunkIndex = 0;
  let totalUrls = 0;

  console.log(`Обработка файла ${inputFile} в формате JSON...`);

  for await (const line of rl) {
    const url = line.trim();

    if (url && url.includes('chipdip.ru')) {
      const id = extractProductId(url);

      if (id) {
        products.push({
          url,
          id,
          hash: createUrlHash(url),
          timestamp: Date.now()
        });

        totalUrls++;

        if (products.length >= chunkSize) {
          const chunkFile = path.join(outputDir, `chipdip-chunk-${chunkIndex}.json`);
          fs.writeFileSync(chunkFile, JSON.stringify(products, null, 2), 'utf8');

          console.log(`Записан чанк ${chunkIndex} (${products.length} URL) в файл ${chunkFile}`);

          products = [];
          chunkIndex++;
        }
      }
    }
  }

  // Записываем оставшиеся URL
  if (products.length > 0) {
    const chunkFile = path.join(outputDir, `chipdip-chunk-${chunkIndex}.json`);
    fs.writeFileSync(chunkFile, JSON.stringify(products, null, 2), 'utf8');

    console.log(`Записан чанк ${chunkIndex} (${products.length} URL) в файл ${chunkFile}`);
  }

  // Создаем индексный файл
  const indexFile = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexFile, JSON.stringify({
    totalChunks: chunkIndex + 1,
    totalUrls,
    chunkSize,
    format: 'json',
    timestamp: Date.now()
  }, null, 2), 'utf8');

  console.log(`Обработка завершена. Всего обработано ${totalUrls} URL, создано ${chunkIndex + 1} чанков.`);
}

// Функция для обработки URL в формате SQLite
async function processSqlite(inputFile, outputDir, chunkSize) {
  // В этой реализации мы создаем SQL-скрипт для импорта в SQLite
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const sqlFile = path.join(outputDir, 'chipdip-urls.sql');
  const sqlStream = fs.createWriteStream(sqlFile);

  // Записываем заголовок SQL-файла
  sqlStream.write(`-- ChipDip URLs для импорта в SQLite
-- Создано: ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS chipdip_urls (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

BEGIN TRANSACTION;
`);

  let totalUrls = 0;

  console.log(`Обработка файла ${inputFile} в формате SQLite...`);

  for await (const line of rl) {
    const url = line.trim();

    if (url && url.includes('chipdip.ru')) {
      const id = extractProductId(url);

      if (id) {
        const hash = createUrlHash(url);
        const timestamp = Date.now();

        // Экранируем специальные символы в URL
        const escapedUrl = url.replace(/'/g, "''");

        sqlStream.write(`INSERT OR REPLACE INTO chipdip_urls (id, url, hash, timestamp) VALUES ('${id}', '${escapedUrl}', '${hash}', ${timestamp});\n`);

        totalUrls++;

        if (totalUrls % chunkSize === 0) {
          console.log(`Обработано ${totalUrls} URL...`);
        }
      }
    }
  }

  // Завершаем транзакцию
  sqlStream.write(`COMMIT;\n`);
  sqlStream.end();

  console.log(`Обработка завершена. Всего обработано ${totalUrls} URL, создан SQL-файл ${sqlFile}.`);
}

// Выбираем формат обработки
async function processFile() {
  console.log(`Начинаем обработку файла ${inputFile} в формате ${format} с размером чанка ${chunkSize}...`);

  switch (format) {
    case 'txt':
      await processTxt(inputFile, outputDir, chunkSize);
      break;
    case 'json':
      await processJson(inputFile, outputDir, chunkSize);
      break;
    case 'sqlite':
      await processSqlite(inputFile, outputDir, chunkSize);
      break;
    default:
      console.error(`Неподдерживаемый формат: ${format}`);
      process.exit(1);
  }
}

// Запускаем обработку
processFile().catch(error => {
  console.error('Ошибка при обработке файла:', error);
  process.exit(1);
});
