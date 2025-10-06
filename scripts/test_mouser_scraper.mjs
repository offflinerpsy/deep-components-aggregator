#!/usr/bin/env node
/**
 * Test Mouser scraper with ScrapingBee
 */

import { scrapeMouserProduct } from './src/integrations/mouser/scraper.mjs';

const TEST_MPN = 'M83513/19-E01NW';

console.log('🔍 Testing Mouser Scraper (ScrapingBee Premium)...');
console.log('Part Number:', TEST_MPN);
console.log('Goal: Get 20+ specs from website (not 1 from API)');
console.log('');

const result = await scrapeMouserProduct(TEST_MPN);

console.log('');
console.log('=== RESULT ===');
console.log('Specs count:', Object.keys(result.specs).length);
console.log('Image:', result.image ? '✅ Found' : '❌ Not found');

if (Object.keys(result.specs).length > 0) {
  console.log('');
  console.log('Specifications:');
  for (const [key, value] of Object.entries(result.specs)) {
    console.log(`  ${key}: ${value}`);
  }
} else {
  console.log('');
  console.log('❌ No specs found!');
  console.log('Check if ScrapingBee bypassed 403 block');
}
