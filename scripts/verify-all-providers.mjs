#!/usr/bin/env node
/**
 * Verify all provider API keys are working
 */

import 'dotenv/config';
import '../src/bootstrap/proxy.mjs';

// Import provider clients
import { digikeySearchByKeyword } from '../src/integrations/digikey/client.mjs';
import { mouserSearchByKeyword } from '../src/integrations/mouser/client.mjs';
import { tmeSearchProducts } from '../src/integrations/tme/client.mjs';
import { farnellByKeyword } from '../src/integrations/farnell/client.mjs';

const testMPN = '2N3904'; // Simple, common component

async function verifyProvider(name, testFn) {
  try {
    console.log(`\n🧪 Testing ${name}...`);
    const startTime = Date.now();
    const result = await testFn();
    const duration = Date.now() - startTime;

    if (result.error) {
      console.log(`  ❌ FAILED: ${result.error}`);
      return { name, status: 'FAILED', error: result.error, duration };
    }

    const count = result.data?.Products?.length
      || result.data?.ProductList?.length
      || result.data?.Products?.length
      || result.data?.results?.length
      || 0;

    if (count > 0) {
      console.log(`  ✅ OK: ${count} results in ${duration}ms`);
      return { name, status: 'OK', count, duration };
    } else {
      console.log(`  ⚠️  NO RESULTS (but API works) in ${duration}ms`);
      return { name, status: 'NO_RESULTS', duration };
    }
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
    return { name, status: 'ERROR', error: err.message };
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Provider API Verification                       ║');
  console.log('║   Test MPN: 2N3904                               ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  const results = [];

  // DigiKey
  results.push(await verifyProvider('DigiKey', async () => {
    return await digikeySearchByKeyword({
      clientId: process.env.DIGIKEY_CLIENT_ID,
      clientSecret: process.env.DIGIKEY_CLIENT_SECRET,
      keyword: testMPN,
      limit: 5
    });
  }));

  // Mouser
  results.push(await verifyProvider('Mouser', async () => {
    return await mouserSearchByKeyword({
      apiKey: process.env.MOUSER_API_KEY,
      q: testMPN
    });
  }));

  // TME
  results.push(await verifyProvider('TME', async () => {
    return await tmeSearchProducts({
      token: process.env.TME_TOKEN,
      secret: process.env.TME_SECRET,
      query: testMPN
    });
  }));

  // Farnell
  results.push(await verifyProvider('Farnell', async () => {
    return await farnellByKeyword({
      apiKey: process.env.FARNELL_API_KEY,
      q: testMPN,
      region: process.env.FARNELL_REGION || 'uk.farnell.com'
    });
  }));

  // Summary
  console.log('\n' + '═'.repeat(55));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(55));

  const ok = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status === 'FAILED' || r.status === 'ERROR').length;
  const noResults = results.filter(r => r.status === 'NO_RESULTS').length;

  console.log(`✅ Working: ${ok}/4`);
  console.log(`❌ Failed:  ${failed}/4`);
  console.log(`⚠️  No Results: ${noResults}/4`);

  if (failed > 0) {
    console.log('\n❌ FAILED PROVIDERS:');
    results.filter(r => r.status === 'FAILED' || r.status === 'ERROR').forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n' + '═'.repeat(55));

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
