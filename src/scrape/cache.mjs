import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {get as bee} from './providers/scrapingbee.mjs';
import {get as sapi} from './providers/scraperapi.mjs';
import {get as bot} from './providers/scrapingbot.mjs';

const HTML_ROOT = 'data/cache/html';
const META_ROOT = 'data/cache/meta';

const PROVIDERS = {
  scrapingbee: bee,
  scraperapi: sapi,
  scrapingbot: bot
};

const TTL_CONFIG = {
  'chipdip.ru': {
    product: 12 * 3600 * 1000, // 12 hours for product pages
    listing: 1 * 3600 * 1000   // 1 hour for listing pages
  },
  default: 6 * 3600 * 1000 // 6 hours for others
};

function getCachePaths(hash) {
  const a = hash.slice(0, 2);
  const b = hash.slice(2, 4);
  const htmlDir = path.join(HTML_ROOT, a, b);
  const metaDir = path.join(META_ROOT, a, b);
  return {
    htmlFile: path.join(htmlDir, `${hash}.html`),
    metaFile: path.join(metaDir, `${hash}.json`),
    htmlDir,
    metaDir
  };
}

function getTTL(url) {
  const hostname = new URL(url).hostname;
  if (hostname.includes('chipdip.ru')) {
    if (url.includes('/product') || url.includes('/product0')) {
      return TTL_CONFIG['chipdip.ru'].product;
    }
    return TTL_CONFIG['chipdip.ru'].listing;
  }
  return TTL_CONFIG.default;
}

export async function fetchHtmlCached(url, { providerName = null, forceRefresh = false } = {}) {
  const urlHash = crypto.createHash('sha1').update(url).digest('hex');
  const { htmlFile, metaFile, htmlDir, metaDir } = getCachePaths(urlHash);

  fs.mkdirSync(htmlDir, { recursive: true });
  fs.mkdirSync(metaDir, { recursive: true });

  let meta = null;
  if (fs.existsSync(metaFile) && fs.existsSync(htmlFile)) {
    meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    const currentTTL = getTTL(url);
    if (Date.now() - meta.ts < currentTTL && !forceRefresh) {
      return { ok: true, html: fs.readFileSync(htmlFile, 'utf8'), fromCache: true, provider: meta.provider, usedKey: meta.usedKey, status: meta.status, size: meta.size };
    }
  }

  // If not in cache or expired, fetch
  let lastError = null;
  for (const pName of Object.keys(PROVIDERS)) {
    const providerFn = PROVIDERS[pName];
    const start = Date.now();
    const result = await providerFn(url);
    const duration = Date.now() - start;

    if (result.status === 'ok') {
      const html = result.html;
      const size = Buffer.byteLength(html, 'utf8');
      fs.writeFileSync(htmlFile, html);
      const newMeta = {
        url,
        ts: Date.now(),
        provider: result.provider,
        usedKey: result.usedKey,
        status: 200,
        size,
        duration,
        fromCache: false
      };
      fs.writeFileSync(metaFile, JSON.stringify(newMeta, null, 2));
      return { ok: true, html, fromCache: false, provider: result.provider, usedKey: result.usedKey, status: 200, size };
    } else {
      lastError = result;
      // Log error to diagnostics if needed
    }
  }

  return { ok: false, status: lastError?.code || 'ALL_PROVIDERS_FAILED', error: lastError?.status || 'Unknown error' };
}

export function countCacheEntries() {
  try {
    let count = 0;
    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (file.endsWith('.html')) {
          count++;
        }
      }
    };
    walkDir(HTML_ROOT);
    return count;
  } catch (error) {
    console.error(`Error counting cache entries: ${error.message}`);
    return 0;
  }
}