import * as cheerio from 'cheerio';
import { normCanon } from '../../core/canon.mjs';
import crypto from 'node:crypto';

function hashName(u){ return crypto.createHash('sha1').update(u).digest('hex'); }

/**
 * Нормализует MPN: убирает невидимые символы, заменяет non-breaking space
 * @param {string} mpn 
 * @returns {string}
 */
function normalizeMpn(mpn) {
  if (!mpn) return '';
  // Нормализация NFKC, удаление невидимых символов, замена non-breaking space
  return mpn.normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Невидимые символы
    .replace(/\u00A0/g, ' ')              // Non-breaking space
    .trim();
}

/**
 * Парсит HTML страницу продукта ChipDip
 * @param {string} html HTML страницы
 * @param {string} url URL страницы
 * @returns {object} Каноническое представление продукта
 */
export function parseChipDipProduct(html, url) {
  const $ = cheerio.load(html);
  
  // Извлечение MPN (артикул) - приоритет у артикула, затем номенклатурный номер
  let mpn = '';
  // Проверяем артикул в таблице характеристик
  const articleRow = $('table.product-params tr').filter((_, el) => {
    return $(el).find('td:first-child').text().trim().toLowerCase().includes('артикул');
  });
  if (articleRow.length) {
    mpn = articleRow.find('td:last-child').text().trim();
  }
  
  // Если артикул не найден, ищем в других местах
  if (!mpn) {
    // Ищем в блоке с артикулом (обычно рядом с заголовком)
    mpn = $('.product__artikul').text().trim().replace(/^Арт\.?\s*:?\s*/i, '');
  }
  
  // Если артикул всё еще не найден, используем номенклатурный номер
  if (!mpn) {
    mpn = $('td:contains("Номенклатурный номер")').next().text().trim();
  }
  
  // Если и это не помогло, используем последнюю часть URL
  if (!mpn) {
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart !== '') {
      mpn = lastPart;
    } else if (urlParts.length > 2) {
      mpn = urlParts[urlParts.length - 2];
    }
  }
  
  // Нормализация MPN
  mpn = normalizeMpn(mpn);
  
  // Извлечение заголовка (название товара)
  const title = $('h1').first().text().trim();
  
  // Извлечение бренда (производителя)
  let brand = '';
  // Ищем бренд в ссылке на производителя
  const brandLink = $('a[href*="/brand/"], .product__brand a').first();
  if (brandLink.length) {
    brand = brandLink.text().trim();
  }
  
  // Если бренд не найден, ищем в таблице характеристик
  if (!brand) {
    brand = $('td:contains("Производитель")').next().text().trim();
  }
  
  // Если бренд не найден, ищем в мета-тегах
  if (!brand) {
    brand = $('meta[itemprop="brand"]').attr('content') || '';
  }
  
  // Извлечение SKU (номенклатурный номер)
  const sku = $('td:contains("Номенклатурный номер")').next().text().trim() || '';
  
  // Извлечение изображений
  const ogImg = $('meta[property="og:image"]').attr('content') || '';
  const imgEl = $('img[src*="/images/"]').first().attr('src') || '';
  const image = (ogImg || imgEl) ? new URL((ogImg || imgEl), url).toString() : '';
  
  // Собираем все изображения
  const images = [];
  $('img').each((_, e) => {
    const src = $(e).attr('src') || '';
    if (!src) return;
    const abs = new URL(src, url).toString();
    // Фильтруем только изображения продукта (исключаем иконки, баннеры и т.д.)
    if (abs.includes('/images/') || abs.includes('/lib/')) {
      images.push(abs);
    }
  });
  
  // Извлечение краткого описания
  let short = '';
  const descBlock = $('div:contains("Описание")').first().next();
  if (descBlock.length) {
    short = descBlock.text().trim();
  } else {
    short = $('meta[name="description"]').attr('content') || '';
  }
  
  // Извлечение цен и наличия
  const offers = [];
  let stockTotal = 0;
  
  // Ищем таблицу с ценами и наличием
  $('table:contains("Сроки доставки") tr, table:contains("Цена") tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length >= 3) {
      const region = $(tds[0]).text().trim();
      const eta = $(tds[1]).text().trim();
      
      // Извлечение цены
      let price = 0;
      let currency = 'RUB';
      
      // Ищем цену в формате "1234 р"
      const priceText = $(tds[2]).text().trim();
      const priceMatch = priceText.match(/[\d\s.,]+\s*(?:р|₽|руб)/i);
      if (priceMatch) {
        price = parseFloat(priceMatch[0].replace(/[^\d.,]/g, '').replace(',', '.'));
      } else {
        // Если не нашли в формате "р", ищем просто число
        const numMatch = priceText.match(/[\d\s.,]+/);
        if (numMatch) {
          price = parseFloat(numMatch[0].replace(/[^\d.,]/g, '').replace(',', '.'));
        }
      }
      
      // Извлечение наличия
      let stock = null;
      const stockText = $(tds[3] || tds[2]).text().trim();
      const stockMatch = stockText.match(/(\d+)\s*(?:шт|pcs)/i);
      if (stockMatch) {
        stock = parseInt(stockMatch[1], 10);
        stockTotal += stock;
      }
      
      // Добавляем предложение, если есть регион и цена
      if (region && price > 0) {
        offers.push({ 
          region, 
          currency, 
          price, 
          stock, 
          eta 
        });
      }
    }
  });
  
  // Если не нашли цены в таблице, ищем в других местах
  if (offers.length === 0) {
    // Ищем цену в блоке с ценой
    const priceBlock = $('.price');
    if (priceBlock.length) {
      const priceText = priceBlock.text().trim();
      const priceMatch = priceText.match(/[\d\s.,]+\s*(?:р|₽|руб)/i);
      if (priceMatch) {
        const price = parseFloat(priceMatch[0].replace(/[^\d.,]/g, '').replace(',', '.'));
        if (price > 0) {
          offers.push({
            region: 'Москва', // Дефолтный регион
            currency: 'RUB',
            price,
            stock: null,
            eta: null
          });
        }
      }
    }
  }
  
  // Извлечение технических характеристик
  const specs = {};
  
  // Ищем таблицу с техническими характеристиками
  $('table.product-params tr').each((_, el) => {
    const tds = $(el).find('td');
    if (tds.length >= 2) {
      const key = $(tds[0]).text().trim();
      const value = $(tds[1]).text().trim();
      if (key) {
        specs[key] = value;
      }
    }
  });
  
  // Если не нашли в таблице, ищем в dl/dt/dd
  if (Object.keys(specs).length === 0) {
    $('dl dt').each((_, el) => {
      const key = $(el).text().trim();
      const value = $(el).next('dd').text().trim();
      if (key) {
        specs[key] = value;
      }
    });
  }
  
  // Извлечение информации о корпусе
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
  
  // Извлечение PDF документов
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
  
  // Формируем каноническое представление продукта
  const canon = normCanon({
    url,
    mpn,
    brand,
    title,
    sku,
    image,
    images,
    desc_short: short,
    offers,
    docs,
    specs,
    stock_total: stockTotal,
    pkg,
    pkg_type: pkgType,
    source: 'chipdip'
  });
  
  return canon;
}