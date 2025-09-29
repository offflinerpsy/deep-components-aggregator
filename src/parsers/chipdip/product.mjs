/**
 * Парсер страницы товара ChipDip
 * @module src/parsers/chipdip/product
 */

import { load } from 'cheerio';
import path from 'node:path';
import fs from 'node:fs';
import { toRub } from '../../currency/cbr.mjs';

/**
 * Извлечь MPN (артикул) товара
 * @param {Object} $ - Cheerio объект
 * @returns {string|null} MPN товара или null
 */
const extractMpn = ($) => {
  // Пытаемся найти MPN в разных местах страницы

  // Вариант 1: В заголовке страницы (часто формат "MPN - Название")
  const title = $('title').text().trim();
  const titleMatch = title.match(/^([A-Za-z0-9-]+)/);

  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }

  // Вариант 2: В метатегах
  const metaMpn = $('meta[itemprop="mpn"]').attr('content');
  if (metaMpn) {
    return metaMpn.trim();
  }

  // Вариант 3: В блоке с артикулом
  const mpnText = $('.item-heading .item-code').text().trim();
  const mpnMatch = mpnText.match(/Артикул:\s*([A-Za-z0-9-]+)/);

  if (mpnMatch && mpnMatch[1]) {
    return mpnMatch[1].trim();
  }

  // Вариант 4: В URL
  const canonicalUrl = $('link[rel="canonical"]').attr('href');
  if (canonicalUrl) {
    const urlMatch = canonicalUrl.match(/\/product0?\/([A-Za-z0-9-]+)/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1].trim();
    }
  }

  return null;
};

/**
 * Извлечь ID товара из URL
 * @param {string} url - URL страницы товара
 * @returns {string|null} ID товара или null
 */
const extractChipDipId = (url) => {
  if (!url) return null;

  const match = url.match(/\/product0?\/([A-Za-z0-9-]+)/);
  return match ? match[1] : null;
};

/**
 * Извлечь производителя товара
 * @param {Object} $ - Cheerio объект
 * @returns {string|null} Производитель товара или null
 */
const extractBrand = ($) => {
  // Вариант 1: В метатегах
  const metaBrand = $('meta[itemprop="brand"]').attr('content');
  if (metaBrand) {
    return metaBrand.trim();
  }

  // Вариант 2: В блоке с информацией о товаре
  let brand = null;

  $('.item-params tr').each((_, row) => {
    const label = $(row).find('th').text().trim().toLowerCase();
    if (label.includes('производитель') || label.includes('бренд')) {
      brand = $(row).find('td').text().trim();
    }
  });

  return brand;
};

/**
 * Извлечь заголовок товара
 * @param {Object} $ - Cheerio объект
 * @returns {string|null} Заголовок товара или null
 */
const extractTitle = ($) => {
  // Вариант 1: В метатегах
  const metaTitle = $('meta[itemprop="name"]').attr('content');
  if (metaTitle) {
    return metaTitle.trim();
  }

  // Вариант 2: В заголовке страницы
  const pageTitle = $('h1.item-title').text().trim();
  if (pageTitle) {
    return pageTitle;
  }

  // Вариант 3: В title страницы (без MPN)
  const title = $('title').text().trim();
  const titleMatch = title.match(/^[A-Za-z0-9-]+ - (.+)/);

  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }

  return title || null;
};

/**
 * Извлечь краткое описание товара
 * @param {Object} $ - Cheerio объект
 * @returns {string|null} Краткое описание товара или null
 */
const extractDescription = ($) => {
  // Вариант 1: В метатегах
  const metaDesc = $('meta[name="description"]').attr('content');
  if (metaDesc) {
    return metaDesc.trim();
  }

  // Вариант 2: В блоке с описанием
  const description = $('.item-description').text().trim();
  if (description) {
    return description;
  }

  return null;
};

/**
 * Извлечь URL изображения товара
 * @param {Object} $ - Cheerio объект
 * @returns {string|null} URL изображения товара или null
 */
const extractImage = ($) => {
  // Вариант 1: В метатегах
  const metaImage = $('meta[itemprop="image"]').attr('content');
  if (metaImage) {
    return new URL(metaImage, 'https://www.chipdip.ru').toString();
  }

  // Вариант 2: В блоке с изображением
  const image = $('.item-image img').attr('src');
  if (image) {
    return new URL(image, 'https://www.chipdip.ru').toString();
  }

  return null;
};

/**
 * Извлечь URL датафайлов (PDF)
 * @param {Object} $ - Cheerio объект
 * @returns {string[]} Массив URL датафайлов
 */
const extractDatasheets = ($) => {
  const datasheets = [];

  // Ищем ссылки на датафайлы
  $('.item-docs a[href*=".pdf"]').each((_, element) => {
    const href = $(element).attr('href');
    if (href) {
      datasheets.push(new URL(href, 'https://www.chipdip.ru').toString());
    }
  });

  return datasheets;
};

/**
 * Извлечь технические характеристики товара
 * @param {Object} $ - Cheerio объект
 * @returns {Object} Технические характеристики товара
 */
const extractTechSpecs = ($) => {
  const specs = {};

  // Ищем технические характеристики в таблице
  $('.item-params tr').each((_, row) => {
    const label = $(row).find('th').text().trim();
    const value = $(row).find('td').text().trim();

    if (label && value) {
      specs[label] = value;
    }
  });

  return specs;
};

/**
 * Извлечь информацию о корпусе товара
 * @param {Object} $ - Cheerio объект
 * @returns {string|null} Информация о корпусе товара или null
 */
const extractPackage = ($) => {
  let packageInfo = null;

  // Ищем информацию о корпусе в технических характеристиках
  $('.item-params tr').each((_, row) => {
    const label = $(row).find('th').text().trim().toLowerCase();
    if (label.includes('корпус') || label.includes('package')) {
      packageInfo = $(row).find('td').text().trim();
    }
  });

  return packageInfo;
};

/**
 * Извлечь информацию о упаковке товара
 * @param {Object} $ - Cheerio объект
 * @returns {string|null} Информация о упаковке товара или null
 */
const extractPackaging = ($) => {
  let packaging = null;

  // Ищем информацию о упаковке в технических характеристиках
  $('.item-params tr').each((_, row) => {
    const label = $(row).find('th').text().trim().toLowerCase();
    if (label.includes('упаковка') || label.includes('поставка')) {
      packaging = $(row).find('td').text().trim();
    }
  });

  return packaging;
};

/**
 * Извлечь информацию о цене и наличии товара
 * @param {Object} $ - Cheerio объект
 * @returns {Object[]} Массив предложений
 */
const extractOffers = ($) => {
  const offers = [];

  // Ищем информацию о цене и наличии
  const price = $('.item-price .price').text().trim().replace(/[^\d.,]/g, '').replace(',', '.');
  const priceValue = parseFloat(price);

  if (!isNaN(priceValue)) {
    // Определяем валюту
    const priceText = $('.item-price .price').text().trim();
    let currency = 'RUB';

    if (priceText.includes('$')) {
      currency = 'USD';
    } else if (priceText.includes('€')) {
      currency = 'EUR';
    }

    // Определяем наличие
    let stock = 0;
    const stockText = $('.item-avail').text().trim().toLowerCase();

    if (stockText.includes('в наличии')) {
      // Пытаемся извлечь количество
      const stockMatch = stockText.match(/(\d+)/);
      stock = stockMatch ? parseInt(stockMatch[1], 10) : 10;
    } else if (stockText.includes('есть')) {
      stock = 5;
    }

    // Конвертируем цену в рубли
    const priceRub = toRub(priceValue, currency);

    offers.push({
      region: 'RU',
      stock,
      price_native: priceValue,
      currency,
      price_min_rub: priceRub,
      source: 'chipdip',
      provider: 'chipdip'
    });
  }

  return offers;
};

/**
 * Преобразовать HTML страницы товара в канонический формат
 * @param {Object} data - Данные для преобразования
 * @param {string} data.url - URL страницы товара
 * @param {string} data.html - HTML страницы товара
 * @returns {Object} Товар в каноническом формате
 */
export const toCanon = ({ url, html }) => {
  if (!html) {
    return {
      ok: false,
      reason: 'Пустой HTML'
    };
  }

  try {
    const $ = load(html);

    // Извлекаем данные товара
    const mpn = extractMpn($);
    const chipDipId = extractChipDipId(url);
    const brand = extractBrand($);
    const title = extractTitle($);
    const description = extractDescription($);
    const image = extractImage($);
    const datasheets = extractDatasheets($);
    const techSpecs = extractTechSpecs($);
    const packageInfo = extractPackage($);
    const packaging = extractPackaging($);
    const offers = extractOffers($);

    // Формируем канонический объект товара
    const product = {
      mpn,
      mpn_guess: !mpn,
      chipdip_id: chipDipId,
      brand,
      title,
      description,
      image_url: image,
      datasheet_urls: datasheets,
      technical_specs: techSpecs,
      package: packageInfo,
      packaging,
      offers,
      source_url: url,
      source: 'chipdip'
    };

    // Сохраняем нормализованную карточку
    if (mpn) {
      try {
        const dir = path.resolve('data/db/products');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(
          path.join(dir, `${mpn}.json`),
          JSON.stringify(product, null, 2),
          'utf8'
        );
      } catch (error) {
        console.error(`Ошибка при сохранении карточки товара ${mpn}:`, error.message);
      }
    }

    return {
      ok: true,
      data: product
    };
  } catch (error) {
    console.error('Ошибка при преобразовании HTML в канонический формат:', error.message);

    return {
      ok: false,
      reason: error.message
    };
  }
};

export default { toCanon };
