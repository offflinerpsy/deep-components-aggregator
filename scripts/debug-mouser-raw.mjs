// Test Mouser API raw response to see ALL available fields
import { mouserSearchByKeyword } from './src/integrations/mouser/client.mjs';

const apiKey = process.env.MOUSER_API_KEY || 'c5782fab-c09c-49b0-86b4-ac535e0be8f0';
const mpn = 'M83513/19-E01NW';

console.log('🔍 Testing Mouser API for:', mpn);
console.log('='.repeat(60));

try {
  const result = await mouserSearchByKeyword({ apiKey, q: mpn, records: 1 });
  const product = result?.data?.SearchResults?.Parts?.[0];
  
  if (product) {
    console.log('\n📦 RAW PRODUCT DATA:');
    console.log(JSON.stringify(product, null, 2));
    
    console.log('\n📊 AVAILABLE FIELDS:');
    const fields = Object.keys(product);
    fields.forEach((field, i) => {
      const value = product[field];
      const type = Array.isArray(value) ? `Array[${value.length}]` : typeof value;
      console.log(`${i + 1}. ${field}: ${type}`);
      
      // Show array contents
      if (Array.isArray(value) && value.length > 0) {
        console.log(`   First item:`, JSON.stringify(value[0], null, 2).substring(0, 200));
      }
    });
    
    console.log('\n🔢 ProductAttributes count:', product.ProductAttributes?.length || 0);
    console.log('\n📋 ProductAttributes:');
    (product.ProductAttributes || []).forEach((attr, i) => {
      console.log(`${i + 1}. ${attr.AttributeName}: ${attr.AttributeValue}`);
    });
    
  } else {
    console.log('❌ Product not found');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error);
}
