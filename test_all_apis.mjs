#!/usr/bin/env node
/**
 * Test current APIs on LOCAL machine
 * Just to see what works/doesn't work
 */

import 'dotenv/config';

console.log('🧪 Testing APIs (local test)...');
console.log('');

// Test DigiKey
console.log('🔵 Testing DigiKey...');
import('./src/integrations/digikey/client.mjs').then(async ({ digikeySearch }) => {
  try {
    const result = await digikeySearch({
      clientId: process.env.DIGIKEY_CLIENT_ID,
      clientSecret: process.env.DIGIKEY_CLIENT_SECRET,
      keyword: 'M83513/19-E01NW',
      limit: 1
    });
    console.log('✅ DigiKey OK:', result.data.ProductsCount || 0, 'products');
    if (result.data.Products?.[0]?.Parameters) {
      console.log('   Parameters:', result.data.Products[0].Parameters.length);
    }
  } catch (e) {
    console.log('❌ DigiKey ERROR:', e.message.substring(0, 200));
  }
  console.log('');
}).catch(e => console.log('❌ DigiKey load error:', e.message));

// Test TME
console.log('🟡 Testing TME...');
import('./src/integrations/tme/client.mjs').then(async ({ tmeSearchProducts }) => {
  try {
    const result = await tmeSearchProducts({
      token: process.env.TME_TOKEN,
      secret: process.env.TME_SECRET,
      query: 'LM317'
    });
    console.log('✅ TME OK:', result.data?.Data?.ProductList?.length || 0, 'products');
  } catch (e) {
    console.log('❌ TME ERROR:', e.message.substring(0, 200));
  }
  console.log('');
}).catch(e => console.log('❌ TME load error:', e.message));

// Test Farnell
console.log('🟢 Testing Farnell...');
import('./src/integrations/farnell/client.mjs').then(async ({ farnellByMPN }) => {
  try {
    const result = await farnellByMPN({
      apiKey: process.env.FARNELL_API_KEY,
      region: process.env.FARNELL_REGION,
      q: 'LM317',
      limit: 1
    });
    console.log('✅ Farnell OK:', result.data?.numberOfResults || 0, 'products');
  } catch (e) {
    console.log('❌ Farnell ERROR:', e.message.substring(0, 200));
  }
  console.log('');
}).catch(e => console.log('❌ Farnell load error:', e.message));
