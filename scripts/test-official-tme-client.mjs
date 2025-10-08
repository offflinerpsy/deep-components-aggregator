#!/usr/bin/env node
/**
 * Test OFFICIAL TME API client to see working signature
 */

import { TmeApiClient } from 'tme-api-client';
import 'dotenv/config';

const TOKEN = process.env.TME_TOKEN;
const SECRET = process.env.TME_SECRET;

async function testOfficial() {
  console.log('=== Testing OFFICIAL TME API Client ===\n');

  const client = new TmeApiClient(TOKEN, SECRET);

  try {
    const response = await client.request('Products/GetProducts', {
      SymbolList: ['2N3904-DIO']
    });

    console.log('✅ SUCCESS!');
    console.log('Status:', response.data.Status);
    console.log('Products:', response.data.Data?.ProductList?.length || 0);

    if (response.data.Data?.ProductList?.length > 0) {
      const product = response.data.Data.ProductList[0];
      console.log('\nFirst product:');
      console.log('  Symbol:', product.Symbol);
      console.log('  Price:', product.PriceList?.[0]?.PriceValue || 'N/A');
      console.log('  Stock:', product.AvailableAmount || 0);
    }
  } catch (error) {
    console.log('❌ FAILED');
    console.log('Error:', error.response?.data || error.message);
  }
}

testOfficial().catch(console.error);
