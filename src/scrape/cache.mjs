import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { fetchHTML } from './rotator.mjs';

const ROOT = 'data/cache/html';
const DEFAULT_TTL = 7 * 24 * 3600 * 1000; // 7 дней

export async function getHtmlCached(url, { ttl = DEFAULT_TTL, params } = {}) {
  const u = new URL(url);
  const key = crypto.createHash('sha1').update(url).digest('hex');
  const dir = `${ROOT}/${u.host}`;
  const path = `${dir}/${key}.html`;
  const metap = `${dir}/${key}.json`;

  mkdirSync(dir, { recursive: true });

  if (existsSync(path)) {
    const meta = JSON.parse(readFileSync(metap, 'utf8'));
    if (Date.now() - meta.ts < ttl) {
      return readFileSync(path, 'utf8');
    }
  }
  const html = await fetchHTML(url, { params });
  writeFileSync(path, html);
  writeFileSync(metap, JSON.stringify({ ts: Date.now(), url }, null, 2));
  return html;
}
