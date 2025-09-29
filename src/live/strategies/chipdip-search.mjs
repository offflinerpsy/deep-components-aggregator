/**
 * Стратегия поиска на ChipDip
 * @module src/live/strategies/chipdip-search
 */

import { fetchHtmlCached } from '../../scrape/cache.mjs';
import { load } from 'cheerio';

/**
 * Извлекает ссылки на продукты из результатов поиска ChipDip
 * @param {string} query - Поисковый запрос
 * @param {Object} options - Опции поиска
 * @param {number} [options.limit=20] - Максимальное количество ссылок
 * @param {Object} [options.diagnostics] - Объект для сбора диагностики
 * @returns {Promise<Object>} Результат поиска с ссылками на продукты
 */
export async function extractProductLinks(query, options = {}) {
  const { limit = 20, diagnostics = null } = options;
  
  // Формируем URL для поиска
  const searchUrl = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(query)}`;
  
  if (diagnostics) {
    diagnostics.addEvent('search_url', `ChipDip search URL: ${searchUrl}`);
  }
  
  try {
    // Получаем HTML страницы поиска
    const result = await fetchHtmlCached(searchUrl, { 
      providerHint: 'scrapingbee',
      diagnostics
    });
    
    if (!result.ok) {
      if (diagnostics) {
        diagnostics.addEvent('search_error', `Failed to fetch ChipDip search page: ${result.status || result.error}`);
      }
      return { ok: false, error: `Failed to fetch search page: ${result.status || result.error}` };
    }
    
    // Парсим HTML
    const $ = load(result.html);
    const links = [];
    
    // Извлекаем ссылки на продукты (только product/product0)
    $('a[href*="/product/"], a[href*="/product0/"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && (href.includes('/product/') || href.includes('/product0/'))) {
        const fullUrl = new URL(href, 'https://www.chipdip.ru').toString();
        // Добавляем только уникальные ссылки
        if (!links.includes(fullUrl)) {
          links.push(fullUrl);
        }
      }
    });
    
    // Ограничиваем количество ссылок
    const limitedLinks = links.slice(0, limit);
    
    if (diagnostics) {
      diagnostics.addEvent('product_links', `Found ${links.length} product links, using ${limitedLinks.length}`);
    }
    
    return { 
      ok: true, 
      links: limitedLinks,
      totalFound: links.length,
      source: 'chipdip',
      query
    };
  } catch (error) {
    if (diagnostics) {
      diagnostics.addEvent('search_exception', `Error extracting product links: ${error.message}`);
    }
    return { ok: false, error: error.message };
  }
}

/**
 * Определяет, является ли запрос поиском по MPN или общим словом
 * @param {string} query - Поисковый запрос
 * @returns {string} Тип запроса: 'mpn' или 'word'
 */
export function classifyQuery(query) {
  if (!query) return 'unknown';
  
  // Очищаем запрос от лишних символов
  const cleanQuery = query.trim();
  
  // Проверяем, содержит ли запрос пробелы
  if (cleanQuery.includes(' ')) {
    return 'word';
  }
  
  // Проверяем, содержит ли запрос кириллицу
  if (/[а-яА-ЯёЁ]/.test(cleanQuery)) {
    return 'word';
  }
  
  // Проверяем, похож ли запрос на MPN (буквы, цифры, дефисы, слеши)
  if (/^[a-zA-Z0-9\-\/\.]+$/.test(cleanQuery)) {
    return 'mpn';
  }
  
  // По умолчанию считаем запрос общим словом
  return 'word';
}

/**
 * Выполняет поиск на ChipDip в зависимости от типа запроса
 * @param {string} query - Поисковый запрос
 * @param {Object} options - Опции поиска
 * @returns {Promise<Object>} Результат поиска с ссылками на продукты
 */
export async function search(query, options = {}) {
  const { diagnostics = null } = options;
  
  // Определяем тип запроса
  const queryType = classifyQuery(query);
  
  if (diagnostics) {
    diagnostics.addEvent('query_type', `Query "${query}" classified as ${queryType}`);
  }
  
  // Определяем лимит в зависимости от типа запроса
  const limit = queryType === 'mpn' ? 5 : 20;
  
  // Выполняем поиск
  return await extractProductLinks(query, { 
    ...options, 
    limit,
    diagnostics 
  });
}

export default {
  search,
  extractProductLinks,
  classifyQuery
};
