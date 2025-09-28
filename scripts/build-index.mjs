#!/usr/bin/env node

import { loadAllProducts } from '../src/core/store.mjs';
import { createIndex, saveIndex } from '../src/core/search.mjs';

/**
 * Строит индекс из всех продуктов
 */
async function main() {
  try {
    console.log('Загрузка продуктов...');
    const products = loadAllProducts();

    if (products.length === 0) {
      console.warn('Не найдено продуктов для индексации');
      process.exit(1);
    }

    console.log(`Создание индекса для ${products.length} продуктов...`);
    const index = await createIndex(products);

    console.log('Сохранение индекса...');
    const saved = await saveIndex(index);

    if (saved) {
      console.log('Индекс успешно создан и сохранен');
      process.exit(0);
    } else {
      console.error('Не удалось сохранить индекс');
      process.exit(1);
    }
  } catch (error) {
    console.error(`Ошибка при создании индекса: ${error.message}`);
    process.exit(1);
  }
}

main();
