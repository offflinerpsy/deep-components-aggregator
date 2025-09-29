/**
 * Парсер продуктов ChipDip
 * @module src/parsers/chipdip/product
 */

import { load } from 'cheerio';
import { nanoid } from 'nanoid';
import { convertToRub } from '../../currency/cbr.mjs';

/**
 * Преобразует страницу продукта ChipDip в канонический формат
 * @param {Object} options - Опции парсинга
 * @param {string} options.url - URL страницы продукта
 * @param {string} options.html - HTML страницы продукта
 * @returns {Promise<Object>} Продукт в каноническом формате
 */
export const toCanon = async ({ url, html }) => {
  const $ = load(html);
  
  // Создаем базовый объект продукта
  const product = {
    id: nanoid(),
    url: url,
    source: 'chipdip',
    datasheet_urls: [],
    technical_specs: {},
    offers: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Извлекаем MPN
  product.mpn = $('[itemprop="mpn"]').text().trim() || $('[data-chd-product-attr="part_number"]').text().trim();
  
  // Если MPN не найден, пытаемся извлечь ID ChipDip из URL
  if (!product.mpn) {
    const urlMatch = url.match(/\/product0?\/(\d+)/);
    if (urlMatch) {
      product.chipdip_id = urlMatch[1];
      product.mpn_guess = true;
      
      // Пытаемся использовать заголовок или артикул как MPN
      const title = $('h1[itemprop="name"]').text().trim();
      const articleMatch = title.match(/\b([A-Z0-9]+-[A-Z0-9]+)\b/);
      if (articleMatch) {
        product.mpn = articleMatch[1];
      }
    }
  }

  // Извлекаем бренд
  product.brand = $('[itemprop="brand"]').find('[itemprop="name"]').text().trim();

  // Извлекаем заголовок
  product.title = $('h1[itemprop="name"]').text().trim();

  // Извлекаем описание
  product.description = $('div[itemprop="description"]').text().trim();
  
  // Если описание пустое, пытаемся найти его в других местах
  if (!product.description) {
    // Проверяем блок с описанием товара
    const descBlock = $('.product-card-description');
    if (descBlock.length > 0) {
      product.description = descBlock.text().trim();
    }
    
    // Проверяем блок с особенностями товара
    if (!product.description) {
      const featuresBlock = $('.product-card-features');
      if (featuresBlock.length > 0) {
        product.description = featuresBlock.text().trim();
      }
    }
  }

  // Извлекаем URL изображения
  product.image_url = $('[itemprop="image"]').attr('src');
  if (product.image_url && !product.image_url.startsWith('http')) {
    product.image_url = new URL(product.image_url, 'https://www.chipdip.ru').toString();
  }
  
  // Собираем все изображения в галерею
  product.gallery = [];
  $('.product-photo-container img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const imgUrl = src.startsWith('http') ? src : new URL(src, 'https://www.chipdip.ru').toString();
      product.gallery.push(imgUrl);
    }
  });

  // Извлекаем URL даташитов
  $('a[href*=".pdf"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const pdfUrl = href.startsWith('http') ? href : new URL(href, 'https://www.chipdip.ru').toString();
      // Добавляем только уникальные URL
      if (!product.datasheet_urls.includes(pdfUrl)) {
        product.datasheet_urls.push(pdfUrl);
      }
    }
  });

  // Извлекаем предложения
  $('.item-table__row').each(async (_, row) => {
    const stockText = $(row).find('.item-table__cell_count .count').text().trim();
    const stock = parseInt(stockText.replace(/\D/g, '')) || 0;

    const priceText = $(row).find('.price__value').text().trim();
    const price_native = parseFloat(priceText.replace(/[^\d,.]/g, '').replace(',', '.')) || 0;
    const currency = $(row).find('.price__currency').text().trim() === '₽' ? 'RUB' : 'USD';

    if (stock > 0 && price_native > 0) {
      const price_min_rub = await convertToRub(price_native, currency);
      
      product.offers.push({
        region: 'RU',
        stock,
        price_native,
        currency,
        price_min_rub,
        source: 'chipdip',
        url: url,
        provider: 'chipdip-parser',
      });
    }
  });

  // Извлекаем технические характеристики
  $('.product-params__table-row').each((_, row) => {
    const paramName = $(row).find('.product-params__table-name').text().trim();
    const paramValue = $(row).find('.product-params__table-value').text().trim();
    
    if (paramName && paramValue) {
      product.technical_specs[paramName] = paramValue;
      
      // Определяем корпус и упаковку
      if (paramName.includes('Корпус')) {
        product.package = paramValue;
      } else if (paramName.includes('Упаковка')) {
        product.packaging = paramValue;
      }
    }
  });
  
  // Извлекаем регионы
  product.regions = Array.from(new Set(product.offers.map(o => o.region).filter(Boolean)));
  
  // Вычисляем минимальную цену в рублях
  if (product.offers.length > 0) {
    const rubPrices = product.offers
      .map(o => o.price_min_rub)
      .filter(p => p !== null && p !== undefined && !isNaN(p));
    
    if (rubPrices.length > 0) {
      product.price_min_rub = Math.min(...rubPrices);
    }
  }
  
  // Вычисляем общий сток
  product.total_stock = product.offers.reduce((sum, o) => sum + (o.stock || 0), 0);

  return product;
};

export default {
  toCanon
};