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
  
  // Поиск карточки продукта
  const productCard = $('#page .card, .product-card').first();
  if (productCard.length === 0) {
    return {
      ok: false,
      source: 'platan',
      reason: 'No products found',
      url
    };
  }

  // Извлечение данных
  const title = productCard.find('h1, #page h1').text().trim();
  const description = productCard.find('p, .description').text().trim();
  
  // Технические параметры из таблиц
  const specs = {};
  productCard.find('table tr, .kv-pairs tr').each((i, row) => {
    const key = $(row).find('td').first().text().trim();
    const value = $(row).find('td').last().text().trim();
    if (key && value) {
      specs[key] = value;
    }
  });
  
  // Документация
  const datasheets = [];
  productCard.find('a[href$=".pdf"]').each((i, link) => {
    const href = $(link).attr('href');
    if (href) {
      const fullHref = href.startsWith('http') ? href : `${config.baseUrl}${href}`;
      datasheets.push(fullHref);
    }
  });
  
  // Изображения
  const images = [];
  productCard.find('img[src*="/product"], img[alt*="LM"]').each((i, img) => {
    const src = $(img).attr('src');
    if (src) {
      const fullSrc = src.startsWith('http') ? src : `${config.baseUrl}${src}`;
      images.push(fullSrc);
    }
  });
  
  const duration = Date.now() - startTime;
  console.log(JSON.stringify({
    route: 'adapter',
    dealer: 'platan',
    ok: true,
    ms: duration,
    url: url
  }));

  return {
    ok: true,
    source: 'platan',
    mpn: mpn,
    mpn_clean: mpn.replace(/\/[A-Z0-9-]+$/, '').replace(/-[A-Z]$/, ''),
    title: title,
    description: description,
    images: images,
    datasheets: datasheets,
    package: '',
    packaging: '',
    technical_specs: specs,
    url: url
  };
}