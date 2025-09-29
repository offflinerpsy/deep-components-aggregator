/**
 * Скрипт для построения индекса Orama из нормализованных карточек продуктов
 *
 * Использование:
 * node scripts/build-index.mjs
 *
 * Выход:
 * - 0: успешное построение
 * - 1: ошибка при построении
 */

import { loadAll } from '../src/core/store.mjs';
import { buildIndex } from '../src/core/search.mjs';

(async () => {
  try {
    console.log('Загрузка продуктов из хранилища...');

    const products = loadAll();
    console.log(`Загружено ${products.length} продуктов`);

    if (products.length === 0) {
      console.warn('Нет продуктов для индексации');
      process.exit(0);
    }

    console.log('Построение индекса Orama...');

    const result = await buildIndex(products);

    if (result) {
      console.log(`Индекс успешно построен (${products.length} продуктов)`);
      process.exit(0);
    } else {
      console.error('Ошибка при построении индекса');
      process.exit(1);
    }
  } catch (error) {
    console.error('Ошибка при построении индекса:', error.message);
    process.exit(1);
  }
})();
