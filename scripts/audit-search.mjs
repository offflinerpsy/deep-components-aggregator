#!/usr/bin/env node
/**
 * Search Cases Audit Script
 * Tests 6 search queries (RU + EN) and saves results
 */

import { fetch } from 'undici';
import fs from 'node:fs';
import path from 'node:path';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:9201';
const OUTPUT_DIR = 'docs/_artifacts/audit-2025-10-04';

const TEST_CASES = [
  { q: 'транзистор 2N3904', lang: 'ru', desc: 'Russian search with MPN' },
  { q: 'конденсатор 1000мкф 25в', lang: 'ru', desc: 'Russian capacitor specs' },
  { q: 'диод Шоттки 3А', lang: 'ru', desc: 'Russian Schottky diode' },
  { q: 'микросхема NE555', lang: 'ru', desc: 'Russian IC with MPN' },
  { q: 'транзисторы', lang: 'ru', desc: 'Russian generic search' },
  { q: 'resistor 10k 1%', lang: 'en', desc: 'English resistor specs' }
];

async function testSearch(query) {
  console.log(`\n🔍 Testing: "${query}"`);
  
  try {
    const url = `${SERVER_URL}/api/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`  ✅ ${data.rows?.length || 0} results from ${data.meta?.source || 'unknown'}`);
    
    return {
      success: true,
      status: response.status,
      data: data,
      result_count: data.rows?.length || 0,
      source: data.meta?.source || 'unknown'
    };
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔎 Search Cases Audit');
  console.log(`Server: ${SERVER_URL}\n`);
  
  // Check if server is running
  try {
    const healthCheck = await fetch(`${SERVER_URL}/api/health`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!healthCheck.ok) {
      console.error('❌ Server not responding to /api/health');
      process.exit(1);
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error(`❌ Cannot reach server at ${SERVER_URL}`);
    console.error(`   Error: ${error.message}`);
    console.error('\n💡 Please start the server first: npm start');
    process.exit(1);
  }
  
  const results = [];
  
  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    const caseNum = i + 1;
    
    const result = await testSearch(testCase.q);
    
    const caseResult = {
      q: testCase.q,
      lang_detected: testCase.lang,
      description: testCase.desc,
      api_status: result.success ? result.status : 'error',
      result_count: result.result_count || 0,
      source: result.source || null,
      api_raw: `search-${caseNum}.json`
    };
    
    results.push(caseResult);
    
    // Save raw API response
    const rawPath = path.join(OUTPUT_DIR, `search-${caseNum}.json`);
    fs.writeFileSync(rawPath, JSON.stringify(result.data || { error: result.error }, null, 2));
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Save summary
  const summaryPath = path.join(OUTPUT_DIR, 'search-cases.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ Audit complete`);
  console.log(`   Summary: ${summaryPath}`);
  console.log(`   Raw responses: search-1.json through search-6.json`);
  
  // Summary stats
  const successful = results.filter(r => r.result_count > 0).length;
  const failed = results.length - successful;
  
  console.log(`\n📊 Results:`);
  console.log(`   Successful: ${successful}/${results.length}`);
  console.log(`   Failed/Empty: ${failed}/${results.length}`);
  
  // Note about screenshots
  console.log(`\n📸 Note: Screenshots need to be captured manually`);
  console.log(`   Please capture desktop + mobile views for each search`);
  console.log(`   Save as: search-1-desktop.png, search-1-mobile.png, etc.`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
