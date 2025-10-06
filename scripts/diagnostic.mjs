#!/usr/bin/env node
/**
 * ULTIMATE DIAGNOSTIC TOOL
 * Проверяет все аспекты Deep Components Aggregator
 */

import 'dotenv/config';
import { mouserSearchByKeyword, mouserSearchByPartNumber } from './src/integrations/mouser/client.mjs';
import { farnellByMPN, farnellByKeyword } from './src/integrations/farnell/client.mjs';

console.log('🔬 DEEP COMPONENTS AGGREGATOR - DIAGNOSTIC TOOL\n');
console.log('='.repeat(60));

// ============================================
// 1. ПРОВЕРКА ОКРУЖЕНИЯ
// ============================================
console.log('\n📋 STEP 1: Environment Check');
console.log('-'.repeat(60));

const env = {
  MOUSER_API_KEY: process.env.MOUSER_API_KEY,
  FARNELL_API_KEY: process.env.FARNELL_API_KEY,
  FARNELL_REGION: process.env.FARNELL_REGION || 'uk.farnell.com',
  PORT: process.env.PORT || 9201,
  NODE_VERSION: process.version
};

for (const [key, value] of Object.entries(env)) {
  const status = value ? '✅' : '❌';
  const display = key.includes('KEY') && value ? `${value.slice(0, 8)}...` : value;
  console.log(`${status} ${key}: ${display || 'NOT SET'}`);
}

// ============================================
// 2. ТЕСТ MOUSER API
// ============================================
console.log('\n🐭 STEP 2: Mouser API Test');
console.log('-'.repeat(60));

if (!env.MOUSER_API_KEY) {
  console.log('❌ Mouser API key not configured');
} else {
  try {
    console.log('Testing keyword search: "LM317"...');
    const result1 = await mouserSearchByKeyword({
      apiKey: env.MOUSER_API_KEY,
      q: 'LM317'
    });
    
    const parts = result1?.data?.SearchResults?.Parts || [];
    console.log(`✅ Mouser keyword search: ${parts.length} results`);
    
    if (parts.length > 0) {
      console.log(`   First result: ${parts[0].ManufacturerPartNumber} (${parts[0].Manufacturer})`);
    }
    
    console.log('\nTesting part number search: "LM317"...');
    const result2 = await mouserSearchByPartNumber({
      apiKey: env.MOUSER_API_KEY,
      mpn: 'LM317'
    });
    
    const parts2 = result2?.data?.SearchResults?.Parts || [];
    console.log(`✅ Mouser MPN search: ${parts2.length} results`);
    
  } catch (error) {
    console.log(`❌ Mouser API Error: ${error.message}`);
    console.log(`   Status: ${error.cause?.status || 'N/A'}`);
    console.log(`   Response: ${JSON.stringify(error.cause?.data || {}).slice(0, 200)}`);
  }
}

// ============================================
// 3. ТЕСТ FARNELL API
// ============================================
console.log('\n🔷 STEP 3: Farnell API Test');
console.log('-'.repeat(60));

if (!env.FARNELL_API_KEY) {
  console.log('❌ Farnell API key not configured');
} else {
  try {
    console.log('Testing keyword search: "LM317"...');
    const result1 = await farnellByKeyword({
      apiKey: env.FARNELL_API_KEY,
      region: env.FARNELL_REGION,
      q: 'LM317',
      limit: 10
    });
    
    const products = result1?.data?.products || [];
    console.log(`✅ Farnell keyword search: ${products.length} results`);
    
    if (products.length > 0) {
      console.log(`   First result: ${products[0].manufacturerPartNumber} (${products[0].brandName})`);
    }
    
    console.log('\nTesting MPN search: "LM317"...');
    const result2 = await farnellByMPN({
      apiKey: env.FARNELL_API_KEY,
      region: env.FARNELL_REGION,
      q: 'LM317',
      limit: 10
    });
    
    const products2 = result2?.data?.products || [];
    console.log(`✅ Farnell MPN search: ${products2.length} results`);
    
  } catch (error) {
    console.log(`❌ Farnell API Error: ${error.message}`);
    console.log(`   Status: ${error.cause?.status || 'N/A'}`);
    console.log(`   Response: ${JSON.stringify(error.cause?.data || {}).slice(0, 200)}`);
  }
}

// ============================================
// 4. ТЕСТ РАЗНЫХ ЗАПРОСОВ
// ============================================
console.log('\n🔍 STEP 4: Testing Various Search Queries');
console.log('-'.repeat(60));

const testQueries = [
  { q: 'LM317', type: 'likely MPN' },
  { q: 'STM32F103', type: 'likely MPN' },
  { q: 'capacitor', type: 'keyword' },
  { q: 'резистор', type: 'cyrillic (should skip Mouser)' }
];

for (const test of testQueries) {
  console.log(`\nQuery: "${test.q}" (${test.type})`);
  
  const isCyrillic = /[А-Яа-яЁё]/.test(test.q);
  const isLikelyMPN = /^[A-Za-z0-9][A-Za-z0-9\-\._]{1,}$/i.test(test.q) && /\d/.test(test.q);
  
  console.log(`  - Cyrillic: ${isCyrillic ? 'YES (skip Mouser)' : 'NO'}`);
  console.log(`  - Likely MPN: ${isLikelyMPN ? 'YES' : 'NO'}`);
}

// ============================================
// 5. ИТОГИ
// ============================================
console.log('\n📊 DIAGNOSTIC SUMMARY');
console.log('='.repeat(60));

const issues = [];

if (!env.MOUSER_API_KEY) issues.push('❌ Mouser API key missing');
if (!env.FARNELL_API_KEY) issues.push('❌ Farnell API key missing');

if (issues.length === 0) {
  console.log('✅ All checks passed! Server should work.');
} else {
  console.log('⚠️  Issues found:');
  issues.forEach(issue => console.log(`   ${issue}`));
}

console.log('\n💡 Next steps:');
console.log('   1. Check logs above for API errors');
console.log('   2. Verify API keys are valid');
console.log('   3. Test direct API endpoints: curl http://localhost:9201/api/search?q=LM317');
console.log('   4. Check browser console for frontend errors');

console.log('\n' + '='.repeat(60));
console.log('Diagnostic complete!\n');
