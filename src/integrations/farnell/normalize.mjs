import { toRUB } from '../../currency/toRUB.mjs';

const clean = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\s+/g, ' ').trim();
};

const parseStock = (value) => {
  const numeric = Number(String(value || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const collectPriceBands = (prices) => {
  const buckets = [];
  if (Array.isArray(prices)) {
    buckets.push(...prices);
  }
  if (prices && Array.isArray(prices.priceBands)) {
    buckets.push(...prices.priceBands);
  }
  if (prices && Array.isArray(prices.pricing)) {
    buckets.push(...prices.pricing);
  }
  return buckets;
};

const parsePriceBand = (band) => {
  if (!band) {
    return null;
  }

  const currency = clean(band.currency || band.currencyCode || 'GBP') || 'GBP';
  const qty = Number(band.from || band.breakQuantity || band.quantity || 1);
  const price = Number(band.cost || band.price || band.unitPrice || band.breakPrice || NaN);
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
};

const evaluatePrice = (prices) => {
  const bands = collectPriceBands(prices).map(parsePriceBand).filter(Boolean);
  if (bands.length === 0) {
    return { bands, best: null };
  }

  const sorted = bands.slice().sort((a, b) => {
    const priceA = Number.isFinite(a.price_rub) ? a.price_rub : a.price;
    const priceB = Number.isFinite(b.price_rub) ? b.price_rub : b.price;
    return priceA - priceB;
  });

  return { bands, best: sorted[0] };
};

const truncate = (value, limit = 200) => {
  const text = clean(value);
  if (!text) {
    return '';
  }
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

export function normFarnell(product, region = 'uk.farnell.com') {
  const mpn = clean(
    product?.manufacturerPartNumber ||
    product?.manufacturerPartNo ||
    product?.translatedManufacturerPartNumber
  );

  if (!mpn) {
    return null;
  }

  const manufacturer = clean(
    product?.vendorName ||
    product?.brandName ||
    product?.manufacturer ||
    product?.translatedManufacturer
  );

  const description = clean(
    product?.displayName ||
    product?.summaryDescription ||
    product?.longDescription ||
    mpn
  );

  const { bands, best } = evaluatePrice(product?.prices || product?.priceBands || product?.pricing);
  const stock = parseStock(
    product?.stock?.level || product?.stockLevel || product?.inventory || product?.inv || product?.stock
  );

  const mainImage = product?.image?.baseName ? `https://${region}${product.image.baseName}` : '';
  const imageUrl = clean(mainImage || product?.imageUrl || '');

  const isUsRegion = region.includes('newark') || region.includes('element14');

  return {
    source: 'farnell',
    mpn,
    manufacturer,
    title: description || mpn,
    description_short: truncate(description),
    package: clean(product?.packSize || product?.package || product?.caseStyle),
    packaging: clean(product?.packaging),
    regions: [isUsRegion ? 'US' : 'EU'],
    stock: Number.isFinite(stock) ? stock : null,
    min_price: best ? best.price : null,
    min_currency: best ? best.currency : null,
    min_price_rub: best && Number.isFinite(best.price_rub) ? best.price_rub : null,
    image_url: imageUrl || null,
    datasheet_url: product?.datasheets?.[0]?.url || product?.datasheet?.url || null,
    product_url: clean(product?.productUrl || product?.translatedProductUrl || ''),
    price_breaks: bands
  };
}
