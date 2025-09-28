import { fetchHtmlCached } from '../scrape/cache.mjs';
import { parseProduct, saveProduct } from '../parsers/chipdip/product.mjs';
import { toRub } from '../currency/cbr.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

// Получаем путь к директории модуля
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

/**
 * Скачивает PDF-документы для продукта
 * @param {object} product Продукт
 * @returns {Promise<object>} Обновленный продукт
 */
async function downloadDatasheets(product) {
  if (!product.datasheets || product.datasheets.length === 0) {
    return product;
  }

  const updatedDatasheets = [];

  for (const datasheet of product.datasheets) {
    try {
      const url = datasheet.url || datasheet;
      if (!url) continue;

      // Генерируем хеш для имени файла
      const hash = datasheet.hash || url.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_');
      const dirPath = path.join(rootDir, 'data/files/pdf');
      const filePath = path.join(dirPath, `${hash}.pdf`);
      const localUrl = `/files/pdf/${hash}.pdf`;

      // Создаем директорию, если она не существует
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Если файл уже существует, пропускаем скачивание
      if (!fs.existsSync(filePath)) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Ошибка при скачивании PDF: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));
      }

      updatedDatasheets.push({
        title: datasheet.title || 'Datasheet',
        url: localUrl,
        original_url: url
      });
    } catch (error) {
      console.error(`Ошибка при скачивании PDF: ${error.message}`);
      updatedDatasheets.push(datasheet);
    }
  }

  return {
    ...product,
    datasheets: updatedDatasheets
  };
}

/**
 * Конвертирует цены в рубли
 * @param {object} product Продукт
 * @returns {Promise<object>} Обновленный продукт
 */
async function convertPrices(product) {
  if (!product.offers || product.offers.length === 0) {
    return product;
  }

  const updatedOffers = [];

  for (const offer of product.offers) {
    try {
      if (offer.currency && offer.currency !== 'RUB' && offer.price_native) {
        const rubPrice = await toRub({
          amount: offer.price_native,
          currency: offer.currency
        });

        updatedOffers.push({
          ...offer,
          price_rub: rubPrice
        });
      } else {
        updatedOffers.push(offer);
      }
    } catch (error) {
      console.error(`Ошибка при конвертации цены: ${error.message}`);
      updatedOffers.push(offer);
    }
  }

  // Вычисляем минимальную цену в рублях
  const rubPrices = updatedOffers
    .map(o => o.price_rub)
    .filter(p => typeof p === 'number' && p > 0);

  const price_min_rub = rubPrices.length > 0 ? Math.min(...rubPrices) : null;

  return {
    ...product,
    offers: updatedOffers,
    price_min_rub
  };
}

/**
 * Выполняет ингест продукта
 * @param {string} url URL продукта
 * @param {object} options Опции ингеста
 * @returns {Promise<object>} Результат ингеста
 */
export async function ingestProduct(url, options = {}) {
  try {
    // Получаем HTML-страницу продукта
    const result = await fetchHtmlCached(url, { ...options });

    if (!result.ok) {
      return {
        ok: false,
        error: `Ошибка при получении HTML продукта: ${result.status}`,
        url
      };
    }

    // Парсим продукт
    let product = parseProduct(result.html, url);

    // Скачиваем PDF-документы
    product = await downloadDatasheets(product);

    // Конвертируем цены в рубли
    product = await convertPrices(product);

    // Сохраняем продукт
    const filePath = saveProduct(product, rootDir);

    if (!filePath) {
      return {
        ok: false,
        error: 'Ошибка при сохранении продукта',
        url
      };
    }

    return {
      ok: true,
      product,
      fromCache: result.fromCache,
      provider: result.provider,
      filePath
    };
  } catch (error) {
    console.error(`Ошибка при ингесте продукта ${url}: ${error.message}`);
    return {
      ok: false,
      error: error.message,
      url
    };
  }
}

/**
 * Выполняет ингест нескольких продуктов
 * @param {Array} urls Массив URL-ов продуктов
 * @param {object} options Опции ингеста
 * @returns {Promise<object>} Результат ингеста
 */
export async function ingestProducts(urls, options = {}) {
  const results = {
    ok: true,
    total: urls.length,
    success: 0,
    failed: 0,
    products: [],
    errors: []
  };

  for (const url of urls) {
    try {
      const result = await ingestProduct(url, options);

      if (result.ok) {
        results.success++;
        results.products.push(result.product);
      } else {
        results.failed++;
        results.errors.push({
          url,
          error: result.error
        });
      }
    } catch (error) {
      console.error(`Ошибка при ингесте продукта ${url}: ${error.message}`);
      results.failed++;
      results.errors.push({
        url,
        error: error.message
      });
    }
  }

  results.ok = results.failed === 0;

  return results;
}
