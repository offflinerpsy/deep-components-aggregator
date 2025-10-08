import { toRUB } from '../../currency/toRUB.mjs';

const clean = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\s+/g, ' ').trim();
};

const parseStock = (value) => {
  const text = clean(value);
  if (!text) {
    return null;
  }
  const match = text.replace(/[,\s]/g, '').match(/\d+/);
  if (!match) {
    return null;
  }
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
};

const detectCurrency = (text) => {
  if (text.includes('€')) {
    return 'EUR';
  }
  if (text.includes('£')) {
    return 'GBP';
  }
  if (text.includes('zł')) {
    return 'PLN';
  }
  return 'USD';
};

const parsePriceBreak = (priceBreak) => {
  if (!priceBreak) {
    return null;
  }

  const priceText = clean(priceBreak.Price || priceBreak.price);
  const quantity = Number(priceBreak.Quantity || priceBreak.quantity || 1);
  if (!priceText) {
    return null;
  }

  const valueMatch = priceText.match(/[\d.,]+/);
  if (!valueMatch) {
    return null;
  }

  const currency = detectCurrency(priceText);
  const price = Number(valueMatch[0].replace(',', '.'));
  if (!Number.isFinite(price)) {
    return null;
  }

  const priceRub = toRUB(price, currency);

  return {
    qty: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    price,
    currency,
    price_rub: Number.isFinite(priceRub) ? priceRub : null
  };
};

const bestPriceBreak = (priceBreaks) => {
  const entries = (priceBreaks || []).map(parsePriceBreak).filter(Boolean);
  if (entries.length === 0) {
    return { entries, best: null };
  }

  const sorted = entries.slice().sort((a, b) => {
    const priceA = Number.isFinite(a.price_rub) ? a.price_rub : a.price;
    const priceB = Number.isFinite(b.price_rub) ? b.price_rub : b.price;
    return priceA - priceB;
  });

  return { entries, best: sorted[0] };
};

const truncate = (value, limit = 200) => {
  const text = clean(value);
  if (!text) {
    return '';
  }
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

export function normMouser(part) {
  const mpn = clean(part?.ManufacturerPartNumber || part?.MouserPartNumber);
  if (!mpn) {
    return null;
  }

  const manufacturer = clean(part?.Manufacturer || part?.ManufacturerName);
  const description = clean(part?.Description || part?.DetailedDescription || mpn);
  const { entries, best } = bestPriceBreak(part?.PriceBreaks || []);
  const stock = parseStock(part?.Availability) ?? parseStock(part?.AvailabilityInStock);

  return {
    source: 'mouser',
    mpn,
    manufacturer,
    title: description || mpn,
    description_short: truncate(description),
    package: clean(part?.Package),
    packaging: clean(part?.Packaging),
    regions: ['US'],
    stock: Number.isFinite(stock) ? stock : null,
    min_price: best ? best.price : null,
    min_currency: best ? best.currency : null,
    min_price_rub: best && Number.isFinite(best.price_rub) ? best.price_rub : null,
    image_url: clean(part?.ImagePath || part?.ImageURL) || null,
    datasheet_url: clean(part?.DataSheetUrl || part?.DatasheetUrl) || null,
    product_url: clean(part?.ProductDetailUrl || ''),
    price_breaks: entries
  };
}
