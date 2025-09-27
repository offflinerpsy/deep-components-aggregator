#!/usr/bin/env node

import { fetchWithRetry } from '../../src/services/net.js';
import fs from 'fs';
import path from 'path';

const SITEMAP_INDEX = 'https://www.chipdip.by/sitemapindex.xml';
const SEED_FILE = 'data/seed/chipdip-products.txt';
const SEED_LIMIT = parseInt(process.env.CD_SEED_LIMIT) || 500;

async function fetchSitemapIndex() {
  const response = await fetchWithRetry(SITEMAP_INDEX);
  if (!response.ok || response.status >= 400) {
    console.log(`Sitemap index fetch failed: ${response.status}`);
    return [];
  }
  
  const xml = await response.text();
  const urls = [];
  const sitemapMatches = xml.match(/<loc>(.*?)<\/loc>/g);
  
  if (!sitemapMatches) {
    return [];
  }
  
  for (const match of sitemapMatches) {
    const url = match.replace(/<\/?loc>/g, '');
    if (url.includes('sitemap') && url.includes('.xml')) {
      urls.push(url);
    }
  }
  
  return urls;
}

async function fetchSitemap(url) {
  const response = await fetchWithRetry(url);
  if (!response.ok || response.status >= 400) {
    console.log(`Sitemap ${url} fetch failed: ${response.status}`);
    return [];
  }
  
  const xml = await response.text();
  const productUrls = [];
  const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g);
  
  if (!urlMatches) {
    return [];
  }
  
  for (const match of urlMatches) {
    const productUrl = match.replace(/<\/?loc>/g, '');
    if (productUrl.includes('/product') && !productUrl.includes('/search') && !productUrl.includes('/cart')) {
      productUrls.push(productUrl);
    }
  }
  
  return productUrls;
}

async function main() {
  console.log('Fetching sitemap index...');
  const sitemapUrls = await fetchSitemapIndex();
  console.log(`Found ${sitemapUrls.length} sitemaps`);
  
  const allProductUrls = new Set();
  
  for (const sitemapUrl of sitemapUrls) {
    if (allProductUrls.size >= SEED_LIMIT) break;
    
    console.log(`Processing sitemap: ${sitemapUrl}`);
    const productUrls = await fetchSitemap(sitemapUrl);
    
    for (const url of productUrls) {
      if (allProductUrls.size >= SEED_LIMIT) break;
      allProductUrls.add(url);
    }
    
    console.log(`Found ${productUrls.length} products, total: ${allProductUrls.size}`);
  }
  
  const productUrlsArray = Array.from(allProductUrls);
  const seedContent = productUrlsArray.join('\n');
  
  fs.writeFileSync(SEED_FILE, seedContent);
  console.log(`Saved ${productUrlsArray.length} product URLs to ${SEED_FILE}`);
}

main().catch(console.error);
