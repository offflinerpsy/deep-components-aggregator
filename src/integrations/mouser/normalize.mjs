import { toRUB } from '../../currency/toRUB.mjs';
const clean = (s) => (s || '').toString().replace(/\s+/g,' ').trim();
const toInt = (s) => { const m=(s||'').replace(/\s/g,'').match(/\d[\d,\.]*/); if(!m) return null; const n=Number(m[0].replace(/[, ]/g,'')); return Number.isFinite(n)?n:null; };
const parseMoney = (s) => { const str=(s||'').trim(); if(!str) return null; const cur=str.includes('$')?'USD':(str.includes('€')?'EUR':(str.includes('£')?'GBP':'USD')); const m=str.match(/[\d.,]+/); if(!m) return null; const val=Number(m[0].replace(',', '.')); return Number.isFinite(val)?{value:val,currency:cur}:null; };
const bestPriceRub = (pbs=[]) => { const ps=pbs.map(pb=>parseMoney(pb.Price)).filter(Boolean); if(!ps.length) return null; const best=ps.sort((a,b)=>a.value-b.value)[0]; return toRUB(best.value, best.currency||'USD'); };

export function normalizeMouserPart(p) {
  const mpn = clean(p.ManufacturerPartNumber);
  const manufacturer = clean(p.Manufacturer || p.ManufacturerName);
  const description = clean(p.Description);
  const pkg = clean(p.Package);
  const packaging = clean(p.Packaging);
  const availability = clean(p.Availability);
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
    regions: ['US'],
    stock,
    minRub: Number.isFinite(minRub) ? minRub : null,
    openUrl: clean(p.ProductDetailUrl || p.ProductDetailPageURL || ''),
    _raw: p
  };
}
