#!/usr/bin/env node
/**
 * Simplified API Validation Tests
 * Tests actual API response formats without strict schemas
 */

const BASE_URL = process.env.API_URL || 'http://localhost:9201';

let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
  if (condition) {
    passed++;
    console.log(`✅ ${name}`);
  } else {
    failed++;
    console.error(`❌ ${name}`);
    if (details) console.error(`   Details: ${details}`);
  }
}

async function testSearch() {
  console.log('\n🔍 Testing /api/search endpoint...\n');

  const response = await fetch(`${BASE_URL}/api/search?q=2N3904&fresh=1`);
  const data = await response.json();

  test('Search returns 200', response.status === 200);
  test('Search has ok=true', data.ok === true);
  test('Search has rows array', Array.isArray(data.rows));
  test('Search returns results', data.rows.length > 0, `Got ${data.rows.length} rows`);
  test('Search has meta object', typeof data.meta === 'object');
  test('Search meta has total', typeof data.meta?.total === 'number');
  test('Search meta has providers array', Array.isArray(data.meta?.providers), `Got ${data.meta?.providers?.length || 0} providers`);

  // Test first row structure
  if (data.rows.length > 0) {
    const row = data.rows[0];
    test('Row has mpn', typeof row.mpn === 'string');
    test('Row has manufacturer', row.manufacturer !== undefined);
    test('Row has minPrice', typeof row.minPrice === 'number' || row.minPrice === null);
    test('Row has currency', typeof row.currency === 'string');
    test('Row has _src (provider)', typeof row._src === 'string', `Provider: ${row._src}`);
  }

  // Test currency info
  test('Meta has currency rates', data.meta?.currency?.rates?.USD > 0);
  test('Meta has currency date', typeof data.meta?.currency?.date === 'string');

  // Test provider diversity (should have multiple providers)
  const providers = data.meta?.providers || [];
  const activeProviders = providers.filter(p => p.total > 0);
  test('Multiple providers returned results', activeProviders.length >= 2, `Active: ${activeProviders.length}/4`);

  return data;
}

async function testHealth() {
  console.log('\n🏥 Testing /api/health endpoint...\n');

  const response = await fetch(`${BASE_URL}/api/health?probe=true`);
  const data = await response.json();

  test('Health returns 200', response.status === 200);
  test('Health has status', typeof data.status === 'string');
  test('Health has uptime', typeof data.uptime === 'number');
  test('Health has database status', typeof data.database === 'string');

  // Test providers (even if structure differs)
  const hasProviders = data.providers || data.apis || data.sources;
  test('Health has provider info', hasProviders !== undefined);

  return data;
}

async function testMetrics() {
  console.log('\n📊 Testing /api/metrics endpoint...\n');

  const response = await fetch(`${BASE_URL}/api/metrics`);
  const text = await response.text();

  test('Metrics returns 200', response.status === 200);
  test('Metrics is text/plain', response.headers.get('content-type')?.includes('text'));
  test('Metrics has search_requests_total', text.includes('search_requests_total'));
  test('Metrics has search_latency_seconds', text.includes('search_latency_seconds'));
  test('Metrics has provider metrics', text.includes('search_results_by_source_total'));
  test('Metrics has cache metrics', text.includes('cache_operations_total'));
  test('Metrics has http metrics', text.includes('http_requests_total'));

  // Count unique metric types
  const metricLines = text.split('\n').filter(l => !l.startsWith('#') && l.trim());
  test('Metrics has sufficient data', metricLines.length > 10, `Got ${metricLines.length} metric lines`);

  return text;
}

async function testProduct() {
  console.log('\n🔍 Testing /api/product endpoint...\n');

  const response = await fetch(`${BASE_URL}/api/product?mpn=2N3904`);
  const data = await response.json();

  test('Product returns 200', response.status === 200);
  test('Product has ok field', typeof data.ok === 'boolean');

  if (data.ok && data.product) {
    test('Product has data', data.product !== null);
    test('Product has mpn', typeof data.product.mpn === 'string');
    test('Product has priceBreaks', Array.isArray(data.product.priceBreaks));
    test('Product has price breaks data', data.product.priceBreaks.length > 0);
  }

  return data;
}

async function testCurrency() {
  console.log('\n💱 Testing /api/currency/rates endpoint...\n');

  const response = await fetch(`${BASE_URL}/api/currency/rates`);
  const data = await response.json();

  test('Currency returns 200', response.status === 200);
  test('Currency has rates', typeof data.rates === 'object');
  test('Currency has USD rate', typeof data.rates?.USD === 'number');
  test('Currency has EUR rate', typeof data.rates?.EUR === 'number');
  test('Currency has timestamp', typeof data.timestamp === 'number');
  test('Currency has source', typeof data.source === 'string');

  return data;
}

async function runAllTests() {
  console.log('🧪 API Validation Tests (Simplified)');
  console.log(`Base URL: ${BASE_URL}\n`);
  console.log('='.repeat(60));

  try {
    await testSearch();
    await testHealth();
    await testMetrics();
    await testProduct();
    await testCurrency();
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Final Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%\n`);

  return failed === 0 ? 0 : 1;
}

runAllTests()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
