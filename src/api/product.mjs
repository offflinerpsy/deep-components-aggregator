import { mouserSearchByPartNumber } from '../integrations/mouser/client.mjs';
import { farnellByMPN } from '../integrations/farnell/client.mjs';
import { toRUB } from '../currency/toRUB.mjs';

const clean = s => (s||'').toString().trim();
const pick = (o,k,d)=> (o && o[k]!=null ? o[k] : d);

const parseMouser = (data) => {
  const p = (data?.SearchResults?.Parts||[])[0] || {};
  const mfg = clean(p.Manufacturer || p.ManufacturerName);
  const mpn = clean(p.ManufacturerPartNumber);
  const desc = clean(p.Description);
  const img = clean(p.ImagePath || p.ImageURL || '');
  const url = clean(p.ProductDetailUrl || p.ProductDetailPageURL || '');
  const priceBreaks = Array.isArray(p.PriceBreaks) ? p.PriceBreaks : [];
  const prices = priceBreaks.map(pb => clean(pb.Price)).filter(Boolean);
  const minRub = (() => {
    const nums = prices.map(x => Number((x.match(/[\d.,]+/)||[''])[0].replace(',', '.'))).filter(Number.isFinite);
    if(!nums.length) return null;
    return toRUB(nums.sort((a,b)=>a-b)[0], (prices.join('').includes('€')?'EUR':(prices.join('').includes('£')?'GBP':'USD')));
  })();
  const datasheets = [ clean(p.DataSheetUrl||p.DataSheetURL||'') ].filter(Boolean);
  // Mouser specs в Search API ограничены: берём «атрибуты», если пришли (иногда бывают)
  const specs = {};
  const attrs = p.Attributes || p.ProductAttributes || [];
  for (const a of attrs) { const k = clean(a.Name||a.attributeName); const v = clean(a.Value||a.attributeValue); if(k && v) specs[k]=v; }
  return { photo: img, mpn, manufacturer: mfg, description: desc, minRub, datasheets, specs, vendorUrl: url, source:'mouser' };
};

const parseFarnell = (resp) => {
  const prod = (resp?.products || resp?.manufacturerPartNumberSearchReturn?.products || [])[0] || {};
  const mfg = clean(prod.vendorName||prod.brandName||prod.manufacturer);
  const mpn = clean(prod.manufacturerPartNumber || prod.manufacturerPartNo || prod.translatedManufacturerPartNumber);
  const desc = clean(prod.displayName || prod.summaryDescription || prod.longDescription);
  const img = clean((prod.images&&(prod.images.medium||prod.images.small||prod.image))||'');
  const url = clean(prod.productUrl || prod.rohsCompliantProductUrl || prod.productDetailUrl || '');
  const bands = (prod.prices && prod.prices.priceBands) || prod.priceBands || [];
  const minRub = (() => {
    const vals = bands.map(b => Number(b.breakPrice || b.price || b.unitPrice)).filter(Number.isFinite);
    if(!vals.length) return null;
    const cur = (bands[0]?.currency || bands[0]?.currencyCode || 'USD').toUpperCase();
    return toRUB(vals.sort((a,b)=>a-b)[0], cur);
  })();
  const datasheets = (prod.datasheets||[]).map(d => clean(d.url || d)).filter(Boolean);
  const specs = {};
  const attrs = prod.attributes || [];
  for (const a of attrs) { const k = clean(a.attributeLabel||a.name); const v = clean(a.attributeValue||a.value); if(k && v) specs[k]=v; }
  return { photo: img, mpn, manufacturer: mfg, description: desc, minRub, datasheets, specs, vendorUrl: url, source:'farnell' };
};

export default function mountProduct(app, { keys }){
  app.get('/api/product', (req,res)=>{
    const src = String(req.query.src||'').toLowerCase();
    const id  = String(req.query.id||'').trim(); // mpn
    const MK=process.env.MOUSER_API_KEY || keys?.mouser || '';
    const FK=process.env.FARNELL_API_KEY || keys?.farnell || '';
    const FR=process.env.FARNELL_REGION   || keys?.farnellRegion || 'uk.farnell.com';
    if(!src || !id){ res.status(400).json({ok:false,code:'bad_params'}); return; }

    if(src==='mouser' && MK){
      mouserSearchByPartNumber({apiKey:MK, mpn:id})
        .then(r=> res.json({ok:true, product: parseMouser(r?.data)}))
        .catch(()=>res.status(502).json({ok:false,code:'mouser_unreachable'}));
      return;
    }
    if(src==='farnell' && FK){
      farnellByMPN({apiKey:FK, region:FR, q:id, limit:1})
        .then(r=> res.json({ok:true, product: parseFarnell(r?.data)}))
        .catch(()=>res.status(502).json({ok:false,code:'farnell_unreachable'}));
      return;
    }
    res.status(400).json({ok:false,code:'unsupported_source'});
  });
}
