// src/adapters/chipdip.js - парсер ChipDip.ru для поиска компонентов
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
    console.log(`[ChipDip Parser] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
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
  const delay = 800 + Math.random() * 400; // 800-1200ms
  await new Promise(resolve => setTimeout(resolve, delay));
}

export async function searchChipDip(query, maxItems = 20) {
  // ChipDip использует поиск через /search
  const searchUrl = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(query)}`;
  
  debugLog(`Searching ChipDip for: ${query}`, { url: searchUrl });
  
  await politeDelay();
  
  const fetchOptions = await proxyManager.createFetchOptions(searchUrl, {
    headers: HDRS,
    timeout: 15000
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
  
  // ChipDip использует таблицу .itemlist с строками tr.with-hover
  $('#itemlist tr.with-hover').each((i, element) => {
    if (results.length >= maxItems) return false;
    
    const item = parseChipDipItem($, element, query);
    if (item) {
      results.push(item);
    }
  });
  
  debugLog(`Extracted ${results.length} items from ChipDip`);
  return results;
}

function parseChipDipItem($, element, originalQuery) {
  const $el = $(element);
  
  // Реальная структура ChipDip: td.h_name содержит название и ссылку
  const $nameCell = $el.find('td.h_name');
  if (!$nameCell.length) return null;
  
  // Название и ссылка из .name a
  const $titleLink = $nameCell.find('.name a').first();
  const title = nz($titleLink.text());
  const url = $titleLink.attr('href');
  
  if (!title || !url) return null;
  
  // Полная ссылка
  const fullUrl = url.startsWith('http') ? url : `https://www.chipdip.ru${url}`;
  
  // Бренд из .itemlist_pval
  const brand = nz($nameCell.find('.itemlist_pval').text()) || 'Unknown';
  
  // MPN извлекаем из title (выделен жирным <b>)
  const $boldText = $titleLink.find('b');
  const mpn = $boldText.length > 0 ? nz($boldText.text()) : extractMpnFromTitle(title);
  
  // Изображение из td.img
  const $imgCell = $el.find('td.img');
  const $img = $imgCell.find('img').first();
  const image = $img.attr('src') || $img.attr('data-src') || '';
  const fullImageUrl = image ? (image.startsWith('http') ? image : `https://www.chipdip.ru${image}`) : '';
  
  // Цена из td.h_pr .price-main
  const $priceCell = $el.find('td.h_pr');
  const priceText = nz($priceCell.find('.price-main').text());
  const priceMatch = priceText.match(/(\d+)/);
  const price = priceMatch ? parseInt(priceMatch[1]) : 0;
  
  // Наличие из .item__avail
  const stockText = nz($nameCell.find('.item__avail').text());
  const stock = extractStockFromChipDip(stockText);
  
  // Краткое описание из названия товара
  const description = title.replace(mpn, '').trim().slice(0, 150);
  
  // ID для карточки товара из атрибута id строки
  const rowId = $el.attr('id') || '';
  const itemId = rowId.replace('item', '') || mpn;
  const id = `chipdip:${itemId}`;
  
  const result = {
    id,
    url: fullUrl,
    title,
    brand,
    mpn,
    sku: itemId,
    description,
    image: fullImageUrl,
    thumb: fullImageUrl,
    price_min: price,
    price_min_currency: 'RUB',
    price_min_rub: price,
    offers: [{
      dealer: 'Чип и Дип',
      region: 'RU-MOW',
      regionName: 'Москва',
      stock,
      price: {
        value: price,
        currency: 'RUB',
        valueRub: price
      },
      buyUrl: fullUrl,
      leadTimeDays: extractLeadTimeFromChipDip(stockText)
    }]
  };
  
  debugLog("Parsed ChipDip item", { title, mpn, brand, price, stock, id: itemId });
  return result;
}

// Извлечение бренда из заголовка
function extractBrandFromTitle(title) {
  // Известные бренды компонентов
  const knownBrands = [
    'STMicroelectronics', 'Texas Instruments', 'Analog Devices', 'Maxim',
    'Infineon', 'NXP', 'Microchip', 'Atmel', 'Intel', 'AMD', 'Vishay',
    'ON Semiconductor', 'Fairchild', 'Linear Technology', 'Cypress',
    'Xilinx', 'Altera', 'Lattice', 'Microsemi', 'Renesas'
  ];
  
  const titleUpper = title.toUpperCase();
  
  for (const brand of knownBrands) {
    if (titleUpper.includes(brand.toUpperCase())) {
      return brand;
    }
  }
  
  // Попытка извлечь первое слово как бренд
  const firstWord = title.split(/\s+/)[0];
  if (firstWord && firstWord.length > 2 && /^[A-Z]/.test(firstWord)) {
    return firstWord;
  }
  
  return '';
}

// Извлечение количества на складе из ChipDip
function extractStockFromChipDip(stockText) {
  if (!stockText) return 0;
  
  const text = stockText.toLowerCase();
  
  // ChipDip показывает "6 шт." или "2023 шт."
  const stockMatch = stockText.match(/(\d+)\s*шт/);
  if (stockMatch) {
    return parseInt(stockMatch[1]);
  }
  
  // Проверяем статусы наличия
  if (text.includes('нет в наличии') || text.includes('отсутствует')) {
    return 0;
  }
  
  if (text.includes('в наличии') || text.includes('есть')) {
    return 10; // по умолчанию 10, если есть в наличии без числа
  }
  
  // Пытаемся найти любое число
  const numMatch = stockText.match(/(\d+)/);
  return numMatch ? parseInt(numMatch[1]) : 0;
}

// Извлечение времени доставки из ChipDip
function extractLeadTimeFromChipDip(stockText) {
  if (!stockText) return 0;
  
  const text = stockText.toLowerCase();
  
  if (text.includes('4-5 дней')) return 5;
  if (text.includes('3 недели')) return 21;
  if (text.includes('1-2 дня')) return 2;
  if (text.includes('неделя')) return 7;
  if (text.includes('дней')) {
    const match = text.match(/(\d+).*дней/);
    return match ? parseInt(match[1]) : 7;
  }
  
  return 1; // по умолчанию 1 день для товаров в наличии
}

// Старая функция для совместимости
function extractStock(stockText) {
  return extractStockFromChipDip(stockText);
}

// Получение детальной карточки товара
export async function fetchChipDipProduct(productId) {
  const url = productId.startsWith('http') ? 
    productId : 
    `https://www.chipdip.ru/product/${productId.replace('chipdip:', '')}`;
  
  debugLog(`Fetching ChipDip product: ${url}`);
  
  await politeDelay();
  
  const fetchOptions = await proxyManager.createFetchOptions(url, {
    headers: HDRS,
    timeout: 15000
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
  const brand = nz($('.brand, .manufacturer').text()) || extractBrandFromTitle(title);
  
  // Галерея изображений
  const gallery = [];
  $('.product-gallery img, .gallery img').each((i, img) => {
    const src = $(img).attr('src') || $(img).attr('data-src');
    if (src) {
      gallery.push(src.startsWith('http') ? src : `https://www.chipdip.ru${src}`);
    }
  });
  
  // Описание
  const description = nz($('.product-description, .description').text());
  
  // Технические характеристики
  const specs = [];
  $('.specs-table tr, .characteristics tr').each((i, row) => {
    const $row = $(row);
    const name = nz($row.find('td:first-child, th:first-child').text());
    const value = nz($row.find('td:last-child').text());
    
    if (name && value && name !== value) {
      specs.push({ name, value });
    }
  });
  
  // Документация
  const docs = [];
  $('a[href*=".pdf"], .docs a, .datasheets a').each((i, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    const name = nz($link.text()) || 'Документ';
    
    if (href && href.includes('.pdf')) {
      docs.push({
        name,
        url: href.startsWith('http') ? href : `https://www.chipdip.ru${href}`,
        local: `/api/pdf/fetch?url=${encodeURIComponent(href)}`
      });
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
    docs,
    summary: {
      category: 'Electronic Component',
      package: extractPackageFromSpecs(specs)
    }
  };
}

function extractMpnFromTitle(title) {
  // Простая эвристика для извлечения MPN из заголовка
  const parts = title.split(/\s+/);
  return parts.find(part => 
    part.length > 2 && 
    /[A-Z0-9]/.test(part) && 
    !/^(в|на|для|из|по|от|до)$/i.test(part)
  ) || parts[0] || '';
}

function extractPackageFromSpecs(specs) {
  const packageSpec = specs.find(spec => 
    spec.name.toLowerCase().includes('корпус') || 
    spec.name.toLowerCase().includes('package')
  );
  return packageSpec ? packageSpec.value : '';
}
