import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { getHtmlCached } from '../src/scrape/cache.mjs';
import { parseChipDipProduct } from '../src/parsers/chipdip/product.mjs';
import { getRates } from '../src/currency/cbr.mjs';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

const OUT = 'data/db/products';
mkdirSync(OUT, { recursive: true });
mkdirSync('data/files/pdf', { recursive: true });

// Парсим аргументы командной строки
const args = process.argv.slice(2);
let query = '';
let limit = 0;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--query' && i + 1 < args.length) {
    query = args[i + 1];
    i++;
  } else if (args[i] === '--limit' && i + 1 < args.length) {
    limit = parseInt(args[i + 1], 10) || 0;
    i++;
  }
}

async function savePdf(srcUrl, hash){
  const dest = `data/files/pdf/${hash}.pdf`;
  if (existsSync(dest)) return dest;
  try {
    const r = await fetch(srcUrl);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    writeFileSync(dest, Buffer.from(ab));
    return dest;
  } catch (e) {
    console.error('Failed to download PDF:', e.message);
    return null;
  }
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

async function main() {
  let totals=0, ok=0, fail=0, cached=0, cacheBytes=0;
  const seen = new Set();
  const rates = getRates();
  
  // Определяем источник URL
  let urls = [];
  if (query) {
    // Если есть запрос, ищем по нему на ChipDip (можно расширить на другие источники)
    const searchUrl = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(query)}`;
    try {
      console.log(`Searching for "${query}" at ${searchUrl}`);
      const r = await getHtmlCached(searchUrl, { ttl: 24*3600*1000 });
      if (r.fromCache) cached++;
      cacheBytes += r.size||0;
      
      // Извлекаем URL продуктов из страницы поиска
      const $ = cheerio.load(r);
      $('.product-item').each((_, el) => {
        const href = $(el).find('a.link').attr('href');
        if (href && href.startsWith('/product')) {
          urls.push(`https://www.chipdip.ru${href}`);
        }
      });
      console.log(`Found ${urls.length} product URLs for query "${query}"`);
    } catch(e) {
      console.error('Search error:', e.message);
    }
    
    // Ограничиваем количество URL для обработки
    if (limit > 0 && urls.length > limit) {
      urls = urls.slice(0, limit);
    }
  } else {
    // Иначе берем URL из файлов
    urls = Array.from(linesFromDir('loads/urls'));
    if (limit > 0) {
      urls = urls.slice(0, limit);
    }
  }

  for (const url of urls) {
    totals++;
    try {
      const r = await getHtmlCached(url, { ttl: 30*24*3600*1000 });
      if (r.fromCache) cached++;
      cacheBytes += r.size||0;
      const canon = parseChipDipProduct(r, url);
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
  
  const report = { ts: Date.now(), query, totals, ok, fail, cached, cacheBytes };
  mkdirSync('data/state', { recursive: true });
  writeFileSync('data/state/ingest-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error);