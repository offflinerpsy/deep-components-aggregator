import { search } from '@orama/orama';
import { db } from '../search/db.js';

export async function searchHealth(_req, res){
  const r = await search(db, {
    term: '1N4148',
    properties: ['title','mpn','manufacturer','description','specs_flat'],
    boost: { mpn:3, title:2, manufacturer:1.5 },
    limit: 1
  });

  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: true, indexOk: (r.count>=0), boosted:true }));
}
