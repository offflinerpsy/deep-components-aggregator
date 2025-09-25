// src/adapters/ru/electronshik.js - Electronshik адаптер (приоритет 5)
import * as cheerio from 'cheerio';
import { httpGet } from '../../services/net.js';
import { getParserConfig } from '../../config/parsers.config.js';
import { saveSourceHtml } from '../../services/sources-storage.js';

const config = getParserConfig('electronshik');

const nz = (text) => {
  if (!text) return '';
  return String(text).trim().replace(/\s+/g, ' ');
};

const extractSpecs = ($, specsSelector) => {
  const specs = {};
  
  // Ищем секцию "Технические параметры"
  $('h2:contains("Технические параметры")').next().find('tr, li, div').each((_, element) => {
    const $el = $(element);
    const text = nz($el.text());
    
    if (text.includes(':')) {
      const [key, value] = text.split(':').map(s => s.trim());
      if (key && value && key !== value) {
        specs[key] = value;
      }
    }
  });
  
  // Альтернативный поиск в таблицах
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

const extractImages = ($, selectors) => {
  const images = [];
  
  $(selectors.images).each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src') || $img.attr('data-src');
    
    if (src && !src.includes('placeholder') && !src.includes('no-photo')) {
      const fullUrl = src.startsWith('http') ? src : `${config.baseUrl}${src}`;
      if (!images.includes(fullUrl)) {
        images.push(fullUrl);
      }
    }
  });
  
  return images;
};

const extractDatasheets = ($, selectors) => {
  const datasheets = [];
  
  // Ищем в секции документов
  $('.docs, .documentation, .files').find('a').each((_, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    
    if (href && href.toLowerCase().includes('pdf')) {
      const fullUrl = href.startsWith('http') ? href : `${config.baseUrl}${href}`;
      if (!datasheets.includes(fullUrl)) {
        datasheets.push(fullUrl);
      }
    }
  });
  
  // Общий поиск PDF
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

const searchProduct = async (mpn) => {
  const searchUrl = config.searchUrl(mpn);
  const result = await httpGet(searchUrl, config.headers);
  
  if (!result.ok) {
    return { ok: false, code: result.code, source: 'electronshik' };
  }
  
  saveSourceHtml('electronshik', mpn, result.text, {
    url: searchUrl,
    status: result.status,
    duration: result.ms
  });
  
  const $ = cheerio.load(result.text);
  const selectors = config.selectors;
  
  const searchResults = $(selectors.searchResults);
  let productLink = null;
  
  if (searchResults.length > 0) {
    const firstResult = searchResults.first();
    const link = firstResult.find(selectors.searchLink).first();
    productLink = link.attr('href');
  } else {
    const title = $(selectors.title).first();
    if (title.length > 0) {
      productLink = searchUrl;
    }
  }
  
  if (!productLink) {
    return { ok: false, code: 'PRODUCT_NOT_FOUND', source: 'electronshik' };
  }
  
  if (!productLink.startsWith('http')) {
    productLink = `${config.baseUrl}${productLink}`;
  }
  
  return { ok: true, productUrl: productLink };
};

const extractProductData = async (productUrl, mpn) => {
  const result = await httpGet(productUrl, config.headers);
  
  if (!result.ok) {
    return { ok: false, code: result.code, source: 'electronshik' };
  }
  
  saveSourceHtml('electronshik-product', mpn, result.text, {
    url: productUrl,
    status: result.status,
    duration: result.ms
  });
  
  const $ = cheerio.load(result.text);
  const selectors = config.selectors;
  
  const title = nz($(selectors.title).first().text());
  const description = nz($(selectors.description).first().text());
  const manufacturer = nz($(selectors.manufacturer).first().text());
  const packageType = nz($(selectors.package).first().text());
  const packaging = nz($(selectors.packaging).first().text());
  
  const technical_specs = extractSpecs($, selectors.specsTable);
  const images = extractImages($, selectors);
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
    source: 'electronshik',
    url: productUrl
  };
  
  return { ok: true, data: productData };
};

export const parseElectronshik = async (mpn) => {
  if (!mpn || typeof mpn !== 'string') {
    return { ok: false, code: 'INVALID_MPN', source: 'electronshik' };
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
    source: 'electronshik',
    priority: config.priority,
    data: extractResult.data
  };
};
