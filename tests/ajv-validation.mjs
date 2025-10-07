#!/usr/bin/env node
/**
 * AJV Schema Validation Tests for API Endpoints
 *
 * Tests:
 * 1. /api/search response format
 * 2. /api/health response format
 * 3. /api/metrics format (text/plain prometheus)
 *
 * Uses existing JSON schemas from schemas/ directory
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = process.env.API_URL || 'http://localhost:9201';

// Initialize AJV
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Load schemas
const searchSchema = JSON.parse(readFileSync(join(__dirname, '../schemas/canon.search.json'), 'utf8'));
const productSchema = JSON.parse(readFileSync(join(__dirname, '../schemas/canon.product.json'), 'utf8'));

// Test counter
let passed = 0;
let failed = 0;

function testResult(name, success, details = '') {
  if (success) {
    passed++;
    console.log(`✅ ${name}`);
  } else {
    failed++;
    console.error(`❌ ${name}`);
    if (details) console.error(`   ${details}`);
  }
}

async function testSearchEndpoint() {
  console.log('\n📦 Testing /api/search endpoint...');

  const testQueries = ['2N3904', 'STM32F103C8T6', 'DS12C887+'];

  for (const query of testQueries) {
    try {
      const response = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      // Test 1: HTTP 200
      testResult(
        `Search "${query}" returns 200`,
        response.status === 200,
        `Got ${response.status}`
      );

      // Test 2: Response has required fields
      testResult(
        `Search "${query}" has ok/rows/meta`,
        data.ok === true && Array.isArray(data.rows) && typeof data.meta === 'object',
        JSON.stringify({ ok: data.ok, rowsIsArray: Array.isArray(data.rows), metaExists: !!data.meta })
      );

      // Test 3: Meta has providers array
      testResult(
        `Search "${query}" meta has providers`,
        Array.isArray(data.meta?.providers) && data.meta.providers.length > 0,
        `Providers: ${data.meta?.providers?.length || 0}`
      );

      // Test 4: Each row matches schema
      if (data.rows && data.rows.length > 0) {
        const validate = ajv.compile(searchSchema);
        const allValid = data.rows.every(row => validate(row));
        testResult(
          `Search "${query}" rows match schema`,
          allValid,
          validate.errors ? JSON.stringify(validate.errors.slice(0, 3)) : ''
        );
      }

      // Test 5: Currency info present
      testResult(
        `Search "${query}" has currency info`,
        data.meta?.currency?.rates?.USD && data.meta?.currency?.date,
        `USD: ${data.meta?.currency?.rates?.USD}, Date: ${data.meta?.currency?.date}`
      );

    } catch (error) {
      testResult(`Search "${query}" request`, false, error.message);
    }
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing /api/health endpoint...');

  try {
    const response = await fetch(`${BASE_URL}/api/health?probe=true`);
    const data = await response.json();

    testResult('Health returns 200', response.status === 200);
    testResult('Health has status', typeof data.status === 'string');
    testResult('Health has providers', typeof data.providers === 'object');

    // Check each provider
    const providers = ['mouser', 'digikey', 'tme', 'farnell'];
    providers.forEach(provider => {
      const providerData = data.providers?.[provider];
      testResult(
        `Health ${provider} has status`,
        providerData?.status === 'ready' || providerData?.status === 'down' || providerData?.status === 'disabled'
      );
    });

  } catch (error) {
    testResult('Health request', false, error.message);
  }
}

async function testMetricsEndpoint() {
  console.log('\n📊 Testing /api/metrics endpoint...');

  try {
    const response = await fetch(`${BASE_URL}/api/metrics`);
    const text = await response.text();

    testResult('Metrics returns 200', response.status === 200);
    testResult('Metrics is text', response.headers.get('content-type')?.includes('text/plain'));

    // Check for key metrics
    const expectedMetrics = [
      'search_requests_total',
      'search_latency_seconds',
      'search_results_by_source_total',
      'cache_operations_total',
      'http_requests_total'
    ];

    expectedMetrics.forEach(metric => {
      testResult(
        `Metrics contains ${metric}`,
        text.includes(metric)
      );
    });

  } catch (error) {
    testResult('Metrics request', false, error.message);
  }
}

async function testProductEndpoint() {
  console.log('\n🔍 Testing /api/product endpoint...');

  const testMPNs = ['2N3904'];

  for (const mpn of testMPNs) {
    try {
      const response = await fetch(`${BASE_URL}/api/product?mpn=${encodeURIComponent(mpn)}`);
      const data = await response.json();

      testResult(`Product "${mpn}" returns 200`, response.status === 200);

      if (data.ok && data.product) {
        // Validate against product schema
        const validate = ajv.compile(productSchema);
        const valid = validate(data.product);
        testResult(
          `Product "${mpn}" matches schema`,
          valid,
          validate.errors ? JSON.stringify(validate.errors.slice(0, 3)) : ''
        );

        testResult(
          `Product "${mpn}" has price breaks`,
          Array.isArray(data.product?.priceBreaks) && data.product.priceBreaks.length > 0
        );
      }

    } catch (error) {
      testResult(`Product "${mpn}" request`, false, error.message);
    }
  }
}

async function runTests() {
  console.log('🧪 AJV Schema Validation Tests\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  console.log('='.repeat(60));

  await testSearchEndpoint();
  await testHealthEndpoint();
  await testMetricsEndpoint();
  await testProductEndpoint();

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`Success Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
