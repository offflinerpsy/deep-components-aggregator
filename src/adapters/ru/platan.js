import { fetchWithRetry, parseHtml } from '../../services/net.js';
import { loadConfig } from '../../config/sources.ru.js';

const config = loadConfig('platan');

export async function parsePlatan(mpn) {
  const startTime = Date.now();
  const url = config.searchUrl.replace('{q}', encodeURIComponent(mpn));
  
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    return {
      ok: false,
      source: 'platan',
      reason: `HTTP ${response.status}`,
      url
    };
  }

  const html = await response.text();
  const $ = parseHtml(html);
  
  // Поиск первой карточки в результатах
  const firstCard = $('.product-item, .item, .search-result').first();
  if (firstCard.length === 0) {
    return {
      ok: false,
      source: 'platan',
      reason: 'No products found',
      url
    };
  }

  // Извлекаем ссылку на товар
  const productLink = firstCard.find('a').attr('href');
  if (!productLink) {
    return {
      ok: false,
      source: 'platan',
      reason: 'No product link found',
      url
    };
  }

  // Переходим на страницу товара
  const fullUrl = productLink.startsWith('http') ? productLink : config.baseUrl + productLink;
  const productResponse = await fetchWithRetry(fullUrl);
  if (!productResponse.ok) {
    return {
      ok: false,
      source: 'platan',
      reason: `Product page HTTP ${productResponse.status}`,
      url: fullUrl
    };
  }

  const productHtml = await productResponse.text();
  const $product = parseHtml(productHtml);
  
  // Извлекаем данные
  const title = $product('h1, .product-title, .title').first().text().trim();
  const description = $product('.description, .product-description, #tab_description').first().text().trim();
  
  // Изображения
  const images = [];
  $product('img').each((i, img) => {
    const src = $(img).attr('src');
    if (src && (src.includes('/images/') || src.includes('/photos/'))) {
      const fullSrc = src.startsWith('http') ? src : config.baseUrl + src;
      images.push(fullSrc);
    }
  });

  // Технические характеристики
  const specs = {};
  $product('table.product-props tr, .props tr, .characteristics tr').each((i, row) => {
    const cells = $(row).find('td, th');
    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim();
      const value = $(cells[1]).text().trim();
      if (key && value && key !== value) {
        specs[key] = value;
      }
    }
  });

  // PDF документы
  const docs = [];
  $product('a[href$=".pdf"], a[href*="datasheet"], a[href*="doc"]').each((i, link) => {
    const href = $(link).attr('href');
    if (href) {
      const fullHref = href.startsWith('http') ? href : config.baseUrl + href;
      docs.push(fullHref);
    }
  });

  const endTime = Date.now();
  
  return {
    ok: true,
    source: 'platan',
    priority: config.priority || 4,
    data: {
      title: title || mpn,
      description: description || '',
      images: images.slice(0, 5), // Максимум 5 изображений
      technical_specs: specs,
      datasheets: docs.slice(0, 3), // Максимум 3 PDF
      manufacturer: '', // Platan не всегда указывает производителя
      package: '',
      packaging: ''
    },
    timing: endTime - startTime,
    url: fullUrl
  };
}

// Экспорт для совместимости
export const parsePlatanProduct = parsePlatan;