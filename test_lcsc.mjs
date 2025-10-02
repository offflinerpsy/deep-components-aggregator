#!/usr/bin/env node
/**
 * Test LCSC API
 */

import { lcscSearchByMPN } from './src/integrations/lcsc/client.mjs';

const TEST_MPN = 'M83513/19-E01NW';

console.log('🔍 Testing LCSC API...');
console.log('Part Number:', TEST_MPN);
console.log('');

const result = await lcscSearchByMPN({ mpn: TEST_MPN });

console.log('');
console.log('=== RESULT ===');
console.log('Success:', result.ok);
console.log('Total products:', result.total);

if (result.products && result.products.length > 0) {
  console.log('');
  console.log('First product:');
  const p = result.products[0];
  console.log('- Product Code:', p.productCode);
  console.log('- Model:', p.productModel);
  console.log('- Manufacturer:', p.brandNameEn);
  console.log('- Price:', p.productPriceList?.[0]?.usdPrice);
  console.log('- Stock:', p.stockNumber);
  console.log('- Description:', p.productIntroEn?.substring(0, 100));
  
  // Check if has detailed parameters
  if (p.paramVOList) {
    console.log('');
    console.log('Parameters:', p.paramVOList.length);
    p.paramVOList.slice(0, 5).forEach(param => {
      console.log(`  ${param.paramNameEn}: ${param.paramValueEn || param.paramValueEnForSearch}`);
    });
  }
} else {
  console.log('❌ No products found');
  if (result.error) {
    console.log('Error:', result.error);
  }
}
