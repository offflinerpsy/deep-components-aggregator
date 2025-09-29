import { toRUB } from '../../currency/toRUB.mjs';
const clean=s=>(s||'').toString().replace(/\s+/g,' ').trim();
const toInt = v => { const n = Number(String(v).replace(/[^\d.]/g,'')); return Number.isFinite(n)?n:null; };

function bestRub(prices){
  // Farnell может отдавать разные структуры (priceBands/prices). Берем минимальную цену/валюту.
  const packs = [];
  if (Array.isArray(prices)) packs.push(...prices);
  if (prices && Array.isArray(prices.priceBands)) packs.push(...prices.priceBands);
  const parsed = packs.map(p=>{
    const cur = (p.currency||p.currencyCode||'USD').toUpperCase();
    const val = Number(p.breakPrice||p.price||p.cost||p.unitPrice||NaN);
    return Number.isFinite(val)?{val,c:cur}:null;
  }).filter(Boolean);
  if (!parsed.length) return null;
  const best = parsed.sort((a,b)=>a.val-b.val)[0];
  return toRUB(best.val, best.c);
}

export function normFarnell(prod, region='uk.farnell.com'){
  const mpn = clean(prod.manufacturerPartNumber || prod.manufacturerPartNo || prod.translatedManufacturerPartNumber);
  const manufacturer = clean(prod.vendorName || prod.brandName || prod.manufacturer || prod.translatedManufacturer);
  const desc = clean(prod.displayName || prod.summaryDescription || prod.longDescription);
  const pkg = clean(prod.packSize || prod.packaging || prod.package || prod.caseStyle);
  const availability = prod.stock && prod.stock.level ? String(prod.stock.level) : (prod.stockLevel || prod.inventory || '');
  const stock = toInt(availability);
  const minRub = bestRub(prod.prices || prod.priceBands || prod.pricing);
  const image = clean((prod.images && (prod.images.medium || prod.images.small || prod.image)) || '');
  const url = clean(prod.productUrl || prod.rohsCompliantProductUrl || prod.productDetailUrl || '');

  return {
    photo: image,
    title: mpn || desc,
    mpn, manufacturer,
    description: desc,
    package: pkg,
    packaging: clean(prod.packaging||''),
    regions: [ region.includes('newark') ? 'US' : 'EU' ],
    stock,
    minRub: Number.isFinite(minRub)?minRub:null,
    openUrl: url,
    _raw: prod
  };
}
