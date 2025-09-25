import { parseChipDip } from '../adapters/ru/chipdip.js';
import { parsePromelec } from '../adapters/ru/promelec.js';
import { parsePlatan } from '../adapters/ru/platan.js';
import { parseElectronshik } from '../adapters/ru/electronshik.js';
import { parseElitan } from '../adapters/ru/elitan.js';
import { parseOEMsTrade } from '../adapters/oemstrade.js';
import { convertToRub } from '../services/rates-cbr.js';
import Ajv from 'ajv';

const ajv = new Ajv();

// Схема для валидации RU-канона
const ruCanonSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    source: { type: 'string' },
    mpn: { type: 'string' },
    mpn_clean: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    images: { type: 'array', items: { type: 'string' } },
    datasheets: { type: 'array', items: { type: 'string' } },
    package: { type: 'string' },
    packaging: { type: 'string' },
    technical_specs: { type: 'object' },
    url: { type: 'string' }
  },
  required: ['ok', 'source', 'mpn']
};

const validateRuCanon = ajv.compile(ruCanonSchema);

// Функция для оценки полноты данных
function calculateCompleteness(data) {
  if (!data.ok) return 0;
  
  let score = 0;
  const fields = ['title', 'description', 'images', 'datasheets', 'technical_specs'];
  
  fields.forEach(field => {
    if (field === 'images' || field === 'datasheets') {
      if (data[field] && data[field].length > 0) score += 1;
    } else if (field === 'technical_specs') {
      if (data[field] && Object.keys(data[field]).length > 0) score += 1;
    } else {
      if (data[field] && data[field].trim()) score += 1;
    }
  });
  
  return score;
}

export async function orchestrateProduct(mpn) {
  const startTime = Date.now();
  
  // Запуск всех RU-адаптеров параллельно
  const ruAdapters = [
    parseChipDip(mpn),
    parsePromelec(mpn),
    parsePlatan(mpn),
    parseElectronshik(mpn),
    parseElitan(mpn)
  ];
  
  const ruResults = await Promise.allSettled(ruAdapters);
  
  // Выбор наиболее полного RU-контента
  let bestRuContent = null;
  let maxCompleteness = 0;
  
  ruResults.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.ok) {
      const completeness = calculateCompleteness(result.value);
      if (completeness > maxCompleteness) {
        maxCompleteness = completeness;
        bestRuContent = result.value;
      }
    }
  });
  
  // Если нет RU-контента, возвращаем ошибку
  if (!bestRuContent) {
    return {
      ok: false,
      error: 'No RU content found',
      mpn: mpn
    };
  }
  
  // Валидация RU-канона
  if (!validateRuCanon(bestRuContent)) {
    return {
      ok: false,
      error: 'RU canon validation failed',
      mpn: mpn,
      validation_errors: validateRuCanon.errors
    };
  }
  
  // Получение коммерческих данных от OEMsTrade
  const commercialData = await parseOEMsTrade(mpn);
  
  // Слияние данных
  const mergedData = {
    ...bestRuContent,
    suppliers: commercialData.ok ? commercialData.suppliers : [],
    regions: commercialData.ok ? commercialData.regions : [],
    stock_total: commercialData.ok ? commercialData.stock_total : 0,
    price_min: commercialData.ok ? commercialData.price_min : 0,
    price_min_currency: commercialData.ok ? commercialData.price_min_currency : 'USD',
    price_min_rub: 0
  };
  
  // Конвертация в рубли
  if (mergedData.price_min > 0 && mergedData.price_min_currency !== 'RUB') {
    const rubRate = await convertToRub(mergedData.price_min_currency);
    if (rubRate > 0) {
      mergedData.price_min_rub = Math.round(mergedData.price_min * rubRate);
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(JSON.stringify({
    route: 'orchestrator',
    mpn: mpn,
    ru_source: bestRuContent.source,
    commercial_ok: commercialData.ok,
    duration: duration
  }));
  
  return {
    ok: true,
    ...mergedData
  };
}

export async function orchestrateSearch(query) {
  // Для поиска пока используем только OEMsTrade
  // В будущем можно добавить поиск по RU-источникам
  return await parseOEMsTrade(query);
}