#!/usr/bin/env node

/**
 * Скрипт для smoke-тестирования API и UI
 * 
 * Использование:
 * node scripts/smoke.mjs [--host=http://localhost:9201] [--verbose]
 * 
 * Опции:
 * --host=URL - URL хоста для тестирования (по умолчанию http://localhost:9201)
 * --verbose - выводить подробную информацию
 */

import { fetch } from 'undici';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// Константы
const DIAG_DIR = '_diag';
const DEFAULT_HOST = 'http://localhost:9201';

/**
 * Выполняет HTTP-запрос и возвращает результат
 * @param {string} url URL для запроса
 * @param {object} options Опции запроса
 * @returns {Promise<object>} Результат запроса
 */
async function fetchWithTimeout(url, options = {}) {
  const { timeout = 10000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
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
 * @param {string} host Хост для тестирования
 * @param {string} path Путь для запроса
 * @param {function} validator Функция проверки результата
 * @param {boolean} verbose Выводить подробную информацию
 * @returns {Promise<boolean>} Результат теста
 */
async function runTest(host, path, validator, verbose = false) {
  const url = `${host}${path}`;
  
  console.log(`Testing ${url}...`);
  
  try {
    const result = await fetchWithTimeout(url);
    
    if (!result.ok) {
      console.error(`  FAIL: HTTP ${result.status} ${result.error || ''}`);
      return false;
    }
    
    let body;
    try {
      body = JSON.parse(result.body);
    } catch (e) {
      body = result.body;
    }
    
    if (verbose) {
      console.log(`  Response: ${typeof body === 'string' ? body.slice(0, 100) : JSON.stringify(body, null, 2).slice(0, 100)}...`);
    }
    
    const isValid = validator(body, result);
    
    if (isValid) {
      console.log(`  PASS: ${path}`);
    } else {
      console.error(`  FAIL: Validation failed for ${path}`);
    }
    
    return isValid;
  } catch (error) {
    console.error(`  ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Основная функция тестирования
 */
async function main() {
  // Парсим аргументы командной строки
  const args = process.argv.slice(2);
  const hostArg = args.find(arg => arg.startsWith('--host='));
  const host = hostArg ? hostArg.split('=')[1] : DEFAULT_HOST;
  const verbose = args.includes('--verbose');
  
  console.log(`Running smoke tests against ${host}`);
  
  // Создаем директорию для диагностики
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const diagDir = path.join(DIAG_DIR, timestamp);
  mkdirSync(diagDir, { recursive: true });
  
  // Результаты тестов
  const results = {};
  
  // Тест 1: Проверка главной страницы
  results.root = await runTest(host, '/', body => {
    return typeof body === 'string' && body.includes('<!DOCTYPE html>');
  }, verbose);
  
  // Тест 2: Проверка API health
  results.health = await runTest(host, '/api/health', body => {
    return body && body.status === 'ok';
  }, verbose);
  
  // Тест 3: Проверка поиска LM317
  results.searchLM317 = await runTest(host, '/api/search?q=LM317', body => {
    return body && body.count > 0 && Array.isArray(body.items) && body.items.length > 0;
  }, verbose);
  
  // Тест 4: Проверка поиска 1N4148W-TP
  results.search1N4148W = await runTest(host, '/api/search?q=1N4148W-TP', body => {
    return body && (body.count > 0 || body.status === 'pending');
  }, verbose);
  
  // Тест 5: Проверка поиска LDD-700L
  results.searchLDD700L = await runTest(host, '/api/search?q=LDD-700L', body => {
    return body && (body.count > 0 || body.status === 'pending');
  }, verbose);
  
  // Тест 6: Проверка API product для LM317
  results.productLM317 = await runTest(host, '/api/product?mpn=LM317', body => {
    return body && body.mpn && body.brand && (body.price_min_rub || body.price_min_rub === 0);
  }, verbose);
  
  // Тест 7: Проверка страницы результатов
  results.resultsPage = await runTest(host, '/results.html', body => {
    return typeof body === 'string' && body.includes('<!DOCTYPE html>') && body.includes('results-table');
  }, verbose);
  
  // Сохраняем результаты
  const reportPath = path.join(diagDir, 'smoke-results.json');
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    host,
    results
  }, null, 2));
  
  // Выводим итоги
  console.log('\nSummary:');
  let allPassed = true;
  
  for (const [test, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✓' : '✗'} ${test}`);
    if (!passed) {
      allPassed = false;
    }
  }
  
  console.log(`\nSmoke tests ${allPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`Results saved to ${reportPath}`);
  
  // Выходим с соответствующим кодом
  process.exit(allPassed ? 0 : 1);
}

// Запускаем основную функцию
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});