// chipdip-fast.js - быстрый парсер ChipDip без Playwright
import { getHtml } from '../../net/http.js';
import * as cheerio from 'cheerio';

export async function parseChipDipFast(mpn) {
  const url = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(mpn)}`;
  const res = await getHtml(url, { timeoutMs: 8000 });
  
  if (!res.ok) {
    return { ok: false, source: 'chipdip', reason: 'fetch_fail', status: res.status };
  }

  const $ = cheerio.load(res.text);
  
  // Ищем первый товар в результатах поиска
  const productCard = $('.product-card, .search-result-item, .item').first();
  
  if (productCard.length === 0) {
    return { ok: false, source: 'chipdip', reason: 'no_products' };
  }

  // Извлекаем данные
  const title = productCard.find('h3, .title, .name').first().text().trim() || mpn;
  const description = productCard.find('.description, .desc, .short-desc').first().text().trim() || '';
  const manufacturer = productCard.find('.manufacturer, .brand, [itemprop="brand"]').first().text().trim() || '';
  
  // Изображения
  const images = [];
  productCard.find('img[src]').each((_, img) => {
    const src = $(img).attr('src');
    if (src && src.startsWith('http')) {
      images.push(src);
    }
  });
  
  // PDF документы
  const pdfs = [];
  productCard.find('a[href$=".pdf"]').each((_, link) => {
    const href = $(link).attr('href');
    if (href && href.startsWith('http')) {
      pdfs.push({
        doc_url: href,
        title: $(link).text().trim() || 'Datasheet'
      });
    }
  });
  
  // Технические характеристики
  const specs = [];
  productCard.find('table tr, .specs tr').each((_, tr) => {
    const key = $(tr).find('th, td').eq(0).text().trim();
    const value = $(tr).find('td').eq(1).text().trim();
    if (key && value) {
      specs.push({ key, value });
    }
  });
  
  // Цена и наличие
  const priceText = productCard.find('.price, .cost, [itemprop="price"]').first().text().trim();
  const stockText = productCard.find('.stock, .availability, .qty').first().text().trim();
  
  const product = {
    mpn: mpn,
    title: title,
    description: description,
    manufacturer: manufacturer,
    images: images.slice(0, 5), // Ограничиваем количество изображений
    datasheets: pdfs,
    technical_specs: specs.reduce((acc, spec) => {
      if (spec.key && spec.value) {
        acc[spec.key] = spec.value;
      }
      return acc;
    }, {}),
    supplier: 'ChipDip',
    url: url,
    region: 'RU'
  };

  return {
    ok: true,
    source: 'chipdip',
    priority: 1,
    data: product
  };
}
