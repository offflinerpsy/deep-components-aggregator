import { mouserSearchByKeyword, mouserSearchByPartNumber } from '../integrations/mouser/client.mjs';
import { normMouser } from '../integrations/mouser/normalize.mjs';
import { farnellByMPN, farnellByKeyword } from '../integrations/farnell/client.mjs';
import { normFarnell } from '../integrations/farnell/normalize.mjs';
import { toRUB } from '../currency/toRUB.mjs';
import { readCachedSearch, cacheSearch } from '../db/sql.mjs';

const TTL_SEARCH_MS = 7*24*60*60*1000;

const isCyrillic = s => /[А-Яа-яЁё]/.test(s);
const isLikelyMPN = s => /^[A-Za-z0-9][A-Za-z0-9\-\._]{1,}$/i.test(s) && /\d/.test(s);

export default function mountSearch(app, { keys, db }){
  app.get('/api/search', (req,res)=>{
    const q = String(req.query.q||'').trim();
    if(!q){ res.json({ok:true,q,rows:[],meta:{source:'none',total:0}}); return; }

    // 1) КЭШ
    const cached = readCachedSearch(db, q.toLowerCase(), TTL_SEARCH_MS);
    if(cached){ res.json({ok:true,q,rows:cached.rows,meta:cached.meta}); return; }

    // 2) LIVE: стратегия — Mouser primary (если латиница), Farnell fallback; для кириллицы → Farnell keyword
    const MK = keys.mouser; const FK = keys.farnell; const FR = keys.farnellRegion;

    const useMouser = !isCyrillic(q) && !!MK;
    const useFarnellFirst = isCyrillic(q) && !!FK;

    const work = useFarnellFirst
      ? farnellByKeyword({apiKey:FK, region:FR, q}).then(r=>{
          const products = (r && r.data && (r.data.products||[])) || [];
          const rows = products.map(p=>normFarnell(p, FR));
          cacheSearch(db, q.toLowerCase(), rows, {source:'farnell'});
          res.json({ok:true,q,rows,meta:{source:'farnell',total:rows.length}});
        }).catch(()=> res.json({ok:true,q,rows:[],meta:{source:'farnell',total:0}}))
      : (isLikelyMPN(q) && MK
          ? mouserSearchByPartNumber({apiKey:MK, mpn:q}).then(r=>{
              const parts = (r && r.data && r.data.SearchResults && r.data.SearchResults.Parts) || [];
              const rows = parts.map(normMouser);
              if(rows.length){
                cacheSearch(db, q.toLowerCase(), rows, {source:'mouser'});
                res.json({ok:true,q,rows,meta:{source:'mouser',total:rows.length}}); return;
              }
              if(FK){
                return farnellByMPN({apiKey:FK, region:FR, q, limit:20}).then(fr=>{
                  const items = (fr && fr.data && (fr.data.products || (fr.data.manufacturerPartNumberSearchReturn && fr.data.manufacturerPartNumberSearchReturn.products) || [])) || [];
                  const rows2 = items.map(p=>normFarnell(p, FR));
                  cacheSearch(db, q.toLowerCase(), rows2, {source:'farnell'});
                  res.json({ok:true,q,rows:rows2,meta:{source:'farnell',total:rows2.length}});
                });
              }
              res.json({ok:true,q,rows:[],meta:{source:'mouser',total:0}});
            })
          : mouserSearchByKeyword({apiKey:MK, q}).then(r=>{
              const parts = (r && r.data && r.data.SearchResults && r.data.SearchResults.Parts) || [];
              const rows = parts.map(normMouser);
              if(rows.length){
                cacheSearch(db, q.toLowerCase(), rows, {source:'mouser'});
                res.json({ok:true,q,rows,meta:{source:'mouser',total:rows.length}}); return;
              }
              if(FK){
                return farnellByKeyword({apiKey:FK, region:FR, q}).then(fr=>{
                  const products = (fr && fr.data && (fr.data.products||[])) || [];
                  const rows2 = products.map(p=>normFarnell(p, FR));
                  cacheSearch(db, q.toLowerCase(), rows2, {source:'farnell'});
                  res.json({ok:true,q,rows:rows2,meta:{source:'farnell',total:rows2.length}});
                });
              }
              res.json({ok:true,q,rows:[],meta:{source:'mouser',total:0}});
            })
        );
  });
}