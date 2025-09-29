/**
 * Модуль для классификации поисковых запросов
 * @module src/live/query
 */

/**
 * Типы поисковых запросов
 * @enum {string}
 */
export const QueryType = {
  MPN: 'mpn',
  WORD: 'word',
  URL: 'url',
  UNKNOWN: 'unknown'
};

/**
 * Классифицировать поисковый запрос
 * @param {string} query - Поисковый запрос
 * @returns {Object} Тип запроса и нормализованный запрос
 */
export const classifyQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return { type: QueryType.UNKNOWN, normalized: '' };
  }

  const normalized = query.trim();

  // Проверяем, является ли запрос URL
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      const url = new URL(normalized);
      return { type: QueryType.URL, normalized };
    } catch (error) {
      // Не URL, продолжаем проверку
    }
  }

  // Проверяем, является ли запрос MPN
  // MPN обычно содержит буквы и цифры, возможно дефисы, без пробелов
  if (/^[A-Za-z0-9][-A-Za-z0-9]*$/.test(normalized)) {
    return { type: QueryType.MPN, normalized };
  }

  // Проверяем, содержит ли запрос MPN-подобную часть
  const mpnMatch = normalized.match(/\b([A-Za-z0-9][-A-Za-z0-9]*)\b/);
  if (mpnMatch && mpnMatch[1] && mpnMatch[1].length >= 3) {
    return { type: QueryType.MPN, normalized: mpnMatch[1] };
  }

  // В остальных случаях считаем запрос словесным
  return { type: QueryType.WORD, normalized };
};

/**
 * Найти URL ChipDip в запросе
 * @param {string} query - Поисковый запрос
 * @returns {string|null} URL ChipDip или null
 */
export const findChipDipUrl = (query) => {
  if (!query || typeof query !== 'string') {
    return null;
  }

  // Проверяем, является ли запрос URL ChipDip
  if (query.includes('chipdip.ru')) {
    try {
      const url = new URL(query);

      if (url.hostname.includes('chipdip.ru')) {
        // Проверяем, является ли URL страницей продукта
        if (url.pathname.includes('/product/') || url.pathname.includes('/product0/')) {
          return url.toString();
        }
      }
    } catch (error) {
      // Не URL, продолжаем проверку
    }
  }

  // Ищем URL ChipDip в тексте запроса
  const urlMatch = query.match(/(https?:\/\/[^\s]+chipdip\.ru\/product0?\/[^\s]+)/i);
  if (urlMatch && urlMatch[1]) {
    try {
      const url = new URL(urlMatch[1]);
      return url.toString();
    } catch (error) {
      // Не валидный URL
    }
  }

  return null;
};

export default { QueryType, classifyQuery, findChipDipUrl };
