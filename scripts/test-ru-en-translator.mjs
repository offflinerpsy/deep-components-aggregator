#!/usr/bin/env node
/**
 * Test RU→EN translator with search-cases.json
 * Runs 20 battle-tested Russian queries and verifies translations
 * 
 * Usage: node scripts/test-ru-en-translator.mjs
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { translateRuToEn, getStats } from '../src/i18n/ru-en-translator.mjs';

// Load test cases
const testCasesPath = join(process.cwd(), 'search-cases.json');
const testCases = JSON.parse(readFileSync(testCasesPath, 'utf-8'));

async function runTests() {
  console.log('🧪 Testing RU→EN Translator\n');
  
  // Show stats
  const stats = getStats();
  console.log(`📊 Loaded Resources:`);
  console.log(`   Glossary: ${stats.glossaryTerms} terms`);
  console.log(`   Units: ${stats.unitConversions} conversions\n`);
  
  console.log('─'.repeat(80));
  
  const results = [];
  let passCount = 0;
  let failCount = 0;
  
  for (const testCase of testCases) {
    const { id, input_ru, expected_en, expect_results } = testCase;
    
    console.log(`\n[Test ${id}] ${input_ru}`);
    
    const result = await translateRuToEn(input_ru);
    const { translated, stages = {}, provider, latency, warning, skipped } = result;
    
    console.log(`  → Translated: ${translated}`);
    console.log(`  → Expected:   ${expected_en}`);
    
    // Fuzzy match (case-insensitive, normalized spaces)
    const translatedNorm = translated.toLowerCase().replace(/\s+/g, ' ');
    const expectedNorm = expected_en.toLowerCase().replace(/\s+/g, ' ');
    const match = translatedNorm === expectedNorm;
    
    const coverage = stages.glossaryCoverage || 100; // 100% if skipped (already English)
    
    if (match) {
      console.log(`  ✅ PASS (${latency}ms, ${coverage}% coverage${skipped ? ', skipped - no Russian' : ''})`);
      passCount++;
    } else {
      console.log(`  ❌ FAIL`);
      console.log(`     Coverage: ${coverage}%`);
      if (stages.missingWords?.length > 0) {
        console.log(`     Missing: ${stages.missingWords.join(', ')}`);
      }
      failCount++;
    }
    
    if (warning) {
      console.log(`  ⚠️  ${warning}`);
    }
    
    results.push({
      id,
      input: input_ru,
      translated,
      expected: expected_en,
      match,
      coverage: stages.glossaryCoverage,
      missingWords: stages.missingWords || [],
      latency
    });
  }
  
  console.log('\n' + '─'.repeat(80));
  console.log('\n📈 Summary:');
  console.log(`   Total: ${testCases.length} tests`);
  console.log(`   Passed: ${passCount} (${Math.round(passCount/testCases.length*100)}%)`);
  console.log(`   Failed: ${failCount} (${Math.round(failCount/testCases.length*100)}%)`);
  
  // Calculate average coverage
  const avgCoverage = results.reduce((sum, r) => sum + r.coverage, 0) / results.length;
  console.log(`   Avg Coverage: ${Math.round(avgCoverage)}%`);
  
  // Collect all missing words
  const allMissing = new Set();
  results.forEach(r => r.missingWords.forEach(w => allMissing.add(w)));
  
  if (allMissing.size > 0) {
    console.log(`\n⚠️  Missing from glossary (${allMissing.size} unique words):`);
    Array.from(allMissing).slice(0, 20).forEach(w => console.log(`   - ${w}`));
    if (allMissing.size > 20) {
      console.log(`   ... and ${allMissing.size - 20} more`);
    }
  }
  
  // Save detailed results
  const outputPath = join(process.cwd(), 'docs', '_artifacts', 'search-card-20251005', 'translation-test-results.json');
  const fs = await import('fs');
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    stats: {
      total: testCases.length,
      passed: passCount,
      failed: failCount,
      passRate: Math.round(passCount/testCases.length*100),
      avgCoverage: Math.round(avgCoverage)
    },
    results
  }, null, 2));
  
  console.log(`\n💾 Detailed results saved to: ${outputPath}`);
  
  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
