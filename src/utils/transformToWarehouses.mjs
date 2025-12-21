// Transform product data: hide supplier sources, create neutral "warehouses"
// КРИТИЧНО: Не выдавать пользователю откуда мы берём данные

import { toRUB } from '../currency/toRUB.mjs';

const clean = s => (s || '').toString().trim();

/**
 * ПОЛЯ КОТОРЫЕ НУЖНО УДАЛИТЬ ИЗ technical_specs
 * Это leak'и поставщиков или мусорные данные
 */
const LEAKED_SPEC_FIELDS = new Set([
  // LEAK ПОСТАВЩИКОВ
  'Product URL',
  'ProductUrl',
  'product_url',
  'Mouser Part Number',
  'MouserPartNumber',
  'Datasheet URL',
  'DatasheetUrl',
  'DataSheetUrl',
  
  // Мусорные поля (обычно содержат [object Object] или бесполезную инфу)
  'Unit Weight',
  'UnitWeight',
  'Standard Pack Qty',
  'StandardPackQty',
  'Order Multiple',
  'OrderMultiple',
  'Minimum Order Quantity',
  'MinimumOrderQuantity',
  'In Stock',
  'InStock',
  'Availability',
  'Lead Time',
  'LeadTime',
  'Manufacturer Lead Weeks',
  'ManufacturerLeadWeeks',
  'Normally Stocking',
  'NormallyStocking',
  'ECCN',
  'CAHTS',
  'MXHTS',
  'USHTS',
  
  // Дублирующие поля
  'Manufacturer Part Number',
  'ManufacturerPartNumber',
  'Manufacturer',
]);

/**
 * Фильтрует и очищает technical_specs от leak'ов и мусора
 * @param {Object} specs - Raw technical_specs
 * @returns {Object} Cleaned specs without leak fields and [object Object]
 * @export - экспортируем для использования в server.js при чтении кэша
 */
export function cleanTechnicalSpecs(specs) {
  if (!specs || typeof specs !== 'object') return {};
  
  const cleaned = {};
  
  for (const [key, value] of Object.entries(specs)) {
    // Пропускаем leak'и
    if (LEAKED_SPEC_FIELDS.has(key)) continue;
    
    // Пропускаем поля начинающиеся с URL
    if (key.toLowerCase().includes('url')) continue;
    
    // Пропускаем null/undefined
    if (value === null || value === undefined) continue;
    
    // Конвертируем значение в строку
    let strValue;
    
    if (typeof value === 'object') {
      // Если объект — пробуем извлечь значение
      if (Array.isArray(value)) {
        strValue = value.map(v => clean(v)).filter(Boolean).join(', ');
      } else if (value.value !== undefined) {
        strValue = clean(value.value);
      } else if (value.name !== undefined) {
        strValue = clean(value.name);
      } else {
        // Пробуем JSON stringify, если не пустой объект
        const str = JSON.stringify(value);
        if (str === '{}' || str === '[]') continue;
        strValue = str;
      }
    } else {
      strValue = clean(value);
    }
    
    // Пропускаем пустые значения
    if (!strValue || strValue === '-' || strValue === 'N/A' || strValue === 'null' || strValue === 'undefined') continue;
    
    // Пропускаем если значение содержит [object Object]
    if (strValue.includes('[object Object]')) continue;
    
    // Пропускаем Yes/No без контекста
    if ((strValue === 'Yes' || strValue === 'No') && !key.toLowerCase().includes('rohs')) continue;
    
    cleaned[key] = strValue;
  }
  
  return cleaned;
}

/**
 * Calculate ETA (срок доставки) without revealing supplier source
 * @param {string} source - Internal source (mouser/digikey/tme/farnell)
 * @param {number} stock - Stock available
 * @param {string} leadTime - Lead time from API
 * @returns {string} User-facing ETA string
 */
function calculateETA(source, stock, leadTime) {
  // Если есть в наличии
  if (stock > 0) {
    // Проверяем регион (но НЕ показываем его пользователю)
    if (source === 'tme') return 'В наличии'; // EU - быстро
    if (source === 'farnell') return '3-5 дней'; // UK/EU
    if (source === 'mouser') return '7-10 дней'; // US
    if (source === 'digikey') return '7-14 дней'; // US/Global
  }
  
  // Под заказ
  if (leadTime && leadTime !== '—' && leadTime !== 'N/A') {
    return leadTime;
  }
  
  // Дефолтные сроки по источнику (без упоминания откуда)
  if (source === 'tme') return '10-14 дней';
  if (source === 'farnell') return '10-14 дней';
  if (source === 'mouser') return '14-21 день';
  if (source === 'digikey') return '14-21 день';
  
  return 'Уточняйте';
}

/**
 * Group pricing breaks by source and create warehouse entries
 * @param {Array} pricing - Array of price breaks from mergeProductData
 * @param {Object} availability - Availability data with sources
 * @returns {Array} Warehouse objects
 */
function createWarehouses(pricing, availability) {
  // Группируем price breaks по источнику
  const bySource = {};
  
  pricing.forEach(pb => {
    if (!pb.source) return;
    if (!bySource[pb.source]) {
      bySource[pb.source] = [];
    }
    bySource[pb.source].push(pb);
  });
  
  // Создаём "склады" из каждого источника
  const warehouses = [];
  let warehouseNum = 1;
  
  for (const [source, priceBreaks] of Object.entries(bySource)) {
    const stock = availability?.sources?.[source] || 0;
    const leadTime = availability?.leadTimes?.[source] || null;
    
    // Сортируем price breaks по количеству
    const sortedBreaks = priceBreaks
      .map(pb => ({
        qty: Number(pb.qty) || 1,
        price_rub: Number(pb.price_rub) || 0,
        currency: pb.currency || 'USD'
      }))
      .filter(pb => pb.price_rub > 0)
      .sort((a, b) => a.qty - b.qty);
    
    if (sortedBreaks.length === 0) continue;
    
    // Минимальная цена = цена при максимальном количестве
    const minPrice = sortedBreaks[sortedBreaks.length - 1].price_rub;
    
    warehouses.push({
      id: `wh${warehouseNum}`,
      name: `Склад ${warehouseNum}`,
      stock,
      minPrice,
      priceBreaks: sortedBreaks,
      eta: calculateETA(source, stock, leadTime)
      // НЕ включаем: source, region, vendorUrl
    });
    
    warehouseNum++;
  }
  
  // Сортируем склады по минимальной цене (лучшая сначала)
  warehouses.sort((a, b) => a.minPrice - b.minPrice);
  
  // Переназначаем номера после сортировки
  warehouses.forEach((wh, idx) => {
    wh.id = `wh${idx + 1}`;
    wh.name = `Склад ${idx + 1}`;
  });
  
  return warehouses;
}

/**
 * Create aggregated price breaks for display (all warehouses combined)
 * @param {Array} warehouses - Array of warehouse objects
 * @returns {Array} Aggregated price breaks with discounts
 */
function createAggregatedPriceBreaks(warehouses) {
  // Собираем ВСЕ price breaks от всех складов
  const allBreaks = warehouses.flatMap(wh => wh.priceBreaks);
  
  // Группируем по количеству, берём МИНИМАЛЬНУЮ цену
  const byQty = {};
  allBreaks.forEach(pb => {
    if (!byQty[pb.qty] || pb.price_rub < byQty[pb.qty].price_rub) {
      byQty[pb.qty] = pb;
    }
  });
  
  // Преобразуем в массив и сортируем
  const aggregated = Object.values(byQty).sort((a, b) => a.qty - b.qty);
  
  if (aggregated.length === 0) return [];
  
  // Вычисляем процент скидки от первого тира
  const basePrice = aggregated[0].price_rub;
  const bestPrice = Math.min(...aggregated.map(pb => pb.price_rub));
  
  return aggregated.map(pb => ({
    qty: pb.qty,
    price_rub: pb.price_rub,
    discount: basePrice > 0 ? Math.round(((basePrice - pb.price_rub) / basePrice) * 100) : 0,
    isBest: pb.price_rub === bestPrice
  }));
}

/**
 * Transform merged product data to warehouse-based format
 * СКРЫВАЕТ все упоминания реальных поставщиков (Mouser, DigiKey, etc.)
 * @param {Object} product - Merged product from mergeProductData
 * @returns {Object} Transformed product with warehouses instead of sources
 */
export function transformToWarehouses(product) {
  if (!product) return null;
  
  const warehouses = createWarehouses(product.pricing || [], product.availability);
  const aggregatedPriceBreaks = createAggregatedPriceBreaks(warehouses);
  
  // Общее количество на всех складах
  const totalStock = warehouses.reduce((sum, wh) => sum + (wh.stock || 0), 0);
  
  // Минимальный срок доставки
  const allETAs = warehouses.map(wh => wh.eta).filter(Boolean);
  const minETA = allETAs.find(eta => eta === 'В наличии') || allETAs[0] || 'Уточняйте';
  
  // Лучшая цена (минимальная)
  const bestPrice = warehouses.length > 0 
    ? Math.min(...warehouses.map(wh => wh.minPrice)) 
    : null;
  
  // DEBUG: Проверим что получаем
  const originalSpecsCount = Object.keys(product.technical_specs || {}).length;
  const cleanedSpecs = cleanTechnicalSpecs(product.technical_specs);
  const cleanedSpecsCount = Object.keys(cleanedSpecs).length;
  console.log(`   🧹 cleanTechnicalSpecs: ${originalSpecsCount} -> ${cleanedSpecsCount} specs`);
  
  return {
    mpn: product.mpn,
    manufacturer: product.manufacturer,
    title: product.title,
    description: product.description,
    photo: product.photo,
    images: product.images || [],
    datasheets: product.datasheets || [],
    // ВАЖНО: Используем ОЧИЩЕННЫЕ specs
    technical_specs: cleanedSpecs,
    package: product.package || '',
    packaging: product.packaging || '',
    
    // НОВОЕ: агрегированные данные БЕЗ упоминания источников
    totalStock,
    warehouseCount: warehouses.length,
    minETA,
    bestPrice,
    
    // Градация цен для всех складов (объединённая)
    priceBreaks: aggregatedPriceBreaks,
    
    // Склады (БЕЗ source, region, vendorUrl)
    warehouses,
    
    // УДАЛЕНО из ответа:
    // - regions (US/EU/etc.)
    // - sources (mouser: true/false)
    // - vendorUrls (прямые ссылки на поставщиков)
    // - availability.sources (leak источников)
    // - availability.leadTimes (leak источников)
    
    // Для backwards compatibility с фронтом (временно)
    availability: {
      inStock: totalStock
    },
    pricing: aggregatedPriceBreaks.map(pb => ({
      qty: pb.qty,
      price_rub: pb.price_rub,
      currency: 'RUB'
    }))
  };
}
