// src/adapters/ru/promelec.js - Promelec адаптер (приоритет 2)
import * as cheerio from 'cheerio';
import { httpGet } from '../../services/net.js';
import { getParserConfig } from '../../config/parsers.config.js';
import { saveSourceHtml } from '../../services/sources-storage.js';

const config = getParserConfig('promelec');

// Нормализация текста
const nz = (text) => {
  if (!text) return '';
  return String(text).trim().replace(/\s+/g, ' ');
};

// Извлечение технических параметров
const extractSpecs = ($, specsSelector) => {
  const specs = {};
  
  // Ищем секцию с техническими параметрами
  const specsSection = $('h2:contains("Технические параметры")').parent();
  if (specsSection.length > 0) {
    specsSection.find('table tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length >= 2) {
        const key = nz($(cells[0]).text());
        const value = nz($(cells[1]).text());
        
        if (key && value && key !== value) {
          specs[key] = value;
        }
      }
    });
  }
  
  // Альтернативный поиск по селектору
  $(specsSelector).find('tr').each((_, row) => {
    const $row = $(row);
    const cells = $row.find('td');
    
    if (cells.length >= 2) {
      const key = nz($(cells[0]).text());
      const value = nz($(cells[1]).text());
      
      if (key && value && key !== value && !specs[key]) {
        specs[key] = value;
      }
    }
  });
  
  return specs;
};

// Извлечение изображений
const extractImages = ($, selectors) => {
  const images = [];
  
  $(selectors.images).each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src') || $img.attr('data-src');
    
    if (src && !src.includes('placeholder')) {
      const fullUrl = src.startsWith('http') ? src : `${config.baseUrl}${src}`;
      if (!images.includes(fullUrl)) {
        images.push(fullUrl);
      }
    }
  });
  
  return images;
};

// Извлечение датащитов
const extractDatasheets = ($, selectors) => {
  const datasheets = [];
  
  // Ищем в секции документации
  $('section:contains("Документация"), section:contains("Datasheet")').find('a').each((_, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    
    if (href && href.toLowerCase().includes('pdf')) {
      const fullUrl = href.startsWith('http') ? href : `${config.baseUrl}${href}`;
      if (!datasheets.includes(fullUrl)) {
        datasheets.push(fullUrl);
      }
    }
  });
  
  // Общий поиск PDF ссылок
  $(selectors.datasheets).each((_, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    
    if (href && href.toLowerCase().includes('pdf')) {
      const fullUrl = href.startsWith('http') ? href : `${config.baseUrl}${href}`;
      if (!datasheets.includes(fullUrl)) {
        datasheets.push(fullUrl);
      }
    }
  });
  
  return datasheets;
};

// Поиск продукта на Promelec
const searchProduct = async (mpn) => {
  const searchUrl = config.searchUrl(mpn);
  const result = await httpGet(searchUrl, config.headers);
  
  if (!result.ok) {
    return { ok: false, code: result.code, source: 'promelec' };
  }
  
  // Сохраняем HTML источник
  saveSourceHtml('promelec', mpn, result.text, {
    url: searchUrl,
    status: result.status,
    duration: result.ms
  });
  
  const $ = cheerio.load(result.text);
  const selectors = config.selectors;
  
  // Ищем результаты поиска
  const searchResults = $(selectors.searchResults);
  let productLink = null;
  
  if (searchResults.length > 0) {
    const firstResult = searchResults.first();
    const link = firstResult.find(selectors.searchLink).first();
    productLink = link.attr('href');
  } else {
    // Проверяем, может быть уже на карточке
    const title = $(selectors.title).first();
    if (title.length > 0 && title.text().toLowerCase().includes(mpn.toLowerCase())) {
      productLink = searchUrl;
    }
  }
  
  if (!productLink) {
    return { ok: false, code: 'PRODUCT_NOT_FOUND', source: 'promelec' };
  }
  
  if (!productLink.startsWith('http')) {
    productLink = `${config.baseUrl}${productLink}`;
  }
  
  return { ok: true, productUrl: productLink };
};

// Извлечение данных с карточки
const extractProductData = async (productUrl, mpn) => {
  const result = await httpGet(productUrl, config.headers);
  
  if (!result.ok) {
    return { ok: false, code: result.code, source: 'promelec' };
  }
  
  saveSourceHtml('promelec-product', mpn, result.text, {
    url: productUrl,
    status: result.status,
    duration: result.ms
  });
  
  const $ = cheerio.load(result.text);
  const selectors = config.selectors;
  
  // Извлекаем данные
  const title = nz($(selectors.title).first().text());
  const description = nz($(selectors.description).first().text());
  const manufacturer = nz($(selectors.manufacturer).first().text());
  const packageType = nz($(selectors.package).first().text());
  const packaging = nz($(selectors.packaging).first().text());
  
  // Технические параметры
  const technical_specs = extractSpecs($, selectors.specsTable);
  
  // Изображения
  const images = extractImages($, selectors);
  
  // Датащиты
  const datasheets = extractDatasheets($, selectors);
  
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
    source: 'promelec',
    url: productUrl
  };
  
  return { ok: true, data: productData };
};

// Основная функция адаптера
export const parsePromelec = async (mpn) => {
  if (!mpn || typeof mpn !== 'string') {
    return { ok: false, code: 'INVALID_MPN', source: 'promelec' };
  }
  
  const searchResult = await searchProduct(mpn.trim());
  if (!searchResult.ok) {
    return searchResult;
  }
  
  const extractResult = await extractProductData(searchResult.productUrl, mpn);
  if (!extractResult.ok) {
    return extractResult;
  }
  
  return {
    ok: true,
    source: 'promelec',
    priority: config.priority,
    data: extractResult.data
  };
};
