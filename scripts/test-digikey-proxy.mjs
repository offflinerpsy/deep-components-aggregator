#!/usr/bin/env node
/**
 * Test DigiKey OAuth with proxy
 */

import 'dotenv/config';
import '../src/bootstrap/proxy.mjs'; // Enable proxy
import { digikeySearch } from '../src/integrations/digikey/client.mjs';

const clientId = process.env.DIGIKEY_CLIENT_ID;
const clientSecret = process.env.DIGIKEY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('❌ Missing DIGIKEY credentials');
  process.exit(1);
}

console.log('🔍 Testing DigiKey search with proxy...\n');

try {
  const result = await digikeySearch({
    clientId,
    clientSecret,
    keyword: 'DS12C887+',
    limit: 3
  });

  console.log('\n✅ DigiKey search SUCCESS');
  console.log(`   Status: ${result.status}`);
  console.log(`   Products: ${result.data?.Products?.length || result.data?.Items?.length || 0}`);

  const products = result.data?.Products || result.data?.Items || [];
  if (products.length > 0) {
    const first = products[0];
    console.log(`   First product: ${first.ManufacturerPartNumber || first.ProductDescription}`);
  }

  process.exit(0);
} catch (error) {
  console.error('\n❌ DigiKey search FAILED');
  console.error(`   ${error.message}`);
  process.exit(1);
}
