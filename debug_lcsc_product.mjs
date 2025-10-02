#!/usr/bin/env node
import { fetchViaScrapingBee } from './src/scrape/providers/scrapingbee.mjs';
import * as fs from 'fs';

const url = 'https://www.lcsc.com/product-detail/C3144614.html';
const key = 'ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ';

console.log('Fetching:', url);
const result = await fetchViaScrapingBee({ key, url, timeout: 30000, render: true, premium: true, wait: 3000 });

fs.writeFileSync('lcsc_product_debug.html', result.text, 'utf-8');
console.log('✅ Saved to lcsc_product_debug.html');
console.log('Length:', result.text.length);

// Check for spec indicators
if (result.text.includes('Parameters') || result.text.includes('Specification')) {
  console.log('✅ Found "Parameters" or "Specification"');
}
