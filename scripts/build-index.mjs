#!/usr/bin/env node

/**
 * Скрипт для построения поискового индекса
 * 
 * Использование:
 * node scripts/build-index.mjs [--source=data/db/products]
 * 
 * Опции:
 * --source - директория с продуктами для индексации (по умолчанию data/db/products)
 */

import fs from 'node:fs';
import path from 'node:path';
import { buildIndex, hasCyrillic } from '../src/core/search.mjs';

// Парсинг аргументов командной строки
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  if (!arg) return defaultValue;
  return arg.split('=')[1];
};

// Директория с продуктами
const sourceDir = getArg('source', 'data/db/products');

// Загрузка продуктов из директории
function loadProducts(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`Directory ${dir} does not exist`);
    return [];
  }
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} product files in ${dir}`);
  
  const products = [];
  
  for (const file of files) {
    try {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const product = JSON.parse(content);
      
      if (product && (product.mpn || product.title)) {
        products.push(product);
      } else {
        console.warn(`Skipping invalid product in file ${file}`);
      }
    } catch (error) {
      console.error(`Error loading product from ${file}: ${error.message}`);
    }
  }
  
  return products;
}

// Анализ продуктов для статистики
function analyzeProducts(products) {
  const stats = {
    total: products.length,
    withMpn: 0,
    withBrand: 0,
    withTitle: 0,
    withDescription: 0,
    withCyrillicTitle: 0,
    withCyrillicDescription: 0,
    withTechnicalSpecs: 0
  };
  
  for (const product of products) {
    if (product.mpn) stats.withMpn++;
    if (product.brand) stats.withBrand++;
    if (product.title) stats.withTitle++;
    if (product.description) stats.withDescription++;
    if (product.title && hasCyrillic(product.title)) stats.withCyrillicTitle++;
    if (product.description && hasCyrillic(product.description)) stats.withCyrillicDescription++;
    if (product.technical_specs && Object.keys(product.technical_specs).length > 0) stats.withTechnicalSpecs++;
  }
  
  return stats;
}

// Основная функция
async function main() {
  console.log(`Building search index from ${sourceDir}...`);
  
  // Загружаем продукты
  const products = loadProducts(sourceDir);
  
  if (products.length === 0) {
    console.error(`No products found in ${sourceDir}`);
    process.exit(1);
  }
  
  // Анализируем продукты
  const stats = analyzeProducts(products);
  console.log('Product statistics:');
  console.log(`- Total: ${stats.total}`);
  console.log(`- With MPN: ${stats.withMpn} (${(stats.withMpn / stats.total * 100).toFixed(1)}%)`);
  console.log(`- With brand: ${stats.withBrand} (${(stats.withBrand / stats.total * 100).toFixed(1)}%)`);
  console.log(`- With title: ${stats.withTitle} (${(stats.withTitle / stats.total * 100).toFixed(1)}%)`);
  console.log(`- With description: ${stats.withDescription} (${(stats.withDescription / stats.total * 100).toFixed(1)}%)`);
  console.log(`- With Cyrillic title: ${stats.withCyrillicTitle} (${(stats.withCyrillicTitle / stats.total * 100).toFixed(1)}%)`);
  console.log(`- With Cyrillic description: ${stats.withCyrillicDescription} (${(stats.withCyrillicDescription / stats.total * 100).toFixed(1)}%)`);
  console.log(`- With technical specs: ${stats.withTechnicalSpecs} (${(stats.withTechnicalSpecs / stats.total * 100).toFixed(1)}%)`);
  
  // Строим индекс
  const success = await buildIndex(products);
  
  if (success) {
    console.log(`Search index built successfully with ${products.length} products`);
    process.exit(0);
  } else {
    console.error(`Failed to build search index`);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch(error => {
  console.error(`Error building index: ${error.message}`);
  process.exit(1);
});