#!/usr/bin/env node

/**
 * Скрипт для инжеста данных с ChipDip
 *
 * Использование:
 * node scripts/ingest-chipdip.mjs [--limit=N] [--force]
 *
 * Опции:
 * --limit=N - ограничить количество URL для обработки (по умолчанию без ограничений)
 * --force - принудительно обновить кеш HTML (по умолчанию false)
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { getHtmlCached } from '../src/scrape/cache.mjs';
import { parseChipDipProduct } from '../src/parsers/chipdip/product.mjs';
import { getRates, toRUB } from '../src/currency/cbr.mjs';
import { fetch } from 'undici';
import crypto from 'node:crypto';

// Константы
const OUT_DIR = 'data/db/products';
const PDF_DIR = 'data/files/pdf';
const INGEST_REPORT_PATH = 'data/state/ingest-report.json';
const URL_DIR = 'loads/urls';
const TTL = 7 * 24 * 3600 * 1000; // 7 дней

// Создаем необходимые директории
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(PDF_DIR, { recursive: true });
mkdirSync(path.dirname(INGEST_REPORT_PATH), { recursive: true });

/**
 * Загружает PDF файл и сохраняет его локально
 * @param {string} pdfUrl URL PDF файла
 * @returns {Promise<string|null>} Локальный путь к PDF или null в случае ошибки
 */
async function downloadPdf(pdfUrl) {
  const hash = crypto.createHash('sha1').update(pdfUrl).digest('hex');
  const filePath = `${PDF_DIR}/${hash}.pdf`;

  // Если файл уже существует, возвращаем его путь
  if (existsSync(filePath)) {
    return `/files/pdf/${hash}.pdf`;
  }

  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(filePath, buffer);

    return `/files/pdf/${hash}.pdf`;
  } catch (e) {
    console.error(`Error downloading PDF ${pdfUrl}: ${e.message}`);
    return null;
  }
}

/**
 * Генератор для чтения URL из файлов в директории
 * @param {string} dir Директория с файлами URL
 * @yields {string} URL
 */
function* linesFromDir(dir) {
  // Проверяем существование директории
  if (!existsSync(dir)) {
    console.warn(`Directory ${dir} does not exist`);
    return;
  }

  // Читаем все файлы с URL
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.txt')) continue;

    const body = readFileSync(`${dir}/${f}`, 'utf8');
    for (const line of body.split(/\r?\n/)) {
      const u = line.trim();
      if (u && u.includes('chipdip.ru')) yield u;
    }
  }
}

/**
 * Основная функция инжеста
 */
async function main() {
  // Парсим аргументы командной строки
  const args = process.argv.slice(2);
  let limit = 0;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10) || 0;
    } else if (arg === '--force') {
      force = true;
    }
  }

  console.log(`Starting ChipDip ingest${limit ? ` with limit ${limit}` : ''} ${force ? '(force update)' : ''}`);

  // Загружаем курсы валют
  const rates = getRates();
  console.log(`Loaded currency rates: ${Object.keys(rates).length} currencies`);

  // Статистика
  let totals = 0;
  let ok = 0;
  let fail = 0;
  let cached = 0;
  let cacheBytes = 0;
  const seen = new Set();

  // Собираем URL для обработки
  const urls = Array.from(linesFromDir(URL_DIR));
  console.log(`Found ${urls.length} URLs to process`);

  // Ограничиваем количество URL, если указан лимит
  const urlsToProcess = limit > 0 ? urls.slice(0, limit) : urls;

  // Обрабатываем каждый URL
  for (const url of urlsToProcess) {
    totals++;
    console.log(`[${totals}/${urlsToProcess.length}] Processing ${url}`);

    try {
      // Получаем HTML из кеша или скачиваем
      const result = await getHtmlCached(url, {
        ttl: TTL,
        params: {},
        force
      });

      // Обновляем статистику кеша
      if (result.fromCache) {
        cached++;
        console.log(`  Cache hit: ${result.size} bytes`);
      } else {
        console.log(`  Downloaded: ${result.size} bytes from ${result.provider}`);
      }
      cacheBytes += result.size || 0;

      // Парсим HTML
      const canon = parseChipDipProduct(result.html, url);

      // Проверяем наличие MPN
      if (!canon.mpn) {
        throw new Error('no mpn');
      }

      // Скачиваем PDF документы
      if (Array.isArray(canon.docs)) {
        for (const doc of canon.docs) {
          if (doc._src) {
            const localPath = await downloadPdf(doc._src);
            if (localPath) {
              doc.url = localPath;
            }
            // Удаляем временные поля
            delete doc._src;
            delete doc._hash;
          }
        }
      }

      // Конвертируем цены в рубли
      if (Array.isArray(canon.offers)) {
        for (const offer of canon.offers) {
          if (offer.currency && offer.currency !== 'RUB' && offer.price) {
            const rubPrice = toRUB({ amount: offer.price, currency: offer.currency });
            if (rubPrice !== null) {
              offer.price_rub = Math.round(rubPrice);
            }
          }
        }
      }

      // Сохраняем результат, если MPN уникальный
      if (!seen.has(canon.mpn)) {
        const safeFilename = canon.mpn.replace(/[\/\\?%*:|"<>]/g, '_');
        writeFileSync(`${OUT_DIR}/${safeFilename}.json`, JSON.stringify(canon, null, 2));
        seen.add(canon.mpn);
        console.log(`  Saved: ${canon.mpn} (${canon.brand})`);
        ok++;
      } else {
        console.log(`  Skipped duplicate: ${canon.mpn}`);
      }
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      fail++;
    }

    // Добавляем небольшую паузу между запросами
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Формируем отчет
  const report = {
    ts: Date.now(),
    totals,
    ok,
    fail,
    cached,
    cacheBytes,
    unique: seen.size
  };

  // Сохраняем отчет
  writeFileSync(INGEST_REPORT_PATH, JSON.stringify(report, null, 2));

  // Выводим итоги
  console.log('\nIngest completed:');
  console.log(`  Total URLs: ${totals}`);
  console.log(`  Successfully processed: ${ok}`);
  console.log(`  Failed: ${fail}`);
  console.log(`  Cached: ${cached}`);
  console.log(`  Cache size: ${Math.round(cacheBytes / 1024 / 1024)} MB`);
  console.log(`  Unique products: ${seen.size}`);
}

// Запускаем основную функцию
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
