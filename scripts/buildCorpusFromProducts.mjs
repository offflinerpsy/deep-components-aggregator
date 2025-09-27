#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const PRODUCTS_DIR = 'data/products';
const CORPUS_FILE = 'data/corpus.json';

function loadProducts() {
  const products = [];
  const productFiles = glob.sync(`${PRODUCTS_DIR}/**/*.json`);
  
  for (const file of productFiles) {
    if (!fs.existsSync(file)) continue;
    
    const productData = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!productData || typeof productData !== 'object') continue;
    
    const document = {
      id: productData.mpn || path.basename(file, '.json'),
      title: productData.title || '',
      manufacturer: productData.manufacturer || '',
      mpn: productData.mpn || '',
      image: productData.image || '',
      url: productData.url || '',
      stock: productData.stock || '',
      source: productData.source || 'unknown',
      price_raw: productData.price_raw || 0,
      currency: productData.currency || '',
      specs_flat: flattenSpecs(productData.specs || {}),
      content: buildSearchContent(productData)
    };
    
    products.push(document);
  }
  
  return products;
}

function flattenSpecs(specs) {
  if (!specs || typeof specs !== 'object') return '';
  
  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' ');
}

function buildSearchContent(product) {
  const parts = [
    product.title || '',
    product.manufacturer || '',
    product.mpn || '',
    flattenSpecs(product.specs || {})
  ];
  
  return parts.filter(Boolean).join(' ');
}

async function main() {
  console.log('Building corpus from products...');
  
  const products = loadProducts();
  console.log(`Loaded ${products.length} products`);
  
  fs.writeFileSync(CORPUS_FILE, JSON.stringify(products, null, 2));
  
  console.log(`Corpus saved to: ${CORPUS_FILE}`);
  console.log(`Total documents: ${products.length}`);
  
  if (products.length > 0) {
    const sample = products[0];
    console.log('Sample document:');
    console.log(`  ID: ${sample.id}`);
    console.log(`  Title: ${sample.title}`);
    console.log(`  Manufacturer: ${sample.manufacturer}`);
    console.log(`  MPN: ${sample.mpn}`);
    console.log(`  Source: ${sample.source}`);
  }
}

main().catch(console.error);
