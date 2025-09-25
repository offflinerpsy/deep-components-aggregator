// src/adapters/ru/chipdip.js - ChipDip адаптер (приоритет 1)
import * as cheerio from 'cheerio';
import { httpGet } from '../../services/net.js';
import { getParserConfig } from '../../config/parsers.config.js';
import { saveSourceHtml } from '../../services/sources-storage.js';

const config = getParserConfig('chipdip');

// Нормализация текста
const nz = (text) => {
  if (!text) return '';
  return String(text).trim().replace(/\s+/g, ' ');
};

// Извлечение технических параметров из таблицы
const extractSpecs = ($, specsTable) => {
  const specs = {};
  
  if (!specsTable || specsTable.length === 0) return specs;
  
  specsTable.find('tr').each((_, row) => {
    const $row = $(row);
    const cells = $row.find('td, th');
    
    if (cells.length >= 2) {
      const key = nz($(cells[0]).text());
      const value = nz($(cells[1]).text());
      
      if (key && value && key !== value) {
        specs[key] = value;
      }
    }
  });
  
  return specs;
};

// Извлечение изображений
const extractImages = ($, selectors) => {
  const images = [];
  
  // Основное изображение
  const mainImg = $(selectors.imageMain).first();
  if (mainImg.length > 0) {
    const src = mainImg.attr('src') || mainImg.attr('data-src');
    if (src) {
      const fullUrl = src.startsWith('http') ? src : `${config.baseUrl}${src}`;
      images.push(fullUrl);
    }
  }
  
  // Дополнительные изображения
  $(selectors.images).each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src') || $img.attr('data-src');
    
    if (src && !images.some(existing => existing.includes(src))) {
      const fullUrl = src.startsWith('http') ? src : `${config.baseUrl}${src}`;
      images.push(fullUrl);
    }
  });
  
  return images;
};

// Извлечение датащитов
const extractDatasheets = ($, selectors) => {
  const datasheets = [];
  
  $(selectors.datasheets).each((_, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    
    if (href && href.toLowerCase().includes('pdf')) {
      const fullUrl = href.startsWith('http') ? href : `${config.baseUrl}${href}`;
      datasheets.push(fullUrl);
    }
  });
  
  return datasheets;
};

// Поиск продукта на ChipDip
const searchProduct = async (mpn) => {
  const searchUrl = config.searchUrl(mpn);
  const result = await httpGet(searchUrl, config.headers);
  
  if (!result.ok) {
    return { ok: false, code: result.code, source: 'chipdip' };
  }
  
  // Сохраняем HTML источник
  saveSourceHtml('chipdip', mpn, result.text, {
    url: searchUrl,
    status: result.status,
    duration: result.ms
  });
  
  const $ = cheerio.load(result.text);
  const selectors = config.selectors;
  
  // Ищем первый результат поиска или прямую карточку
  const searchResults = $(selectors.searchResults);
  let productLink = null;
  
  if (searchResults.length > 0) {
    // Есть результаты поиска - берем первый
    const firstResult = searchResults.first();
    const link = firstResult.find(selectors.searchLink).first();
    productLink = link.attr('href');
  } else {
    // Возможно, мы уже на карточке продукта
    const title = $(selectors.title).first();
    if (title.length > 0) {
      productLink = searchUrl; // Используем текущий URL
    }
  }
  
  if (!productLink) {
    return { ok: false, code: 'PRODUCT_NOT_FOUND', source: 'chipdip' };
  }
  
  // Если ссылка относительная, делаем абсолютной
  if (!productLink.startsWith('http')) {
    productLink = `${config.baseUrl}${productLink}`;
  }
  
  return { ok: true, productUrl: productLink };
};

// Извлечение данных с карточки продукта
const extractProductData = async (productUrl, mpn) => {
  const result = await httpGet(productUrl, config.headers);
  
  if (!result.ok) {
    return { ok: false, code: result.code, source: 'chipdip' };
  }
  
  // Сохраняем HTML карточки
  saveSourceHtml('chipdip-product', mpn, result.text, {
    url: productUrl,
    status: result.status,
    duration: result.ms
  });
  
  const $ = cheerio.load(result.text);
  const selectors = config.selectors;
  
  // Извлекаем основные поля
  const title = nz($(selectors.title).first().text());
  const description = nz($(selectors.description).first().text());
  const manufacturer = nz($(selectors.manufacturer).first().text());
  const packageType = nz($(selectors.package).first().text());
  const packaging = nz($(selectors.packaging).first().text());
  
  // Технические параметры
  const specsTable = $(selectors.specsTable).first();
  const technical_specs = extractSpecs($, specsTable);
  
  // Изображения
  const images = extractImages($, selectors);
  
  // Датащиты
  const datasheets = extractDatasheets($, selectors);
  
  // Формируем результат в RU-каноне
  const productData = {
    mpn,
    title,
    description,
    manufacturer,
    package: packageType,
    packaging,
    images,
    datasheets,
    technical_specs,
    source: 'chipdip',
    url: productUrl
  };
  
  return { ok: true, data: productData };
};

// Основная функция адаптера
export const parseChipDip = async (mpn) => {
  if (!mpn || typeof mpn !== 'string') {
    return { ok: false, code: 'INVALID_MPN', source: 'chipdip' };
  }
  
  // Поиск продукта
  const searchResult = await searchProduct(mpn.trim());
  if (!searchResult.ok) {
    return searchResult;
  }
  
  // Извлечение данных
  const extractResult = await extractProductData(searchResult.productUrl, mpn);
  if (!extractResult.ok) {
    return extractResult;
  }
  
  return {
    ok: true,
    source: 'chipdip',
    priority: config.priority,
    data: extractResult.data
  };
};

// Экспорт для тестирования
export { searchProduct, extractProductData };
