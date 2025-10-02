#!/usr/bin/env node
/**
 * Test Octopart with CAPTCHA solving
 */

import { fetchViaScrapingBee } from './src/scrape/providers/scrapingbee.mjs';

const SCRAPINGBEE_KEY = 'ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ';
const TEST_MPN = 'M83513/19-E01NW';
const searchUrl = `https://octopart.com/search?q=${encodeURIComponent(TEST_MPN)}`;

console.log('🔍 Fetching with CAPTCHA SOLVER...');
console.log('URL:', searchUrl);
console.log('⚡ premium_proxy + stealth_proxy + solve_captcha');
console.log('⏳ This may take 30-60 seconds...');
console.log('');

const result = await fetchViaScrapingBee({
  key: SCRAPINGBEE_KEY,
  url: searchUrl,
  timeout: 120000,      // 2 minutes timeout
  render: true,
  premium: true,
  stealth: true,
  solveCaptcha: true,   // 🔥 SOLVE CAPTCHA AUTOMATICALLY
  wait: 10000           // Wait 10s after solving
});

console.log('Status:', result.status);
console.log('HTML length:', result.text.length);

// Check for CAPTCHA
if (result.text.includes('captcha') || result.text.includes('CAPTCHA')) {
  console.log('❌ CAPTCHA still present');
} else {
  console.log('✅ No CAPTCHA detected');
}

// Check for product data
if (result.text.includes('M83513')) {
  console.log('✅ Found part number');
}

if (result.text.includes('/part/')) {
  console.log('✅ Found part links');
  const matches = [...result.text.matchAll(/href="(\/part\/[^"]+)"/g)];
  console.log(`  Found ${matches.length} part URLs`);
}

// Save result
import * as fs from 'fs';
fs.writeFileSync('octopart_captcha_solved.html', result.text, 'utf-8');
console.log('✅ Saved to octopart_captcha_solved.html');
