/**
 * Тест Mouser scraper
 */

import { scrapeMouserProduct } from './src/scrapers/mouser.mjs';

async function main() {
  const mpn = process.argv[2] || 'M83513/19-E01NW';
  console.log(`🔍 Testing Mouser scraper: ${mpn}\n`);
  
  const result = await scrapeMouserProduct(mpn);
  
  console.log('\n📊 RESULT:');
  console.log(`   OK: ${result.ok}`);
  
  if (result.ok) {
    console.log(`   Specs: ${Object.keys(result.specs || {}).length}`);
    console.log(`   Images: ${result.images?.length || 0}`);
    console.log(`   Description: ${result.description}`);
    console.log(`   Manufacturer: ${result.manufacturer}`);
    
    if (result.specs && Object.keys(result.specs).length > 0) {
      console.log('\n   📋 All Specs:');
      Object.entries(result.specs).forEach(([k, v], i) => {
        console.log(`      ${i+1}. ${k}: ${v}`);
      });
    }
  } else {
    console.log(`   Error: ${result.error}`);
  }
}

main().catch(console.error);
