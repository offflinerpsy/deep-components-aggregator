#!/usr/bin/env node
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:9201/search.html?q=M83513%2F19-E01NW';

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message, stack: err.stack }));

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const summary = await page.evaluate(() => document.getElementById('results-summary')?.textContent || null);
  const rowsCount = await page.evaluate(() => document.querySelectorAll('#results-tbody tr').length);

  await browser.close();

  console.log(JSON.stringify({ url, summary, rowsCount, logs }, null, 2));
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
