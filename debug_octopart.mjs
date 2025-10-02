#!/usr/bin/env node
/**
 * Debug Octopart HTML response
 */

import { fetchViaScrapingBee } from './src/scrape/providers/scrapingbee.mjs';
import * as fs from 'fs';

const SCRAPINGBEE_KEY = 'ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ';
const TEST_MPN = 'M83513/19-E01NW';
const searchUrl = `https://octopart.com/search?q=${encodeURIComponent(TEST_MPN)}`;

console.log('🔍 Fetching Octopart page...');
console.log('URL:', searchUrl);
console.log('');

const result = await fetchViaScrapingBee({
  key: SCRAPINGBEE_KEY,
  url: searchUrl,
  timeout: 30000,
  render: true
});

console.log('Status:', result.status);
console.log('OK:', result.ok);
console.log('HTML length:', result.text.length);
console.log('');

// Save HTML for inspection
fs.writeFileSync('octopart_debug.html', result.text, 'utf-8');
console.log('✅ HTML saved to octopart_debug.html');

// Check for common blocking patterns
if (result.text.includes('cloudflare')) {
  console.log('⚠️  Cloudflare detected!');
}
if (result.text.includes('captcha')) {
  console.log('⚠️  CAPTCHA detected!');
}
if (result.text.includes('Access Denied')) {
  console.log('⚠️  Access Denied!');
}
if (result.text.includes('Robot')) {
  console.log('⚠️  Robot detection!');
}

// Look for product indicators
if (result.text.includes('/part/')) {
  console.log('✅ Found /part/ URLs');
}
if (result.text.includes('manufacturer')) {
  console.log('✅ Found "manufacturer" text');
}
if (result.text.includes('specifications')) {
  console.log('✅ Found "specifications" text');
}

// Extract first 1000 chars
console.log('');
console.log('=== First 1000 chars of HTML ===');
console.log(result.text.substring(0, 1000));
