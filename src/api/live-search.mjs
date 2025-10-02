import { fetchHtmlRotating } from '../scrape/fetch-html.mjs';
import { promelec } from '../parsers/promelec/build-urls.mjs';
import { electronshik } from '../parsers/electronshik/build-urls.mjs';
import { parseListing as parsePromelec } from '../parsers/promelec/parse-listing.mjs';
import { parseListing as parseElectronshik } from '../parsers/electronshik/parse-listing.mjs';
import { buildSearchUrl as oemsUrl, parseOemsTrade } from '../parsers/oemstrade/enrich-by-mpn.mjs';
import { toCanonRow } from '../core/canon.mjs';
import { toRUB } from '../currency/cbr.mjs';

export default function mountLive(app, ctx) {
  app.get('/api/live/search', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const send = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const q = String(req.query.q || '').trim();
    if (!q) { send('warn', { reason: 'empty_q' }); res.end(); return; }

    send('note', { stage: 'start', q, donors: ['promelec','electronshik'], enrich: 'oemstrade' });

    // Переиспользуем быстрый конвейер, но шагами, чтобы отдать промежуточные результаты:
    const { keys } = ctx;

    const step = (label, p) => p.then(r => { send('note', { stage: label, ok: true }); return r; })
      .catch(() => { send('warn', { stage: label, ok: false }); return { ok:true, data: [] }; });

    const pUrl = promelec.searchUrl(q);
    const eUrl = electronshik.searchUrl(q);

    const P = step('promelec', fetchHtmlRotating({ url: pUrl, timeout: 10000, session: 1, primary: 'scraperapi', keys })
      .then(r => r && r.ok ? parsePromelec({ html: r.text, sourceUrl: pUrl }) : ({ ok:true, data: [] }))
      .then(x => { send('enrich', { donor:'promelec', rows: (x.data||[]).slice(0,10) }); return x; })
    );

    const E = step('electronshik', fetchHtmlRotating({ url: eUrl, timeout: 10000, session: 2, primary: 'scraperapi', keys })
      .then(r => r && r.ok ? parseElectronshik({ html: r.text, sourceUrl: eUrl }) : ({ ok:true, data: [] }))
      .then(x => { send('enrich', { donor:'electronshik', rows: (x.data||[]).slice(0,10) }); return x; })
    );

    Promise.all([P, E]).then(([rp, re]) => {
      const raw = [...(rp.data || []), ...(re.data || [])];
      const withMpn = raw.filter(x => x.mpn && x.mpn.length >= 5).slice(0, 10);

      const enrich = withMpn.map(x => {
        const sUrl = oemsUrl(x.mpn);
        return fetchHtmlRotating({ url: sUrl, timeout: 10000, session: 3, primary: 'scraperapi', keys })
          .then(r => r && r.ok ? parseOemsTrade({ html: r.text }) : ({ ok:true, data: [] }))
          .then(er => {
            const best = (er.data || []).sort((a,b) => (a.price || 1e9) - (b.price || 1e9))[0];
            if (best && best.price) x.min_rub = toRUB({ amount: best.price, currency: best.currency || 'USD' });
            send('enrich', { donor:'oemstrade', mpn:x.mpn, min_rub:x.min_rub || null });
            return x;
          });
      });

      Promise.all(enrich).then(() => {
        const rows = raw.map(toCanonRow);
        send('done', { q, rows, meta: { donor: ['promelec','electronshik'], enriched: withMpn.length } });
        res.end();
      });
    });
  });
}



