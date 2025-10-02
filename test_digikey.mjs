/**
 * Test DigiKey API
 */

import { digikeySearch, digikeyGetProduct } from './src/integrations/digikey/client.mjs';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.DIGIKEY_CLIENT_ID;
const CLIENT_SECRET = process.env.DIGIKEY_CLIENT_SECRET;

const TEST_PRODUCTS = [
  'M83513/19-E01NW',
  'STM32F407VGT6',
  'ATMEGA328P-PU',
  'LM358P'
];

async function testProduct(mpn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 Testing: ${mpn}`);
  console.log('='.repeat(60));

  try {
    const result = await digikeyGetProduct({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      partNumber: mpn
    });

    if (result.ok && result.data) {
      const count = result.data.ProductsCount || 0;
      console.log(`✅ Found ${count} products`);

      if (count > 0 && result.data.Products) {
        const product = result.data.Products[0];
        console.log(`\n📋 Product Details:`);
        console.log(`   Manufacturer: ${product.Manufacturer?.Name}`);
        console.log(`   MPN: ${product.ManufacturerPartNumber}`);
        console.log(`   Description: ${product.Description}`);
        console.log(`   Parameters: ${product.Parameters?.length || 0}`);
        console.log(`   Stock: ${product.QuantityAvailable || 0}`);
        console.log(`   Images: ${product.MediaLinks?.filter(m => m.MediaType === 'Image').length || 0}`);
        console.log(`   Datasheets: ${product.MediaLinks?.filter(m => m.MediaType === 'Datasheet').length || 0}`);

        if (product.Parameters && product.Parameters.length > 0) {
          console.log(`\n📊 Sample Parameters:`);
          product.Parameters.slice(0, 5).forEach(p => {
            console.log(`   • ${p.Parameter}: ${p.Value}`);
          });
          if (product.Parameters.length > 5) {
            console.log(`   ... and ${product.Parameters.length - 5} more`);
          }
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🧪 DigiKey API Test\n');
  console.log(`Client ID: ${CLIENT_ID?.substring(0, 20)}...`);
  console.log(`Client Secret: ${CLIENT_SECRET?.substring(0, 20)}...`);

  for (const mpn of TEST_PRODUCTS) {
    await testProduct(mpn);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test complete!');
}

main().catch(console.error);
