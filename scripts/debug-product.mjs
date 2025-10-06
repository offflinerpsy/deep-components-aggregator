import { mouserSearchByPartNumber } from './src/integrations/mouser/client.mjs';

const result = await mouserSearchByPartNumber({ 
  apiKey: 'b1ade04e-2dd0-4bd9-b5b4-e51f252a0687', 
  mpn: 'LM317LID' 
});

const part = result?.data?.SearchResults?.Parts?.[0];
if (!part) {
  console.log('ERROR: No part found');
  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log('=== PRODUCT ATTRIBUTES ===');
console.log('Count:', part.ProductAttributes?.length || 0);
if (part.ProductAttributes) {
  part.ProductAttributes.slice(0, 5).forEach(attr => {
    console.log(`- ${attr.AttributeName}: ${attr.AttributeValue}`);
  });
}

console.log('\n=== PRODUCT DOCUMENTS ===');
console.log('Count:', part.ProductDocuments?.length || 0);
if (part.ProductDocuments) {
  part.ProductDocuments.forEach(doc => {
    console.log(`- ${doc.DocumentTitle}: ${doc.DocumentUrl}`);
  });
}

console.log('\n=== PRICE BREAKS ===');
console.log('Count:', part.PriceBreaks?.length || 0);
if (part.PriceBreaks) {
  part.PriceBreaks.forEach(pb => {
    console.log(`- Qty ${pb.Quantity}: ${pb.Price} ${pb.Currency || 'USD'}`);
  });
}

console.log('\n=== OTHER FIELDS ===');
console.log('Description:', part.Description);
console.log('Manufacturer:', part.Manufacturer);
console.log('ImagePath:', part.ImagePath);
console.log('DataSheetUrl:', part.DataSheetUrl);
console.log('ProductDetailUrl:', part.ProductDetailUrl);
console.log('Availability:', part.Availability);
console.log('LeadTime:', part.LeadTime);
