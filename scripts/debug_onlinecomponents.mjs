#!/usr/bin/env node
import { fetchViaScrapingBee } from './src/scrape/providers/scrapingbee.mjs';
import * as fs from 'fs';

const url = 'https://www.onlinecomponents.com/en/search?searchterm=M83513/19-E01NW';
const key = 'ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ';

console.log('Fetching:', url);
const result = await fetchViaScrapingBee({ key, url, timeout: 30000, render: true, premium: true, wait: 3000 });

fs.writeFileSync('onlinecomponents_debug.html', result.text, 'utf-8');
console.log('✅ Saved to onlinecomponents_debug.html');
console.log('Length:', result.text.length);
console.log('Status:', result.status);

// Check content
if (result.text.includes('No results') || result.text.includes('not found')) {
  console.log('❌ Product not found');
}
if (result.text.includes('productdetail')) {
  console.log('✅ Found "productdetail" in page');
}
