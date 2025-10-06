/**
 * Debug Farnell API - почему 0 results?
 */

import { farnellByMPN, farnellByKeyword } from './src/integrations/farnell/client.mjs';
import dotenv from 'dotenv';

dotenv.config();

const FARNELL_KEY = process.env.FARNELL_API_KEY;
const REGIONS = ['uk.farnell.com', 'us.newark.com', 'de.farnell.com', 'fr.farnell.com'];

// Популярные товары которые ТОЧНО есть у Farnell
const TEST_PRODUCTS = [
  { name: 'Arduino Uno R3', mpn: 'A000066', keyword: 'Arduino Uno' },
  { name: 'Raspberry Pi 4', mpn: 'RPI4-MODBP-2GB', keyword: 'Raspberry Pi 4' },
  { name: 'Texas Instruments IC', mpn: 'LM358P', keyword: 'LM358' },
  { name: 'Generic resistor', mpn: '', keyword: 'resistor 10k' },
];

async function testRegion(region) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🌍 REGION: ${region}`);
  console.log('='.repeat(60));
  
  for (const product of TEST_PRODUCTS) {
    console.log(`\n📦 ${product.name}`);
    
    // Try MPN if available
    if (product.mpn) {
      console.log(`   🔍 MPN: ${product.mpn}`);
      try {
        const result = await farnellByMPN({
          apiKey: FARNELL_KEY,
          region: region,
          q: product.mpn,
          limit: 5
        });
        
        console.log(`      Status: ${result.status}`);
        console.log(`      OK: ${result.ok}`);
        
        if (result.ok && result.data) {
          const count = result.data.premierFarnellPartNumberReturn?.numberOfResults || 0;
          console.log(`      Results: ${count}`);
          
          if (count > 0) {
            const products = result.data.premierFarnellPartNumberReturn?.products || [];
            if (products.length > 0) {
              const p = products[0];
              console.log(`      ✅ Found: ${p.sku} - ${p.displayName}`);
              console.log(`         Attributes: ${p.attributes?.length || 0}`);
              console.log(`         Images: ${p.images ? Object.keys(p.images).length : 0}`);
              continue; // Success!
            }
          }
        }
        
        console.log(`      ❌ Not found via MPN`);
      } catch (err) {
        console.log(`      ❌ Error: ${err.message}`);
      }
    }
    
    // Try keyword
    console.log(`   🔍 Keyword: ${product.keyword}`);
    try {
      const result = await farnellByKeyword({
        apiKey: FARNELL_KEY,
        region: region,
        q: product.keyword,
        limit: 5
      });
      
      console.log(`      Status: ${result.status}`);
      console.log(`      OK: ${result.ok}`);
      
      if (result.ok && result.data) {
        const count = result.data.premierFarnellPartNumberReturn?.numberOfResults || 0;
        console.log(`      Results: ${count}`);
        
        if (count > 0) {
          const products = result.data.premierFarnellPartNumberReturn?.products || [];
          if (products.length > 0) {
            const p = products[0];
            console.log(`      ✅ Found: ${p.sku} - ${p.displayName}`);
            console.log(`         Attributes: ${p.attributes?.length || 0}`);
          } else {
            console.log(`      ⚠️  Count=${count} but products array empty`);
          }
        } else {
          console.log(`      ❌ 0 results`);
        }
      } else {
        console.log(`      ❌ Response not OK or no data`);
        console.log(`      Data keys:`, Object.keys(result.data || {}));
      }
    } catch (err) {
      console.log(`      ❌ Error: ${err.message}`);
    }
  }
}

async function main() {
  console.log('🧪 Farnell API Debug\n');
  console.log(`API Key: ${FARNELL_KEY?.substring(0, 15)}...`);
  
  // Test each region
  for (const region of REGIONS) {
    await testRegion(region);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГ\n');
  console.log('Если ВСЕ регионы дают 0 results - проблема с API key');
  console.log('Если хотя бы один регион работает - использовать его');
  console.log('\n💡 Возможные проблемы:');
  console.log('   1. API key не активирован');
  console.log('   2. Нужна регистрация на element14.com/api');
  console.log('   3. Rate limit exceeded');
  console.log('   4. Неправильный формат search term');
}

main().catch(console.error);
