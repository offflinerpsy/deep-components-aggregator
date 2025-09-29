import { mouserSearchByPartNumber } from '../integrations/mouser/client.mjs';
import { farnellByMPN } from '../integrations/farnell/client.mjs';
import { toRUB } from '../currency/toRUB.mjs';
import { readCachedProduct, cacheProduct } from '../db/sql.mjs';

const TTL_PRODUCT_MS = 30*24*60*60*1000;

const clean = s => (s||'').toString().trim();

const parseMouser = (data) => {
  const p = (data && data.SearchResults && (data.SearchResults.Parts||[])[0]) || {};
  const priceBreaks = Array.isArray(p.PriceBreaks) ? p.PriceBreaks : [];
  const prices = priceBreaks.map(pb => clean(pb.Price)).filter(Boolean);
  const minRub = (() => {
    const nums = prices.map(x => Number((x.match(/[\d.,]+/)||[''])[0].replace(',', '.'))).filter(Number.isFinite);
    if(!nums.length) return null;
    const cur = prices.join('').includes('€')?'EUR':(prices.join('').includes('£')?'GBP':'USD');
    return toRUB(nums.sort((a,b)=>a.v-b.v)[0], cur);
  })();
  const attrs = p.Attributes || p.ProductAttributes || [];
  const specs = {}; for (const a of attrs){ const k=clean(a.Name||a.attributeName); const v=clean(a.Value||a.attributeValue); if(k && v) specs[k]=v; }
  return {
    photo: clean(p.ImagePath||p.ImageURL||''),
    mpn: clean(p.ManufacturerPartNumber),
    manufacturer: clean(p.Manufacturer || p.ManufacturerName),
    description: clean(p.Description),
    minRub,
    datasheets: [ clean(p.DataSheetUrl||p.DataSheetURL||'') ].filter(Boolean),
    specs,
    vendorUrl: clean(p.ProductDetailUrl || p.ProductDetailPageURL || ''),
    source:'mouser'
  };
};

const parseFarnell = (resp, targetMPN, region) => {
  const arr = (resp && (resp.products || (resp.manufacturerPartNumberSearchReturn && resp.manufacturerPartNumberSearchReturn.products) || [])) || [];
  const prod = arr.find(p => clean(p.manufacturerPartNumber||p.manufacturerPartNo).toUpperCase() === clean(targetMPN).toUpperCase()) || arr[0] || {};
  const bands = (prod.prices && prod.prices.priceBands) || prod.priceBands || [];
  const ps = bands.map(b => ({v:Number(b.breakPrice||b.price||b.unitPrice), c:String(b.currency||b.currencyCode||'GBP').toUpperCase()})).filter(x=>Number.isFinite(x.v));
  const minRub = ps.length ? toRUB(ps.sort((a,b)=>a.v-b.v)[0].v, ps[0].c) : null;
  const specs = {}; (prod.attributes||[]).forEach(a=>{ const k=clean(a.attributeLabel||a.name); const v=clean(a.attributeValue||a.value); if(k && v) specs[k]=v; });
  const image = (prod.images && (prod.images.medium||prod.images.small||prod.image)) || '';
  const url = prod.productUrl || prod.rohsCompliantProductUrl || prod.productDetailUrl || '';
  return {
    photo: clean(image),
    mpn: clean(prod.manufacturerPartNumber||prod.manufacturerPartNo),
    manufacturer: clean(prod.vendorName||prod.brandName||prod.manufacturer),
    description: clean(prod.displayName||prod.summaryDescription||prod.longDescription),
    minRub,
    datasheets: (prod.datasheets||[]).map(d=>clean(d.url||d)).filter(Boolean),
    specs,
    vendorUrl: clean(url),
    source:'farnell'
  };
};

export default function mountProduct(app, { keys, db }){
  app.get('/api/product', (req,res)=>{
    const src = String(req.query.src||'').toLowerCase();
    const id  = String(req.query.id||'').trim();
    if(!src || !id){ res.status(400).json({ok:false,code:'bad_params'}); return; }

    const cached = readCachedProduct(db, src, id, TTL_PRODUCT_MS);
    if(cached){ res.json({ok:true, product: cached, meta:{cached:true}}); return; }

    const MK=keys.mouser, FK=keys.farnell, FR=keys.farnellRegion;

    if(src==='mouser' && MK){
      mouserSearchByPartNumber({apiKey:MK, mpn:id})
        .then(r=>{ const p=parseMouser(r&&r.data); cacheProduct(db, 'mouser', id, p); res.json({ok:true,product:p}); })
        .catch(()=>res.status(502).json({ok:false,code:'mouser_unreachable'}));
      return;
    }
    if(src==='farnell' && FK){
      farnellByMPN({apiKey:FK, region:FR, q:id, limit:1})
        .then(r=>{ const p=parseFarnell(r&&r.data, id, FR); cacheProduct(db, 'farnell', id, p); res.json({ok:true,product:p}); })
        .catch(()=>res.status(502).json({ok:false,code:'farnell_unreachable'}));
      return;
    }
    res.status(400).json({ok:false,code:'unsupported_source'});
  });
}