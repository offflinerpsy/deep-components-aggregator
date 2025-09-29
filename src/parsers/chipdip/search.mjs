import * as cheerio from 'cheerio';

/**
 * Парсит страницу результатов поиска ChipDip
 * @param {string} html HTML-содержимое страницы поиска
 * @param {string} baseUrl Базовый URL для построения абсолютных ссылок
 * @returns {Array<Object>} Массив найденных товаров
 */
export function parseChipDipSearch(html, baseUrl = 'https://www.chipdip.ru') {
  if (!html || html.trim() === '') {
    console.error('Empty HTML passed to parseChipDipSearch');
    return [];
  }

  const $ = cheerio.load(html);
  const results = [];

  console.log(`[CHIPDIP PARSER] Parsing search results. HTML length: ${html.length}`);

  // Находим все ссылки, которые могут вести на страницы товаров
  $('a[href*="/product/"]').each((_, element) => {
    try {
      const el = $(element);
      const relativeUrl = el.attr('href');
      if (!relativeUrl || !relativeUrl.includes('/product/')) return;

      // Проверяем, что это не ссылка из меню или навигации
      const parentClasses = el.parent().attr('class') || '';
      if (parentClasses.includes('menu') || parentClasses.includes('nav')) return;

      const url = new URL(relativeUrl, baseUrl).toString();

      // Проверяем, что это не дубликат
      if (results.some(item => item.url === url)) return;

      // Извлекаем название из текста ссылки
      const title = el.text().trim();
      if (!title) return;

      // Извлекаем MPN из URL
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      const mpn = lastPart || '';

      // Извлекаем изображение, если есть
      let image = null;
      const imgEl = el.closest('div').find('img').first();
      if (imgEl.length) {
        const imgSrc = imgEl.attr('src') || imgEl.attr('data-src');
        if (imgSrc) {
          image = new URL(imgSrc, baseUrl).toString();
        }
      }

      // Извлекаем описание, если есть
      let description = '';
      const descEl = el.closest('div').find('.product-micro-description, .item-description, .description');
      if (descEl.length) {
        description = descEl.text().trim();
      }

      // Добавляем результат
      results.push({
        url,
        title,
        mpn,
        image,
        description,
        source: 'chipdip'
      });
    } catch (error) {
      console.error('Error parsing product link:', error);
    }
  });

  // Если не нашли ни одного товара, пробуем найти категории
  if (results.length === 0) {
    console.log('[CHIPDIP PARSER] No products found, looking for categories');

    $('.category-item, .catalog-category').each((_, element) => {
      try {
        const el = $(element);
        const linkEl = el.find('a').first();
        const relativeUrl = linkEl.attr('href');
        if (!relativeUrl) return;

        const url = new URL(relativeUrl, baseUrl).toString();
        const title = linkEl.text().trim();

        if (url && title) {
          results.push({
            url,
            title: `Категория: ${title}`,
            is_category: true,
            source: 'chipdip'
          });
        }
      } catch (error) {
        console.error('Error parsing category item:', error);
      }
    });
  }

  console.log(`[CHIPDIP PARSER] Found ${results.length} items (${results.filter(r => !r.is_category).length} products, ${results.filter(r => r.is_category).length} categories)`);
  return results;
}
