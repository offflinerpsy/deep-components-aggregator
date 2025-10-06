
import { octopartSearchByMPN } from './src/integrations/octopart/scraper.mjs';

console.log('🔍 Testing Octopart Scraper...');
console.log('Part Number:', 'M83513/19-E01NW');
console.log('');

const result = await octopartSearchByMPN('M83513/19-E01NW');

console.log('');
console.log('=== RESULT ===');
console.log('Success:', result.ok);
console.log('Products found:', result.count);

if (result.products && result.products.length > 0) {
    const p = result.products[0];
    console.log('');
    console.log('First Product:');
    console.log('- URL:', p.url);
    console.log('- MPN:', p.mpn);
    console.log('- Manufacturer:', p.manufacturer);
    console.log('- Description:', p.description);
    console.log('- Specs count:', Object.keys(p.specs || {}).length);
    
    if (p.specs && Object.keys(p.specs).length > 0) {
        console.log('');
        console.log('Specifications:');
        for (const [key, value] of Object.entries(p.specs)) {
            console.log(`  ${key}: ${value}`);
        }
    }
    
    if (p.distributors && p.distributors.length > 0) {
        console.log('');
        console.log('Distributors:');
        for (const d of p.distributors) {
            console.log(`  - ${d.name}: ${d.stock} @ ${d.price}`);
        }
    }
} else {
    console.log('❌ No products found');
    if (result.error) {
        console.log('Error:', result.error);
    }
}
