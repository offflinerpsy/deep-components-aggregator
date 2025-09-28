import * as cheerio from 'cheerio';

/**
 * Парсит страницу результатов поиска ChipDip
 * @param {string} html HTML-содержимое страницы поиска
 * @param {string} baseUrl Базовый URL для построения абсолютных ссылок
 * @returns {Array<Object>} Массив найденных товаров
 */
export function parseChipDipSearch(html, baseUrl = 'https://www.chipdip.ru') {
  const $ = cheerio.load(html);
  const results = [];
  
  // Находим все блоки с товарами
  $('.product-item, .item').each((_, element) => {
    try {
      const el = $(element);
      
      // Извлекаем ссылку на товар
      const linkEl = el.find('a.link, a.item-link, a.product-item-link').first();
      const relativeUrl = linkEl.attr('href');
      if (!relativeUrl) return;
      
      const url = new URL(relativeUrl, baseUrl).toString();
      
      // Извлекаем название товара
      const title = linkEl.text().trim();
      
      // Извлекаем изображение
      const imgEl = el.find('img').first();
      const imgSrc = imgEl.attr('src') || imgEl.attr('data-src');
      const image = imgSrc ? new URL(imgSrc, baseUrl).toString() : null;
      
      // Извлекаем описание
      const descEl = el.find('.product-micro-description, .item-description, .description');
      const description = descEl.text().trim();
      
      // Извлекаем цену
      const priceEl = el.find('.price, .product-price');
      let price = null;
      let currency = 'RUB';
      
      const priceText = priceEl.text().trim();
      const priceMatch = priceText.match(/[\d\s.,]+\s*(?:р|₽|руб)/i);
      if (priceMatch) {
        price = parseFloat(priceMatch[0].replace(/[^\d.,]/g, '').replace(',', '.'));
      }
      
      // Извлекаем наличие
      const stockEl = el.find('.stock, .product-stock');
      let stock = null;
      const stockText = stockEl.text().trim();
      const stockMatch = stockText.match(/(\d+)\s*(?:шт|pcs)/i);
      if (stockMatch) {
        stock = parseInt(stockMatch[1], 10);
      }
      
      // Извлекаем производителя
      const brandEl = el.find('.brand, .manufacturer');
      const brand = brandEl.text().trim();
      
      // Извлекаем MPN (артикул)
      const mpnEl = el.find('.mpn, .article');
      let mpn = mpnEl.text().trim().replace(/^Арт\.?\s*:?\s*/i, '');
      
      // Если MPN не найден, пытаемся извлечь из URL
      if (!mpn) {
        const urlParts = url.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && lastPart !== '') {
          mpn = lastPart;
        }
      }
      
      // Добавляем результат, если есть хотя бы URL и название
      if (url && (title || mpn)) {
        results.push({
          url,
          title,
          mpn,
          brand,
          description,
          image,
          price,
          currency,
          stock
        });
      }
    } catch (error) {
      console.error('Error parsing product item:', error);
    }
  });
  
  return results;
}
