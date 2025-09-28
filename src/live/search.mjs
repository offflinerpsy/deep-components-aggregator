import { load } from 'cheerio';
import { fetchHtmlCached } from '../scrape/cache.mjs';
import { classifyQuery, QueryType } from './query.mjs';

/**
 * Извлекает ссылки на продукты из результатов поиска ChipDip
 * @param {string} html HTML-страница с результатами поиска
 * @returns {Array} Массив URL-ов продуктов
 */
function extractProductLinks(html) {
  const $ = load(html);
  const links = new Set();

  // Ищем ссылки на продукты
  $('a[href*="/product/"], a[href*="/product0/"]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href) return;

    try {
      const url = new URL(href, 'https://www.chipdip.ru').toString();
      links.add(url);
    } catch (error) {
      // Игнорируем ошибки парсинга URL
    }
  });

  return Array.from(links);
}

/**
 * Выполняет поиск по ChipDip
 * @param {string} query Поисковый запрос
 * @param {object} options Опции поиска
 * @returns {Promise<object>} Результаты поиска
 */
export async function searchChipDip(query, options = {}) {
  const url = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(query)}`;

  // Получаем HTML-страницу с результатами поиска
  const result = await fetchHtmlCached(url, { ...options });

  if (!result.ok) {
    return {
      ok: false,
      error: `Ошибка при поиске по ChipDip: ${result.status}`,
      links: []
    };
  }

  // Извлекаем ссылки на продукты
  const links = extractProductLinks(result.html);

  return {
    ok: true,
    links,
    fromCache: result.fromCache,
    provider: result.provider
  };
}

/**
 * Выполняет поиск по запросу
 * @param {string} query Поисковый запрос
 * @param {object} options Опции поиска
 * @returns {Promise<object>} Результаты поиска
 */
export async function search(query, options = {}) {
  // Классифицируем запрос
  const classified = classifyQuery(query);

  switch (classified.type) {
    case QueryType.URL:
      // Если запрос является URL-ом, возвращаем его
      return {
        ok: true,
        links: [classified.url],
        type: QueryType.URL
      };

    case QueryType.MPN:
    case QueryType.WORD:
      // Выполняем поиск по ChipDip
      const result = await searchChipDip(query, options);
      return {
        ...result,
        type: classified.type
      };

    default:
      return {
        ok: false,
        error: 'Неизвестный тип запроса',
        links: [],
        type: QueryType.UNKNOWN
      };
  }
}
