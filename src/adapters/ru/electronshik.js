import { fetchWithRetry, parseHtml } from '../../services/net.js';
import { loadConfig } from '../../config/sources.ru.js';

const config = loadConfig('electronshik');

export async function parseElectronshik(mpn) {
  const startTime = Date.now();
  const url = config.searchUrl.replace('{q}', encodeURIComponent(mpn));
  
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    return {
      ok: false,
      source: 'electronshik',
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
      source: 'electronshik',
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
      source: 'electronshik',
      reason: `Product page HTTP ${productResponse.status}`,
      url: fullUrl
    };
  }

  const productHtml = await productResponse.text();
  const $product = parseHtml(productHtml);
  
  // Извлечение данных карточки
  const productTitle = $product('h1').text().trim();
  const brand = $product('a[href*="/brand"], .breadcrumbs a:last-of-type').text().trim();
  
  // Описание
  const description = $product('.description, .product-description').text().trim();
  
  // Технические параметры
  const specs = {};
  $product('h2:contains("Технические параметры"), h3:contains("Технические параметры")').nextAll('table tr, .specs tr').each((i, row) => {
    const key = $product(row).find('td').first().text().trim();
    const value = $product(row).find('td').last().text().trim();
    if (key && value) {
      specs[key] = value;
    }
  });
  
  // Документация
  const datasheets = [];
  $product('a[href*="data.electronshik.ru"][href$=".pdf"], a[href$=".pdf"]').each((i, link) => {
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
    dealer: 'electronshik',
    ok: true,
    ms: duration,
    url: fullUrl
  }));

  return {
    ok: true,
    source: 'electronshik',
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