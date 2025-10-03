#!/usr/bin/env node
import 'dotenv/config';
import '../src/bootstrap/proxy.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mouserSearchByKeyword } from '../src/integrations/mouser/client.mjs';
import { tmeSearchProducts } from '../src/integrations/tme/client.mjs';
import { farnellByKeyword } from '../src/integrations/farnell/client.mjs';
import { digikeySearch } from '../src/integrations/digikey/client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const q = process.argv.find(a => a.startsWith('--q='))?.split('=')[1] || 'LM317';
const outDir = path.join(__dirname, '..', 'docs', '_artifacts');
fs.mkdirSync(outDir, { recursive: true });

function now() { return new Date().toISOString().replace(/[:.]/g, '-'); }

const keys = {
  mouser: process.env.MOUSER_API_KEY || '',
  farnell: process.env.FARNELL_API_KEY || '',
  farnellRegion: process.env.FARNELL_REGION || 'uk.farnell.com',
  tmeToken: process.env.TME_TOKEN || '',
  tmeSecret: process.env.TME_SECRET || '',
  digikeyClientId: process.env.DIGIKEY_CLIENT_ID || '',
  digikeyClientSecret: process.env.DIGIKEY_CLIENT_SECRET || ''
};

async function timed(label, fn) {
  const started = Date.now();
  try {
    const data = await fn();
    const ms = Date.now() - started;
    return { ok: true, ms, data };
  } catch (e) {
    const ms = Date.now() - started;
    return { ok: false, ms, error: e?.message || String(e) };
  }
}

async function run() {
  const report = { ts: new Date().toISOString(), q, proxy: process.env.WARP_PROXY_URL || 'default: http://127.0.0.1:40000', results: {} };

  // Mouser
  if (!keys.mouser) {
    report.results.mouser = { ok: false, error: 'missing key' };
  } else {
    report.results.mouser = await timed('mouser', async () => {
      const r = await mouserSearchByKeyword({ apiKey: keys.mouser, q, records: 5 });
      const items = r?.data?.SearchResults?.Parts || [];
      return { status: r.status, count: items.length, sample: items[0]?.ManufacturerPartNumber };
    });
  }

  // TME
  if (!keys.tmeToken || !keys.tmeSecret) {
    report.results.tme = { ok: false, error: 'missing creds' };
  } else {
    report.results.tme = await timed('tme', async () => {
      const r = await tmeSearchProducts({ token: keys.tmeToken, secret: keys.tmeSecret, q });
      const items = r?.data?.ProductList || r?.data?.Data?.ProductList || [];
      return { status: r.status, count: items.length, sample: items[0]?.Symbol };
    });
  }

  // Farnell
  if (!keys.farnell) {
    report.results.farnell = { ok: false, error: 'missing key' };
  } else {
    report.results.farnell = await timed('farnell', async () => {
      const r = await farnellByKeyword({ apiKey: keys.farnell, region: keys.farnellRegion, q, limit: 5 });
      const items = r?.data?.products || r?.data?.premierFarnellPartNumberReturn?.products || [];
      return { status: r.status, count: items.length, sample: items[0]?.manufacturerPartNumber };
    });
  }

  // DigiKey
  if (!keys.digikeyClientId || !keys.digikeyClientSecret) {
    report.results.digikey = { ok: false, error: 'missing creds' };
  } else {
    report.results.digikey = await timed('digikey', async () => {
      const r = await digikeySearch({ clientId: keys.digikeyClientId, clientSecret: keys.digikeyClientSecret, keyword: q, limit: 5 });
      const items = r?.data?.Products || r?.data?.Items || [];
      return { status: r.status, count: items.length, sample: items[0]?.ManufacturerPartNumber };
    });
  }

  const file = path.join(outDir, `providers-${now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Providers report written: ${file}`);
  for (const [k, v] of Object.entries(report.results)) {
    const status = v.ok ? `ok in ${v.ms}ms` : `FAIL (${v.error})`;
    console.log(` - ${k}: ${status}${v.data ? `, count=${v.data.count}` : ''}`);
  }
}

run().catch((e) => {
  console.error('Provider check failed:', e);
  process.exit(1);
});
