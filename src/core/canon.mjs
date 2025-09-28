import crypto from 'node:crypto';

/**
 * Генерирует уникальный идентификатор для элемента
 * @returns {string} Уникальный идентификатор
 */
export function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Нормализует MPN (Model Part Number)
 * @param {string} mpn Исходный MPN
 * @returns {string} Нормализованный MPN
 */
export function normalizeMpn(mpn) {
  if (!mpn) return '';

  // Удаляем невидимые символы и нормализуем пробелы
  return mpn
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Невидимые символы
    .replace(/\u00A0/g, ' ')              // Non-breaking space
    .replace(/\s+/g, ' ')                 // Множественные пробелы
    .trim();
}

/**
 * Проверяет, является ли строка валидным MPN
 * @param {string} mpn Строка для проверки
 * @returns {boolean} true, если строка является валидным MPN
 */
export function isValidMpn(mpn) {
  if (!mpn || typeof mpn !== 'string') return false;

  // MPN обычно содержит буквы, цифры, дефисы и точки
  // и имеет длину от 3 до 30 символов
  return /^[A-Za-z0-9\-\.]{3,30}$/.test(mpn);
}

/**
 * Преобразует данные в каноническое представление
 * @param {object} data Исходные данные
 * @returns {object} Каноническое представление
 */
export function toCanon(data) {
  const mpn = normalizeMpn(data.mpn);

  return {
    id: data.id || generateId(),
    mpn,
    mpn_guess: data.mpn_guess || false,
    brand: (data.brand || '').trim(),
    title: (data.title || '').trim(),
    description: (data.desc_short || data.description || '').trim(),
    image_url: data.image_url || data.image || null,
    images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
    datasheets: Array.isArray(data.datasheets) ? data.datasheets.filter(Boolean) : [],
    package: (data.package || '').trim(),
    packaging: (data.packaging || '').trim(),
    offers: Array.isArray(data.offers) ? data.offers.map(normalizeOffer) : [],
    specs: data.specs || {},
    source: data.source || '',
    source_url: data.source_url || data.url || '',
    price_min_rub: calculateMinPrice(data.offers),
    regions: extractRegions(data.offers),
    stock_total: calculateTotalStock(data.offers),
    updated_at: new Date().toISOString()
  };
}

/**
 * Нормализует предложение (оффер)
 * @param {object} offer Исходное предложение
 * @returns {object} Нормализованное предложение
 */
function normalizeOffer(offer) {
  return {
    region: (offer.region || '').trim(),
    stock: typeof offer.stock === 'number' ? offer.stock : null,
    price_native: typeof offer.price_native === 'number' ? offer.price_native :
                 (typeof offer.price === 'number' ? offer.price : null),
    price_rub: typeof offer.price_rub === 'number' ? offer.price_rub : null,
    currency: (offer.currency || 'RUB').toUpperCase(),
    source: offer.source || '',
    url: offer.url || ''
  };
}

/**
 * Вычисляет минимальную цену в рублях
 * @param {Array} offers Массив предложений
 * @returns {number|null} Минимальная цена или null
 */
function calculateMinPrice(offers) {
  if (!Array.isArray(offers) || offers.length === 0) {
    return null;
  }

  const prices = offers
    .map(o => o.price_rub)
    .filter(p => typeof p === 'number' && p > 0);

  return prices.length > 0 ? Math.min(...prices) : null;
}

/**
 * Извлекает уникальные регионы из предложений
 * @param {Array} offers Массив предложений
 * @returns {Array} Массив уникальных регионов
 */
function extractRegions(offers) {
  if (!Array.isArray(offers)) {
    return [];
  }

  return [...new Set(offers.map(o => o.region).filter(Boolean))];
}

/**
 * Вычисляет общее количество товара
 * @param {Array} offers Массив предложений
 * @returns {number} Общее количество товара
 */
function calculateTotalStock(offers) {
  if (!Array.isArray(offers)) {
    return 0;
  }

  return offers
    .map(o => o.stock)
    .filter(s => typeof s === 'number')
    .reduce((sum, stock) => sum + stock, 0);
}
