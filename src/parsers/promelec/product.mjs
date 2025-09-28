import * as cheerio from 'cheerio';
import { normCanon } from '../../core/canon.mjs';
import crypto from 'node:crypto';

function hashName(u){ return crypto.createHash('sha1').update(u).digest('hex'); }

/**
 * Парсит страницу товара Promelec
 * @param {string} html HTML-содержимое страницы товара
 * @param {string} url URL страницы
 * @returns {object} Каноническое представление товара
 */
export function parsePromelecProduct(html, url) {
  const $ = cheerio.load(html);
  
  // Извлекаем название товара
  const title = $('h1').first().text().trim();
  
  // Извлекаем MPN (артикул)
  let mpn = '';
  const mpnEl = $('.article, .product-article, [itemprop="mpn"]');
  if (mpnEl.length) {
    mpn = mpnEl.text().trim().replace(/^Арт\.?\s*:?\s*/i, '');
  }
  
  // Если MPN не найден, используем часть URL
  if (!mpn) {
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart !== '') {
      mpn = lastPart;
    }
  }
  
  // Извлекаем производителя
  let brand = '';
  const brandEl = $('.manufacturer, .brand, [itemprop="brand"]');
  if (brandEl.length) {
    brand = brandEl.text().trim();
  }
  
  // Извлекаем изображение
  let image = null;
  const ogImage = $('meta[property="og:image"]').attr('content');
  const mainImage = $('.product-image img, .gallery img').first().attr('src');
  if (ogImage) {
    image = new URL(ogImage, url).toString();
  } else if (mainImage) {
    image = new URL(mainImage, url).toString();
  }
  
  // Собираем все изображения
  const images = [];
  $('.product-image img, .gallery img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src) {
      const imgUrl = new URL(src, url).toString();
      images.push(imgUrl);
    }
  });
  
  // Извлекаем краткое описание
  let shortDesc = '';
  const descEl = $('.product-description, [itemprop="description"]');
  if (descEl.length) {
    shortDesc = descEl.text().trim();
  }
  
  // Извлекаем технические характеристики
  const specs = {};
  $('.specifications table tr, .characteristics table tr').each((_, row) => {
    const cells = $(row).find('td, th');
    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim();
      const value = $(cells[1]).text().trim();
      if (key && value) {
        specs[key] = value;
      }
    }
  });
  
  // Извлекаем информацию о корпусе
  let pkg = '';
  let pkgType = '';
  
  // Ищем информацию о корпусе в технических характеристиках
  for (const key in specs) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('корпус') || lowerKey.includes('package')) {
      pkg = specs[key];
      break;
    }
  }
  
  // Если не нашли в характеристиках, ищем в заголовке
  if (!pkg && title) {
    const pkgMatch = title.match(/\[(.*?)\]/);
    if (pkgMatch) {
      pkg = pkgMatch[1].trim();
    }
  }
  
  // Определяем тип корпуса на основе его названия
  if (pkg) {
    if (/^(SO|SOIC|SOP|SSOP|TSSOP|MSOP|QFP|LQFP|TQFP|QFN|DFN|BGA|CSP)/i.test(pkg)) {
      pkgType = 'SMD';
    } else if (/^(DIP|PDIP|DIL|CDIP|TO-|HC49)/i.test(pkg)) {
      pkgType = 'THT';
    }
  }
  
  // Извлекаем цены и наличие
  const offers = [];
  let stockTotal = 0;
  
  $('.price-block, .product-price-block').each((_, block) => {
    const priceEl = $(block).find('.price');
    const priceText = priceEl.text().trim();
    const priceMatch = priceText.match(/[\d\s.,]+\s*(?:р|₽|руб)/i);
    
    let price = 0;
    let currency = 'RUB';
    
    if (priceMatch) {
      price = parseFloat(priceMatch[0].replace(/[^\d.,]/g, '').replace(',', '.'));
    }
    
    const stockEl = $(block).find('.stock, .availability');
    const stockText = stockEl.text().trim();
    const stockMatch = stockText.match(/(\d+)\s*(?:шт|pcs)/i);
    
    let stock = null;
    if (stockMatch) {
      stock = parseInt(stockMatch[1], 10);
      stockTotal += stock;
    }
    
    const regionEl = $(block).find('.region, .warehouse');
    const region = regionEl.text().trim() || 'Москва';
    
    if (price > 0) {
      offers.push({
        region,
        currency,
        price,
        stock,
        eta: null
      });
    }
  });
  
  // Извлекаем PDF документы
  const docs = [];
  $('a[href$=".pdf"]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href) return;
    
    const abs = new URL(href, url).toString();
    const h = hashName(abs);
    
    docs.push({
      title: $(a).text().trim() || 'PDF',
      url: `/files/pdf/${h}.pdf`,
      _src: abs,
      _hash: h
    });
  });
  
  // Формируем каноническое представление
  const canon = normCanon({
    url,
    mpn,
    brand,
    title,
    sku: mpn,
    image,
    images,
    desc_short: shortDesc,
    offers,
    docs,
    specs,
    stock_total: stockTotal,
    pkg,
    pkg_type: pkgType,
    source: 'promelec'
  });
  
  return canon;
}
