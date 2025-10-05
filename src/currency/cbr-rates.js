// src/currency/cbr-rates.js - получение курсов валют ЦБ РФ
// Без try/catch - только явные проверки

import { XMLParser } from 'fast-xml-parser';

// Кеш курсов валют
let ratesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 часов

// Отладочная функция
function debugLog(msg, data = null) {
  if (process.env.DEBUG_CURRENCY) {
    console.log(`[CBR Rates] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

// Получение курсов валют с ЦБ РФ
export async function fetchCBRRates() {
  const now = Date.now();
  
  // Проверяем кеш
  if (ratesCache && (now - cacheTimestamp) < CACHE_TTL) {
    debugLog('Using cached rates', { age: Math.round((now - cacheTimestamp) / 1000 / 60) + ' minutes' });
    return ratesCache;
  }
  
  debugLog('Fetching fresh rates from CBR');
  
  // URL ЦБ РФ для получения курсов
  const cbrUrl = 'https://www.cbr.ru/scripts/XML_daily.asp';
  
  const response = await fetch(cbrUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/xml, text/xml, */*'
    },
    timeout: 9500
  });
  
  if (!response.ok) {
    debugLog(`CBR request failed: ${response.status}`);
    
    // Возвращаем старый кеш если есть
    if (ratesCache) {
      debugLog('Returning stale cache due to fetch error');
      return ratesCache;
    }
    
    // Возвращаем дефолтные курсы
    return getDefaultRates();
  }
  
  const xmlText = await response.text();
  
  if (!xmlText || xmlText.length < 100) {
    debugLog('Invalid XML response', { length: xmlText?.length });
    return ratesCache || getDefaultRates();
  }
  
  // Парсим XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });
  
  const xmlData = parser.parse(xmlText);
  
  if (!xmlData.ValCurs || !xmlData.ValCurs.Valute) {
    debugLog('Invalid XML structure');
    return ratesCache || getDefaultRates();
  }
  
  // Извлекаем курсы
  const valutes = Array.isArray(xmlData.ValCurs.Valute) ? 
    xmlData.ValCurs.Valute : [xmlData.ValCurs.Valute];
  
  const rates = {
    date: xmlData.ValCurs['@_Date'] || new Date().toISOString().split('T')[0],
    timestamp: now,
    currencies: {}
  };
  
  for (const valute of valutes) {
    const code = valute.CharCode;
    const nominal = parseFloat(valute.Nominal) || 1;
    const value = parseFloat(valute.Value?.replace(',', '.')) || 0;
    
    if (code && value > 0) {
      // Курс к рублю за 1 единицу валюты
      rates.currencies[code] = {
        name: valute.Name,
        nominal,
        value,
        rate: value / nominal // курс за 1 единицу
      };
    }
  }
  
  // Добавляем рубль
  rates.currencies.RUB = {
    name: 'Российский рубль',
    nominal: 1,
    value: 1,
    rate: 1
  };
  
  debugLog(`Fetched ${Object.keys(rates.currencies).length} currency rates`, {
    date: rates.date,
    usd: rates.currencies.USD?.rate,
    eur: rates.currencies.EUR?.rate
  });
  
  // Обновляем кеш
  ratesCache = rates;
  cacheTimestamp = now;
  
  return rates;
}

// Дефолтные курсы на случай недоступности ЦБ РФ
function getDefaultRates() {
  debugLog('Using default rates');
  
  return {
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    currencies: {
      RUB: { name: 'Российский рубль', nominal: 1, value: 1, rate: 1 },
      USD: { name: 'Доллар США', nominal: 1, value: 95, rate: 95 },
      EUR: { name: 'Евро', nominal: 1, value: 105, rate: 105 },
      CNY: { name: 'Китайский юань', nominal: 10, value: 130, rate: 13 }
    }
  };
}

// Конвертация валют
export async function convertCurrency(amount, fromCurrency, toCurrency = 'RUB') {
  if (!amount || amount <= 0) {
    return { amount: 0, rate: 1, date: new Date().toISOString().split('T')[0] };
  }
  
  if (fromCurrency === toCurrency) {
    return { amount, rate: 1, date: new Date().toISOString().split('T')[0] };
  }
  
  const rates = await fetchCBRRates();
  
  const fromRate = rates.currencies[fromCurrency]?.rate;
  const toRate = rates.currencies[toCurrency]?.rate;
  
  if (!fromRate || !toRate) {
    debugLog(`Currency not found`, { fromCurrency, toCurrency, available: Object.keys(rates.currencies) });
    return { amount, rate: 1, date: rates.date };
  }
  
  // Конвертация через рубль
  const rubAmount = amount * fromRate; // в рубли
  const convertedAmount = rubAmount / toRate; // в целевую валюту
  const conversionRate = fromRate / toRate;
  
  debugLog(`Converted ${amount} ${fromCurrency} = ${convertedAmount.toFixed(2)} ${toCurrency}`, {
    fromRate,
    toRate,
    conversionRate
  });
  
  return {
    amount: Math.round(convertedAmount * 100) / 100, // округляем до копеек
    rate: conversionRate,
    date: rates.date
  };
}

// Конвертация в рубли (наиболее частый случай)
export async function convertToRub(amount, fromCurrency) {
  if (fromCurrency === 'RUB') {
    return Math.round(amount);
  }
  
  const result = await convertCurrency(amount, fromCurrency, 'RUB');
  return Math.round(result.amount);
}

// Получение текущих курсов для отображения
export async function getCurrentRates() {
  const rates = await fetchCBRRates();
  
  return {
    date: rates.date,
    timestamp: rates.timestamp,
    USD: rates.currencies.USD?.rate || 95,
    EUR: rates.currencies.EUR?.rate || 105,
    CNY: rates.currencies.CNY?.rate || 13
  };
}

// Очистка кеша (для тестирования)
export function clearRatesCache() {
  ratesCache = null;
  cacheTimestamp = 0;
  debugLog('Rates cache cleared');
}
