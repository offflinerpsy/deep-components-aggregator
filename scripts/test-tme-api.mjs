// Test TME API for full specs
import 'dotenv/config';
import { tmeSearchProducts, tmeGetProduct } from './src/integrations/tme/client.mjs';

const mpn = 'M83513/19-E01NW';

async function testTME() {
  console.log('\n🧪 Testing TME API...\n');
  
  // Search by MPN
  console.log('=== Searching TME for:', mpn, '===\n');
  const searchResult = await tmeSearchProducts({
    token: process.env.TME_TOKEN,
    secret: process.env.TME_SECRET,
    query: mpn
  });
  
  console.log('Search results:', searchResult.data?.ProductList?.length || 0);
  
  if (searchResult.data?.ProductList?.length > 0) {
    const product = searchResult.data.ProductList[0];
    console.log('\n📦 Found product:');
    console.log('  Symbol:', product.Symbol);
    console.log('  Producer:', product.Producer);
    console.log('  Description:', product.Description);
    console.log('\n📋 Parameters:', JSON.stringify(product.Parameters, null, 2));
    console.log('\n🔍 ALL FIELDS:', Object.keys(product));
  }
  
  // Try alternative searches
  console.log('\n\n=== Trying alternative: M83513 ===\n');
  const altResult = await tmeSearchProducts({
    token: process.env.TME_TOKEN,
    secret: process.env.TME_SECRET,
    query: 'M83513'
  });
  
  console.log('Found', altResult.data?.ProductList?.length || 0, 'products');
  if (altResult.data?.ProductList?.length > 0) {
    altResult.data.ProductList.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.Symbol} - ${p.Producer}`);
    });
  }
  
  // Try D-Sub connector category
  console.log('\n\n=== Trying: D-Sub connector ===\n');
  const dsubResult = await tmeSearchProducts({
    token: process.env.TME_TOKEN,
    secret: process.env.TME_SECRET,
    query: 'D-Sub MIL 31 pin connector Amphenol'
  });
  
  console.log('Found', dsubResult.data?.ProductList?.length || 0, 'products');
  if (dsubResult.data?.ProductList?.length > 0) {
    dsubResult.data.ProductList.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.Symbol} - ${p.Producer} - ${p.Description}`);
    });
  }
}

testTME().catch(console.error);
