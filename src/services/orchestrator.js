import { parseChipDip } from '../adapters/ru/chipdip.js';
import { parsePromelec } from '../adapters/ru/promelec.js';
import { parsePlatan } from '../adapters/ru/platan.js';
import { parseElectronshik } from '../adapters/ru/electronshik.js';
import { parseElitan } from '../adapters/ru/elitan.js';
import { searchOEMsTrade } from '../../adapters/oemstrade.js';
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
  
  // Если нет RU-контента, используем только коммерческие данные
  if (!bestRuContent) {
    console.log(JSON.stringify({
      route: 'orchestrator',
      mpn: mpn,
      fallback: 'no-ru-content',
      using_oemstrade_only: true
    }));
    
    // Получение коммерческих данных от OEMsTrade
    const commercialResults = await searchOEMsTrade(mpn);
    
    if (!Array.isArray(commercialResults) || commercialResults.length === 0) {
      // Создаем fallback данные когда нет результатов
      return {
        ok: true,
        source: 'fallback',
        mpn: mpn,
        mpn_clean: mpn.replace(/\/[A-Z0-9-]+$/, '').replace(/-[A-Z]$/, ''),
        title: mpn,
        description: 'Компонент не найден в базе данных',
        images: [],
        datasheets: [],
        package: '',
        packaging: '',
        technical_specs: {},
        suppliers: [],
        regions: [],
        stock_total: 0,
        price_min: 0,
        price_min_currency: 'RUB',
        price_min_rub: 0,
        url: ''
      };
    }
    
    // Найти точное совпадение MPN или взять первый результат
    const commercialData = commercialResults.find(item => item.mpn === mpn) || commercialResults[0];
    
    // Конвертация в рубли
    let price_min_rub = 0;
    if (commercialData.price_min > 0 && commercialData.price_min_currency !== 'RUB') {
      const rubRate = await convertToRub(commercialData.price_min_currency);
      if (rubRate > 0) {
        price_min_rub = Math.round(commercialData.price_min * rubRate);
      }
    } else if (commercialData.price_min_currency === 'RUB') {
      price_min_rub = commercialData.price_min;
    }
    
    return {
      ok: true,
      source: 'oemstrade-only',
      mpn: mpn,
      mpn_clean: mpn.replace(/\/[A-Z0-9-]+$/, '').replace(/-[A-Z]$/, ''),
      title: commercialData.title || mpn,
      description: commercialData.description || '',
      images: commercialData.images || [],
      datasheets: commercialData.datasheets || [],
      package: commercialData.package || '',
      packaging: commercialData.packaging || '',
      technical_specs: commercialData.technical_specs || {},
      suppliers: commercialData.suppliers || [],
      regions: commercialData.regions || [],
      stock_total: commercialData.stock_total || 0,
      price_min: commercialData.price_min || 0,
      price_min_currency: commercialData.price_min_currency || 'USD',
      price_min_rub: price_min_rub,
      url: commercialData.url || ''
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
  const commercialData = await searchOEMsTrade(mpn);
  
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
  } else if (mergedData.price_min_currency === 'RUB') {
    mergedData.price_min_rub = mergedData.price_min;
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
  const results = await searchOEMsTrade(query);
  
  if (Array.isArray(results) && results.length > 0) {
    // Конвертация валют для всех результатов
    const convertedResults = await Promise.all(results.map(async (item) => {
      let price_min_rub = 0;
      if (item.price_min > 0 && item.price_min_currency !== 'RUB') {
        const rubRate = await convertToRub(item.price_min_currency);
        if (rubRate > 0) {
          price_min_rub = Math.round(item.price_min * rubRate);
        }
      } else if (item.price_min_currency === 'RUB') {
        price_min_rub = item.price_min;
      }
      
      return {
        ...item,
        price_min_rub: price_min_rub
      };
    }));
    
    return {
      ok: true,
      results: convertedResults,
      count: convertedResults.length,
      query: query
    };
  } else {
    // Возвращаем пустой массив вместо ошибки
    return {
      ok: true,
      results: [],
      count: 0,
      query: query
    };
  }
}