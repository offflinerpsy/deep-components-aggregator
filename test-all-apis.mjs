// Test all 3 APIs and data merging logic
import 'dotenv/config';
import { mouserSearchByKeyword } from './src/integrations/mouser/client.mjs';
import { tmeSearchProducts } from './src/integrations/tme/client.mjs';
import { farnellByMPN } from './src/integrations/farnell/client.mjs';

const mpn = 'M83513/19-E01NW';

console.log('🧪 Testing all 3 APIs for:', mpn);
console.log('='.repeat(60));

async function testAll() {
  // Test Mouser
  console.log('\n📦 MOUSER API:');
  const mouser = await mouserSearchByKeyword({ 
    apiKey: process.env.MOUSER_API_KEY, 
    q: mpn, 
    records: 1 
  });
  
  if (mouser.data?.SearchResults?.Parts?.[0]) {
    const p = mouser.data.SearchResults.Parts[0];
    console.log('✅ Found:', p.ManufacturerPartNumber);
    console.log('   ProductAttributes:', p.ProductAttributes?.length || 0);
    console.log('   Fields:', Object.keys(p).length);
  } else {
    console.log('❌ No data');
  }

  // Test TME
  console.log('\n📦 TME API:');
  try {
    const tme = await tmeSearchProducts({
      token: process.env.TME_TOKEN,
      secret: process.env.TME_SECRET,
      query: mpn
    });
    
    if (tme.data?.ProductList?.[0]) {
      const p = tme.data.ProductList[0];
      console.log('✅ Found:', p.Symbol);
      console.log('   Parameters:', p.Parameters?.length || 0);
      console.log('   Fields:', Object.keys(p).length);
    } else {
      console.log('⚠️  No exact match, trying alternative...');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test Farnell
  console.log('\n📦 FARNELL API:');
  const farnell = await farnellByMPN({
    apiKey: process.env.FARNELL_API_KEY,
    region: process.env.FARNELL_REGION || 'uk.farnell.com',
    q: mpn,
    limit: 1
  });
  
  if (farnell.data?.products?.[0]) {
    const p = farnell.data.products[0];
    console.log('✅ Found:', p.translatedManufacturerPartNumber);
    console.log('   Attributes:', p.attributes?.length || 0);
    console.log('   Fields:', Object.keys(p).length);
  } else {
    console.log('❌ No data');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All APIs tested!');
}

testAll().catch(console.error);
