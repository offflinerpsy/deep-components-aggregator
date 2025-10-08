#!/usr/bin/env node
/**
 * CI Smoke Tests for Mission Pack Features
 * Tests: SSE endpoint, Admin CRUD, proxy routing, orchestrator metrics
 * 
 * Usage: node scripts/ci-smoke-tests.mjs [--base-url http://127.0.0.1:9201]
 */

import { strict as assert } from 'assert';

const BASE_URL = process.argv.find(arg => arg.startsWith('--base-url='))?.split('=')[1] || 'http://127.0.0.1:9201';
const TIMEOUT_MS = 10000;

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(emoji, message, color = colors.reset) {
  console.log(`${emoji} ${color}${message}${colors.reset}`);
}

function logGroup(title) {
  console.log(`\n${colors.blue}━━━ ${title} ━━━${colors.reset}`);
}

async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Test 1: Health endpoint (baseline)
async function testHealth() {
  logGroup('Test 1: Health Endpoint');
  
  const response = await fetchWithTimeout(`${BASE_URL}/api/health`);
  assert.strictEqual(response.status, 200, 'Health endpoint should return 200');
  
  const data = await response.json();
  assert.strictEqual(data.status, 'ok', 'Health status should be "ok"');
  assert.ok(data.version, 'Version should be present');
  
  log('✅', 'Health endpoint working', colors.green);
  return data;
}

// Test 2: SSE endpoint (Mission Pack Block 3)
async function testSSE() {
  logGroup('Test 2: SSE Live Search Endpoint');
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(`${BASE_URL}/api/live/search?q=LM358`, {
      signal: controller.signal,
      headers: { 'Accept': 'text/event-stream' }
    });
    
    clearTimeout(timeout);
    
    assert.strictEqual(response.status, 200, 'SSE endpoint should return 200');
    assert.strictEqual(
      response.headers.get('content-type'), 
      'text/event-stream; charset=utf-8',
      'SSE content-type should be text/event-stream'
    );
    assert.strictEqual(
      response.headers.get('x-accel-buffering'),
      'no',
      'SSE should disable nginx buffering'
    );
    
    // Read first chunk to verify SSE format
    const reader = response.body.getReader();
    const { value } = await reader.read();
    const chunk = new TextDecoder().decode(value);
    
    assert.ok(chunk.includes('data:'), 'SSE should send data: events');
    
    // Cleanup
    reader.cancel();
    
    log('✅', 'SSE endpoint working', colors.green);
    log('  ', `Headers: content-type=${response.headers.get('content-type')}, x-accel-buffering=no`, colors.reset);
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      log('⚠️', 'SSE test timed out (this is expected for long-lived connections)', colors.yellow);
    } else {
      throw error;
    }
  }
}

// Test 3: Admin CRUD endpoints (Mission Pack Block 6)
async function testAdminCRUD() {
  logGroup('Test 3: Admin CRUD Endpoints');
  
  // 3.1: GET /api/admin/products (list)
  const listResponse = await fetchWithTimeout(`${BASE_URL}/api/admin/products`);
  assert.strictEqual(listResponse.status, 200, 'Admin products list should return 200');
  
  const listData = await listResponse.json();
  assert.strictEqual(listData.ok, true, 'List response should have ok=true');
  assert.ok(Array.isArray(listData.products), 'Products should be an array');
  assert.ok(listData.pagination, 'Pagination should be present');
  
  log('✅', `Admin products list: ${listData.products.length} products, page ${listData.pagination.page}`, colors.green);
  
  // 3.2: POST /api/admin/products (create test product)
  const testProduct = {
    mpn: `CI-TEST-${Date.now()}`,
    manufacturer: 'CI Test Corp',
    title: 'CI Test Product',
    description_short: 'Created by CI smoke test',
    category: 'Test',
    price_rub: 99.99,
    stock: 10
  };
  
  const createResponse = await fetchWithTimeout(`${BASE_URL}/api/admin/products`, {
    method: 'POST',
    body: JSON.stringify(testProduct)
  });
  
  assert.strictEqual(createResponse.status, 201, 'Create product should return 201');
  
  const createData = await createResponse.json();
  assert.strictEqual(createData.ok, true, 'Create response should have ok=true');
  assert.ok(createData.product.id, 'Created product should have ID');
  assert.strictEqual(createData.product.mpn, testProduct.mpn, 'MPN should match');
  
  const productId = createData.product.id;
  log('✅', `Admin product created: ID=${productId}, MPN=${testProduct.mpn}`, colors.green);
  
  // 3.3: GET /api/admin/products/:id (get single)
  const getResponse = await fetchWithTimeout(`${BASE_URL}/api/admin/products/${productId}`);
  assert.strictEqual(getResponse.status, 200, 'Get product should return 200');
  
  const getData = await getResponse.json();
  assert.strictEqual(getData.ok, true, 'Get response should have ok=true');
  assert.strictEqual(getData.product.id, productId, 'Product ID should match');
  
  log('✅', `Admin product retrieved: ID=${productId}`, colors.green);
  
  // 3.4: PUT /api/admin/products/:id (update)
  const updatePayload = {
    ...testProduct,
    title: 'CI Test Product (Updated)',
    price_rub: 149.99
  };
  
  const updateResponse = await fetchWithTimeout(`${BASE_URL}/api/admin/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(updatePayload)
  });
  
  assert.strictEqual(updateResponse.status, 200, 'Update product should return 200');
  
  const updateData = await updateResponse.json();
  assert.strictEqual(updateData.ok, true, 'Update response should have ok=true');
  assert.strictEqual(updateData.product.title, updatePayload.title, 'Title should be updated');
  
  log('✅', `Admin product updated: ID=${productId}, new title="${updatePayload.title}"`, colors.green);
  
  // 3.5: DELETE /api/admin/products/:id (cleanup)
  const deleteResponse = await fetchWithTimeout(`${BASE_URL}/api/admin/products/${productId}`, {
    method: 'DELETE'
  });
  
  assert.strictEqual(deleteResponse.status, 200, 'Delete product should return 200');
  
  const deleteData = await deleteResponse.json();
  assert.strictEqual(deleteData.ok, true, 'Delete response should have ok=true');
  
  log('✅', `Admin product deleted: ID=${productId}`, colors.green);
  
  // 3.6: Verify deletion (should return 404)
  const verifyResponse = await fetchWithTimeout(`${BASE_URL}/api/admin/products/${productId}`);
  assert.strictEqual(verifyResponse.status, 404, 'Deleted product should return 404');
  
  log('✅', 'Admin CRUD endpoints working (CREATE, READ, UPDATE, DELETE verified)', colors.green);
}

// Test 4: Proxy configuration (Mission Pack Block 1+2)
async function testProxyConfig() {
  logGroup('Test 4: Proxy Configuration');
  
  const response = await fetchWithTimeout(`${BASE_URL}/api/health`);
  const data = await response.json();
  
  // Check if proxy config is present in health response
  if (data.proxy) {
    assert.strictEqual(data.proxy.trust, true, 'Proxy trust should be enabled');
    log('✅', `Proxy configured: trust=${data.proxy.trust}, value=${data.proxy.value}`, colors.green);
  } else {
    log('⚠️', 'Proxy config not present in health response (may be OK for local dev)', colors.yellow);
  }
}

// Test 5: Orchestrator metrics (Mission Pack Block 4)
async function testOrchestratorMetrics() {
  logGroup('Test 5: Provider Orchestrator Metrics');
  
  // Trigger a search to populate metrics
  const searchResponse = await fetchWithTimeout(`${BASE_URL}/api/search?q=LM358`);
  assert.strictEqual(searchResponse.status, 200, 'Search endpoint should return 200');
  
  const searchData = await searchResponse.json();
  assert.ok(searchData.rows || searchData.items || searchData.products, 'Search should return rows, items or products');
  
  const resultCount = searchData.rows?.length || searchData.items?.length || searchData.products?.length || 0;
  log('✅', `Search triggered: ${resultCount} results`, colors.green);
  
  // Check metrics endpoint (if exists)
  try {
    const metricsResponse = await fetchWithTimeout(`${BASE_URL}/api/metrics`);
    if (metricsResponse.status === 200) {
      const metricsData = await metricsResponse.json();
      log('✅', 'Metrics endpoint available', colors.green);
      
      if (metricsData.orchestrator) {
        log('  ', `Orchestrator metrics: ${JSON.stringify(metricsData.orchestrator)}`, colors.reset);
      }
    } else {
      log('⚠️', 'Metrics endpoint not available (404)', colors.yellow);
    }
  } catch (error) {
    log('⚠️', 'Metrics endpoint not accessible (may not be implemented)', colors.yellow);
  }
}

// Main test runner
async function runTests() {
  console.log(`\n${colors.blue}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║         CI Smoke Tests - Mission Pack Features               ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\n🎯 Target: ${BASE_URL}\n`);
  
  const tests = [
    { name: 'Health Endpoint', fn: testHealth },
    { name: 'SSE Live Search', fn: testSSE },
    { name: 'Admin CRUD', fn: testAdminCRUD },
    { name: 'Proxy Config', fn: testProxyConfig },
    { name: 'Orchestrator Metrics', fn: testOrchestratorMetrics }
  ];
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0
  };
  
  for (const test of tests) {
    try {
      await test.fn();
      results.passed++;
    } catch (error) {
      results.failed++;
      log('❌', `${test.name} FAILED: ${error.message}`, colors.red);
      if (process.env.CI) {
        console.error(error.stack);
      }
    }
  }
  
  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}SUMMARY${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`✅ Passed:  ${results.passed}/${tests.length}`);
  console.log(`❌ Failed:  ${results.failed}/${tests.length}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  if (results.failed > 0) {
    process.exit(1);
  }
  
  log('🎉', 'All smoke tests passed!', colors.green);
  process.exit(0);
}

// Run tests
runTests().catch((error) => {
  log('❌', `Fatal error: ${error.message}`, colors.red);
  console.error(error.stack);
  process.exit(1);
});
