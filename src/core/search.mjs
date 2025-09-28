import { create, insertMultiple, search } from '@orama/orama';
let db;
let sourceItems = [];
export async function buildIndex(items){
  sourceItems = items || [];
  db = await create({
    schema: { mpn: 'string', brand: 'string', title: 'string', desc: 'string', regions: 'string[]', price: 'number', image: 'string', sku: 'string' }
  });
  await insertMultiple(db, sourceItems.map(p=>({
    mpn: p.mpn, brand: p.brand, title: p.title,
    desc: p.desc_short || '',
    regions: p.regions || [],
    price: p.price_min_rub ?? Number.MAX_SAFE_INTEGER,
    image: p.image || '',
    sku: p.sku || ''
  })));
  return db;
}
export async function searchIndex(q, { limit=50 }={}){
  if (!db) throw new Error('INDEX_NOT_READY');
  const term = String(q||'').trim();
  const lc = term.toLowerCase();
  const exact = sourceItems.filter(p=> (p.mpn||'').toLowerCase()===lc || (p.sku||'').toLowerCase()===lc);
  const exactDocs = exact.map(p=>({ mpn:p.mpn, brand:p.brand, title:p.title, desc:p.desc_short||'', regions:p.regions||[], price:p.price_min_rub ?? Number.MAX_SAFE_INTEGER, image:p.image||'' }));
  const r = await search(db, { term, limit });
  const rest = r.hits.map(h=>h.document).filter(d=> !exactDocs.find(e=>e.mpn===d.mpn));
  const merged = [...exactDocs, ...rest].slice(0, limit);
  return { hits: merged.map(d=>({ document:d })) };
}
