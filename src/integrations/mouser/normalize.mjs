import { toRUB } from '../../currency/toRUB.mjs';
const clean=s=>(s||'').toString().replace(/\s+/g,' ').trim();
const toInt=s=>{const m=(s||'').replace(/\s/g,'').match(/\d[\d,\.]*/); if(!m) return null; const n=Number(m[0].replace(/[, ]/g,'')); return Number.isFinite(n)?n:null;};
const parseMoney=s=>{const t=(s||'').trim(); if(!t) return null; const cur=t.includes('$')?'USD':(t.includes('€')?'EUR':(t.includes('£')?'GBP':'USD')); const m=t.match(/[\d.,]+/); if(!m) return null; const v=Number(m[0].replace(',', '.')); return Number.isFinite(v)?{value:v,currency:cur}:null;};
const bestRub=(pbs=[])=>{const ps=pbs.map(pb=>parseMoney(pb.Price)).filter(Boolean); if(!ps.length) return null; const b=ps.sort((a,b)=>a.value-b.value)[0]; return toRUB(b.value,b.currency||'USD');};
export function normMouser(p){
  const mpn=clean(p.ManufacturerPartNumber), manufacturer=clean(p.Manufacturer||p.ManufacturerName);
  const desc=clean(p.Description);
  const minRub = bestRub(p.PriceBreaks||[]);
  return {
    photo: clean(p.ImagePath||p.ImageURL||''),
    title: mpn || desc,
    mpn, manufacturer,
    description: desc,
    package: clean(p.Package),
    packaging: clean(p.Packaging),
    regions: ['US'],
    stock: toInt(clean(p.Availability)),
    minRub: Number.isFinite(minRub)?minRub:null,
    openUrl: clean(p.ProductDetailUrl||p.ProductDetailPageURL||''),
    _raw:p
  };
}