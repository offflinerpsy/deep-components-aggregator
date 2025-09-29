import { promelec } from '../src/parsers/promelec/build-urls.mjs';
import { electronshik } from '../src/parsers/electronshik/build-urls.mjs';
import { fetchHtmlRotating } from '../src/scrape/fetch-html.mjs';
import { parseListing as parseP } from '../src/parsers/promelec/parse-listing.mjs';
import { parseListing as parseE } from '../src/parsers/electronshik/parse-listing.mjs';

const q = process.argv[2] || '1N4148';
const keys = { scraperapi: process.env.SCRAPERAPI_KEY || '', scrapingbee: process.env.SCRAPINGBEE_KEYS || '' };

console.log(`🧪 Smoke test for query: "${q}"`);

const pUrl = promelec.searchUrl(q);
const eUrl = electronshik.searchUrl(q);

console.log(`📡 Promelec URL: ${pUrl}`);
console.log(`📡 Electronshik URL: ${eUrl}`);

fetchHtmlRotating({ url: pUrl, timeout: 10000, session: 1, primary: 'scraperapi', keys })
  .then(r => r && r.ok ? parseP({ html: r.text, sourceUrl: pUrl }) : ({ ok:true, data: [] }))
  .then(r => { console.log('[promelec]', r.data.length, 'items found'); return r; })
  .then(() => fetchHtmlRotating({ url: eUrl, timeout: 10000, session: 2, primary: 'scraperapi', keys }))
  .then(r => r && r.ok ? parseE({ html: r.text, sourceUrl: eUrl }) : ({ ok:true, data: [] }))
  .then(r => { console.log('[electronshik]', r.data.length, 'items found'); })
  .catch(err => console.error('❌ Error:', err.message));
