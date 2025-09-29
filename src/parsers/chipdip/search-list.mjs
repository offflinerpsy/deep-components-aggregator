import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Парсит страницу результатов поиска ChipDip для текстовых запросов
 * @param {string} html HTML-содержимое страницы поиска
 * @param {string} baseUrl Базовый URL для построения абсолютных ссылок
 * @param {string} query Исходный поисковый запрос
 * @param {object} diagnostics Объект для диагностики
 * @returns {Array<Object>} Массив найденных товаров
 */
export function parseChipDipSearchList(html, baseUrl = 'https://www.chipdip.ru', query = '', diagnostics = null) {
  if (!html || html.trim() === '') {
    console.error('Empty HTML passed to parseChipDipSearchList');
    return [];
  }

  const $ = cheerio.load(html);
  const results = [];

  console.log(`[CHIPDIP SEARCH LIST PARSER] Parsing search results for "${query}". HTML length: ${html.length}`);

  // Сохраняем сырой HTML для диагностики
  if (diagnostics) {
    const diagDir = path.dirname(diagnostics.tracePath);
    const htmlPath = path.join(diagDir, 'fetch-chipdip-search.html');
    writeFileSync(htmlPath, html, 'utf8');
    diagnostics.addEvent('html_saved', `Saved HTML to ${htmlPath}`);
  }

  // Ищем товары в различных контейнерах
  const productSelectors = [
    '.product-item',
    '.item',
    '.catalog-item',
    '.search-result-item',
    '.product-card',
    '.product',
    '[data-product-id]',
    '.goods-item'
  ];

  let foundItems = false;

  for (const selector of productSelectors) {
    if (foundItems) break;

    $(selector).each((_, element) => {
      try {
        const el = $(element);
        const productData = extractProductData(el, baseUrl);

        if (productData && productData.title) {
          results.push({
            ...productData,
            source: 'chipdip',
            query: query
          });
          foundItems = true;
        }
      } catch (error) {
        console.error(`Error parsing product with selector ${selector}:`, error);
      }
    });

    if (results.length > 0) {
      console.log(`[CHIPDIP SEARCH LIST PARSER] Found ${results.length} items using selector: ${selector}`);
      break;
    }
  }

  // Если не нашли товары стандартными селекторами, пробуем поиск по ссылкам
  if (results.length === 0) {
    console.log('[CHIPDIP SEARCH LIST PARSER] No items found with standard selectors, trying link-based search');

    $('a[href*="/product"]').each((_, element) => {
      try {
        const el = $(element);
        const href = el.attr('href');
        if (!href || !href.includes('/product')) return;

        // Проверяем, что это не навигационная ссылка
        const parentClasses = el.parent().attr('class') || '';
        if (parentClasses.includes('menu') || parentClasses.includes('nav') || parentClasses.includes('breadcrumb')) {
          return;
        }

        const title = el.text().trim();
        if (!title || title.length < 3) return;

        const url = new URL(href, baseUrl).toString();

        // Извлекаем MPN из URL
        const urlParts = url.split('/');
        const mpn = urlParts[urlParts.length - 1] || '';

        // Ищем изображение рядом со ссылкой
        let image = null;
        const imgEl = el.closest('div, li, td').find('img').first();
        if (imgEl.length) {
          const imgSrc = imgEl.attr('src') || imgEl.attr('data-src');
          if (imgSrc) {
            image = new URL(imgSrc, baseUrl).toString();
          }
        }

        // Ищем описание рядом со ссылкой
        let description = '';
        const descEl = el.closest('div, li, td').find('.description, .desc, .summary').first();
        if (descEl.length) {
          description = descEl.text().trim();
        }

        results.push({
          url,
          title,
          mpn,
          image,
          description,
          source: 'chipdip',
          query: query
        });
      } catch (error) {
        console.error('Error parsing product link:', error);
      }
    });
  }

  // Если все еще ничего не нашли, пробуем поиск по таблицам
  if (results.length === 0) {
    console.log('[CHIPDIP SEARCH LIST PARSER] Trying table-based search');

    $('table tr').each((_, element) => {
      try {
        const el = $(element);
        const linkEl = el.find('a').first();
        const href = linkEl.attr('href');

        if (!href || !href.includes('/product')) return;

        const title = linkEl.text().trim();
        if (!title || title.length < 3) return;

        const url = new URL(href, baseUrl).toString();
        const urlParts = url.split('/');
        const mpn = urlParts[urlParts.length - 1] || '';

        results.push({
          url,
          title,
          mpn,
          source: 'chipdip',
          query: query
        });
      } catch (error) {
        console.error('Error parsing table row:', error);
      }
    });
  }

  // Сохраняем результаты для диагностики
  if (diagnostics && results.length > 0) {
    const diagDir = path.dirname(diagnostics.tracePath);
    const itemsPath = path.join(diagDir, 'items.json');
    writeFileSync(itemsPath, JSON.stringify(results, null, 2), 'utf8');
    diagnostics.addEvent('items_saved', `Saved ${results.length} items to ${itemsPath}`);
  }

  console.log(`[CHIPDIP SEARCH LIST PARSER] Final result: ${results.length} items found`);
  return results.slice(0, 10); // Ограничиваем 10 элементами
}

/**
 * Извлекает данные товара из элемента
 * @param {object} $el jQuery элемент
 * @param {string} baseUrl Базовый URL
 * @returns {object|null} Данные товара или null
 */
function extractProductData($el, baseUrl) {
  try {
    // Ищем ссылку на товар
    const linkEl = $el.find('a').first();
    const href = linkEl.attr('href');
    if (!href) return null;

    const url = new URL(href, baseUrl).toString();
    const title = linkEl.text().trim();
    if (!title) return null;

    // Извлекаем MPN из URL или текста
    let mpn = '';
    if (url.includes('/product')) {
      const urlParts = url.split('/');
      mpn = urlParts[urlParts.length - 1] || '';
    } else {
      // Пробуем найти MPN в тексте
      const mpnMatch = title.match(/^([A-Z0-9-]+)/);
      if (mpnMatch) {
        mpn = mpnMatch[1];
      }
    }

    // Ищем изображение
    let image = null;
    const imgEl = $el.find('img').first();
    if (imgEl.length) {
      const imgSrc = imgEl.attr('src') || imgEl.attr('data-src');
      if (imgSrc) {
        image = new URL(imgSrc, baseUrl).toString();
      }
    }

    // Ищем описание
    let description = '';
    const descEl = $el.find('.description, .desc, .summary, .product-description').first();
    if (descEl.length) {
      description = descEl.text().trim();
    }

    // Ищем бренд
    let brand = '';
    const brandEl = $el.find('.brand, .manufacturer, .vendor').first();
    if (brandEl.length) {
      brand = brandEl.text().trim();
    }

    return {
      url,
      title,
      mpn,
      image,
      description,
      brand
    };
  } catch (error) {
    console.error('Error extracting product data:', error);
    return null;
  }
}
