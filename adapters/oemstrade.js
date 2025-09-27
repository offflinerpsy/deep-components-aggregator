// adapters/oemstrade.js — улучшенный парсер выдачи OEMsTrade с Cheerio селекторами
import * as cheerio from "cheerio";
import { httpGet, politeDelay } from "../lib/net.js";
import { proxyManager } from "../src/proxy/proxy-manager.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";
const HDRS = { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.8" };

// мягкие нормализаторы (никаких исключений)
function nz(v){ return v === undefined || v === null ? "" : String(v).trim(); }
function nnum(s){ const n = Number(String(s).replace(/[, ]+/g,"")); return Number.isFinite(n) ? n : 0; }

// Отладочная функция
function debugLog(msg, data = null) {
  if (process.env.DEBUG_PARSER) {
    console.log(`[OEMsTrade Parser] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

// Полностью переписанная функция извлечения данных
function parseProductElement($, element, qUpper) {
  const $el = $(element);
  const elementText = $el.text().replace(/\s+/g, " ").trim();

  if (elementText.length < 30) return null;

  debugLog("Parsing element text", elementText);

  // Точное извлечение MPN - ищем D# префикс или прямое совпадение
  let mpn = "";
  const mpnMatch = elementText.match(/D#:\s*([A-Z0-9\-_:]+)/i) ||
                   elementText.match(new RegExp(`\\b(${qUpper}[A-Z0-9\\-_/]*)\\b`, 'i')) ||
                   elementText.match(/\b([A-Z0-9]{3,}[\-_/][A-Z0-9\-_/]+)\b/i);

  if (mpnMatch) {
    mpn = mpnMatch[1].replace(/^[A-Z0-9]+:/, ''); // убираем префиксы типа "E02:"
  } else {
    mpn = qUpper; // fallback
  }

  // Производитель - точные названия
  let manufacturer = "";
  const mfgMatch = elementText.match(/\b(STMicroelectronics|Texas Instruments|onsemi|ON Semiconductor|Analog Devices|Infineon|NXP|Microchip|Vishay|Rohm|Toshiba|Renesas|National Semiconductor|Linear Technology|Maxim Integrated)\b/i);
  if (mfgMatch) {
    manufacturer = mfgMatch[1];
  }

  // Описание - извлекаем полный блок без обрезки
  let description = "";
  let title = "";

  // Ищем описание типа продукта
  const descMatch = elementText.match(/((?:Standard |Linear |Switching |IC |)(?:Regulator|Voltage Regulator|Current Regulator|Power Supply|Amplifier|Transistor|Diode|Controller|Driver|Switch|Converter)[\w\s\-,\.]{0,80})/i);
  if (descMatch) {
    description = descMatch[1].trim();
    title = description.length > 50 ? description.substring(0, 47) + "..." : description;
  }

  // Если не нашли стандартное описание, берем первую значимую часть
  if (!description) {
    const parts = elementText.split(/\s+/);
    const meaningfulParts = parts.filter(p => p.length > 3 && !/^(D#|RoHS|Min|Qty|Lead|time|Date|Code|Multiple|Package)$/i.test(p));
    if (meaningfulParts.length >= 3) {
      description = meaningfulParts.slice(0, 8).join(" ");
      title = description.length > 50 ? description.substring(0, 47) + "..." : description;
    }
  }

  // Корпус - точные паттерны
  let packageType = "";
  const packageMatch = elementText.match(/\b(TO-220AB|TO-220|TO-\d+[A-Z]*|SOT-\d+|SOD-\d+|SOIC-?\d+|TSSOP-?\d+|QFN-?\d+|PDIP|MSOP|QFP|BGA)\b/i) ||
                       elementText.match(/(\d+)\-Pin\((\d+)\+Tab\)\s+([A-Z0-9\-]+)/i);

  if (packageMatch) {
    if (packageMatch[3]) {
      // Формат "3-Pin(3+Tab) TO-220AB"
      packageType = packageMatch[3];
    } else {
      packageType = packageMatch[1];
    }
  }

  // Упаковка - точные паттерны
  let packaging = "";
  const packagingMatch = elementText.match(/\b(Tube|Tray|Reel|Cut Tape|Tape|Bulk|Digi-Reel)\b/i);
  if (packagingMatch) {
    packaging = packagingMatch[1];
  }

  // Извлекаем регионы и сток
  const regions = [];
  let stock = 0;

  const regionPatterns = [
    { pattern: /Europe\s*-\s*([\d,\s]+)/i, region: "EU" },
    { pattern: /Americas?\s*-\s*([\d,\s]+)/i, region: "US" },
    { pattern: /Asia\s*-\s*([\d,\s]+)/i, region: "ASIA" }
  ];

  for (const {pattern, region} of regionPatterns) {
    const match = pattern.exec(elementText);
    if (match && match[1]) {
      const stockNum = nnum(match[1]);
      if (stockNum > 0) {
        regions.push(region);
        stock += stockNum;
      }
    }
  }

  // Извлекаем минимальную цену - улучшенная логика
  let minPrice = 0;
  let currency = "USD";

  // Ищем цены в разных форматах
  const priceMatches = elementText.matchAll(/([€$])([\d.]+)/g);
  for (const match of priceMatches) {
    const price = Number(match[2]);
    if (Number.isFinite(price) && price > 0 && (minPrice === 0 || price < minPrice)) {
        minPrice = price;
      currency = match[1] === "€" ? "EUR" : "USD";
    }
  }

  // Альтернативный формат: "1000 $0.2510"
  if (minPrice === 0) {
    const altPriceMatch = elementText.match(/\d+\s+([€$])([\d.]+)/);
    if (altPriceMatch) {
      minPrice = Number(altPriceMatch[2]);
      currency = altPriceMatch[1] === "€" ? "EUR" : "USD";
    }
  }

  // Проверяем минимальные требования для валидного результата
  if (!mpn || (regions.length === 0 && stock === 0 && minPrice === 0)) {
    debugLog("Skipping element - no useful data found");
    return null;
  }

  const result = {
    mpn,
    title: title || (description ? description.substring(0, 50) + "..." : ""),
    manufacturer,
    description,
    package: packageType,
    packaging,
    regions,
    stock_total: stock,
    lead_days: 0,
    price_min: minPrice,
    price_min_currency: currency,
    price_min_rub: 0,
    image: "/ui/placeholder.svg"
  };

  debugLog("Parsed result", result);
  return result;
}

export async function searchOEMsTrade(qUpper, maxItems = 40){
  const url = "https://www.oemstrade.com/search/" + encodeURIComponent(qUpper);
  
  debugLog(`Searching for: ${qUpper}`, { originalUrl: url });
  
  // Используем прокси-менеджер для получения fetch options
  await politeDelay(); // уважительный интервал перед запросом
  
  const fetchOptions = await proxyManager.createFetchOptions(url, {
    headers: HDRS,
    timeout: 15000
  });
  
  const response = await fetch(url, fetchOptions);
  const r = {
    ok: response.ok,
    status: response.status,
    text: response.ok ? await response.text() : ''
  };

  if (!r || !r.ok) {
    debugLog(`HTTP request failed: ${r?.status || 'no response'}`);
    return [];
  }

  const text = r.text;
  if (!text || text.length < 1000) {
    debugLog("Response too short or empty", { length: text?.length || 0 });
    return [];
  }

  debugLog(`HTML response length: ${text.length}`);

  const $ = cheerio.load(text);

  // Пробуем различные стратегии поиска элементов товаров
  const searchStrategies = [
    // Стратегия 1: поиск по общим селекторам товаров
    () => $('.search-result, .product-item, .item, .result-item, .product-row').toArray(),

    // Стратегия 2: поиск по содержимому с "Buy Now"
    () => {
      const elements = [];
      $('*').each((i, el) => {
        const text = $(el).text();
        if (text.includes('Buy Now') && text.length > 100 && text.length < 2000) {
          elements.push(el);
        }
      });
      return elements;
    },

    // Стратегия 3: разрезание по тексту (fallback)
    () => {
      const chunks = $.text().split(/Buy Now/i);
      return chunks.slice(1, maxItems + 1).map(chunk => ({
        isTextChunk: true,
        text: chunk
      }));
    }
  ];

  let elements = [];
  for (let i = 0; i < searchStrategies.length && elements.length === 0; i++) {
    elements = searchStrategies[i]();
    debugLog(`Strategy ${i + 1} found ${elements.length} elements`);
    if (elements.length > 0) break;
  }

  if (elements.length === 0) {
    debugLog("No elements found with any strategy");
    return [];
  }

  const results = [];

  for (let element of elements) {
    if (results.length >= maxItems) break;

    let item;
    if (element.isTextChunk) {
      // Fallback: парсим текстовый блок
      item = parseBlockTextFallback(element.text, qUpper);
    } else {
      // Основной метод: парсим HTML элемент
      item = parseProductElement($, element, qUpper);
    }

    if (item) {
      results.push(item);
    }
  }

  debugLog(`Final results count: ${results.length}`);

  // Дедупликация по (mpn+regions)
  const seen = new Set();
  const deduplicated = results.filter(x => {
    const key = x.mpn + "|" + x.regions.join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  debugLog(`After deduplication: ${deduplicated.length}`);
  return deduplicated;
}

// Fallback функция для парсинга текстовых блоков (старая логика)
function parseBlockTextFallback(text, qUpper) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 120) return null;

  const mEU = /Europe\s*-\s*([\d, ]+)/i.exec(t);
  const mUS = /Americas\s*-\s*([\d, ]+)/i.exec(t);
  const mAS = /Asia\s*-\s*([\d, ]+)/i.exec(t);

  const regions = [];
  let stock = 0;
  if (mEU){ const n = nnum(mEU[1]); if (n>0){ regions.push("EU"); stock += n; } }
  if (mUS){ const n = nnum(mUS[1]); if (n>0){ regions.push("US"); stock += n; } }
  if (mAS){ const n = nnum(mAS[1]); if (n>0){ regions.push("ASIA"); stock += n; } }

  if (regions.length === 0 && stock === 0) return null;

  // минимальная цена
  let min = Infinity, cur = "";
  const re = /(\d+)\s*([€$])\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(t))){
    const p = Number(m[3]);
    if (Number.isFinite(p) && p < min){ min = p; cur = m[2] === "€" ? "EUR" : "USD"; }
  }
  if (!Number.isFinite(min)) { min = 0; cur = ""; }

  // MPN
  let mpn = qUpper;
  const mh = /([A-Z0-9][A-Z0-9\-._]{2,})\s*(?:D#|RoHS|Min Qty|STMicroelectronics|onsemi|Texas|Container)/i.exec(t);
  if (mh && mh[1] && mh[1].length <= 40) mpn = mh[1].toUpperCase();

  return {
    mpn, title: "", manufacturer: "", description: "",
    package: "", packaging: "",
    regions, stock_total: stock, lead_days: 0,
    price_min: min, price_min_currency: cur, price_min_rub: 0,
    image: "/ui/placeholder.svg"
  };
}
