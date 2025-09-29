/**
 * Модуль для JIT-инжеста продуктов
 * @module src/live/ingest
 */

import fs from 'node:fs';
import path from 'node:path';
import { fetchHtmlCached } from '../scrape/cache.mjs';
import { toCanon } from '../parsers/chipdip/product.mjs';
import { save } from '../core/store.mjs';
import { addToIndex } from '../core/search.mjs';

/**
 * Инжест одного продукта по URL
 * @param {string} url - URL продукта
 * @returns {Promise<Object>} Результат инжеста
 */
export const ingestProduct = async (url) => {
  if (!url) {
    return { ok: false, reason: 'URL не указан' };
  }

  try {
    // Получаем HTML страницы продукта
    const { html, ok, status, fromCache } = await fetchHtmlCached(url);

    if (!ok || !html) {
      return {
        ok: false,
        reason: `Ошибка при получении HTML (${status})`,
        url
      };
    }

    // Сохраняем сырой HTML (если разрешено)
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      if (domain.includes('chipdip.ru')) {
        const pathMatch = urlObj.pathname.match(/\/product0?\/([A-Za-z0-9-]+)/);

        if (pathMatch && pathMatch[1]) {
          const id = pathMatch[1];
          const dir = path.resolve(`data/_diag/sources/chipdip`);

          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          fs.writeFileSync(path.join(dir, `${id}.html`), html, 'utf8');
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении сырого HTML:', error.message);
    }

    // Преобразуем HTML в канонический формат
    const result = toCanon({ url, html });

    if (!result.ok) {
      return {
        ok: false,
        reason: result.reason || 'Ошибка при преобразовании HTML',
        url
      };
    }

    // Сохраняем продукт
    const saveResult = save(result.data);

    if (!saveResult) {
      return {
        ok: false,
        reason: 'Ошибка при сохранении продукта',
        url
      };
    }

    // Добавляем продукт в индекс
    await addToIndex(result.data);

    return {
      ok: true,
      data: result.data,
      fromCache: fromCache || false,
      url
    };
  } catch (error) {
    console.error('Ошибка при инжесте продукта:', error.message);

    return {
      ok: false,
      reason: error.message,
      url
    };
  }
};

/**
 * Инжест нескольких продуктов по URL
 * @param {string[]} urls - Массив URL продуктов
 * @returns {Promise<Object[]>} Результаты инжеста
 */
export const ingestProducts = async (urls) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    return [];
  }

  const results = [];

  // Инжест продуктов последовательно
  for (const url of urls) {
    const result = await ingestProduct(url);
    results.push(result);
  }

  return results;
};

export default { ingestProduct, ingestProducts };
