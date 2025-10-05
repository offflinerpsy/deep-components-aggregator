#!/usr/bin/env node
/**
 * Russian Search Normalization Test Suite
 * 
 * Tests the normalization system with real-world Russian queries
 * and generates artifacts for verification
 */

import { normalizeRussianQuery, getTestCases } from '../src/search/russianNormalization.mjs';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test cases with expected results
const TEST_CASES = [
  {
    name: 'Russian transistor with MPN',
    query: 'транзистор 2N3904',
    expectedMPNs: ['2N3904'],
    expectedTokens: ['transistor'],
    shouldHaveCyrillic: true
  },
  {
    name: 'Russian capacitor with specs',
    query: 'конденсатор 1000мкф 25в',
    expectedTokens: ['capacitor'],
    shouldHaveCyrillic: true
  },
  {
    name: 'Russian Schottky diode',
    query: 'диод шоттки 3А',
    expectedTokens: ['diode'],
    shouldHaveCyrillic: true
  },
  {
    name: 'English MPN only',
    query: 'NE555',
    expectedMPNs: ['NE555'],
    shouldHaveCyrillic: false
  },
  {
    name: 'Russian plural form',
    query: 'транзисторы',
    expectedTokens: ['transistor'],
    shouldHaveCyrillic: true
  },
  {
    name: 'Mixed English with specs',
    query: 'resistor 10k 1%',
    expectedTokens: ['resistor'],
    shouldHaveCyrillic: false
  }
];

/**
 * Runs a single test case
 * @param {Object} testCase - Test case definition
 * @returns {Object} Test result
 */
function runTestCase(testCase) {
  const result = normalizeRussianQuery(testCase.query);
  const errors = [];
  
  // Check success
  if (!result.success) {
    errors.push(`Normalization failed: ${result.error}`);
  }
  
  // Check Cyrillic detection
  if (result.hasCyrillic !== testCase.shouldHaveCyrillic) {
    errors.push(`Cyrillic detection mismatch: expected ${testCase.shouldHaveCyrillic}, got ${result.hasCyrillic}`);
  }
  
  // Check expected MPNs
  if (testCase.expectedMPNs) {
    const missing = testCase.expectedMPNs.filter(mpn => !result.mpns.includes(mpn));
    if (missing.length > 0) {
      errors.push(`Missing MPNs: ${missing.join(', ')}`);
    }
  }
  
  // Check expected tokens
  if (testCase.expectedTokens) {
    const missing = testCase.expectedTokens.filter(token => !result.tokens.includes(token));
    if (missing.length > 0) {
      errors.push(`Missing tokens: ${missing.join(', ')}`);
    }
  }
  
  return {
    name: testCase.name,
    query: testCase.query,
    passed: errors.length === 0,
    errors,
    result
  };
}

/**
 * Main test runner
 */
function runTests() {
  console.log('🧪 Russian Search Normalization Test Suite');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  const results = [];
  
  // Run all test cases
  for (const testCase of TEST_CASES) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`   Query: "${testCase.query}"`);
    
    const result = runTestCase(testCase);
    results.push(result);
    
    if (result.passed) {
      console.log(`   ✅ PASSED`);
      console.log(`   📝 Normalized: "${result.result.normalized}"`);
      if (result.result.mpns.length > 0) {
        console.log(`   🏷️  MPNs: ${result.result.mpns.join(', ')}`);
      }
      if (result.result.tokens.length > 0) {
        console.log(`   🔤 Tokens: ${result.result.tokens.join(', ')}`);
      }
    } else {
      console.log(`   ❌ FAILED`);
      result.errors.forEach(error => {
        console.log(`   💥 ${error}`);
      });
    }
  }
  
  const endTime = Date.now();
  const elapsed = endTime - startTime;
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\n📊 Test Summary:`);
  console.log(`   Total tests: ${total}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${total - passed}`);
  console.log(`   Success rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`   Duration: ${elapsed}ms`);
  
  // Generate artifacts
  const artifactPath = join(__dirname, '../docs/_artifacts/full-pass-2025-10-05');
  
  // Test results JSON
  const testResults = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed: total - passed,
      successRate: (passed / total) * 100,
      duration: elapsed
    },
    testCases: results.map(r => ({
      name: r.name,
      query: r.query,
      passed: r.passed,
      errors: r.errors,
      normalized: r.result.normalized,
      mpns: r.result.mpns,
      tokens: r.result.tokens,
      hasCyrillic: r.result.hasCyrillic,
      metadata: r.result.metadata
    }))
  };
  
  writeFileSync(
    join(artifactPath, 'search-cases.json'),
    JSON.stringify(testResults, null, 2)
  );
  
  // Additional verification cases (from task requirements)
  console.log(`\n🎯 Running additional verification cases...`);
  
  const verificationCases = getTestCases();
  const verificationResults = {
    timestamp: new Date().toISOString(),
    cases: verificationCases
  };
  
  writeFileSync(
    join(artifactPath, 'search-verification.json'),
    JSON.stringify(verificationResults, null, 2)
  );
  
  console.log(`\n📄 Artifacts created:`);
  console.log(`   📊 search-cases.json - Test results`);
  console.log(`   ✅ search-verification.json - Verification cases`);
  
  // Exit with appropriate code
  if (passed === total) {
    console.log(`\n🎉 All tests passed!`);
    process.exit(0);
  } else {
    console.log(`\n💥 Some tests failed!`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}