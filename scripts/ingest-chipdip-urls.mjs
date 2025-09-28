import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { getHtmlCached } from '../src/scrape/cache.mjs';
import { parseChipDipProduct } from '../src/parsers/chipdip/product.mjs';

const OUT = 'data/db/products';
mkdirSync(OUT, { recursive: true });

function* linesFromDir(dir){
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.txt')) continue;
    const body = readFileSync(`${dir}/${f}`, 'utf8');
    for (const line of body.split(/\r?\n/)) {
      const u = line.trim();
      if (u) yield u;
    }
  }
}

let totals=0, ok=0, fail=0, cached=0, cacheBytes=0;
const seen = new Set();
for (const url of linesFromDir('loads/urls')) {
  totals++;
  try {
    const r = await getHtmlCached(url, { ttl: 30*24*3600*1000, params: {} });
    if (r.fromCache) cached++;
    cacheBytes += r.size||0;
    const canon = parseChipDipProduct(r.html, url);
    if (!canon.mpn) throw new Error('no mpn');
    if (!seen.has(canon.mpn)) {
      writeFileSync(`${OUT}/${canon.mpn}.json`, JSON.stringify(canon, null, 2));
      seen.add(canon.mpn);
    }
    ok++;
  } catch(e){
    console.error('ERR', url, e.message);
    fail++;
  }
}
const report = { ts: Date.now(), totals, ok, fail, cached, cacheBytes };
mkdirSync('data/state', { recursive: true });
writeFileSync('data/state/ingest-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
