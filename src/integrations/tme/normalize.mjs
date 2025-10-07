import { toRUB } from '../../currency/toRUB.mjs';

const clean = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\s+/g, ' ').trim();
};

const parsePriceList = (list) => {
  return (Array.isArray(list) ? list : []).map((item) => {
    const qty = Number(item.Amount || item.Quantity || 1);
    const price = Number(item.PriceValue || item.Price || item.UnitPrice || NaN);
    const currency = clean(item.PriceCurrency || item.Currency || 'EUR') || 'EUR';
    if (!Number.isFinite(price)) {
      return null;
    }
    const priceRub = toRUB(price, currency);
    return {
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      price,
      currency,
      price_rub: Number.isFinite(priceRub) ? priceRub : null
    };
  }).filter(Boolean);
};

const selectBestPrice = (prices) => {
  if (prices.length === 0) {
    return null;
  }
  const sorted = prices.slice().sort((a, b) => {
    const priceA = Number.isFinite(a.price_rub) ? a.price_rub : a.price;
    const priceB = Number.isFinite(b.price_rub) ? b.price_rub : b.price;
    return priceA - priceB;
  });
  return sorted[0];
};

const truncate = (value, limit = 200) => {
  const text = clean(value);
  if (!text) {
    return '';
  }
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

export function normTME(product) {
  const mpn = clean(product?.OriginalSymbol || product?.Symbol);
  if (!mpn) {
    return null;
  }

  const manufacturer = clean(product?.Producer);
  const description = clean(product?.Description || product?.AdditionalDescription || mpn);
  const priceBreaks = parsePriceList(product?.PriceList);
  const best = selectBestPrice(priceBreaks);
  const stock = Number(product?.InStock || product?.Quantity || 0);
  const baseUrl = mpn ? `https://www.tme.eu/en/details/${encodeURIComponent(mpn)}/` : '';

  return {
    source: 'tme',
    mpn,
    manufacturer,
    title: description || mpn,
    description_short: truncate(description),
    package: clean(product?.Case || product?.Package),
    packaging: '',
    regions: ['EU'],
    stock: Number.isFinite(stock) ? stock : null,
    min_price: best ? best.price : null,
    min_currency: best ? best.currency : null,
    min_price_rub: best && Number.isFinite(best.price_rub) ? best.price_rub : null,
    image_url: product?.Photo ? `https://www.tme.eu${product.Photo}` : null,
    product_url: baseUrl,
    price_breaks: priceBreaks
  };
}
