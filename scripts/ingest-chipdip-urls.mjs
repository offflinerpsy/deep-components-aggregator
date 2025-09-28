import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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

let ok=0, fail=0;
for (const url of linesFromDir('loads/urls')) {
  try {
    const html = await getHtmlCached(url, { ttl: 30*24*3600*1000, params: { /* по дефолту без JS */ } });
    const canon = parseChipDipProduct(html, url);
    if (!canon.mpn) throw new Error('no mpn');
    writeFileSync(`${OUT}/${canon.mpn}.json`, JSON.stringify(canon, null, 2));
    ok++;
  } catch(e){
    console.error('ERR', url, e.message);
    fail++;
  }
}
console.log(JSON.stringify({ ok, fail }, null, 2));
