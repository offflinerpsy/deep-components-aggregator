import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { getHtmlCached } from '../src/scrape/cache.mjs';
import { parseChipDipProduct } from '../src/parsers/chipdip/product.mjs';
import { getRates } from '../src/currency/cbr.mjs';
import { fetch } from 'undici';

const OUT = 'data/db/products';
mkdirSync(OUT, { recursive: true });
mkdirSync('data/files/pdf', { recursive: true });

async function savePdf(srcUrl, hash){
  const dest = `data/files/pdf/${hash}.pdf`;
  if (existsSync(dest)) return dest;
  const r = await fetch(srcUrl);
  if (!r.ok) return null;
  const ab = await r.arrayBuffer();
  writeFileSync(dest, Buffer.from(ab));
  return dest;
}

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
const rates = getRates();

for (const url of linesFromDir('loads/urls')) {
  totals++;
  try {
    const r = await getHtmlCached(url, { ttl: 30*24*3600*1000, params: {} });
    if (r.fromCache) cached++;
    cacheBytes += r.size||0;
    const canon = parseChipDipProduct(r.html, url);
    // Скачивание PDF и переписывание ссылок
    if (Array.isArray(canon.docs)) {
      for (const d of canon.docs) {
        if (d._src && d._hash) {
          const saved = await savePdf(d._src, d._hash);
          if (saved) d.url = `/files/pdf/${d._hash}.pdf`;
          delete d._src; delete d._hash;
        }
      }
    }
    // Конвертация валют (если попадутся офферы не RUB)
    if (Array.isArray(canon.offers)) {
      for (const ofr of canon.offers) {
        if (ofr.currency && ofr.currency !== 'RUB') {
          const rate = rates[ofr.currency.toUpperCase()];
          if (rate) {
            ofr.price_rub = Math.round(ofr.price * rate);
          }
        }
      }
    }

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
