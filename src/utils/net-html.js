import * as cheerio from 'cheerio';
import { setTimeout as sleep } from 'node:timers/promises';
import { request } from 'undici';
import iconv from 'iconv-lite';

export async function loadHtml(url, headers) {
  const r = await request(url, { headers });
  if (!r || r.statusCode < 200 || r.statusCode >= 300) return null;

  // Определяем кодировку по заголовку и meta
  const buf = await r.body.arrayBuffer();
  const raw = Buffer.from(buf);
  const ct = (r.headers && (r.headers['content-type'] || r.headers['Content-Type'])) || '';
  const is1251 = /1251/i.test(String(ct));
  let html = is1251 ? iconv.decode(raw, 'win1251') : raw.toString('utf8');

  // Дополнительная проверка meta charset
  const metaMatch = html.match(/<meta[^>]+charset\s*=\s*"?([a-zA-Z0-9-]+)"?/i);
  if (metaMatch && /1251/i.test(metaMatch[1]) && !is1251) {
    html = iconv.decode(raw, 'win1251');
  }

  const $ = cheerio.load(html);
  return {
    firstHref: (sel) => ($(sel).attr('href') || null),
    firstText: (sel) => { const t = $(sel).first().text().trim(); return t.length ? t : null; },
    firstHtml: (sel) => { const h = $(sel).first().html(); return h && h.trim().length ? h : null; },
    firstAttr: (sel, name) => ($(sel).first().attr(name) || null),
    allHrefs:  (sel) => $(sel).map((_,a)=>$(a).attr('href')).toArray().filter(Boolean),
    allSrcs:   (sel) => $(sel).map((_,el)=>$(el).attr('src')).toArray().filter(Boolean),
    tablePairs:(sel) => {
      const rows = $(sel); if (!rows.length) return null;
      const o = {};
      rows.each((_, tr) => {
        const cells = $(tr).find('td,th'); if (cells.length < 2) return;
        const k = $(cells[0]).text().trim(); const v = $(cells[1]).text().trim();
        if (k && v) o[k] = v;
      });
      return Object.keys(o).length ? o : null;
    }
  };
}

export const absUrl = (href, base) =>
  href && /^https?:\/\//.test(href) ? href : (href ? new URL(href, base).toString() : null);

export const delayJitter = async (minMs, maxMs) =>
  sleep(Math.floor(minMs + Math.random()*(maxMs-minMs)));

export async function withTimeout(p, ms) {
  let done = false; 
  const t = sleep(ms).then(()=>!done ? null : null);
  const r = await Promise.race([p.then(v => { done = true; return v; }), t]);
  return r;
}
