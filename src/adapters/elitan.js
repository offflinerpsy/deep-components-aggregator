// src/adapters/elitan.js - парсер Elitan.ru для поиска компонентов
// Без try/catch - только явные проверки

import * as cheerio from "cheerio";
import { proxyManager } from "../proxy/proxy-manager.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";
const HDRS = { 
  "User-Agent": UA, 
  "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
};

// Отладочная функция
function debugLog(msg, data = null) {
  if (process.env.DEBUG_PARSER) {
    console.log(`[Elitan Parser] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

// Нормализация данных
function nz(v) { return v === undefined || v === null ? "" : String(v).trim(); }
function nnum(s) { 
  const n = Number(String(s).replace(/[,\s₽руб.]+/gi, ""));
  return Number.isFinite(n) ? n : 0; 
}

// Задержка между запросами
async function politeDelay() {
  const delay = 900 + Math.random() * 600; // 900-1500ms (больше для Elitan)
  await new Promise(resolve => setTimeout(resolve, delay));
}

export async function searchElitan(query, maxItems = 15) {
  // Elitan использует поиск через /search.php
  const searchUrl = `https://www.elitan.ru/search.php?q=${encodeURIComponent(query)}`;
  
  debugLog(`Searching Elitan for: ${query}`, { url: searchUrl });
  
  await politeDelay();
  
  const fetchOptions = await proxyManager.createFetchOptions(searchUrl, {
    headers: HDRS,
    timeout: 20000 // больше таймаут для Elitan
  });
  
  const response = await fetch(searchUrl, fetchOptions);
  
  if (!response.ok) {
    debugLog(`HTTP request failed: ${response.status}`);
    return [];
  }
  
  const html = await response.text();
  
  if (!html || html.length < 1000) {
    debugLog("Response too short or empty", { length: html?.length || 0 });
    return [];
  }
  
  debugLog(`HTML response length: ${html.length}`);
  
  const $ = cheerio.load(html);
  const results = [];
  
  // Elitan использует таблицу результатов
  $('.search-results tr, .product-row, .item-row').each((i, element) => {
    if (results.length >= maxItems) return false;
    
    const item = parseElitanItem($, element, query);
    if (item) {
      results.push(item);
    }
  });
  
  // Альтернативный селектор для карточек
  if (results.length === 0) {
    $('.product-card, .item-card').each((i, element) => {
      if (results.length >= maxItems) return false;
      
      const item = parseElitanItem($, element, query);
      if (item) {
        results.push(item);
      }
    });
  }
  
  debugLog(`Extracted ${results.length} items from Elitan`);
  return results;
}

function parseElitanItem($, element, originalQuery) {
  const $el = $(element);
  const elementText = $el.text().replace(/\s+/g, " ").trim();
  
  // Пропускаем слишком короткие элементы
  if (elementText.length < 20) return null;
  
  // Название и ссылка
  const $titleLink = $el.find('a[href*="/product"], a[href*="/item"]').first();
  if (!$titleLink.length) return null;
  
  const title = nz($titleLink.text()) || nz($el.find('.name, .title').text());
  const url = $titleLink.attr('href');
  
  if (!title || !url) return null;
  
  // Полная ссылка
  const fullUrl = url.startsWith('http') ? url : `https://www.elitan.ru${url}`;
  
  // MPN - в Elitan обычно в отдельной колонке или в скобках
  const mpnMatch = elementText.match(/\b([A-Z0-9\-_]{3,})\b/g);
  const mpn = mpnMatch ? mpnMatch.find(m => 
    m.toLowerCase().includes(originalQuery.toLowerCase().slice(0, 3))
  ) || mpnMatch[0] : extractMpnFromTitle(title);
  
  // Бренд
  const brand = nz($el.find('.brand, .manufacturer').text()) || 
                extractBrandFromText(elementText);
  
  // Цена - ищем в разных местах
  const priceText = nz($el.find('.price, .cost').text()) || 
                   extractPriceFromText(elementText);
  const price = nnum(priceText);
  
  // Наличие
  const stockText = nz($el.find('.stock, .availability').text()) || elementText;
  const stock = extractStock(stockText);
  
  // Описание
  const description = nz($el.find('.description, .desc').text()).slice(0, 150) ||
                     extractDescriptionFromText(elementText);
  
  // ID для карточки товара
  const urlMatch = fullUrl.match(/\/(?:product|item)\/([^\/\?]+)/);
  const id = urlMatch ? `elitan:${urlMatch[1]}` : `elitan:${mpn}`;
  
  const result = {
    id,
    url: fullUrl,
    title,
    brand,
    mpn,
    sku: mpn,
    description,
    price_min: price,
    price_min_currency: 'RUB',
    price_min_rub: price,
    offers: [{
      dealer: 'Элитан',
      region: 'RU-MOW',
      regionName: 'Москва',
      stock,
      price: {
        value: price,
        currency: 'RUB',
        valueRub: price
      },
      buyUrl: fullUrl
    }]
  };
  
  debugLog("Parsed Elitan item", { title, mpn, brand, price, stock });
  return result;
}

function extractMpnFromTitle(title) {
  const parts = title.split(/[\s\-_,]+/);
  return parts.find(part => 
    part.length > 2 && 
    /[A-Z0-9]/.test(part) && 
    !/^(и|в|на|для|из|по|от|до|шт|руб)$/i.test(part)
  ) || parts[0] || '';
}

function extractBrandFromText(text) {
  // Известные бренды
  const knownBrands = [
    'STMicroelectronics', 'Texas Instruments', 'Analog Devices', 'Maxim',
    'Infineon', 'NXP', 'Microchip', 'Atmel', 'Intel', 'AMD', 'Vishay',
    'ON Semiconductor', 'Fairchild', 'Linear Technology', 'Cypress',
    'Xilinx', 'Altera', 'Lattice', 'Microsemi', 'Renesas', 'ST', 'TI'
  ];
  
  const textUpper = text.toUpperCase();
  
  for (const brand of knownBrands) {
    if (textUpper.includes(brand.toUpperCase())) {
      return brand;
    }
  }
  
  return '';
}

function extractPriceFromText(text) {
  // Ищем цену в формате "123.45 руб" или "123₽"
  const priceMatch = text.match(/([\d\s,]+)[\s]*(?:руб|₽|rub)/i);
  return priceMatch ? priceMatch[1] : '';
}

function extractStock(stockText) {
  if (!stockText) return 0;
  
  const text = stockText.toLowerCase();
  
  if (text.includes('нет') || text.includes('отсутствует') || text.includes('под заказ')) {
    return 0;
  }
  
  if (text.includes('есть') || text.includes('в наличии') || text.includes('склад')) {
    const match = stockText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 5; // по умолчанию 5
  }
  
  const numMatch = stockText.match(/(\d+)/);
  return numMatch ? parseInt(numMatch[1]) : 0;
}

function extractDescriptionFromText(text) {
  // Убираем лишние пробелы и берем первые 100 символов
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 100 ? cleaned.slice(0, 100) + '...' : cleaned;
}

// Получение детальной карточки товара
export async function fetchElitanProduct(productId) {
  const url = productId.startsWith('http') ? 
    productId : 
    `https://www.elitan.ru/product/${productId.replace('elitan:', '')}`;
  
  debugLog(`Fetching Elitan product: ${url}`);
  
  await politeDelay();
  
  const fetchOptions = await proxyManager.createFetchOptions(url, {
    headers: HDRS,
    timeout: 20000
  });
  
  const response = await fetch(url, fetchOptions);
  
  if (!response.ok) {
    debugLog(`Product fetch failed: ${response.status}`);
    return null;
  }
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Парсим детальную карточку
  const title = nz($('h1, .product-title').first().text());
  const brand = nz($('.brand, .manufacturer').text()) || extractBrandFromText(title);
  
  // Галерея изображений
  const gallery = [];
  $('.product-images img, .gallery img').each((i, img) => {
    const src = $(img).attr('src') || $(img).attr('data-src');
    if (src) {
      gallery.push(src.startsWith('http') ? src : `https://www.elitan.ru${src}`);
    }
  });
  
  // Описание
  const description = nz($('.product-description, .description').text());
  
  // Технические характеристики
  const specs = [];
  $('.specs tr, .characteristics tr, .params tr').each((i, row) => {
    const $row = $(row);
    const name = nz($row.find('td:first-child, th:first-child').text());
    const value = nz($row.find('td:last-child').text());
    
    if (name && value && name !== value) {
      specs.push({ name, value });
    }
  });
  
  return {
    id: productId,
    url,
    title,
    brand,
    mpn: extractMpnFromTitle(title),
    gallery,
    description,
    specs,
    summary: {
      category: 'Electronic Component'
    }
  };
}
