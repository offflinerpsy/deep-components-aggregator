import { fetchWithRetry } from './net.js';

let ratesCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 часов

export async function convertToRub(currency) {
  if (!ratesCache || !cacheTimestamp || Date.now() - cacheTimestamp > CACHE_TTL) {
    await loadRates();
  }
  
  return ratesCache[currency] || 0;
}

export async function getRates() {
  if (!ratesCache || !cacheTimestamp || Date.now() - cacheTimestamp > CACHE_TTL) {
    await loadRates();
  }
  
  return {
    ok: true,
    cached: !!ratesCache,
    rates: ratesCache
  };
}

export function applyRub(price, currency, rates) {
  if (!rates.ok || !rates.rates || !rates.rates[currency]) {
    return 0;
  }
  
  const rate = rates.rates[currency];
  return Math.round(price * rate);
}

async function loadRates() {
  try {
    const response = await fetchWithRetry('https://www.cbr.ru/scripts/XML_daily.asp');
    if (!response.ok) {
      console.log(JSON.stringify({
        route: 'rates-cbr',
        error: `HTTP ${response.status}`,
        fallback: true
      }));
      // Fallback rates
      ratesCache = {
        'USD': 83.99,
        'EUR': 98.60
      };
      cacheTimestamp = Date.now();
      return;
    }
    
    const xml = await response.text();
    const rates = parseCbrXml(xml);
    
    ratesCache = rates;
    cacheTimestamp = Date.now();
    
    console.log(JSON.stringify({
      route: 'rates-cbr',
      loaded: true,
      rates: rates
    }));
  } catch (error) {
    console.log(JSON.stringify({
      route: 'rates-cbr',
      error: error.message,
      fallback: true
    }));
    // Fallback rates
    ratesCache = {
      'USD': 83.99,
      'EUR': 98.60
    };
    cacheTimestamp = Date.now();
  }
}

function parseCbrXml(xml) {
  const rates = {};
  
  // Простой парсинг XML для получения курсов
  const usdMatch = xml.match(/<Valute ID="R01235">[\s\S]*?<Value>([\d,]+)<\/Value>/);
  const eurMatch = xml.match(/<Valute ID="R01239">[\s\S]*?<Value>([\d,]+)<\/Value>/);
  
  if (usdMatch) {
    rates['USD'] = parseFloat(usdMatch[1].replace(',', '.'));
  }
  
  if (eurMatch) {
    rates['EUR'] = parseFloat(eurMatch[1].replace(',', '.'));
  }
  
  return rates;
}