/**
 * Парсер страницы поиска ChipDip
 * @module src/parsers/chipdip/listing
 */

import { load } from 'cheerio';

/**
 * Извлечь ссылки на товары из страницы поиска ChipDip
 * @param {string} html - HTML страницы поиска
 * @param {Object} [options] - Опции извлечения
 * @param {number} [options.limit=20] - Максимальное количество ссылок
 * @returns {string[]} Массив URL товаров
 */
export const extractProductLinks = (html, { limit = 20 } = {}) => {
  if (!html) {
    return [];
  }

  try {
    const $ = load(html);
    const links = new Set();

    // Поиск ссылок на товары в разных форматах
    $('a[href*="/product/"], a[href*="/product0/"]').each((_, element) => {
      const href = $(element).attr('href');

      if (href && (href.includes('/product/') || href.includes('/product0/'))) {
        // Формируем полный URL
        const fullUrl = new URL(href, 'https://www.chipdip.ru').toString();
        links.add(fullUrl);
      }
    });

    // Преобразуем Set в массив и ограничиваем количество
    return Array.from(links).slice(0, limit);
  } catch (error) {
    console.error('Ошибка при извлечении ссылок на товары:', error.message);
    return [];
  }
};

/**
 * Извлечь информацию о пагинации из страницы поиска
 * @param {string} html - HTML страницы поиска
 * @returns {Object} Информация о пагинации
 */
export const extractPagination = (html) => {
  if (!html) {
    return { currentPage: 1, totalPages: 1 };
  }

  try {
    const $ = load(html);
    let currentPage = 1;
    let totalPages = 1;

    // Ищем текущую страницу
    $('.pager .current').each((_, element) => {
      const page = parseInt($(element).text().trim(), 10);
      if (!isNaN(page)) {
        currentPage = page;
      }
    });

    // Ищем общее количество страниц
    $('.pager a').each((_, element) => {
      const page = parseInt($(element).text().trim(), 10);
      if (!isNaN(page) && page > totalPages) {
        totalPages = page;
      }
    });

    return { currentPage, totalPages };
  } catch (error) {
    console.error('Ошибка при извлечении информации о пагинации:', error.message);
    return { currentPage: 1, totalPages: 1 };
  }
};

/**
 * Извлечь общее количество найденных товаров
 * @param {string} html - HTML страницы поиска
 * @returns {number} Количество найденных товаров
 */
export const extractTotalCount = (html) => {
  if (!html) {
    return 0;
  }

  try {
    const $ = load(html);
    let totalCount = 0;

    // Ищем информацию о количестве найденных товаров
    $('.search-results-count').each((_, element) => {
      const text = $(element).text().trim();
      const match = text.match(/\d+/);

      if (match) {
        totalCount = parseInt(match[0], 10);
      }
    });

    return totalCount;
  } catch (error) {
    console.error('Ошибка при извлечении общего количества товаров:', error.message);
    return 0;
  }
};

export default { extractProductLinks, extractPagination, extractTotalCount };
