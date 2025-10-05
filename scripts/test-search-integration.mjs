/**
 * Test RU→EN integration with search pipeline
 */

import { processSearchQuery, selectSearchStrategy } from '../src/search/searchIntegration.mjs';

const testQueries = [
  'транзистор 2N3904 SOT-23',
  'конденсатор 1000мкФ 25В low esr',
  'резистор 10к 1% 0603',
  'диод шоттки 3А 40В',
  'ATmega328P TQFP',  // English only
  'NE555'  // MPN only
];

console.log('🧪 Testing Search Integration with RU→EN Translation\n');

testQueries.forEach((query, i) => {
  console.log(`[Test ${i + 1}] "${query}"`);
  
  const processed = processSearchQuery(query);
  const strategy = selectSearchStrategy(processed);
  
  console.log(`  Success: ${processed.success}`);
  console.log(`  Has Russian: ${processed.metadata.hasCyrillic || false}`);
  console.log(`  Translation Used: ${processed.metadata.translationUsed || false}`);
  console.log(`  Coverage: ${processed.metadata.coverage || 0}%`);
  console.log(`  Strategy: ${strategy.strategy} - ${strategy.reasoning}`);
  console.log(`  Primary Query: "${strategy.primaryQuery}"`);
  if (strategy.alternativeQueries.length > 0) {
    console.log(`  Alternatives: [${strategy.alternativeQueries.map(q => `"${q}"`).join(', ')}]`);
  }
  if (processed.mpns.length > 0) {
    console.log(`  MPNs: [${processed.mpns.join(', ')}]`);
  }
  if (processed.metadata.missingWords?.length > 0) {
    console.log(`  ⚠️ Missing: ${processed.metadata.missingWords.join(', ')}`);
  }
  console.log();
});

console.log('✅ Integration test complete');
