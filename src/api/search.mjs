import { mouserSearchByKeyword, mouserSearchByPartNumber } from '../integrations/mouser/client.mjs';
import { normalizeMouserPart } from '../integrations/mouser/normalize.mjs';
import { toCanonRow } from '../core/canon.mjs';

const isLikelyMPN = (q) => { const s=q.trim(); return !!(s && !/\s/.test(s) && /[A-Za-z]/.test(s) && /\d/.test(s) && s.length>=3 && s.length<=40); };

export default function mount(app, { keys }) {
  app.get('/api/search', (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) { res.status(400).json({ ok:false, code:'bad_q' }); return; }
    const apiKey = process.env.MOUSER_API_KEY || keys?.mouser || '';
    if (!apiKey) { res.status(500).json({ ok:false, code:'no_mouser_api_key' }); return; }

    const callPart = () => mouserSearchByPartNumber({ apiKey, mpn: q }).then(r => r && r.ok ? (r.data?.SearchResults?.Parts || []) : []);
    const callKw   = () => mouserSearchByKeyword({ apiKey, q, records: 50, startingRecord: 0 }).then(r => r && r.ok ? (r.data?.SearchResults?.Parts || []) : []);
    const chain = isLikelyMPN(q) ? [callPart, callKw] : [callKw, callPart];

    chain[0]().then(a => (Array.isArray(a) && a.length ? a : chain[1]()))
      .then(parts => parts.map(normalizeMouserPart).map(toCanonRow))
      .then(rows => res.json({ ok:true, q, rows, meta:{ source:'mouser', total: rows.length } }))
      .catch(() => res.status(502).json({ ok:false, code:'mouser_unreachable' }));
  });
}
