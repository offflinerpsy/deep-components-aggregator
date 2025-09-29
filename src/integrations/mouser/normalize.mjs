// Канон полей таблицы: photo | MPN/Title | Manufacturer | Description | Package | Packaging | Regions | Stock | Min ₽ | Open
import { toRUB } from '../../currency/toRUB.mjs';

const clean = (s) => (s || '').toString().replace(/\s+/g,' ').trim();
const toInt = (s) => {
  const m = (s || '').toString().replace(/\s/g,'').match(/\d[\d,\.]*/);
  if (!m) return null;
  const n = Number(m[0].replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const parseMoney = (s) => {
  // Mouser присылает прайсы как строки с символом валюты, например "$0.12" или "€0.10".
  // Возвращаем { value:number, currency:'USD|EUR|...' }.
  const str = (s || '').toString().trim();
  if (!str) return null;
  // простая эвристика определения валюты:
  const cur = str.includes('$') ? 'USD' : (str.includes('€') ? 'EUR' : (str.includes('£') ? 'GBP' : 'USD'));
  const m = str.match(/[\d.,]+/);
  if (!m) return null;
  const val = Number(m[0].replace(',', '.'));
  return Number.isFinite(val) ? { value: val, currency: cur } : null;
};

const bestPriceRub = (priceBreaks = []) => {
  // priceBreaks: [{ Quantity, Price }, ...] — выбираем минимальную цену/ед.
  const parsed = priceBreaks.map(pb => parseMoney(pb.Price)).filter(Boolean);
  if (!parsed.length) return null;
  const best = parsed.sort((a,b) => a.value - b.value)[0];
  return toRUB(best.value, best.currency || 'USD'); // конвертируем в ₽ локально
};

export function normalizeMouserPart(p) {
  // Поля соответствуют списку «What data is available?» на странице Search API.
  const mpn = clean(p.ManufacturerPartNumber);
  const manufacturer = clean(p.Manufacturer || p.ManufacturerName);
  const description = clean(p.Description);
  const pkg = clean(p.Package);
  const packaging = clean(p.Packaging);
  const availability = clean(p.Availability);      // например: "1,234 In Stock"
  const stock = toInt(availability);
  const minRub = bestPriceRub(p.PriceBreaks || []);

  return {
    photo: clean(p.ImagePath || p.ImageURL || ''),
    title: mpn || description,
    mpn,
    manufacturer,
    description,
    package: pkg,
    packaging,
    regions: ['US'], // Mouser — глобальный дистрибьютор; для нашей таблицы фиксируем 'US'.
    stock,
    minRub: (typeof minRub === 'number' && Number.isFinite(minRub)) ? minRub : null,
    openUrl: clean(p.ProductDetailUrl || p.ProductDetailPageURL || ''),
    _raw: p, // диагностический хвост (не рендерим в UI)
  };
}
