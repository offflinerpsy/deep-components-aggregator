import 'dotenv/config';
import { mouserSearchByPartNumber } from './src/integrations/mouser/client.mjs';

const mpn = 'LM317LID';
const result = await mouserSearchByPartNumber({ 
  apiKey: process.env.MOUSER_API_KEY, 
  mpn 
});

console.log('=== MOUSER PRODUCT DATA ===');
console.log(JSON.stringify(result, null, 2));

const part = result?.data?.SearchResults?.Parts?.[0];
if (part) {
  console.log('\n=== FIELDS AVAILABLE ===');
  console.log('ProductAttributes:', part.ProductAttributes?.length || 0);
  console.log('ProductDocuments:', part.ProductDocuments?.length || 0);
  console.log('AlternatePackagings:', part.AlternatePackagings?.length || 0);
  console.log('PriceBreaks:', part.PriceBreaks?.length || 0);
}
