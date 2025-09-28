import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import crypto from 'node:crypto';
import { fetchHTML } from './rotator.mjs';

const ROOT = 'data/cache/html';
const DEFAULT_TTL = 7 * 24 * 3600 * 1000; // 7 дней

function splitPathByHash(hash){
  const a = hash.slice(0,2);
  const b = hash.slice(2,4);
  const dir = `${ROOT}/${a}/${b}`;
  const html = `${dir}/${hash}.html`;
  const meta = `${dir}/${hash}.json`;
  return { dir, html, meta };
}

export async function getHtmlCached(url, { ttl = DEFAULT_TTL, params, provider } = {}) {
  const key = crypto.createHash('sha1').update(url).digest('hex');
  const { dir, html: htmlPath, meta: metaPath } = splitPathByHash(key);
  mkdirSync(dir, { recursive: true });

  if (existsSync(htmlPath) && existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    if (Date.now() - meta.ts < ttl) {
      const body = readFileSync(htmlPath, 'utf8');
      const size = Buffer.byteLength(body);
      return { html: body, fromCache: true, provider: meta.provider || 'unknown', status: meta.status || 200, size };
    }
  }
  const html = await fetchHTML(url, { params });
  const body = typeof html === 'string' ? html : (html?.html || '');
  const size = Buffer.byteLength(body);
  writeFileSync(htmlPath, body);
  writeFileSync(metaPath, JSON.stringify({ ts: Date.now(), url, provider: provider || 'unknown', status: 200, size }, null, 2));
  return { html: body, fromCache: false, provider: provider || 'unknown', status: 200, size };
}
