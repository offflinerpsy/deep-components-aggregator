import { fetchWithRetry, parseHtml } from '../../services/net.js';
import { loadConfig } from '../../config/sources.ru.js';

const config = loadConfig('elitan');

export async function parseElitan(mpn) {
  const startTime = Date.now();
  const url = `${config.baseUrl}/search/?q=${encodeURIComponent(mpn)}`;
  
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    return {
      ok: false,
      source: 'elitan',
      reason: `HTTP ${response.status}`,
      url
    };
  }

  const html = await response.text();
  const $ = parseHtml(html);
  
  // Поиск первой карточки в результатах
  const firstCard = $('.product-item, .search-result-item').first();
  if (firstCard.length === 0) {
    return {
      ok: false,
      source: 'elitan',
      reason: 'No products found',
      url
    };
  }

  // Извлечение данных
  const title = firstCard.find('h3 a, .product-title a').text().trim();
  const productUrl = firstCard.find('h3 a, .product-title a').attr('href');
  const fullUrl = productUrl.startsWith('http') ? productUrl : `${config.baseUrl}${productUrl}`;
  
  // Парсинг карточки продукта
  const productResponse = await fetchWithRetry(fullUrl);
  if (!productResponse.ok) {
    return {
      ok: false,
      source: 'elitan',
      reason: `Product page HTTP ${productResponse.status}`,
      url: fullUrl
    };
  }

  const productHtml = await productResponse.text();
  const $product = parseHtml(productHtml);
  
  // Извлечение данных карточки
  const productTitle = $product('h1, .product-title').text().trim();
  const description = $product('.description, .product-description').text().trim();
  
  // Технические параметры из таблиц
  const specs = {};
  $product('table tr, dl').each((i, row) => {
    const key = $product(row).find('td, dt').first().text().trim();
    const value = $product(row).find('td, dd').last().text().trim();
    if (key && value) {
      specs[key] = value;
    }
  });
  
  // Документация
  const datasheets = [];
  $product('a[href$=".pdf"]').each((i, link) => {
    const href = $product(link).attr('href');
    if (href) {
      const fullHref = href.startsWith('http') ? href : `${config.baseUrl}${href}`;
      datasheets.push(fullHref);
    }
  });
  
  // Изображения
  const images = [];
  $product('img[src*="/product"], img[alt*="LM"], img[alt*="Фото"]').each((i, img) => {
    const src = $product(img).attr('src');
    if (src) {
      const fullSrc = src.startsWith('http') ? src : `${config.baseUrl}${src}`;
      images.push(fullSrc);
    }
  });
  
  const duration = Date.now() - startTime;
  console.log(JSON.stringify({
    route: 'adapter',
    dealer: 'elitan',
    ok: true,
    ms: duration,
    url: fullUrl
  }));

  return {
    ok: true,
    source: 'elitan',
    mpn: mpn,
    mpn_clean: mpn.replace(/\/[A-Z0-9-]+$/, '').replace(/-[A-Z]$/, ''),
    title: productTitle,
    description: description,
    images: images,
    datasheets: datasheets,
    package: '',
    packaging: '',
    technical_specs: specs,
    url: fullUrl
  };
}
