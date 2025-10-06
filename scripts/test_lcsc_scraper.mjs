#!/usr/bin/env node
/**
 * Test LCSC scraper
 */

import { lcscSearchByMPN } from './src/integrations/lcsc/scraper.mjs';

const TEST_MPN = 'M83513/19-E01NW';

console.log('🔍 Testing LCSC Scraper...');
console.log('Part Number:', TEST_MPN);
console.log('');

const result = await lcscSearchByMPN(TEST_MPN);

console.log('');
console.log('=== RESULT ===');
console.log('Success:', result.ok);
console.log('Products found:', result.count);

if (result.products && result.products.length > 0) {
  const p = result.products[0];
  console.log('');
  console.log('First Product:');
  console.log('- URL:', p.url);
  console.log('- Product Code:', p.productCode);
  console.log('- Model:', p.model);
  console.log('- Manufacturer:', p.manufacturer);
  console.log('- Price:', p.price);
  console.log('- Stock:', p.stock);
  console.log('- Description:', p.description?.substring(0, 100));
  console.log('- Specs count:', Object.keys(p.specs || {}).length);
  
  if (p.specs && Object.keys(p.specs).length > 0) {
    console.log('');
    console.log('Specifications:');
    for (const [key, value] of Object.entries(p.specs).slice(0, 10)) {
      console.log(`  ${key}: ${value}`);
    }
  }
} else {
  console.log('❌ No products found');
  if (result.error) {
    console.log('Error:', result.error);
  }
}
