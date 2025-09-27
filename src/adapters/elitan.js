// src/adapters/elitan.js - парсер Elitan на основе реального исследования
import * as cheerio from "cheerio";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";
const HDRS = { "User-Agent": UA, "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8" };

function debugLog(msg, extra = {}) {
  console.log(`[ELITAN] ${msg}`, extra);
}

// Нормализация цены
function parsePrice(priceText) {
  if (!priceText) return null;
  
  const clean = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

// Парсинг одного элемента товара
function parseProductElement($, elem) {
  const $elem = $(elem);
  
  // Название и ссылка
  const titleLink = $elem.find('a[href*="/product/"], .product-title a, .item-title a').first();
  const title = titleLink.text().trim() || $elem.find('.product-name, .item-name').text().trim();
  const url = titleLink.attr('href');
  
  if (!title || !url) return null;
  
  // Изображение
  const img = $elem.find('img').first();
  const image = img.attr('src') || img.attr('data-src');
  
  // Цена
  const priceElem = $elem.find('.price, .cost, [class*="price"], [class*="cost"]').first();
  const priceText = priceElem.text().trim();
  const price = parsePrice(priceText);
  
  // Наличие
  const stockElem = $elem.find('.stock, .availability, [class*="stock"], [class*="avail"]').first();
  const stockText = stockElem.text().trim();
  const inStock = stockText.includes('есть') || stockText.includes('наличии') || stockText.includes('шт');
  
  // Описание
  const desc = $elem.find('.description, .desc, .product-desc').text().trim();
  
  // Бренд из названия или отдельного поля
  const brandElem = $elem.find('.brand, .manufacturer').text().trim();
  let brand = brandElem;
  if (!brand && title) {
    // Пытаемся извлечь бренд из названия
    const brandMatch = title.match(/^([A-Z][A-Za-z]+)/);
    brand = brandMatch ? brandMatch[1] : '';
  }
  
  // MPN из названия
  const mpnMatch = title.match(/([A-Z0-9-]+)/);
  const mpn = mpnMatch ? mpnMatch[1] : '';
  
  return {
    id: url.split('/').pop() || mpn,
    title: title,
    url: url.startsWith('http') ? url : `https://www.elitan.ru${url}`,
    image: image ? (image.startsWith('http') ? image : `https://www.elitan.ru${image}`) : null,
    brand: brand,
    mpn: mpn,
    description: desc,
    price_min: price,
    price_min_currency: 'RUB',
    price_min_rub: price,
    in_stock: inStock,
    stock_quantity: inStock ? 1 : 0,
    source: 'elitan'
  };
}

export async function searchElitan(query, maxItems = 20) {
  const searchUrl = `https://www.elitan.ru/search.php?q=${encodeURIComponent(query)}`;
  
  debugLog(`Searching for: ${query}`, { url: searchUrl });
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(searchUrl, {
      headers: HDRS,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      debugLog(`HTTP error: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    
    if (!html || html.length < 1000) {
      debugLog("Response too short", { length: html?.length || 0 });
      return [];
    }
    
    debugLog(`HTML response length: ${html.length}`);
    
    const $ = cheerio.load(html);
    const results = [];
    
    // Множественные селекторы для поиска товаров
    const selectors = [
      '.product-item',
      '.item',
      '.search-result',
      '.product',
      '[class*="product"]',
      '[class*="item"]'
    ];
    
    let foundElements = [];
    
    for (const selector of selectors) {
      const elements = $(selector).toArray();
      if (elements.length > 0) {
        debugLog(`Found ${elements.length} elements with selector: ${selector}`);
        foundElements = elements;
        break;
      }
    }
    
    if (foundElements.length === 0) {
      debugLog("No product elements found with any selector");
      
      // Fallback: ищем любые ссылки на товары
      const productLinks = $('a[href*="/product/"], a[href*="/item/"], a[href*="/catalog/"]').toArray();
      if (productLinks.length > 0) {
        debugLog(`Fallback: found ${productLinks.length} product links`);
        
        for (let i = 0; i < Math.min(productLinks.length, maxItems); i++) {
          const link = $(productLinks[i]);
          const title = link.text().trim();
          const url = link.attr('href');
          
          if (title && url && title.length > 3) {
            results.push({
              id: url.split('/').pop(),
              title: title,
              url: url.startsWith('http') ? url : `https://www.elitan.ru${url}`,
              brand: '',
              mpn: title.split(' ')[0],
              description: '',
              price_min: null,
              price_min_currency: 'RUB',
              price_min_rub: null,
              in_stock: false,
              stock_quantity: 0,
              source: 'elitan'
            });
          }
        }
      }
      
      return results;
    }
    
    // Парсим найденные элементы
    for (let i = 0; i < Math.min(foundElements.length, maxItems); i++) {
      const elem = foundElements[i];
      const parsed = parseProductElement($, elem);
      
      if (parsed) {
        results.push(parsed);
        debugLog(`Parsed item: ${parsed.title}`);
      }
    }
    
    debugLog(`Parsing completed: ${results.length} items`);
    return results;
    
  } catch (error) {
    debugLog(`Search failed: ${error.message}`);
    return [];
  }
}