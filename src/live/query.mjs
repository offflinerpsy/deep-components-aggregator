import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Получаем путь к директории модуля
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// Путь к файлу с URL-ами ChipDip
const CHIPDIP_URLS_FILE = path.join(rootDir, 'loads/urls/chipdip-products.txt');

/**
 * Типы запросов
 */
export const QueryType = {
  MPN: 'mpn',
  WORD: 'word',
  URL: 'url',
  UNKNOWN: 'unknown'
};

/**
 * Определяет тип запроса
 * @param {string} query Поисковый запрос
 * @returns {object} Объект с типом запроса и дополнительными данными
 */
export function classifyQuery(query) {
  if (!query) {
    return { type: QueryType.UNKNOWN };
  }

  // Проверяем, является ли запрос URL-ом
  if (query.startsWith('http://') || query.startsWith('https://')) {
    try {
      const url = new URL(query);

      // Проверяем, является ли URL-ом ChipDip
      if (url.hostname === 'www.chipdip.ru' || url.hostname === 'chipdip.ru') {
        if (url.pathname.includes('/product/') || url.pathname.includes('/product0/')) {
          return { type: QueryType.URL, url: url.toString(), source: 'chipdip' };
        }
      }

      return { type: QueryType.URL, url: url.toString() };
    } catch (error) {
      // Если не удалось распарсить URL, продолжаем проверку
    }
  }

  // Проверяем, является ли запрос MPN
  // MPN обычно содержит буквы, цифры, дефисы и точки
  if (/^[A-Za-z0-9\-\.]{3,30}$/.test(query)) {
    return { type: QueryType.MPN, mpn: query };
  }

  // Если запрос не является MPN, считаем его словом
  return { type: QueryType.WORD, word: query };
}

/**
 * Проверяет, является ли MPN известным ID в ChipDip
 * @param {string} mpn MPN для проверки
 * @returns {string|null} URL продукта или null, если не найден
 */
export function findChipDipUrl(mpn) {
  if (!mpn) {
    return null;
  }

  try {
    if (!fs.existsSync(CHIPDIP_URLS_FILE)) {
      return null;
    }

    const content = fs.readFileSync(CHIPDIP_URLS_FILE, 'utf8');
    const urls = content.split('\n').map(line => line.trim()).filter(Boolean);

    // Ищем URL, содержащий MPN
    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];

        if (lastPart === mpn) {
          return url;
        }
      } catch (error) {
        // Игнорируем ошибки парсинга URL
      }
    }

    return null;
  } catch (error) {
    console.error(`Ошибка при поиске URL для ${mpn}: ${error.message}`);
    return null;
  }
}
