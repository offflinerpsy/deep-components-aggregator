import { mouserSearchByKeyword, mouserSearchByPartNumber } from '../integrations/mouser/client.mjs';
import { normMouser } from '../integrations/mouser/normalize.mjs';
import { farnellByMPN, farnellByKeyword } from '../integrations/farnell/client.mjs';
import { normFarnell } from '../integrations/farnell/normalize.mjs';
import { toRUB } from '../currency/toRUB.mjs';
import { readCachedSearch, cacheSearch } from '../db/sql.mjs';
import { normalizeQuery } from '../search/normalizeQuery.mjs';
import { cacheHitsTotal, cacheMissesTotal } from '../../metrics/registry.js';
import { appendFile, mkdir } from 'node:fs/promises';

const TTL_SEARCH_MS = 7 * 24 * 60 * 60 * 1000;

const isCyrillic = s => /[А-Яа-яЁё]/.test(s);
const isLikelyMPN = s => /^[A-Za-z0-9][A-Za-z0-9\-\._]{1,}$/i.test(s) && /\d/.test(s);

const logTrace = (msg) => {
  const ts = Date.now();
  const line = `[${ts}] ${msg}\n`;
  mkdir('./_diag', { recursive: true }).then(() =>
    appendFile(`./_diag/trace-${Math.floor(ts / 1000)}.log`, line, 'utf8')
  ).catch(() => { });
};

export default function mountSearch(app, { keys, db }) {
  app.get('/api/search', (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) { res.json({ ok: true, q, rows: [], meta: { source: 'none', total: 0 } }); return; }

    // RU→EN normalization: transliterate + synonym mapping
    const queryMeta = normalizeQuery(q);
    const normalizedQ = queryMeta.normalized; // Use for provider search if Cyrillic

    const fresh = String(req.query.fresh || '') === '1';
    if (!fresh) {
      const cached = readCachedSearch(db, q.toLowerCase(), TTL_SEARCH_MS);
      if (cached) {
        cacheHitsTotal.inc({ source: 'search' });
        logTrace(`search q="${q}" source=${cached.meta.source} cached=1 rows=${cached.rows.length}`);
        res.json({ ok: true, q, rows: cached.rows, meta: { ...cached.meta, queryNorm: queryMeta } });
        return;
      }
      cacheMissesTotal.inc({ source: 'search' });
    }

    // 2) LIVE: strategy — Mouser primary (if Latin), Farnell fallback; for Cyrillic → use normalized query
    const MK = keys.mouser; const FK = keys.farnell; const FR = keys.farnellRegion;

    const useMouser = !isCyrillic(q) && !!MK;
    const useFarnellFirst = isCyrillic(q) && !!FK;

    // Use normalized query for provider searches if Cyrillic detected
    const searchQuery = queryMeta.hasCyrillic ? normalizedQ : q;

    const work = useFarnellFirst
      ? farnellByKeyword({ apiKey: FK, region: FR, q: searchQuery }).then(r => {
        const products = (r && r.data && (r.data.products || [])) || [];
        const rows = products.map(p => normFarnell(p, FR));
        cacheSearch(db, q.toLowerCase(), rows, { source: 'farnell' });
        logTrace(`search q="${q}" norm="${normalizedQ}" source=farnell cached=0 rows=${rows.length}`);
        res.json({ ok: true, q, rows, meta: { source: 'farnell', total: rows.length, queryNorm: queryMeta } });
      }).catch(() => {
        logTrace(`search q="${q}" norm="${normalizedQ}" source=farnell cached=0 rows=0 error=1`);
        res.json({ ok: true, q, rows: [], meta: { source: 'farnell', total: 0, queryNorm: queryMeta } });
      })
      : (isLikelyMPN(searchQuery) && MK
        ? mouserSearchByPartNumber({ apiKey: MK, mpn: searchQuery }).then(r => {
          const parts = (r && r.data && r.data.SearchResults && r.data.SearchResults.Parts) || [];
          const rows = parts.map(normMouser);
          if (rows.length) {
            cacheSearch(db, q.toLowerCase(), rows, { source: 'mouser' });
            res.json({ ok: true, q, rows, meta: { source: 'mouser', total: rows.length, queryNorm: queryMeta } }); return;
          }
          if (FK) {
            return farnellByMPN({ apiKey: FK, region: FR, q: searchQuery, limit: 20 }).then(fr => {
              const items = (fr && fr.data && (fr.data.products || (fr.data.manufacturerPartNumberSearchReturn && fr.data.manufacturerPartNumberSearchReturn.products) || [])) || [];
              const rows2 = items.map(p => normFarnell(p, FR));
              cacheSearch(db, q.toLowerCase(), rows2, { source: 'farnell' });
              res.json({ ok: true, q, rows: rows2, meta: { source: 'farnell', total: rows2.length, queryNorm: queryMeta } });
            });
          }
          res.json({ ok: true, q, rows: [], meta: { source: 'mouser', total: 0, queryNorm: queryMeta } });
        })
        : mouserSearchByKeyword({ apiKey: MK, q: searchQuery }).then(r => {
          const parts = (r && r.data && r.data.SearchResults && r.data.SearchResults.Parts) || [];
          const rows = parts.map(normMouser);
          if (rows.length) {
            cacheSearch(db, q.toLowerCase(), rows, { source: 'mouser' });
            res.json({ ok: true, q, rows, meta: { source: 'mouser', total: rows.length, queryNorm: queryMeta } }); return;
          }
          if (FK) {
            return farnellByKeyword({ apiKey: FK, region: FR, q: searchQuery }).then(fr => {
              const products = (fr && fr.data && (fr.data.products || [])) || [];
              const rows2 = products.map(p => normFarnell(p, FR));
              cacheSearch(db, q.toLowerCase(), rows2, { source: 'farnell' });
              res.json({ ok: true, q, rows: rows2, meta: { source: 'farnell', total: rows2.length, queryNorm: queryMeta } });
            });
          }
          res.json({ ok: true, q, rows: [], meta: { source: 'mouser', total: 0, queryNorm: queryMeta } });
        })
      );
  });
}
