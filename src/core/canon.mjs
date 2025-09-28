/**
 * Нормализует каноническое представление продукта
 * @param {object} o Исходный объект с данными продукта
 * @returns {object} Нормализованное представление продукта
 */
export function normCanon(o){
  // Вычисляем минимальную цену в рублях
  const price_min_rub = computeMinRub(o.offers||[]);
  
  // Находим минимальную цену и ее валюту
  let price_min = null;
  let price_min_currency = null;
  
  if (o.offers && o.offers.length > 0) {
    // Сортируем предложения по цене
    const sortedOffers = [...o.offers].sort((a, b) => {
      if (!a.price) return 1;
      if (!b.price) return -1;
      return a.price - b.price;
    });
    
    // Берем минимальную цену и ее валюту
    if (sortedOffers[0] && sortedOffers[0].price) {
      price_min = sortedOffers[0].price;
      price_min_currency = sortedOffers[0].currency;
    }
  }
  
  return {
    mpn: o.mpn || '',
    brand: o.brand || '',
    title: o.title || '',
    sku: o.sku || '',
    url: o.url || '',
    image: o.image || null,
    images: o.images || [],
    desc_short: o.desc_short || '',
    regions: Array.from(new Set((o.offers||[]).map(x=>x.region))).filter(Boolean),
    offers: o.offers || [],
    docs: o.docs || [],
    specs: o.specs || {},
    stock_total: typeof o.stock_total === 'number' ? o.stock_total : null,
    source: o.source || '',
    price_min,
    price_min_currency,
    price_min_rub,
    pkg: o.pkg || null,
    pkg_type: o.pkg_type || null
  };
}

/**
 * Вычисляет минимальную цену в рублях из списка предложений
 * @param {Array} offers Список предложений
 * @returns {number|null} Минимальная цена в рублях или null
 */
function computeMinRub(offers){
  const rubs = offers.filter(x=>x.currency==='RUB').map(x=>x.price).filter(Number.isFinite);
  return rubs.length ? Math.min(...rubs) : null;
}