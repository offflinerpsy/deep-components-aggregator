#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = 'data/seed/chipdip-products.txt';
const SNAPSHOT_DIR = 'snapshots/chipdip';
const CONCURRENCY = parseInt(process.env.CD_SNAPSHOT_CONC) || 2;
const DELAY = parseInt(process.env.CD_SNAPSHOT_DELAY) || 1000;
const HEADLESS = process.env.HEADLESS !== '0';

function parseProxy() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) return null;
  
  const url = new URL(proxyUrl);
  return {
    server: `${url.protocol}//${url.host}`,
    username: url.username || undefined,
    password: url.password || undefined
  };
}

function sanitizeFilename(url) {
  return url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
}

async function snapshotUrl(browser, url, index) {
  const page = await browser.newPage();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}__${sanitizeFilename(url)}.html`;
  const filepath = path.join(SNAPSHOT_DIR, filename);
  
  console.log(`[${index}] Snapshotting: ${url}`);
  
  const response = await page.goto(url, { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  if (!response || response.status() >= 400) {
    console.log(`[${index}] Failed: ${url} (${response?.status() || 'no response'})`);
    await page.close();
    return null;
  }
  
  await page.waitForSelector('h1', { timeout: 10000 });
  
  const html = await page.content();
  fs.writeFileSync(filepath, html);
  
  console.log(`[${index}] Saved: ${filename}`);
  await page.close();
  
  return filepath;
}

async function processBatch(browser, urls, startIndex) {
  const promises = urls.map((url, i) => 
    snapshotUrl(browser, url, startIndex + i)
  );
  
  return Promise.all(promises);
}

async function main() {
  if (!fs.existsSync(SEED_FILE)) {
    console.log(`Seed file not found: ${SEED_FILE}`);
    process.exit(1);
  }
  
  const seedContent = fs.readFileSync(SEED_FILE, 'utf8');
  const urls = seedContent.trim().split('\n').filter(line => line.trim());
  
  console.log(`Processing ${urls.length} URLs with concurrency ${CONCURRENCY}`);
  
  const proxy = parseProxy();
  if (proxy) {
    console.log(`Using proxy: ${proxy.server}`);
  }
  
  const browser = await chromium.launch({
    headless: HEADLESS,
    ...(proxy && { proxy })
  });
  
  const results = [];
  
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await processBatch(browser, batch, i);
    results.push(...batchResults.filter(Boolean));
    
    if (i + CONCURRENCY < urls.length) {
      console.log(`Waiting ${DELAY}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY));
    }
  }
  
  await browser.close();
  
  console.log(`Completed: ${results.length} snapshots saved to ${SNAPSHOT_DIR}`);
}

main().catch(console.error);
