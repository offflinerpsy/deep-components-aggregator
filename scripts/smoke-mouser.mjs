import { mouserSearchByKeyword, mouserSearchByPartNumber } from '../src/integrations/mouser/client.mjs';
import { normalizeMouserPart } from '../src/integrations/mouser/normalize.mjs';

const apiKey = process.env.MOUSER_API_KEY || '';
const q = process.argv[2] || '1N4148';

const run = (fn) => fn().then(r => {
  const parts = r && r.ok ? (r.data?.SearchResults?.Parts || []) : [];
  const rows = parts.slice(0,5).map(normalizeMouserPart);
  console.log(JSON.stringify({ count: parts.length, sample: rows }, null, 2));
}).catch(() => console.log(JSON.stringify({ count: 0, sample: [] })));

const isLikelyMPN = (s) => !!(s && !/\s/.test(s) && /[A-Za-z]/.test(s) && /\d/.test(s));

const part = () => mouserSearchByPartNumber({ apiKey, mpn: q });
const kw   = () => mouserSearchByKeyword({ apiKey, q, records: 10, startingRecord: 0 });

(isLikelyMPN(q) ? run(part).then(() => run(kw)) : run(kw).then(() => run(part)));
