#!/usr/bin/env node

/**
 * Скрипт для построения поискового индекса
 * 
 * Использование:
 * node scripts/build-index.mjs [--backup]
 * 
 * Опции:
 * --backup - создать резервную копию существующего индекса (по умолчанию false)
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { loadAllProducts } from '../src/core/store.mjs';
import { buildIndex } from '../src/core/search.mjs';

// Константы
const INDEX_PATH = 'data/idx/search-index.json';
const BACKUP_PATH = 'data/idx/search-index.json.bak';

/**
 * Основная функция построения индекса
 */
async function main() {
  console.log('Starting index build...');
  
  // Парсим аргументы командной строки
  const args = process.argv.slice(2);
  const backup = args.includes('--backup');
  
  // Создаем резервную копию индекса, если указана опция
  if (backup && existsSync(INDEX_PATH)) {
    console.log('Creating backup of existing index...');
    try {
      copyFileSync(INDEX_PATH, BACKUP_PATH);
      console.log(`Backup created: ${BACKUP_PATH}`);
    } catch (error) {
      console.warn(`Failed to create backup: ${error.message}`);
    }
  }
  
  // Загружаем все продукты
  console.log('Loading products...');
  const items = loadAllProducts();
  console.log(`Loaded ${items.length} products`);
  
  // Строим индекс
  console.log('Building search index...');
  const startTime = Date.now();
  await buildIndex(items);
  const endTime = Date.now();
  
  // Создаем метаданные индекса
  const indexMeta = {
    ts: Date.now(),
    count: items.length,
    build_time_ms: endTime - startTime
  };
  
  // Создаем директорию, если она не существует
  const dir = path.dirname(INDEX_PATH);
  if (!existsSync(dir)) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(dir, { recursive: true });
  }
  
  // Сохраняем метаданные индекса
  writeFileSync(INDEX_PATH, JSON.stringify(indexMeta, null, 2));
  
  console.log(`Index built successfully with ${items.length} items in ${(endTime - startTime) / 1000} seconds`);
  console.log(`Index metadata saved to ${INDEX_PATH}`);
}

// Запускаем основную функцию
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});