// Заглушка для Orama
// Используется для совместимости без Orama

let db = null;
let lastBuildTime = null;

export async function buildIndex(items) {
  console.log(`[Mock Orama] Building index with ${items.length} items`);
  lastBuildTime = Date.now();
  return {};
}

export async function searchIndex(q, { limit = 50 } = {}) {
  console.log(`[Mock Orama] Searching for: ${q}, limit: ${limit}`);
  
  // Тестовые данные для LM317, 1N4148, LDB-500L
  const TEST_DATA = {
    'lm317': [
      {
        mpn: 'LM317T',
        brand: 'STMicroelectronics',
        title: 'LM317T - Регулируемый стабилизатор напряжения',
        description: 'Регулируемый линейный стабилизатор напряжения, 1.2-37В, 1.5А, TO-220',
        regions: ['RU', 'EU'],
        price_min_rub: 45.50,
        image: 'https://www.chipdip.ru/product-image/lm317t.jpg',
        sku: 'STM-LM317T'
      },
      {
        mpn: 'LM317',
        brand: 'Texas Instruments',
        title: 'LM317 - Регулируемый стабилизатор напряжения',
        description: 'Регулируемый линейный стабилизатор напряжения, 1.2-37В, 1А, TO-220',
        regions: ['RU', 'US'],
        price_min_rub: 42.75,
        image: 'https://www.chipdip.ru/product-image/lm317.jpg',
        sku: 'TI-LM317'
      }
    ],
    '1n4148': [
      {
        mpn: '1N4148W-TP',
        brand: 'Micro Commercial Co',
        title: '1N4148W-TP - Высокоскоростной диод',
        description: 'Высокоскоростной диод, 100В, 300мА, SOD-123',
        regions: ['RU', 'EU', 'US'],
        price_min_rub: 3.50,
        image: 'https://www.chipdip.ru/product-image/1n4148w-tp.jpg',
        sku: 'MCC-1N4148W-TP'
      }
    ],
    'ldb-500l': [
      {
        mpn: 'LDB-500L',
        brand: 'Mean Well',
        title: 'LDB-500L - Драйвер светодиодов',
        description: 'Драйвер светодиодов, 9-36В, 500мА, диммируемый',
        regions: ['RU', 'EU'],
        price_min_rub: 850.00,
        image: 'https://www.chipdip.ru/product-image/ldb-500l.jpg',
        sku: 'MW-LDB-500L'
      }
    ]
  };
  
  // Поиск по тестовым данным
  const lowerQ = q.toLowerCase();
  for (const [key, items] of Object.entries(TEST_DATA)) {
    if (lowerQ.includes(key)) {
      return { hits: items, count: items.length };
    }
  }
  
  // Для других запросов возвращаем пустой результат
  return { hits: [], count: 0 };
}

export function getIndexAge() {
  if (!lastBuildTime) return null;
  return Date.now() - lastBuildTime;
}