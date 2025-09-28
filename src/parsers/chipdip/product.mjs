import * as cheerio from 'cheerio';
import { toCanon, normalizeMpn } from '../../core/canon.mjs';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

/**
 * Извлекает MPN из HTML-страницы ChipDip
 * @param {object} $ Объект cheerio
 * @param {string} url URL страницы
 * @returns {string} Извлеченный MPN
 */
function extractMpn($, url) {
  // Пытаемся найти MPN в мета-тегах
  let mpn = $('meta[itemprop="mpn"]').attr('content');
  if (mpn) return normalizeMpn(mpn);

  // Пытаемся найти MPN в таблице характеристик
  const articleRow = $('table.product-params tr').filter((_, el) => {
    return $(el).find('td:first-child').text().trim().toLowerCase().includes('артикул');
  });

  if (articleRow.length) {
    mpn = articleRow.find('td:last-child').text().trim();
    if (mpn) return normalizeMpn(mpn);
  }

  // Пытаемся найти MPN в блоке с артикулом
  mpn = $('.product__artikul').text().trim().replace(/^Арт\.?\s*:?\s*/i, '');
  if (mpn) return normalizeMpn(mpn);

  // Пытаемся найти MPN в номенклатурном номере
  mpn = $('td:contains("Номенклатурный номер")').next().text().trim();
  if (mpn) return normalizeMpn(mpn);

  // Извлекаем MPN из URL
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];

    if (lastPart && lastPart !== '') {
      return normalizeMpn(lastPart);
    }

    if (pathParts.length > 2) {
      return normalizeMpn(pathParts[pathParts.length - 2]);
    }
  } catch (error) {
    // Игнорируем ошибки парсинга URL
  }

  // Если не удалось извлечь MPN, возвращаем пустую строку
  return '';
}

/**
 * Извлекает ChipDip ID из URL
 * @param {string} url URL страницы
 * @returns {string|null} ChipDip ID или null
 */
function extractChipDipId(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');

    // Проверяем формат /product0/<id>
    if (pathParts[1] === 'product0' && pathParts[2]) {
      return pathParts[2];
    }

    // Проверяем формат /product/<name>
    if (pathParts[1] === 'product' && pathParts[2]) {
      return null; // В этом случае ID не указан явно
    }
  } catch (error) {
    // Игнорируем ошибки парсинга URL
  }

  return null;
}

/**
 * Извлекает бренд из HTML-страницы ChipDip
 * @param {object} $ Объект cheerio
 * @returns {string} Извлеченный бренд
 */
function extractBrand($) {
  // Пытаемся найти бренд в мета-тегах
  let brand = $('meta[itemprop="brand"]').attr('content');
  if (brand) return brand.trim();

  // Пытаемся найти бренд в ссылке на производителя
  brand = $('a[href*="/brand/"], .product__brand a').first().text();
  if (brand) return brand.trim();

  // Пытаемся найти бренд в таблице характеристик
  brand = $('td:contains("Производитель")').next().text();
  if (brand) return brand.trim();

  // Если не удалось извлечь бренд, возвращаем пустую строку
  return '';
}

/**
 * Извлекает заголовок из HTML-страницы ChipDip
 * @param {object} $ Объект cheerio
 * @returns {string} Извлеченный заголовок
 */
function extractTitle($) {
  return $('h1').first().text().trim();
}

/**
 * Извлекает описание из HTML-страницы ChipDip
 * @param {object} $ Объект cheerio
 * @returns {string} Извлеченное описание
 */
function extractDescription($) {
  // Пытаемся найти описание в мета-тегах
  let description = $('meta[name="description"]').attr('content');
  if (description) return description.trim();

  // Пытаемся найти описание в блоке описания
  const descBlock = $('div:contains("Описание")').first().next();
  if (descBlock.length) {
    description = descBlock.text().trim();
    if (description) return description;
  }

  // Пытаемся найти описание в первом абзаце
  description = $('p').first().text().trim();
  if (description) return description;

  // Если не удалось извлечь описание, возвращаем пустую строку
  return '';
}

/**
 * Извлекает изображения из HTML-страницы ChipDip
 * @param {object} $ Объект cheerio
 * @param {string} url URL страницы
 * @returns {object} Объект с главным изображением и массивом всех изображений
 */
function extractImages($, url) {
  // Пытаемся найти главное изображение в мета-тегах
  let mainImage = $('meta[property="og:image"]').attr('content');
  if (!mainImage) {
    mainImage = $('img[itemprop="image"]').attr('src');
  }
  if (!mainImage) {
    mainImage = $('img[src*="/images/"]').first().attr('src');
  }

  // Преобразуем относительный путь в абсолютный
  if (mainImage) {
    try {
      mainImage = new URL(mainImage, url).toString();
    } catch (error) {
      mainImage = null;
    }
  }

  // Собираем все изображения
  const images = [];
  $('img').each((_, img) => {
    const src = $(img).attr('src');
    if (!src) return;

    try {
      const imgUrl = new URL(src, url).toString();
      // Фильтруем только изображения продукта (исключаем иконки, баннеры и т.д.)
      if (imgUrl.includes('/images/') || imgUrl.includes('/lib/')) {
        images.push(imgUrl);
      }
    } catch (error) {
      // Игнорируем ошибки парсинга URL
    }
  });

  return {
    mainImage,
    images: Array.from(new Set(images))
  };
}

/**
 * Извлекает PDF-документы из HTML-страницы ChipDip
 * @param {object} $ Объект cheerio
 * @param {string} url URL страницы
 * @returns {Array} Массив объектов с информацией о PDF-документах
 */
function extractDatasheets($, url) {
  const datasheets = [];

  $('a[href$=".pdf"]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href) return;

    try {
      const pdfUrl = new URL(href, url).toString();
      const title = $(a).text().trim() || 'Datasheet';

      // Генерируем хеш для имени файла
      const hash = crypto.createHash('sha1').update(pdfUrl).digest('hex');
      const localPath = `/files/pdf/${hash}.pdf`;

      datasheets.push({
        title,
        url: pdfUrl,
        local_url: localPath,
        hash
      });
    } catch (error) {
      // Игнорируем ошибки парсинга URL
    }
  });

  return datasheets;
}

/**
 * Извлекает информацию о корпусе из HTML-страницы ChipDip
 * @param {object} $ Объект cheerio
 * @param {string} title Заголовок страницы
 * @returns {object} Объект с информацией о корпусе
 */
function extractPackage($, title) {
  // Пытаемся найти информацию о корпусе в таблице характеристик
  let pkg = '';
  let pkgType = '';

  // Ищем в таблице характеристик
  $('table.product-params tr').each((_, tr) => {
    const key = $(tr).find('td:first-child').text().trim().toLowerCase();
    if (key.includes('корпус') || key.includes('package')) {
      pkg = $(tr).find('td:last-child').text().trim();
    }
  });

  // Если не нашли в таблице, ищем в заголовке
  if (!pkg && title) {
    const pkgMatch = title.match(/\[(.*?)\]/);
    if (pkgMatch) {
      pkg = pkgMatch[1].trim();
    }
  }

  // Определяем тип корпуса
  if (pkg) {
    if (/^(SO|SOIC|SOP|SSOP|TSSOP|MSOP|QFP|LQFP|TQFP|QFN|DFN|BGA|CSP)/i.test(pkg)) {
      pkgType = 'SMD';
    } else if (/^(DIP|PDIP|DIL|CDIP|TO-|HC49)/i.test(pkg)) {
      pkgType = 'THT';
    }
  }

  return {
    package: pkg,
    packageType: pkgType
  };
}

/**
 * Извлекает технические характеристики из HTML-страницы ChipDip
 * @param {object} $ Объект cheerio
 * @returns {object} Объект с техническими характеристиками
 */
function extractSpecs($) {
  const specs = {};

  // Ищем в таблице характеристик
  $('table.product-params tr').each((_, tr) => {
    const key = $(tr).find('td:first-child').text().trim();
    const value = $(tr).find('td:last-child').text().trim();

    if (key && value) {
      specs[key] = value;
    }
  });

  // Если не нашли в таблице, ищем в dl/dt/dd
  if (Object.keys(specs).length === 0) {
    $('dl dt').each((_, dt) => {
      const key = $(dt).text().trim();
      const value = $(dt).next('dd').text().trim();

      if (key && value) {
        specs[key] = value;
      }
    });
  }

  return specs;
}

/**
 * Извлекает предложения (цены, наличие, регионы) из HTML-страницы ChipDip
 * @param {object} $ Объект cheerio
 * @returns {object} Объект с предложениями и общим количеством
 */
function extractOffers($) {
  const offers = [];
  let stockTotal = 0;

  // Ищем таблицу с ценами и наличием
  $('table:contains("Сроки доставки") tr, table:contains("Цена") tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 3) return;

    const region = $(tds[0]).text().trim();
    const eta = $(tds[1]).text().trim();

    // Извлекаем цену
    let price = 0;
    let currency = 'RUB';

    const priceText = $(tds[2]).text().trim();
    const priceMatch = priceText.match(/[\d\s.,]+\s*(?:р|₽|руб)/i);
    if (priceMatch) {
      price = parseFloat(priceMatch[0].replace(/[^\d.,]/g, '').replace(',', '.'));
    } else {
      const numMatch = priceText.match(/[\d\s.,]+/);
      if (numMatch) {
        price = parseFloat(numMatch[0].replace(/[^\d.,]/g, '').replace(',', '.'));
      }
    }

    // Извлекаем наличие
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
        price_native: price,
        price_rub: price, // Для ChipDip цены уже в рублях
        currency,
        stock,
        eta
      });
    }
  });

  // Если не нашли цены в таблице, ищем в других местах
  if (offers.length === 0) {
    const priceBlock = $('.price');
    if (priceBlock.length) {
      const priceText = priceBlock.text().trim();
      const priceMatch = priceText.match(/[\d\s.,]+\s*(?:р|₽|руб)/i);
      if (priceMatch) {
        const price = parseFloat(priceMatch[0].replace(/[^\d.,]/g, '').replace(',', '.'));
        if (price > 0) {
          offers.push({
            region: 'Москва', // Дефолтный регион
            price_native: price,
            price_rub: price,
            currency: 'RUB',
            stock: null,
            eta: null
          });
        }
      }
    }
  }

  return {
    offers,
    stockTotal
  };
}

/**
 * Парсит HTML-страницу ChipDip и возвращает каноническое представление
 * @param {string} html HTML-страница
 * @param {string} url URL страницы
 * @returns {object} Каноническое представление продукта
 */
export function parseProduct(html, url) {
  const $ = cheerio.load(html);

  // Извлекаем основные данные
  const mpn = extractMpn($, url);
  const chipDipId = extractChipDipId(url);
  const brand = extractBrand($);
  const title = extractTitle($);
  const description = extractDescription($);
  const { mainImage, images } = extractImages($, url);
  const datasheets = extractDatasheets($, url);
  const { package: pkg, packageType } = extractPackage($, title);
  const specs = extractSpecs($);
  const { offers, stockTotal } = extractOffers($);

  // Проверяем, удалось ли надежно извлечь MPN
  const mpnGuess = !mpn || mpn === '';

  // Формируем данные для канонического представления
  const data = {
    mpn,
    mpn_guess: mpnGuess,
    chipdip_id: chipDipId,
    brand,
    title,
    desc_short: description,
    image_url: mainImage,
    images,
    datasheets: datasheets.map(ds => ds.url),
    package: pkg,
    packaging: packageType,
    specs,
    offers: offers.map(o => ({
      ...o,
      source: 'chipdip',
      url
    })),
    stock_total: stockTotal,
    source: 'chipdip',
    source_url: url
  };

  // Преобразуем в каноническое представление
  return toCanon(data);
}

/**
 * Сохраняет каноническое представление продукта в файл
 * @param {object} product Каноническое представление продукта
 * @param {string} rootDir Корневая директория проекта
 * @returns {string} Путь к сохраненному файлу
 */
export function saveProduct(product, rootDir) {
  if (!product.mpn) {
    throw new Error('MPN is required');
  }

  // Нормализуем MPN для использования в имени файла
  const safeMpn = product.mpn.replace(/[\/\\?%*:|"<>]/g, '_');
  const dir = path.join(rootDir, 'data/db/products');
  const filePath = path.join(dir, `${safeMpn}.json`);

  // Создаем директорию, если она не существует
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Сохраняем файл
  fs.writeFileSync(filePath, JSON.stringify(product, null, 2));

  return filePath;
}
