/**
 * Test Translation Cache
 */

import { translateRuToEn, getStats, translationCache } from '../src/i18n/ru-en-translator.mjs';

const testQueries = [
  'транзистор 2N3904',
  'конденсатор 1000мкФ 25В',
  'транзистор 2N3904',  // Duplicate - should hit cache
  'резистор 10к 1%',
  'конденсатор 1000мкФ 25В',  // Duplicate - should hit cache
  'диод шоттки 3А'
];

console.log('🧪 Testing Translation Cache\n');
console.log('='.repeat(60));

testQueries.forEach((query, i) => {
  console.log(`\n[Test ${i + 1}] "${query}"`);
  
  const result = translateRuToEn(query);
  
  console.log(`  Translated: "${result.translated}"`);
  console.log(`  Provider: ${result.provider}`);
  console.log(`  From Cache: ${result.fromCache || false}`);
  if (result.cacheAge) {
    console.log(`  Cache Age: ${result.cacheAge}ms`);
  }
  console.log(`  Coverage: ${result.stages?.glossaryCoverage || 0}%`);
  console.log(`  Latency: ${result.latency}ms`);
});

console.log('\n' + '='.repeat(60));
console.log('\n📊 Cache Statistics:');

const stats = getStats();
console.log(JSON.stringify(stats.cache, null, 2));

console.log('\n📝 Cache Entries:');
translationCache.entries().forEach((entry, i) => {
  console.log(`  ${i + 1}. "${entry.query}" → "${entry.translated}"`);
  console.log(`     Coverage: ${entry.coverage}%, Age: ${entry.age}s, Expires in: ${entry.expiresIn}s`);
});

console.log('\n✅ Cache test complete');
