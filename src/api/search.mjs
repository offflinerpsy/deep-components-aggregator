import { mouserSearchByKeyword, mouserSearchByPartNumber } from '../integrations/mouser/client.mjs';
import { normMouser } from '../integrations/mouser/normalize.mjs';
import { farnellByMPN, farnellByKeyword } from '../integrations/farnell/client.mjs';
import { normFarnell } from '../integrations/farnell/normalize.mjs';
import { toCanonRow } from '../core/canon.mjs';

const isMPN = q => { const s=q.trim(); return !!(s && !/\s/.test(s) && /[A-Za-z]/.test(s) && /\d/.test(s) && s.length>=3 && s.length<=40); };
const uniqBy = (arr, key) => { const seen = new Set(); const out=[]; for(const x of arr){ const k=key(x); if(!seen.has(k)){ seen.add(k); out.push(x); } } return out; };

export default function mount(app, { keys }){
  app.get('/api/search', (req,res)=>{
    const q=String(req.query.q||'').trim();
    if(!q){ res.status(400).json({ok:false,code:'bad_q'}); return; }
    const MK=process.env.MOUSER_API_KEY||keys?.mouser||'';
    const FK=process.env.FARNELL_API_KEY||keys?.farnell||'';
    const FR=process.env.FARNELL_REGION||keys?.farnellRegion||'uk.farnell.com';
    if(!MK && !FK){ res.status(500).json({ok:false,code:'no_api_keys'}); return; }

    const callMPart = () => MK ? mouserSearchByPartNumber({apiKey:MK, mpn:q}).then(r=>r&&r.ok?(r.data?.SearchResults?.Parts||[]):[]) : Promise.resolve([]);
    const callMKey  = () => MK ? mouserSearchByKeyword({apiKey:MK, q, records:50, startingRecord:0}).then(r=>r&&r.ok?(r.data?.SearchResults?.Parts||[]):[]) : Promise.resolve([]);

    const callFPart = () => FK ? farnellByMPN({apiKey:FK, region:FR, q, limit:25}).then(r=>r&&r.ok?(r.data?.products||r.data?.manufacturerPartNumberSearchReturn?.products||[]):[]) : Promise.resolve([]);
    const callFKey  = () => FK ? farnellByKeyword({apiKey:FK, region:FR, q, limit:25}).then(r=>r&&r.ok?(r.data?.products||r.data?.keywordSearchReturn?.products||[]):[]) : Promise.resolve([]);

    const chainM = isMPN(q) ? [callMPart, callMKey] : [callMKey, callMPart];
    const chainF = isMPN(q) ? [callFPart, callFKey] : [callFKey, callFPart];

    chainM[0]().then(ma => (Array.isArray(ma)&&ma.length?ma:chainM[1]()))
    .then(mparts => {
      const mRows = (mparts||[]).map(normMouser);
      chainF[0]().then(fa => (Array.isArray(fa)&&fa.length?fa:chainF[1]()))
      .then(fparts => {
        const fRows = (fparts||[]).map(p=>normFarnell(p, FR));
        const merged = uniqBy([...mRows, ...fRows], x => (x.mpn||'').toUpperCase()+'|'+(x.manufacturer||'').toUpperCase());
        merged.sort((a,b)=>{
          const A=a.minRub, B=b.minRub;
          if (Number.isFinite(A) && Number.isFinite(B)) return A-B;
          if (Number.isFinite(A)) return -1;
          if (Number.isFinite(B)) return 1;
          const s=(b.stock||0)-(a.stock||0); if (s) return s;
          return String(a.mpn||a.title).localeCompare(String(b.mpn||b.title));
        });
        const rows = merged.map(toCanonRow);
        res.json({ok:true,q,rows,meta:{source:(MK?'mouser':'')+(FK?'+farnell':''), total: rows.length}});
      });
    }).catch(()=>res.status(502).json({ok:false,code:'providers_unreachable'}));
  });
}