import { create, insertMultiple, search } from '@orama/orama';

/**
 * Экземпляр поискового индекса
 */
let db;

/**
 * Исходные элементы для поиска
 */
let sourceItems = [];

/**
 * Простая транслитерация кириллицы в латиницу
 * @param {string} text Текст для транслитерации
 * @returns {string} Транслитерированный текст
 */
function transliterate(text) {
  if (!text) return '';
  
  const map = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  
  return text.toLowerCase().split('').map(char => {
    return map[char] || char;
  }).join('');
}

/**
 * Строит поисковый индекс на основе предоставленных элементов
 * @param {Array} items Массив элементов для индексации
 * @returns {Promise<object>} Экземпляр поискового индекса
 */
export async function buildIndex(items) {
  sourceItems = items || [];
  
  // Создаем индекс с расширенной схемой
  db = await create({
    schema: {
      mpn: 'string',
      brand: 'string',
      title: 'string',
      desc: 'string',
      regions: 'string[]',
      price: 'number',
      image: 'string',
      sku: 'string',
      pkg: 'string',
      pkg_type: 'string',
      tech_specs: 'string[]',
      translit: 'string' // Поле для транслитерации
    }
  });
  
  // Подготавливаем данные для индексации
  const indexItems = sourceItems.map(p => {
    // Собираем все текстовые поля для транслитерации
    const textFields = [
      p.mpn || '',
      p.brand || '',
      p.title || '',
      p.desc_short || '',
      p.sku || ''
    ].join(' ');
    
    // Подготавливаем технические характеристики
    const techSpecs = [];
    if (p.specs) {
      for (const [key, value] of Object.entries(p.specs)) {
        techSpecs.push(`${key}: ${value}`);
      }
    }
    
    return {
      mpn: p.mpn || '',
      brand: p.brand || '',
      title: p.title || '',
      desc: p.desc_short || '',
      regions: p.regions || [],
      price: p.price_min_rub ?? Number.MAX_SAFE_INTEGER,
      image: p.image || '',
      sku: p.sku || '',
      pkg: p.pkg || '',
      pkg_type: p.pkg_type || '',
      tech_specs: techSpecs,
      translit: transliterate(textFields) // Добавляем транслитерацию
    };
  });
  
  // Добавляем элементы в индекс
  await insertMultiple(db, indexItems);
  
  return db;
}

/**
 * Выполняет поиск по индексу
 * @param {string} q Поисковый запрос
 * @param {object} options Опции поиска
 * @param {number} options.limit Максимальное количество результатов
 * @returns {Promise<object>} Результаты поиска
 */
export async function searchIndex(q, { limit = 50 } = {}) {
  // Проверяем готовность индекса
  if (!db) {
    throw new Error('INDEX_NOT_READY');
  }
  
  // Нормализуем запрос
  const term = String(q || '').trim();
  if (!term) {
    return { hits: [] };
  }
  
  // Транслитерируем запрос для поиска по кириллице/латинице
  const translitTerm = transliterate(term);
  const lc = term.toLowerCase();
  
  // Ищем точные совпадения по MPN или SKU
  const exactMatches = await search(db, {
    term,
    where: {
      $or: [
        { mpn: { $eq: term } },
        { sku: { $eq: term } }
      ]
    },
    limit: 10
  });
  
  // Если есть точные совпадения, возвращаем их первыми
  if (exactMatches.count > 0) {
    const exactDocs = exactMatches.hits.map(h => h.document);
    
    // Выполняем общий поиск для дополнения результатов
    const fuzzyResult = await search(db, {
      term,
      limit: limit + exactDocs.length,
      boost: {
        mpn: 6,
        sku: 5,
        brand: 2,
        title: 1.5,
        desc: 1,
        tech_specs: 1,
        translit: 1.2 // Повышаем релевантность транслитерации
      }
    });
    
    // Фильтруем результаты, исключая точные совпадения
    const fuzzyDocs = fuzzyResult.hits
      .map(h => h.document)
      .filter(d => !exactDocs.some(e => e.mpn === d.mpn));
    
    // Объединяем результаты и ограничиваем количество
    const merged = [...exactDocs, ...fuzzyDocs].slice(0, limit);
    
    return { 
      count: merged.length,
      hits: merged.map(document => ({ document }))
    };
  }
  
  // Если точных совпадений нет, выполняем обычный поиск с бустами
  const result = await search(db, {
    term,
    limit,
    boost: {
      mpn: 6,
      sku: 5,
      brand: 2,
      title: 1.5,
      desc: 1,
      tech_specs: 1,
      translit: 1.2 // Повышаем релевантность транслитерации
    }
  });
  
  return {
    count: result.count,
    hits: result.hits
  };
}