import * as cheerio from 'cheerio';

/**
 * Парсит страницу результатов поиска Promelec
 * @param {string} html HTML-содержимое страницы поиска
 * @param {string} baseUrl Базовый URL для построения абсолютных ссылок
 * @returns {Array<Object>} Массив найденных товаров
 */
export function parsePromelecSearch(html, baseUrl = 'https://www.promelec.ru') {
  if (!html || html.trim() === '') {
    console.error('Empty HTML passed to parsePromelecSearch');
    return [];
  }

  const $ = cheerio.load(html);
  const results = [];

  console.log(`[PROMELEC PARSER] Parsing search results. HTML length: ${html.length}`);

  // Находим все товары
  $('.catalog-item, .product-item').each((_, element) => {
    try {
      const el = $(element);

      // Извлекаем ссылку на товар
      const linkEl = el.find('a.catalog-item__title, a.product-title, a.product-name').first();
      if (!linkEl.length) return;

      const relativeUrl = linkEl.attr('href');
      if (!relativeUrl) return;

      const url = new URL(relativeUrl, baseUrl).toString();

      // Извлекаем название товара
      const title = linkEl.text().trim();

      // Извлекаем MPN (артикул)
      let mpn = '';
      const mpnEl = el.find('.catalog-item__part-number, .product-code, .article');
      if (mpnEl.length) {
        mpn = mpnEl.text().trim().replace(/^Арт\.?\s*:?\s*/i, '');
      }

      // Извлекаем бренд
      let brand = '';
      const brandEl = el.find('.catalog-item__manufacturer, .product-brand, .manufacturer');
      if (brandEl.length) {
        brand = brandEl.text().trim();
      }

      // Извлекаем изображение
      let image = null;
      const imgEl = el.find('img').first();
      if (imgEl.length) {
        const imgSrc = imgEl.attr('src') || imgEl.attr('data-src');
        if (imgSrc) {
          image = new URL(imgSrc, baseUrl).toString();
        }
      }

      // Извлекаем описание
      let description = '';
      const descEl = el.find('.catalog-item__description, .product-description, .description');
      if (descEl.length) {
        description = descEl.text().trim();
      }

      // Извлекаем цену
      let price = null;
      let currency = 'RUB';
      const priceEl = el.find('.catalog-item__price, .product-price, .price');
      if (priceEl.length) {
        const priceText = priceEl.text().trim();
        const priceMatch = priceText.match(/[\d\s.,]+\s*(?:р|₽|руб)/i);
        if (priceMatch) {
          price = parseFloat(priceMatch[0].replace(/[^\d.,]/g, '').replace(',', '.'));
        }
      }

      // Извлекаем наличие
      let stock = null;
      const stockEl = el.find('.catalog-item__stock, .product-stock, .stock');
      if (stockEl.length) {
        const stockText = stockEl.text().trim();
        const stockMatch = stockText.match(/(\d+)\s*(?:шт|pcs)/i);
        if (stockMatch) {
          stock = parseInt(stockMatch[1], 10);
        }
      }

      // Добавляем результат, если есть хотя бы URL и название
      if (url && title) {
        results.push({
          url,
          title,
          mpn,
          brand,
          description,
          image,
          price,
          currency,
          stock,
          source: 'promelec'
        });
      }
    } catch (error) {
      console.error('Error parsing Promelec product item:', error);
    }
  });

  // Если не нашли ни одного товара, пробуем найти ссылки на товары другим способом
  if (results.length === 0) {
    console.log('[PROMELEC PARSER] No products found with standard selectors, trying alternative selectors');

    // Ищем все ссылки, которые могут вести на страницы товаров
    $('a[href*="/catalog/"]').each((_, element) => {
      try {
        const el = $(element);
        const relativeUrl = el.attr('href');
        if (!relativeUrl || !relativeUrl.includes('/catalog/')) return;

        // Проверяем, что это не ссылка из меню или навигации
        const parentClasses = el.parent().attr('class') || '';
        if (parentClasses.includes('menu') || parentClasses.includes('nav')) return;

        const url = new URL(relativeUrl, baseUrl).toString();

        // Проверяем, что это не дубликат
        if (results.some(item => item.url === url)) return;

        // Извлекаем название из текста ссылки
        const title = el.text().trim();
        if (!title) return;

        results.push({
          url,
          title,
          source: 'promelec'
        });
      } catch (error) {
        console.error('Error parsing alternative Promelec link:', error);
      }
    });
  }

  console.log(`[PROMELEC PARSER] Found ${results.length} items`);
  return results;
}
