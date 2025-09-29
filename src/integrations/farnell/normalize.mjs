import { toRUB } from '../../currency/toRUB.mjs';
const clean=s=>(s||'').toString().replace(/\s+/g,' ').trim();
const toInt=v=>{const n=Number(String(v).replace(/[^\d.]/g,'')); return Number.isFinite(n)?n:null;};
function bestRub(prices){
  const packs=[]; if(Array.isArray(prices)) packs.push(...prices);
  if(prices && Array.isArray(prices.priceBands)) packs.push(...prices.priceBands);
  const ps=packs.map(p=>{const c=(p.currency||p.currencyCode||'USD').toUpperCase(); const v=Number(p.breakPrice||p.price||p.unitPrice||p.cost||NaN); return Number.isFinite(v)?{v,c}:null;}).filter(Boolean);
  if(!ps.length) return null; const b=ps.sort((a,b)=>a.v-b.v)[0]; return toRUB(b.v,b.c);
}
export function normFarnell(prod, region='uk.farnell.com'){
  const mpn=clean(prod.manufacturerPartNumber||prod.manufacturerPartNo||prod.translatedManufacturerPartNumber);
  const manufacturer=clean(prod.vendorName||prod.brandName||prod.manufacturer||prod.translatedManufacturer);
  const desc=clean(prod.displayName||prod.summaryDescription||prod.longDescription);
  const pkg=clean(prod.packSize||prod.packaging||prod.package||prod.caseStyle);
  const availability=prod.stock && prod.stock.level ? String(prod.stock.level) : (prod.stockLevel||prod.inventory||'');
  const stock=toInt(availability);
  const minRub=bestRub(prod.prices||prod.priceBands||prod.pricing);
  const image=clean((prod.images&&(prod.images.medium||prod.images.small||prod.image))||'');
  const url=`/product.html?src=farnell&id=${encodeURIComponent(mpn||'')}`;
  return {
    _src:'farnell',
    _id: mpn,
    photo:image,
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