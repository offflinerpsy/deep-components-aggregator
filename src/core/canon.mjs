/**
 * Определение канонического формата продукта
 * @module src/core/canon
 */

/**
 * Валидировать канонический объект продукта
 * @param {Object} product - Продукт для валидации
 * @returns {boolean} Результат валидации
 */
export const validate = (product) => {
  if (!product) return false;

  // Проверяем наличие обязательных полей
  const requiredFields = ['mpn', 'title'];
  for (const field of requiredFields) {
    if (!product[field]) {
      return false;
    }
  }

  return true;
};

/**
 * Нормализовать канонический объект продукта
 * @param {Object} product - Продукт для нормализации
 * @returns {Object} Нормализованный продукт
 */
export const normalize = (product) => {
  if (!product) return null;

  // Копируем объект, чтобы не изменять оригинал
  const normalized = { ...product };

  // Нормализуем MPN
  if (normalized.mpn) {
    normalized.mpn = normalized.mpn.trim().toUpperCase();
  }

  // Нормализуем бренд
  if (normalized.brand) {
    normalized.brand = normalized.brand.trim();
  }

  // Нормализуем заголовок
  if (normalized.title) {
    normalized.title = normalized.title.trim();
  }

  // Нормализуем описание
  if (normalized.description) {
    normalized.description = normalized.description.trim();
  }

  // Нормализуем массивы
  if (Array.isArray(normalized.datasheet_urls)) {
    normalized.datasheet_urls = normalized.datasheet_urls.filter(Boolean);
  } else {
    normalized.datasheet_urls = [];
  }

  if (Array.isArray(normalized.offers)) {
    normalized.offers = normalized.offers.filter(Boolean);
  } else {
    normalized.offers = [];
  }

  // Нормализуем технические характеристики
  if (normalized.technical_specs && typeof normalized.technical_specs === 'object') {
    const specs = {};

    for (const [key, value] of Object.entries(normalized.technical_specs)) {
      if (key && value) {
        specs[key.trim()] = value.toString().trim();
      }
    }

    normalized.technical_specs = specs;
  } else {
    normalized.technical_specs = {};
  }

  return normalized;
};

/**
 * Создать пустой канонический объект продукта
 * @returns {Object} Пустой продукт
 */
export const createEmpty = () => {
  return {
    mpn: null,
    brand: null,
    title: null,
    description: null,
    image_url: null,
    datasheet_urls: [],
    technical_specs: {},
    package: null,
    packaging: null,
    offers: [],
    source: null,
    source_url: null
  };
};

/**
 * Объединить два канонических объекта продукта
 * @param {Object} target - Целевой продукт
 * @param {Object} source - Исходный продукт
 * @returns {Object} Объединенный продукт
 */
export const merge = (target, source) => {
  if (!target) return normalize(source);
  if (!source) return normalize(target);

  const merged = { ...target };

  // Объединяем простые поля (берем непустые значения из source)
  const simpleFields = ['mpn', 'brand', 'title', 'description', 'image_url', 'package', 'packaging'];

  for (const field of simpleFields) {
    if (source[field] && !merged[field]) {
      merged[field] = source[field];
    }
  }

  // Объединяем массивы
  if (Array.isArray(source.datasheet_urls)) {
    merged.datasheet_urls = Array.from(new Set([
      ...(merged.datasheet_urls || []),
      ...source.datasheet_urls
    ]));
  }

  // Объединяем технические характеристики
  if (source.technical_specs && typeof source.technical_specs === 'object') {
    merged.technical_specs = {
      ...(merged.technical_specs || {}),
      ...source.technical_specs
    };
  }

  // Объединяем предложения
  if (Array.isArray(source.offers)) {
    merged.offers = [
      ...(merged.offers || []),
      ...source.offers
    ];
  }

  return normalize(merged);
};

/**
 * Преобразовать канонический объект продукта в объект для индексации
 * @param {Object} product - Продукт для преобразования
 * @returns {Object} Объект для индексации
 */
export const toIndexable = (product) => {
  if (!product) return null;

  const normalized = normalize(product);

  // Создаем текстовое представление для полнотекстового поиска
  const textParts = [
    normalized.mpn,
    normalized.brand,
    normalized.title,
    normalized.description,
    normalized.package,
    normalized.packaging
  ].filter(Boolean);

  // Добавляем технические характеристики в текст
  if (normalized.technical_specs) {
    for (const [key, value] of Object.entries(normalized.technical_specs)) {
      textParts.push(`${key}: ${value}`);
    }
  }

  // Формируем объект для индексации
  return {
    id: normalized.mpn,
    mpn: normalized.mpn,
    brand: normalized.brand || '',
    title: normalized.title || '',
    description: normalized.description || '',
    package: normalized.package || '',
    packaging: normalized.packaging || '',
    image_url: normalized.image_url || '',
    datasheet_urls: normalized.datasheet_urls || [],
    technical_specs: normalized.technical_specs || {},
    text: textParts.join(' '),

    // Агрегированные данные из предложений
    regions: Array.from(new Set(normalized.offers.map(o => o.region).filter(Boolean))),
    min_price_rub: Math.min(...normalized.offers.map(o => o.price_min_rub || Infinity).filter(p => p !== Infinity)) || null,
    total_stock: normalized.offers.reduce((sum, o) => sum + (o.stock || 0), 0)
  };
};

// унифицированная запись строки выдачи
export function toCanonRow(x) {
  return {
    photo: x.photo || '',
    mpn: x.mpn || '',
    title: x.title || '',
    manufacturer: x.manufacturer || '',
    description: x.description || '',
    package: x.package || '',
    packaging: x.packaging || '',
    regions: x.regions || ['US'],
    stock: Number.isFinite(x.stock) ? x.stock : null,
    minRub: Number.isFinite(x.minRub) ? x.minRub : null,
    openUrl: x.openUrl || ''
  };
}

export default { validate, normalize, createEmpty, merge, toIndexable, toCanonRow };
