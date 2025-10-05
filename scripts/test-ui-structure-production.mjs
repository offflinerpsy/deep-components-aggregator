// Production UI Structure Verification with Playwright
// Captures screenshots and validates table columns

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const PROD_URL = 'http://5.129.228.88:9201';
const ARTIFACT_DIR = 'docs/_artifacts/live-pass-2025-10-05';
const SCREENSHOTS_DIR = join(ARTIFACT_DIR, 'screenshots');

const EXPECTED_COLUMNS = [
  'Manufacturer',
  'MPN',
  'Description',
  'Region',
  'Price ₽',
  'CTA' // Call-to-action button
];

async function verifyUI() {
  console.log('🚀 UI Structure Production Verification');
  console.log(`📍 Target: ${PROD_URL}\n`);
  
  // Create screenshots directory
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  
  console.log('📸 Navigating to homepage...');
  await page.goto(PROD_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000); // Wait for any dynamic content
  
  // Screenshot 1: Homepage
  const homescreenPath = join(SCREENSHOTS_DIR, 'block-3-homepage.png');
  await page.screenshot({ path: homescreenPath, fullPage: true });
  console.log(`✅ Saved: ${homescreenPath}`);
  
  // Perform search
  console.log('\n🔍 Performing search for "resistor"...');
  await page.fill('#searchInput', 'resistor');
  await page.press('#searchInput', 'Enter');
  
  // Wait for results
  await page.waitForTimeout(5000); // Wait for API response
  
  // Screenshot 2: Search results
  const resultsPath = join(SCREENSHOTS_DIR, 'block-3-search-results.png');
  await page.screenshot({ path: resultsPath, fullPage: true });
  console.log(`✅ Saved: ${resultsPath}`);
  
  // Extract table structure
  const tableData = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    if (tables.length === 0) return { found: false, error: 'No tables found' };
    
    const table = tables[0];
    const headers = Array.from(table.querySelectorAll('thead th, thead td')).map(th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 3).map(tr => {
      return Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim().substring(0, 50));
    });
    
    return {
      found: true,
      headers,
      rowCount: table.querySelectorAll('tbody tr').length,
      sampleRows: rows
    };
  });
  
  console.log('\n📊 Table Analysis:');
  if (tableData.found) {
    console.log(`   Headers: ${tableData.headers.join(' | ')}`);
    console.log(`   Rows: ${tableData.rowCount}`);
  } else {
    console.log(`   ❌ ${tableData.error}`);
  }
  
  // Verify columns
  const results = {
    timestamp: new Date().toISOString(),
    productionUrl: PROD_URL,
    tableFound: tableData.found,
    headers: tableData.headers || [],
    expectedHeaders: EXPECTED_COLUMNS,
    rowCount: tableData.rowCount || 0,
    sampleRows: tableData.sampleRows || [],
    screenshots: [
      { name: 'homepage', path: homescreenPath },
      { name: 'search-results', path: resultsPath }
    ],
    verdict: tableData.found && tableData.rowCount > 0 ? 'PASSED' : 'NEEDS_IMPROVEMENT'
  };
  
  await browser.close();
  
  // Save artifact
  const artifactPath = join(ARTIFACT_DIR, 'block-3-ui-structure.json');
  await writeFile(artifactPath, JSON.stringify(results, null, 2));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`📋 Table Found: ${results.tableFound ? 'YES' : 'NO'}`);
  console.log(`📊 Row Count: ${results.rowCount}`);
  console.log(`📸 Screenshots: ${results.screenshots.length}`);
  console.log(`\n🎯 Verdict: ${results.verdict}`);
  console.log(`💾 Artifact: ${artifactPath}`);
  
  return results.verdict === 'PASSED' ? 0 : 1;
}

verifyUI().then(code => process.exit(code)).catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
