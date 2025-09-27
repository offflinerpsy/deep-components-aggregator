import * as cheerio from 'cheerio';

export function chipdipHtmlToCanon(html, url) {
  const $ = cheerio.load(html);

  // Извлекаем основные данные
  const title = $('h1').first().text().trim() || $('.product-title').text().trim();
  const mpn = $('.product-code').text().trim() || $('[data-product-code]').attr('data-product-code');
  const manufacturer = $('.manufacturer').text().trim() || $('.brand').text().trim();

  // Цена
  const priceText = $('.price-current').text().trim() || $('.price').text().trim();
  const priceMatch = priceText.match(/[\d\s,]+/);
  const price = priceMatch ? priceMatch[0].replace(/[\s,]/g, '') : '';

  // Изображение
  const image = $('.product-image img').attr('src') || $('.product-photo img').attr('src') || '';
  const imageUrl = image.startsWith('http') ? image : (image ? `https://www.chipdip.by${image}` : '');

  // Описание
  const description = $('.product-description').text().trim() || $('.description').text().trim();

  // Технические характеристики
  const specs = {};
  $('.specs tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim();
      const value = $(cells[1]).text().trim();
      if (key && value) {
        specs[key] = value;
      }
    }
  });

  return {
    title,
    mpn,
    manufacturer,
    price,
    image: imageUrl,
    description,
    specs,
    url,
    source: 'chipdip'
  };
}
