/**
 * Модуль для инжестирования продуктов
 * @module src/live/ingest
 */

import { fetchHtmlCached } from '../scrape/cache.mjs';
import { toCanon as parseChipDipProduct } from '../parsers/chipdip/product.mjs';
import { saveProduct } from '../core/store.mjs';
import { normalize } from '../core/canon.mjs';

/**
 * Инжестирует продукт по URL
 * @param {string} url - URL продукта
 * @param {Object} options - Опции инжестирования
 * @param {Object} [options.diagnostics] - Объект для сбора диагностики
 * @returns {Promise<Object>} Сохраненный продукт
 */
export async function ingestProduct(url, options = {}) {
  const { diagnostics = null } = options;

  if (diagnostics) {
    diagnostics.addEvent('ingest_start', `Starting ingestion for URL: ${url}`);
  }

  try {
    // Получаем HTML страницы продукта
    const htmlResult = await fetchHtmlCached(url, { diagnostics });

    if (!htmlResult.ok) {
      if (diagnostics) {
        diagnostics.addEvent('ingest_html_error', `Failed to fetch HTML for ${url}: ${htmlResult.status || htmlResult.error}`);
      }
      return null;
    }

    // Парсим страницу продукта
    let productData;

    // Определяем парсер в зависимости от домена
    if (url.includes('chipdip.ru')) {
      productData = await parseChipDipProduct({ url, html: htmlResult.html });
    } else {
      if (diagnostics) {
        diagnostics.addEvent('ingest_unsupported_domain', `Unsupported domain for URL: ${url}`);
      }
      return null;
    }

    if (!productData || (!productData.mpn && !productData.chipdip_id)) {
      if (diagnostics) {
        diagnostics.addEvent('ingest_parse_error', `Failed to parse product data from ${url}. No MPN or ChipDip ID found.`);
      }
      return null;
    }

    // Нормализуем продукт
    const normalizedProduct = normalize(productData);

    if (diagnostics) {
      diagnostics.addEvent('ingest_parsed', `Parsed product: ${normalizedProduct.mpn || normalizedProduct.chipdip_id}`);
    }

    // Сохраняем продукт
    const savedProduct = await saveProduct(normalizedProduct);

    if (savedProduct) {
      if (diagnostics) {
        diagnostics.addEvent('ingest_success', `Product saved: ${savedProduct.mpn || savedProduct.chipdip_id}`);
      }
      return savedProduct;
    } else {
      if (diagnostics) {
        diagnostics.addEvent('ingest_save_error', `Failed to save product for ${url}`);
      }
      return null;
    }
  } catch (error) {
    if (diagnostics) {
      diagnostics.addEvent('ingest_exception', `Exception processing ${url}: ${error.message}`);
    }
    console.error(`[INGEST] Error processing ${url}:`, error);
    return null;
  }
}

/**
 * Инжестирует несколько продуктов по URL
 * @param {string[]} urls - Массив URL продуктов
 * @param {Object} options - Опции инжестирования
 * @returns {Promise<Object[]>} Массив сохраненных продуктов
 */
export async function ingestProducts(urls, options = {}) {
  const results = [];

  for (const url of urls) {
    const product = await ingestProduct(url, options);
    if (product) {
      results.push(product);
    }
  }

  return results;
}

export default {
  ingestProduct,
  ingestProducts
};
