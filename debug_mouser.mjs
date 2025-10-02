/**
 * Debug Mouser API raw response
 */

import { mouserSearchByKeyword } from './src/integrations/mouser/client.mjs';
import dotenv from 'dotenv';

dotenv.config();

const MOUSER_KEY = process.env.MOUSER_API_KEY;

async function debugMouser(mpn) {
  console.log(`\n📦 Search: ${mpn}`);
  console.log('─'.repeat(60));
  
  try {
    const result = await mouserSearchByKeyword({
      apiKey: MOUSER_KEY,
      keyword: mpn
    });
    
    console.log('Status:', result.status);
    console.log('OK:', result.ok);
    console.log('Keys:', Object.keys(result.data || {}));
    
    if (result.data?.SearchResults) {
      console.log('SearchResults keys:', Object.keys(result.data.SearchResults));
      console.log('NumberOfResult:', result.data.SearchResults.NumberOfResult);
      console.log('Parts:', result.data.SearchResults.Parts?.length);
    }
    
    if (result.data?.Errors?.length > 0) {
      console.log('ERRORS:', result.data.Errors);
    }
    
    console.log('\nFull response:');
    console.log(JSON.stringify(result.data, null, 2).substring(0, 2000));
    
  } catch (err) {
    console.log('ERROR:', err.message);
    console.log('Stack:', err.stack);
  }
}

async function main() {
  await debugMouser('STM32F407');
}

main().catch(console.error);
