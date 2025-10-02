#!/usr/bin/env node
/**
 * Try to scrape Octopart using their internal GraphQL API
 * by analyzing network requests
 */

import { fetchViaScrapingBee } from './src/scrape/providers/scrapingbee.mjs';

const SCRAPINGBEE_KEY = 'ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ';
const TEST_MPN = 'M83513/19-E01NW';

// Try direct product page instead of search
const productUrl = `https://octopart.com/search?q=${encodeURIComponent(TEST_MPN)}`;

console.log('🔍 Fetching with PREMIUM + STEALTH mode...');
console.log('URL:', productUrl);
console.log('⚡ premium_proxy=true, stealth_proxy=true, wait=3000');
console.log('');

// Try with premium ScrapingBee features
const result = await fetchViaScrapingBee({
  key: SCRAPINGBEE_KEY,
  url: productUrl,
  timeout: 60000,
  render: true,
  premium: true,   // 🔥 RESIDENTIAL PROXY
  stealth: true,   // 🔥 ANTI-BOT DETECTION
  wait: 5000       // 🔥 WAIT 5 SECONDS FOR FULL RENDER
});

console.log('Status:', result.status);
console.log('HTML length:', result.text.length);

// Look for actual product content
const checks = [
  { pattern: /class="[^"]*part-number/i, name: 'part-number class' },
  { pattern: /class="[^"]*mpn/i, name: 'mpn class' },
  { pattern: /M83513/i, name: 'Part number text' },
  { pattern: /data-testid/i, name: 'data-testid attributes' },
  { pattern: /Glenair/i, name: 'Manufacturer name' },
  { pattern: /specification/i, name: 'specification text' },
  { pattern: /href="\/part\//i, name: 'part links' }
];

console.log('');
console.log('Content checks:');
for (const check of checks) {
  const found = check.pattern.test(result.text);
  console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
  
  if (found && check.pattern.source.includes('href')) {
    const matches = [...result.text.matchAll(/href="(\/part\/[^"]+)"/g)];
    if (matches.length > 0) {
      console.log(`     Found ${matches.length} part URLs`);
      console.log(`     Example: https://octopart.com${matches[0][1]}`);
    }
  }
}

// Save for inspection
import * as fs from 'fs';
fs.writeFileSync('octopart_full.html', result.text, 'utf-8');
console.log('');
console.log('✅ Saved to octopart_full.html');
