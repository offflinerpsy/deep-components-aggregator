import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fetchViaScraperAPI } from './providers/scraperapi.mjs';
import { fetchViaScrapingBee } from './providers/scrapingbee.mjs';
import { fetchViaScrapingBot } from './providers/scrapingbot.mjs';
import crypto from 'node:crypto';

const USAGE_PATH = 'data/state/usage.json';
const PROVIDERS = [
  { name: 'scraperapi', file: 'secrets/apis/scraperapi.txt', fetcher: fetchViaScraperAPI, defaults: { render: 'false' } },
  { name: 'scrapingbee', file: 'secrets/apis/scrapingbee.txt', fetcher: fetchViaScrapingBee, defaults: { render_js: 'false' } },
  { name: 'scrapingbot', file: 'secrets/apis/scrapingbot.txt', fetcher: fetchViaScrapingBot, defaults: {} }
];

function loadKeys(file) {
  try { return readFileSync(file, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean); }
  catch { return []; }
}

function loadUsage() {
  if (!existsSync('data/state')) mkdirSync('data/state', { recursive: true });
  if (!existsSync(USAGE_PATH)) return {};
  return JSON.parse(readFileSync(USAGE_PATH, 'utf8'));
}
function saveUsage(u){ writeFileSync(USAGE_PATH, JSON.stringify(u, null, 2)); }

export async function fetchHTML(url, opts = {}) {
  const usage = loadUsage();
  const perHost = opts.hostKey || new URL(url).host;

  const order = PROVIDERS
    .map(p => ({ ...p, keys: loadKeys(p.file) }))
    .filter(p => p.keys.length > 0);

  if (!order.length) throw new Error('NO_KEYS');

  let lastErr;
  for (const prov of order) {
    const keys = prov.keys;
    // простая круговая ротация по хэшу URL:
    const idx = Math.abs(crypto.createHash('md5').update(url).digest().readUInt32BE(0)) % keys.length;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[(idx + i) % keys.length];
      try {
        const html = await prov.fetcher({ key, url, params: { ...prov.defaults, ...(opts.params || {}) } });
        usage[prov.name] = usage[prov.name] || {};
        usage[prov.name][key] = (usage[prov.name][key] || 0) + 1;
        saveUsage(usage);
        return html;
      } catch (e) {
        lastErr = e;
        // 403/429/5xx -> пробуем следующего ключа/провайдера
        continue;
      }
    }
  }
  throw lastErr || new Error('ALL_PROVIDERS_FAILED');
}
