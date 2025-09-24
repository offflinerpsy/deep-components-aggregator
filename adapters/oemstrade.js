// adapters/oemstrade.js — улучшенный парсер выдачи OEMsTrade с Cheerio селекторами
import * as cheerio from "cheerio";
import { httpGet, politeDelay } from "../lib/net.js";

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

// Улучшенная функция извлечения данных из HTML элемента
function parseProductElement($, element, qUpper) {
  const $el = $(element);
  
  // Пробуем различные селекторы для названия/MPN
  let mpn = qUpper;
  let title = "";
  let manufacturer = "";
  let description = "";
  let packageType = "";
  let packaging = "";
  
  // Извлекаем текст элемента для анализа
  const elementText = $el.text().replace(/\s+/g, " ").trim();
  
  if (elementText.length < 50) return null; // Слишком короткий блок
  
  debugLog("Parsing element text", elementText.substring(0, 200));
  
  // Ищем MPN в тексте (улучшенные паттерны)
  const mpnPatterns = [
    /\b([A-Z0-9][A-Z0-9\-._]{2,20})\b(?=\s*(?:STMicroelectronics|Texas|Analog|Linear|National|Maxim|Infineon|NXP|ON|Microchip|Vishay|Rohm|Toshiba|Renesas))/i,
    /\b([A-Z0-9][A-Z0-9\-._]{2,20})\b(?=\s*(?:D#|RoHS|Min Qty|Container|Tube|Reel|Cut Tape))/i,
    new RegExp(`\\b(${qUpper}[A-Z0-9\\-._]*)\\b`, 'i'),
    /\b([A-Z]{2,4}\d{2,6}[A-Z0-9\-._]*)\b/i
  ];
  
  for (const pattern of mpnPatterns) {
    const match = pattern.exec(elementText);
    if (match && match[1] && match[1].length <= 25) {
      mpn = match[1].toUpperCase();
      break;
    }
  }
  
  // Ищем производителя
  const mfgPatterns = [
    /\b(STMicroelectronics|Texas Instruments?|Analog Devices|Linear Technology|National Semiconductor|Maxim Integrated|Infineon|NXP|ON Semiconductor|Microchip|Vishay|Rohm|Toshiba|Renesas|Intel|AMD|Qualcomm|Broadcom)\b/i,
    /\b(STM|TI|ADI|LT|NS|MAX|IFX|NXP|ONS|MCHP|VSH|ROHM|TOSH|REN)\b/i
  ];
  
  for (const pattern of mfgPatterns) {
    const match = pattern.exec(elementText);
    if (match && match[1]) {
      manufacturer = match[1];
      break;
    }
  }
  
  // Ищем описание (обычно идет после MPN)
  const descPatterns = [
    /(?:Regulator|Voltage|Current|Power|Amplifier|Transistor|Diode|Capacitor|Resistor|Inductor|IC|Controller|Driver|Switch|Converter|Oscillator|Timer|Counter|Memory|Processor|Microcontroller)[\w\s\-,\.]{10,80}/i,
    /(?:Linear|Switching|Step-down|Step-up|Buck|Boost|LDO)[\w\s\-,\.]{10,60}/i
  ];
  
  for (const pattern of descPatterns) {
    const match = pattern.exec(elementText);
    if (match && match[0]) {
      description = match[0].trim();
      if (description.length > 100) description = description.substring(0, 97) + "...";
      break;
    }
  }
  
  // Ищем корпус
  const packagePatterns = [
    /\b(TO-\d+|SOT-\d+|SOD-\d+|SOIC-?\d+|TSSOP-?\d+|QFN-?\d+|BGA-?\d+|DIP-?\d+|SIP-?\d+|PLCC-?\d+)\b/i,
    /\b(PDIP|SOIC|TSSOP|MSOP|QFN|QFP|BGA|CSP|WLCSP)\b/i,
    /\b(\d+\-pin\s+\w+|\w+\-\d+)\b/i
  ];
  
  for (const pattern of packagePatterns) {
    const match = pattern.exec(elementText);
    if (match && match[1]) {
      packageType = match[1];
      break;
    }
  }
  
  // Ищем упаковку
  const packagingPatterns = [
    /\b(Tube|Tray|Reel|Cut Tape|Bulk|Digi-Reel)\b/i
  ];
  
  for (const pattern of packagingPatterns) {
    const match = pattern.exec(elementText);
    if (match && match[1]) {
      packaging = match[1];
      break;
    }
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
  
  // Извлекаем минимальную цену
  let minPrice = 0;
  let currency = "";
  
  const pricePatterns = [
    /(\d+)\s*([€$])\s*([\d.]+)/g,
    /([€$])\s*([\d.]+)/g
  ];
  
  for (const pattern of pricePatterns) {
    let match;
    while ((match = pattern.exec(elementText))) {
      const price = match[3] ? Number(match[3]) : Number(match[2]);
      if (Number.isFinite(price) && (minPrice === 0 || price < minPrice)) {
        minPrice = price;
        currency = (match[2] === "€" || match[1] === "€") ? "EUR" : "USD";
      }
    }
    if (minPrice > 0) break;
  }
  
  // Проверяем минимальные требования для валидного результата
  if (regions.length === 0 && stock === 0 && minPrice === 0) {
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
  
  debugLog(`Searching for: ${qUpper}`, { url });
  
  await politeDelay(); // уважительный интервал перед запросом
  const r = await httpGet(url, HDRS, 15000);
  
  if (!r.ok) {
    debugLog(`HTTP request failed: ${r.status}`);
    return [];
  }
  
  if (!r.text || r.text.length < 1000) {
    debugLog("Response too short or empty");
    return [];
  }
  
  debugLog(`HTML response length: ${r.text.length}`);
  
  const $ = cheerio.load(r.text);
  
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