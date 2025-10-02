import { toRUB } from '../../currency/toRUB.mjs';
const clean=s=>(s||'').toString().replace(/\s+/g,' ').trim();
const toInt=s=>{const m=(s||'').replace(/\s/g,'').match(/\d[\d,\.]*/); if(!m) return null; const n=Number(m[0].replace(/[, ]/g,'')); return Number.isFinite(n)?n:null;};
const parseMoney=s=>{const t=(s||'').trim(); if(!t) return null; const cur=t.includes('€')?'EUR':(t.includes('£')?'GBP':'USD'); const m=t.match(/[\d.,]+/); if(!m) return null; const v=Number(m[0].replace(',', '.')); return Number.isFinite(v)?{v,cur}:null;};
const bestRub=(pbs=[])=>{const ps=pbs.map(pb=>parseMoney(pb.Price)).filter(Boolean); if(!ps.length) return null; const b=ps.sort((a,b)=>a.v-b.v)[0]; return toRUB(b.v,b.cur);};
export function normMouser(p){
  const mpn=clean(p.ManufacturerPartNumber), manufacturer=clean(p.Manufacturer||p.ManufacturerName);
  const minRub = bestRub(p.PriceBreaks||[]);
  return {
    _src:'mouser',
    _id: mpn || clean(p.MouserPartNumber||''),
    photo: clean(p.ImagePath||p.ImageURL||''),
    title: mpn || clean(p.Description),
    mpn, manufacturer,
    description: clean(p.Description),
    package: clean(p.Package),
    packaging: clean(p.Packaging),
    regions: ['US'],
    stock: toInt(clean(p.Availability)),
    minRub: Number.isFinite(minRub)?minRub:null,
    openUrl: `/product.html?src=mouser&id=${encodeURIComponent(mpn||'')}`,
    _raw:p
  };
}