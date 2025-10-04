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
  console.log('=== Provider Connectivity Check ===');
  console.log(`Query: "${q}"`);
  console.log(`Proxy: ${process.env.WARP_PROXY_URL || process.env.HTTP_PROXY || 'default http://127.0.0.1:40000'}`);
  console.log(`Proxy disabled: ${process.env.NO_PROXY || process.env.DIRECT_CONNECTIONS || 'no'}`);
  console.log('');
  
  const report = { 
    ts: new Date().toISOString(), 
    q, 
    proxy: process.env.WARP_PROXY_URL || process.env.HTTP_PROXY || 'default: http://127.0.0.1:40000',
    proxyDisabled: !!(process.env.NO_PROXY || process.env.DIRECT_CONNECTIONS || process.env.WARP_DISABLE),
    results: {} 
  };

  // Mouser
  if (!keys.mouser) {
    report.results.mouser = { ok: false, error: 'missing key', ms: 0 };
  } else {
    console.log('[1/4] Testing Mouser...');
    report.results.mouser = await timed('mouser', async () => {
      const r = await mouserSearchByKeyword({ apiKey: keys.mouser, q, records: 5 });
      const items = r?.data?.SearchResults?.Parts || [];
      return { status: r.status, count: items.length, sample: items[0]?.ManufacturerPartNumber };
    });
  }

  // TME
  if (!keys.tmeToken || !keys.tmeSecret) {
    report.results.tme = { ok: false, error: 'missing creds', ms: 0 };
  } else {
    console.log('[2/4] Testing TME...');
    report.results.tme = await timed('tme', async () => {
      const r = await tmeSearchProducts({ token: keys.tmeToken, secret: keys.tmeSecret, q });
      const items = r?.data?.ProductList || r?.data?.Data?.ProductList || [];
      return { status: r.status, count: items.length, sample: items[0]?.Symbol };
    });
  }

  // Farnell
  if (!keys.farnell) {
    report.results.farnell = { ok: false, error: 'missing key', ms: 0 };
  } else {
    console.log('[3/4] Testing Farnell...');
    report.results.farnell = await timed('farnell', async () => {
      const r = await farnellByKeyword({ apiKey: keys.farnell, region: keys.farnellRegion, q, limit: 5 });
      const items = r?.data?.products || r?.data?.premierFarnellPartNumberReturn?.products || [];
      return { status: r.status, count: items.length, sample: items[0]?.manufacturerPartNumber };
    });
  }

  // DigiKey (critical test for proxy verification)
  if (!keys.digikeyClientId || !keys.digikeyClientSecret) {
    report.results.digikey = { ok: false, error: 'missing creds', ms: 0 };
  } else {
    console.log('[4/4] Testing DigiKey (proxy indicator)...');
    report.results.digikey = await timed('digikey', async () => {
      const r = await digikeySearch({ clientId: keys.digikeyClientId, clientSecret: keys.digikeyClientSecret, keyword: q, limit: 5 });
      const items = r?.data?.Products || r?.data?.Items || [];
      return { status: r.status, count: items.length, sample: items[0]?.ManufacturerPartNumber };
    });
  }

  // Save artifact
  const file = path.join(outDir, `providers-${now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf-8');
  
  console.log('');
  console.log('=== Results Summary ===');
  console.log(`Report: ${file}`);
  console.log('');
  
  let allOk = true;
  for (const [k, v] of Object.entries(report.results)) {
    const status = v.ok ? `✅ OK` : `❌ FAIL`;
    const timing = v.ok ? ` (${v.ms}ms)` : ` (${v.error})`;
    const details = v.ok && v.data ? ` — HTTP ${v.data.status}, ${v.data.count} results` : '';
    console.log(`  ${k.padEnd(10)}: ${status}${timing}${details}`);
    if (!v.ok) allOk = false;
  }
  
  console.log('');
  
  // Proxy health indicator
  const dk = report.results.digikey;
  if (dk.ok) {
    console.log('✅ DigiKey accessible → Proxy is working (without proxy DigiKey returns 403)');
  } else if (dk.error && dk.error.includes('403')) {
    console.log('⚠️  DigiKey 403 Blocked → Proxy may not be active or routing failed');
    console.log('   Check: warp-cli status; curl --socks5 127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace/');
  } else if (!keys.digikeyClientId) {
    console.log('⚠️  DigiKey credentials missing — cannot verify proxy');
  } else {
    console.log(`⚠️  DigiKey error: ${dk.error || 'unknown'}`);
  }
  
  console.log('');
  return allOk ? 0 : 1;
}

run().catch((e) => {
  console.error('❌ Provider check failed:', e.message);
  console.error(e.stack);
  process.exit(1);
}).then((exitCode) => {
  process.exit(exitCode || 0);
});
