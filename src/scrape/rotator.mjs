import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fetchViaScraperAPI } from './providers/scraperapi.mjs';
import { fetchViaScrapingBee } from './providers/scrapingbee.mjs';
import { fetchViaScrapingBot } from './providers/scrapingbot.mjs';
import crypto from 'node:crypto';

const USAGE_PATH = 'data/state/usage.json';
const RATE_PATH = 'data/state/rate.json';
const PROVIDERS = [
  { name: 'scraperapi', file: 'secrets/apis/scraperapi.txt', fetcher: fetchViaScraperAPI, defaults: { render: 'false' } },
  { name: 'scrapingbee', file: 'secrets/apis/scrapingbee.txt', fetcher: fetchViaScrapingBee, defaults: { render_js: 'false' } },
  { name: 'scrapingbot', file: 'secrets/apis/scrapingbot.txt', fetcher: fetchViaScrapingBot, defaults: {} }
];

function loadKeys(file) { try { return readFileSync(file, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean); } catch { return []; } }
function ensureState(){ if (!existsSync('data/state')) mkdirSync('data/state', { recursive: true }); }
function loadUsage(){ ensureState(); if (!existsSync(USAGE_PATH)) return {}; return JSON.parse(readFileSync(USAGE_PATH,'utf8')); }
function saveUsage(u){ writeFileSync(USAGE_PATH, JSON.stringify(u, null, 2)); }
function loadRate(){ ensureState(); if (!existsSync(RATE_PATH)) return {}; return JSON.parse(readFileSync(RATE_PATH,'utf8')); }
function saveRate(r){ writeFileSync(RATE_PATH, JSON.stringify(r, null, 2)); }

async function sleep(ms){ await new Promise(r=>setTimeout(r,ms)); }

export async function fetchHTML(url, opts = {}) {
  const usage = loadUsage();
  const rate = loadRate();
  const order = PROVIDERS.map(p => ({ ...p, keys: loadKeys(p.file) })).filter(p => p.keys.length > 0);
  if (!order.length) throw new Error('NO_KEYS');

  let lastErr;
  for (const prov of order) {
    const now = Date.now();
    const nextAt = rate[prov.name]?.nextAt || 0;
    if (now < nextAt) await sleep(nextAt - now);

    const keys = prov.keys;
    const idx = Math.abs(crypto.createHash('md5').update(url).digest().readUInt32BE(0)) % keys.length;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[(idx + i) % keys.length];
      // до 3 попыток с экспоненциальным бэкоффом, переключаясь по провайдерам/ключам
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const html = await prov.fetcher({ key, url, params: { ...prov.defaults, ...(opts.params || {}) }, timeoutMs: 30000 });
          usage[prov.name] = usage[prov.name] || {}; usage[prov.name][key] = (usage[prov.name][key] || 0) + 1; saveUsage(usage);
          // простой RPS лимит: не чаще 1 req/500ms на провайдера
          rate[prov.name] = { nextAt: Date.now() + 500 }; saveRate(rate);
          return html;
        } catch (e) {
          lastErr = e;
          const backoff = 300 * Math.pow(2, attempt); // 300ms, 600ms
          await sleep(backoff);
          break; // перейти к следующему ключу или провайдеру
        }
      }
    }
  }
  throw lastErr || new Error('ALL_PROVIDERS_FAILED');
}
