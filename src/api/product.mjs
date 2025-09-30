import { mouserSearchByPartNumber } from '../integrations/mouser/client.mjs';
import { farnellByMPN } from '../integrations/farnell/client.mjs';
import { toRUB } from '../currency/toRUB.mjs';
import { readCachedProduct, cacheProduct } from '../db/sql.mjs';
import { appendFile, mkdir } from 'node:fs/promises';

const logTrace = (msg) => {
  const ts = Date.now();
  const line = `[${ts}] ${msg}\n`;
  mkdir('./_diag', { recursive: true }).then(() =>
    appendFile(`./_diag/trace-${Math.floor(ts/1000)}.log`, line, 'utf8')
  ).catch(() => {});
};

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
  const images = [];
  if(clean(p.ImagePath)) images.push(clean(p.ImagePath));
  if(clean(p.ImageURL) && clean(p.ImageURL) !== clean(p.ImagePath)) images.push(clean(p.ImageURL));

  return {
    photo: clean(p.ImagePath||p.ImageURL||''),
    images,
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
  const prod = arr.find(p => clean(p.translatedManufacturerPartNumber||p.manufacturerPartNumber||p.manufacturerPartNo).toUpperCase() === clean(targetMPN).toUpperCase()) || arr[0] || {};

  // Цены из Farnell - они в массиве prod.prices с полем cost
  const prices = Array.isArray(prod.prices) ? prod.prices : [];
  const minRub = (() => {
    const vals = prices.map(p => Number(p.cost || p.breakPrice || p.price || p.unitPrice)).filter(Number.isFinite);
    if(!vals.length) return null;
    return toRUB(vals.sort((a,b)=>a-b)[0], 'GBP');
  })();

  const specs = {}; (prod.attributes||[]).forEach(a=>{ const k=clean(a.attributeLabel||a.name); const v=clean(a.attributeValue||a.value); if(k && v) specs[k]=v; });

  const images = [];
  const mainImg = clean(prod.image ? `https://uk.farnell.com${prod.image.baseName}` : '');
  if(mainImg) images.push(mainImg);
  if(prod.images && prod.images.small && clean(prod.images.small) !== mainImg) images.push(clean(prod.images.small));
  if(prod.images && prod.images.medium && clean(prod.images.medium) !== mainImg) images.push(clean(prod.images.medium));

  return {
    photo: mainImg,
    images,
    mpn: clean(prod.translatedManufacturerPartNumber||prod.manufacturerPartNumber||prod.manufacturerPartNo),
    manufacturer: clean(prod.vendorName||prod.brandName||prod.manufacturer),
    description: clean(prod.displayName||prod.summaryDescription||prod.longDescription),
    minRub,
    datasheets: (prod.datasheets||[]).map(d=>clean(d.url||d)).filter(Boolean),
    specs,
    vendorUrl: clean(prod.productUrl || `https://uk.farnell.com/${prod.sku}`),
    source:'farnell'
  };
};

export default function mountProduct(app, { keys, db }){
  app.get('/api/product', (req,res)=>{
    const src = String(req.query.src||'').toLowerCase();
    const id  = String(req.query.id||'').trim();
    if(!src || !id){ res.status(400).json({ok:false,code:'bad_params'}); return; }

    const cached = readCachedProduct(db, src, id, TTL_PRODUCT_MS);
    if(cached){
      logTrace(`product src=${src} id="${id}" cached=1 photo=${cached.photo ? 'yes' : 'no'}`);
      res.json({ok:true, product: cached, meta:{cached:true}});
      return;
    }

    const MK=keys.mouser, FK=keys.farnell, FR=keys.farnellRegion;

    if(src==='mouser' && MK){
      mouserSearchByPartNumber({apiKey:MK, mpn:id})
        .then(r=>{
          const p=parseMouser(r&&r.data);
          cacheProduct(db, 'mouser', id, p);
          logTrace(`product src=${src} id="${id}" cached=0 photo=${p.photo ? 'yes' : 'no'}`);
          res.json({ok:true,product:p});
        })
        .catch(()=>{
          logTrace(`product src=${src} id="${id}" cached=0 error=1`);
          res.status(502).json({ok:false,code:'mouser_unreachable'});
        });
      return;
    }
    if(src==='farnell' && FK){
      farnellByMPN({apiKey:FK, region:FR, q:id, limit:1})
        .then(r=>{
          const p=parseFarnell(r&&r.data, id, FR);
          cacheProduct(db, 'farnell', id, p);
          logTrace(`product src=${src} id="${id}" cached=0 photo=${p.photo ? 'yes' : 'no'}`);
          res.json({ok:true,product:p});
        })
        .catch(()=>{
          logTrace(`product src=${src} id="${id}" cached=0 error=1`);
          res.status(502).json({ok:false,code:'farnell_unreachable'});
        });
      return;
    }
    res.status(400).json({ok:false,code:'unsupported_source'});
  });
}
