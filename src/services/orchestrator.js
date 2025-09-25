// src/services/orchestrator.js - Оркестрация RU-контента + коммерция + валюта
import { parseChipDip } from '../adapters/ru/chipdip.js';
import { parsePromelec } from '../adapters/ru/promelec.js';
import { parseCompel } from '../adapters/ru/compel.js';
import { parsePlatan } from '../adapters/ru/platan.js';
import { parseElectronshik } from '../adapters/ru/electronshik.js';
import { searchOEMsTrade } from '../../adapters/oemstrade.js';
import { getRates, applyRub } from './rates-cbr.js';

// Список RU-адаптеров по приоритету
const RU_ADAPTERS = [
  { name: 'chipdip', parser: parseChipDip, priority: 1 },
  { name: 'promelec', parser: parsePromelec, priority: 2 },
  { name: 'compel', parser: parseCompel, priority: 3 },
  { name: 'platan', parser: parsePlatan, priority: 4 },
  { name: 'electronshik', parser: parseElectronshik, priority: 5 }
];

// Мерж данных по приоритету (ChipDip → Promelec → Compel → Platan → Electronshik)
const mergeProductData = (results) => {
  const merged = {
    mpn: '',
    title: '',
    description: '',
    manufacturer: '',
    package: '',
    packaging: '',
    images: [],
    datasheets: [],
    technical_specs: {},
    sources: []
  };
  
  // Сортируем результаты по приоритету
  const sortedResults = results
    .filter(r => r.ok && r.data)
    .sort((a, b) => a.priority - b.priority);
  
  if (sortedResults.length === 0) {
    return merged;
  }
  
  // Мерж по приоритету - берем первое непустое значение
  for (const result of sortedResults) {
    const data = result.data;
    
    if (!merged.mpn && data.mpn) merged.mpn = data.mpn;
    if (!merged.title && data.title) merged.title = data.title;
    if (!merged.description && data.description) merged.description = data.description;
    if (!merged.manufacturer && data.manufacturer) merged.manufacturer = data.manufacturer;
    if (!merged.package && data.package) merged.package = data.package;
    if (!merged.packaging && data.packaging) merged.packaging = data.packaging;
    
    // Изображения - объединяем уникальные
    if (Array.isArray(data.images)) {
      data.images.forEach(img => {
        if (img && !merged.images.includes(img)) {
          merged.images.push(img);
        }
      });
    }
    
    // Датащиты - объединяем уникальные
    if (Array.isArray(data.datasheets)) {
      data.datasheets.forEach(doc => {
        if (doc && !merged.datasheets.includes(doc)) {
          merged.datasheets.push(doc);
        }
      });
    }
    
    // Технические параметры - мерж с приоритетом
    if (data.technical_specs && typeof data.technical_specs === 'object') {
      Object.entries(data.technical_specs).forEach(([key, value]) => {
        if (value && !merged.technical_specs[key]) {
          merged.technical_specs[key] = value;
        }
      });
    }
    
    // Сохраняем информацию об источниках
    merged.sources.push({
      source: result.source,
      priority: result.priority,
      url: data.url,
      hasTitle: !!data.title,
      hasDescription: !!data.description,
      hasImages: Array.isArray(data.images) && data.images.length > 0,
      hasDatasheets: Array.isArray(data.datasheets) && data.datasheets.length > 0,
      hasSpecs: data.technical_specs && Object.keys(data.technical_specs).length > 0
    });
  }
  
  return merged;
};

// Параллельный запрос к RU-источникам
const fetchRuContent = async (mpn) => {
  const startTime = Date.now();
  
  // Запускаем все адаптеры параллельно
  const promises = RU_ADAPTERS.map(async (adapter) => {
    const adapterStartTime = Date.now();
    
    const result = await adapter.parser(mpn);
    
    return {
      ...result,
      adapter: adapter.name,
      duration: Date.now() - adapterStartTime
    };
  });
  
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;
  
  // Мерж результатов
  const mergedData = mergeProductData(results);
  
  return {
    ok: true,
    data: mergedData,
    duration,
    results: results.map(r => ({
      source: r.adapter,
      ok: r.ok,
      code: r.code || 'SUCCESS',
      duration: r.duration,
      hasData: r.ok && r.data && Object.keys(r.data).length > 0
    }))
  };
};

// Получение коммерческих данных из OEMsTrade
const fetchCommerceData = async (mpn) => {
  const startTime = Date.now();
  
  const result = await searchOEMsTrade(mpn.toUpperCase(), 10);
  const duration = Date.now() - startTime;
  
  if (!result || result.length === 0) {
    return {
      ok: false,
      code: 'NO_COMMERCE_DATA',
      duration,
      data: null
    };
  }
  
  // Берем первый результат как основной
  const primaryResult = result[0];
  
  return {
    ok: true,
    duration,
    data: {
      regions: primaryResult.regions || [],
      stock_total: primaryResult.stock_total || 0,
      lead_days: primaryResult.lead_days || 0,
      price_min: primaryResult.price_min || 0,
      price_min_currency: primaryResult.price_min_currency || 'USD',
      suppliers: result.map(item => ({
        name: 'OEMsTrade',
        region: item.regions && item.regions.length > 0 ? item.regions[0] : '',
        stock: item.stock_total || 0,
        price: item.price_min || 0,
        currency: item.price_min_currency || 'USD'
      }))
    }
  };
};

// Конвертация цен в рубли
const convertPrices = async (commerceData) => {
  if (!commerceData || !commerceData.price_min || commerceData.price_min <= 0) {
    return {
      price_min_rub: 0,
      rates_used: null,
      conversion_ok: false
    };
  }
  
  const rates = await getRates();
  
  if (!rates.ok) {
    return {
      price_min_rub: 0,
      rates_used: null,
      conversion_ok: false,
      rates_error: rates.code
    };
  }
  
  const priceRub = applyRub(commerceData.price_min, commerceData.price_min_currency, rates);
  
  return {
    price_min_rub: priceRub,
    rates_used: {
      USD: rates.USD,
      EUR: rates.EUR,
      cached: rates.cached || false
    },
    conversion_ok: true
  };
};

// Основная функция оркестрации
export const orchestrateProduct = async (mpn) => {
  if (!mpn || typeof mpn !== 'string') {
    return { ok: false, code: 'INVALID_MPN' };
  }
  
  const startTime = Date.now();
  const normalizedMpn = mpn.trim();
  
  // Параллельно получаем контент и коммерцию
  const [ruContentResult, commerceResult] = await Promise.all([
    fetchRuContent(normalizedMpn),
    fetchCommerceData(normalizedMpn)
  ]);
  
  // Конвертируем цены в рубли
  const priceConversion = await convertPrices(commerceResult.ok ? commerceResult.data : null);
  
  // Формируем итоговый продукт
  const product = {
    mpn: normalizedMpn,
    title: ruContentResult.data.title || '',
    description: ruContentResult.data.description || '',
    manufacturer: ruContentResult.data.manufacturer || '',
    package: ruContentResult.data.package || '',
    packaging: ruContentResult.data.packaging || '',
    
    // Медиа контент
    images: ruContentResult.data.images || [],
    datasheets: ruContentResult.data.datasheets || [],
    technical_specs: ruContentResult.data.technical_specs || {},
    
    // Коммерческие данные
    availability: {
      inStock: commerceResult.ok ? commerceResult.data.stock_total : 0,
      lead: commerceResult.ok ? commerceResult.data.lead_days : 0
    },
    
    pricing: commerceResult.ok ? [{
      qty: 1,
      price: commerceResult.data.price_min,
      currency: commerceResult.data.price_min_currency,
      price_rub: priceConversion.price_min_rub
    }] : [],
    
    regions: commerceResult.ok ? commerceResult.data.regions : [],
    
    suppliers: commerceResult.ok ? commerceResult.data.suppliers : [],
    
    // Метаданные
    sources: ruContentResult.data.sources || [],
    orchestration: {
      duration: Date.now() - startTime,
      ru_content: {
        ok: ruContentResult.ok,
        duration: ruContentResult.duration,
        sources_count: ruContentResult.results ? ruContentResult.results.filter(r => r.ok).length : 0
      },
      commerce: {
        ok: commerceResult.ok,
        duration: commerceResult.duration,
        code: commerceResult.code
      },
      pricing: {
        conversion_ok: priceConversion.conversion_ok,
        rates_cached: priceConversion.rates_used ? priceConversion.rates_used.cached : false
      }
    }
  };
  
  return {
    ok: true,
    product,
    debug: {
      ru_results: ruContentResult.results,
      commerce_result: commerceResult,
      price_conversion: priceConversion
    }
  };
};

// Оркестрация поиска (для /api/search)
export const orchestrateSearch = async (query, maxResults = 40) => {
  if (!query || typeof query !== 'string') {
    return { ok: false, code: 'INVALID_QUERY' };
  }
  
  const startTime = Date.now();
  const normalizedQuery = query.trim().toUpperCase();
  
  // Получаем коммерческие данные из OEMsTrade
  const oemsResults = await searchOEMsTrade(normalizedQuery, maxResults);
  
  if (!oemsResults || oemsResults.length === 0) {
    return {
      ok: true,
      source: 'oemstrade',
      count: 0,
      items: [],
      duration: Date.now() - startTime
    };
  }
  
  // Получаем курсы валют
  const rates = await getRates();
  
  // Нормализуем результаты
  const items = oemsResults.map(item => ({
    mpn: item.mpn || '',
    title: item.title || '',
    manufacturer: item.manufacturer || '',
    description: item.description || '',
    package: item.package || '',
    packaging: item.packaging || '',
    regions: item.regions || [],
    stock_total: item.stock_total || 0,
    lead_days: item.lead_days || 0,
    price_min: item.price_min || 0,
    price_min_currency: item.price_min_currency || 'USD',
    price_min_rub: rates.ok ? applyRub(item.price_min, item.price_min_currency, rates) : 0,
    image: item.image || '/ui/placeholder.svg'
  }));
  
  return {
    ok: true,
    source: 'oemstrade',
    count: items.length,
    items,
    duration: Date.now() - startTime,
    rates_cached: rates.cached || false
  };
};
