import { create, insertMultiple, search } from '@orama/orama';
let db;
export async function buildIndex(items){
  db = await create({
    schema: { mpn: 'string', brand: 'string', title: 'string', desc: 'string', regions: 'string[]', price: 'number', image: 'string' }
  });
  await insertMultiple(db, items.map(p=>({
    mpn: p.mpn, brand: p.brand, title: p.title,
    desc: p.desc_short || '',
    regions: p.regions || [],
    price: p.price_min_rub ?? Number.MAX_SAFE_INTEGER,
    image: p.image || ''
  })));
  return db;
}
export async function searchIndex(q, { limit=50 }={}){
  if (!db) throw new Error('INDEX_NOT_READY');
  return await search(db, { term: q, limit });
}
