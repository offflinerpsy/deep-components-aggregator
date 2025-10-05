#!/usr/bin/env node
// Production Russian Search Verification
// Tests 5 Russian queries against live server with artifacts generation

import { writeFile } from 'fs/promises';
import { join } from 'path';

const PROD_URL = 'http://5.129.228.88:9201';
const ARTIFACT_DIR = 'docs/_artifacts/live-pass-2025-10-05';

const RUSSIAN_QUERIES = [
  { ru: 'резистор', transliterated: 'rezistor', expected: 'resistor' },
  { ru: 'конденсатор', transliterated: 'kondensator', expected: 'capacitor' },
  { ru: 'микросхема', transliterated: 'mikroskhema', expected: 'IC|chip|integrated' },
  { ru: 'транзистор', transliterated: 'tranzistor', expected: 'transistor' },
  { ru: 'диод', transliterated: 'diod', expected: 'diode' }
];

/**
 * Test a single Russian query against production API
 */
async function testQuery(query) {
  console.log(`\n🔍 Testing: "${query.ru}" (${query.transliterated})`);
  
  const url = `${PROD_URL}/api/search?q=${encodeURIComponent(query.ru)}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        query: query.ru,
        status: 'FAILED',
        error: `HTTP ${response.status}: ${response.statusText}`,
        duration
      };
    }
    
    const data = await response.json();
    
    // Validate response structure
    if (!data.rows || !Array.isArray(data.rows)) {
      return {
        query: query.ru,
        status: 'FAILED',
        error: 'Invalid response structure - missing rows array',
        duration,
        response: data
      };
    }
    
    // Check if results are relevant
    const hasResults = data.rows.length > 0;
    const relevanceCheck = hasResults && data.rows.some(item => {
      const searchIn = `${item.title || ''} ${item.description || ''} ${item.category || ''}`.toLowerCase();
      return query.expected.split('|').some(term => searchIn.includes(term.toLowerCase()));
    });
    
    return {
      query: query.ru,
      transliterated: query.transliterated,
      status: relevanceCheck ? 'PASSED' : (hasResults ? 'PARTIAL' : 'FAILED'),
      resultsCount: data.rows.length,
      duration,
      results: data.rows.slice(0, 3).map(r => ({
        source: r.source || data.meta?.source,
        title: r.title?.substring(0, 80),
        mpn: r.mpn,
        manufacturer: r.manufacturer,
        price: r.price,
        currency: r.currency
      })),
      normalizedQuery: data.meta?.usedQuery || query.transliterated,
      relevanceMatch: relevanceCheck,
      searchMeta: {
        source: data.meta?.source,
        strategy: data.meta?.searchStrategy,
        hasCyrillic: data.meta?.hasCyrillic,
        attempts: data.meta?.attempts
      }
    };
    
  } catch (error) {
    return {
      query: query.ru,
      status: 'ERROR',
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run all tests and generate artifacts
 */
async function runTests() {
  console.log('🚀 Russian Search Production Verification');
  console.log(`📍 Target: ${PROD_URL}`);
  console.log(`📋 Queries: ${RUSSIAN_QUERIES.length}\n`);
  
  const results = [];
  
  for (const query of RUSSIAN_QUERIES) {
    const result = await testQuery(query);
    results.push(result);
    
    // Visual feedback
    const emoji = result.status === 'PASSED' ? '✅' : 
                  result.status === 'PARTIAL' ? '⚠️' : '❌';
    console.log(`${emoji} ${result.query}: ${result.status} (${result.duration}ms, ${result.resultsCount || 0} results)`);
  }
  
  // Calculate statistics
  const stats = {
    total: results.length,
    passed: results.filter(r => r.status === 'PASSED').length,
    partial: results.filter(r => r.status === 'PARTIAL').length,
    failed: results.filter(r => r.status === 'FAILED' || r.status === 'ERROR').length,
    avgDuration: Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length),
    totalResults: results.reduce((sum, r) => sum + (r.resultsCount || 0), 0)
  };
  
  // Generate artifact
  const artifact = {
    blockId: 1,
    blockName: 'Russian Search Production Verification',
    timestamp: new Date().toISOString(),
    productionUrl: PROD_URL,
    statistics: stats,
    queries: results,
    verdict: stats.passed >= 4 ? 'PASSED' : 'NEEDS_IMPROVEMENT',
    notes: [
      'Testing Cyrillic-to-Latin transliteration in production',
      'Validating search relevance and response times',
      'Verifying all Russian electronics terms work correctly'
    ]
  };
  
  // Save artifact
  const artifactPath = join(ARTIFACT_DIR, 'block-1-russian-search.json');
  await writeFile(artifactPath, JSON.stringify(artifact, null, 2));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${stats.passed}/${stats.total}`);
  console.log(`⚠️  Partial: ${stats.partial}/${stats.total}`);
  console.log(`❌ Failed: ${stats.failed}/${stats.total}`);
  console.log(`⏱️  Avg Response: ${stats.avgDuration}ms`);
  console.log(`📦 Total Results: ${stats.totalResults}`);
  console.log(`\n🎯 Verdict: ${artifact.verdict}`);
  console.log(`💾 Artifact: ${artifactPath}`);
  
  return artifact.verdict === 'PASSED' ? 0 : 1;
}

runTests().then(code => process.exit(code)).catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
