import fs from 'node:fs';
import path from 'node:path';
import { request, setGlobalDispatcher, ProxyAgent } from 'undici';
import { XMLParser } from 'fast-xml-parser';

const INDEX = 'https://www.chipdip.by/sitemapindex.xml';
const OUT   = path.resolve('data', 'manifests', 'chipdip-urls.txt');
const LIMIT = Number(process.env.CD_MANIFEST_LIMIT || 20000);

function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }
function isProduct(u){ return /:\/\/[^/]+\/product1?\//i.test(u); }

async function get(url){
  const r = await request(url, { maxRedirections: 2, headers:{'User-Agent':'deep-agg/jit'} }).then(x=>x, _=>null);
  if(!r || r.statusCode>399) return '';
  return r.body.text();
}
function parseXml(s){ const p = new XMLParser({ ignoreAttributes:true }); return p.parse(s); }

async function main(){
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  if(proxy){ setGlobalDispatcher(new ProxyAgent({ uri: proxy })); }

  ensureDir(path.dirname(OUT));
  const idx = parseXml(await get(INDEX));
  const maps = (idx?.sitemapindex?.sitemap || []).map(x=>x.loc).filter(Boolean);

  const urls = []; let i=0;
  while(i<maps.length && urls.length<LIMIT){
    const xml = await get(maps[i]);
    if(xml){
      const doc = parseXml(xml);
      const items = (doc?.urlset?.url || []);
      const arr = Array.isArray(items) ? items : [items];
      let j=0; while(j<arr.length && urls.length<LIMIT){
        const loc = arr[j]?.loc; if(loc && isProduct(loc)) urls.push(loc);
        j++;
      }
    }
    i++;
  }
  const uniq = Array.from(new Set(urls));
  fs.writeFileSync(OUT, uniq.join('\n')+'\n', 'utf8');
  process.stdout.write(`[manifest] ${uniq.length} → ${OUT}\n`);
}
await main();
