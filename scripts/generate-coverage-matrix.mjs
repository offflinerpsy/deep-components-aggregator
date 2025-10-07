#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const today = new Date().toISOString().slice(0, 10);
const artifactsDir = path.resolve('docs/_artifacts', today);
const providersDir = path.join(artifactsDir, 'providers', 'raw');

if (!fs.existsSync(providersDir)) {
  fs.mkdirSync(providersDir, { recursive: true });
}

// Collect all raw provider files from today
const rawFiles = fs.readdirSync(providersDir).filter(f => f.endsWith('.json'));

const matrix = {
  generatedAt: new Date().toISOString(),
  providers: ['digikey', 'mouser', 'farnell', 'tme'],
  mpns: ['DS12C887+', '2N3904', 'STM32F103C8T6'],
  coverage: {}
};

// Initialize matrix
matrix.providers.forEach(provider => {
  matrix.coverage[provider] = {};
  matrix.mpns.forEach(mpn => {
    matrix.coverage[provider][mpn] = {
      hasResponse: false,
      hasProducts: false,
      hasPricing: false,
      hasStock: false,
      error: null
    };
  });
});

// Process raw files
rawFiles.forEach(fileName => {
  const filePath = path.join(providersDir, fileName);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const provider = content.provider;
  const mpn = content.mpn;

  if (provider && mpn && matrix.coverage[provider] && matrix.coverage[provider][mpn]) {
    const entry = matrix.coverage[provider][mpn];

    entry.hasResponse = true;
    entry.error = content.error || null;

    if (content.ok && content.data) {
      const products = content.data.Products || content.data.SearchResults?.Parts || content.data.Data?.ProductList || [];
      entry.hasProducts = Array.isArray(products) && products.length > 0;

      if (entry.hasProducts) {
        const firstProduct = products[0];
        entry.hasPricing = Boolean(
          firstProduct.StandardPricing ||
          firstProduct.PriceBreaks ||
          firstProduct.ProductVariations?.[0]?.StandardPricing
        );
        entry.hasStock = Boolean(
          firstProduct.QuantityAvailable ||
          firstProduct.AvailabilityInStock ||
          firstProduct.Stock
        );
      }
    }
  }
});

// Generate CSV
const csvLines = ['Provider,MPN,HasResponse,HasProducts,HasPricing,HasStock,Error'];
matrix.providers.forEach(provider => {
  matrix.mpns.forEach(mpn => {
    const entry = matrix.coverage[provider][mpn];
    csvLines.push([
      provider,
      mpn,
      entry.hasResponse,
      entry.hasProducts,
      entry.hasPricing,
      entry.hasStock,
      entry.error || ''
    ].join(','));
  });
});

// Save outputs
const outputDir = path.join(artifactsDir, 'providers');
fs.writeFileSync(path.join(outputDir, 'coverage-matrix-detailed.json'), JSON.stringify(matrix, null, 2));
fs.writeFileSync(path.join(outputDir, 'coverage-matrix.csv'), csvLines.join('\n'));

console.log(`Coverage matrix generated for ${today}`);
console.log(`  Raw files processed: ${rawFiles.length}`);
console.log(`  Matrix: ${outputDir}/coverage-matrix-detailed.json`);
console.log(`  CSV: ${outputDir}/coverage-matrix.csv`);
