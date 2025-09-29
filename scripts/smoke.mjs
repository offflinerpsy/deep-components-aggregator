#!/usr/bin/env node

/**
 * Скрипт для smoke-тестирования API и UI
 *
 * Использование:
 * node scripts/smoke.mjs [--host=http://localhost:9201] [--verbose] [--timeout=10000]
 *
 * Опции:
 * --host=URL - URL хоста для тестирования (по умолчанию http://localhost:9201)
 * --verbose - выводить подробную информацию
 * --timeout - таймаут для запросов в миллисекундах (по умолчанию 10000)
 */

import { fetch } from 'undici';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// Парсинг аргументов командной строки
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  if (!arg) return defaultValue;
  return arg.split('=')[1];
};

const hasFlag = (name) => args.includes(`--${name}`);

// Константы
const DIAG_DIR = '_diag';
const DEFAULT_HOST = 'http://localhost:9201';
const DEFAULT_TIMEOUT = 10000;

// Опции
const host = getArg('host', DEFAULT_HOST);
const verbose = hasFlag('verbose');
const timeout = parseInt(getArg('timeout', DEFAULT_TIMEOUT), 10);

// Создаем директорию для диагностики
mkdirSync(DIAG_DIR, { recursive: true });

// Функция для логирования
const log = (message, isVerbose = false) => {
  if (!isVerbose || verbose) {
    console.log(message);
  }
};

/**
 * Выполняет HTTP-запрос и возвращает результат
 * @param {string} url URL для запроса
 * @param {object} options Опции запроса
 * @returns {Promise<object>} Результат запроса
 */
async function fetchWithTimeout(url, options = {}) {
  const { timeout: requestTimeout = timeout, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });

    return {
      ok: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text()
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Выполняет тест для указанного URL
 * @param {string} path Путь для запроса
 * @param {function} validator Функция проверки результата
 * @param {string} name Название теста
 * @returns {Promise<boolean>} Результат теста
 */
async function runTest(path, validator, name) {
  const url = `${host}${path}`;
  log(`Testing ${name}: ${url}...`);

  try {
    const startTime = Date.now();
    const result = await fetchWithTimeout(url);
    const duration = Date.now() - startTime;

    log(`Request completed in ${duration}ms`, true);

    if (!result.ok) {
      log(`  FAIL: HTTP ${result.status} ${result.error || ''}`);
      return false;
    }

    let body;
    try {
      body = JSON.parse(result.body);
    } catch (error) {
      body = result.body;
    }

    const validationResult = await validator(body, result);
    if (validationResult === true) {
      log(`  PASS: ${name} (${duration}ms)`);
      return true;
    } else {
      log(`  FAIL: ${validationResult}`);
      return false;
    }
  } catch (error) {
    log(`  ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Выполняет тест для SSE-запроса
 * @param {string} path Путь для запроса
 * @param {function} validator Функция проверки события
 * @param {string} name Название теста
 * @returns {Promise<boolean>} Результат теста
 */
async function runSSETest(path, validator, name) {
  const url = `${host}${path}`;
  log(`Testing SSE ${name}: ${url}...`);

  return new Promise((resolve) => {
    let eventCount = 0;
    let itemCount = 0;
    let success = false;
    let timeoutId;

    const eventSource = new EventSource(url);
    const startTime = Date.now();

    eventSource.onmessage = (event) => {
      eventCount++;
      log(`Received generic message: ${event.data}`, true);
    };

    eventSource.addEventListener('item', (event) => {
      itemCount++;
      log(`Received item event: ${event.data.substring(0, 100)}...`, true);

      try {
        const data = JSON.parse(event.data);
        const validationResult = validator(data, 'item');

        if (validationResult === true) {
          success = true;
          log(`  PASS: Found valid item in SSE stream`);
          clearTimeout(timeoutId);
          eventSource.close();
          resolve(true);
        }
      } catch (error) {
        log(`  ERROR parsing item event: ${error.message}`, true);
      }
    });

    eventSource.addEventListener('error', (event) => {
      log(`SSE error: ${JSON.stringify(event)}`, true);
    });

    eventSource.addEventListener('done', (event) => {
      log(`Received done event: ${event.data}`, true);

      try {
        const data = JSON.parse(event.data);
        log(`  INFO: SSE stream completed with ${data.count} items`);

        if (success || itemCount > 0) {
          log(`  PASS: ${name} (${Date.now() - startTime}ms)`);
          resolve(true);
        } else {
          log(`  FAIL: No valid items found in SSE stream`);
          resolve(false);
        }
      } catch (error) {
        log(`  ERROR parsing done event: ${error.message}`, true);
        resolve(false);
      } finally {
        eventSource.close();
        clearTimeout(timeoutId);
      }
    });

    // Устанавливаем таймаут для SSE-запроса
    timeoutId = setTimeout(() => {
      eventSource.close();
      if (success) {
        log(`  PASS: ${name} (timeout reached, but found valid items)`);
        resolve(true);
      } else {
        log(`  FAIL: Timeout reached (${timeout}ms) without finding valid items`);
        resolve(false);
      }
    }, timeout);
  });
}

/**
 * Выполняет все тесты
 * @returns {Promise<void>}
 */
async function runTests() {
  log(`Running smoke tests against ${host}`);
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  // Тест для /api/health
  const healthTest = await runTest('/api/health', (body) => {
    if (body.status !== 'ok') {
      return `Expected status "ok", got "${body.status}"`;
    }
    return true;
  }, 'API Health');

  if (healthTest) passed++; else failed++;

  // Тест для /api/search?q=LM317
  const searchTest = await runTest('/api/search?q=LM317', (body) => {
    if (!body.items || !Array.isArray(body.items)) {
      return `Expected items array, got ${typeof body.items}`;
    }
    if (body.items.length === 0) {
      return `Expected at least one item, got 0`;
    }
    return true;
  }, 'API Search');

  if (searchTest) passed++; else failed++;

  // Тест для /api/live/search?q=LM317
  const liveSearchTest = await runSSETest('/api/live/search?q=LM317', (item) => {
    if (!item.mpn && !item.title) {
      return `Expected item with mpn or title, got neither`;
    }
    return true;
  }, 'API Live Search');

  if (liveSearchTest) passed++; else failed++;

  // Тест для /api/live/search?q=транзистор (кириллица)
  const cyrillicSearchTest = await runSSETest('/api/live/search?q=транзистор', (item) => {
    if (!item.mpn && !item.title) {
      return `Expected item with mpn or title, got neither`;
    }
    return true;
  }, 'API Cyrillic Search');

  if (cyrillicSearchTest) passed++; else failed++;

  // Выводим итоги
  const duration = Date.now() - startTime;
  log(`\nTests completed in ${duration}ms`);
  log(`PASSED: ${passed}`);
  log(`FAILED: ${failed}`);

  // Возвращаем код завершения
  process.exit(failed > 0 ? 1 : 0);
}

// Запускаем тесты
runTests().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
