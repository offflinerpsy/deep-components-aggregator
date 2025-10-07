#!/usr/bin/env node
/**
 * Create UI screenshots for SRX-FULL-BOOT Phase 6
 * 
 * Takes screenshots of:
 * 1. Search results page
 * 2. Product card page
 * 3. Health endpoint (JSON)
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const SCREENSHOTS_DIR = 'docs/_artifacts/2025-10-07/screenshots';
const BASE_URL = 'http://localhost:9201';

async function takeScreenshots() {
  // Ensure directory exists
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
  
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  
  try {
    // 1. Search results page
    console.log('📸 Screenshot 1/3: Search results...');
    await page.goto(`${BASE_URL}/search.html?q=2N3904`, { waitUntil: 'networkidle' });
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.screenshot({ 
      path: `${SCREENSHOTS_DIR}/01-search-results.png`,
      fullPage: false
    });
    console.log('✅ Saved: 01-search-results.png');
    
    // 2. Product card page
    console.log('📸 Screenshot 2/3: Product card...');
    await page.goto(`${BASE_URL}/product.html?mpn=2N3904`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for data to load
    await page.screenshot({ 
      path: `${SCREENSHOTS_DIR}/02-product-card.png`,
      fullPage: false
    });
    console.log('✅ Saved: 02-product-card.png');
    
    // 3. Health endpoint (render JSON)
    console.log('📸 Screenshot 3/3: Health/Metrics...');
    await page.goto(`${BASE_URL}/api/health?probe=true`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `${SCREENSHOTS_DIR}/03-health-api.png`,
      fullPage: false
    });
    console.log('✅ Saved: 03-health-api.png');
    
    console.log('\n✨ All screenshots saved to:', SCREENSHOTS_DIR);
    
  } catch (error) {
    console.error('❌ Screenshot error:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
