#!/usr/bin/env node
/**
 * Построить coverage matrix из сырых ответов провайдеров
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawDir = path.join(__dirname, '..', 'docs', '_artifacts', new Date().toISOString().split('T')[0], 'providers', 'raw');
const outDir = path.join(__dirname, '..', 'docs', '_artifacts', new Date().toISOString().split('T')[0], 'providers');

const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.json'));

const rows = [];

for (const file of files) {
  const [provider, mpnPart] = file.replace('.json', '').split('-');
  const mpn = mpnPart.replace(/plus/g, '+');

  const content = JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf8'));

  let row = {
    provider,
    mpn,
    priceBreaks: 'N/A',
    currency: '',
    stockQty: '',
    manufacturer: '',
    description: '',
    package: '',
    packaging: '',
    regions: '',
    leadTime: '',
    url: ''
  };

  // DigiKey
  if (provider === 'digikey' && content.data?.Products) {
    const product = content.data.Products[0];
    if (product) {
      row.manufacturer = product.Manufacturer?.Name || '';
      row.description = product.Description?.ProductDescription || product.Description?.DetailedDescription || '';
      row.package = product.Packaging?.Name || '';
      row.url = product.ProductUrl || '';

      const variation = product.ProductVariations?.[0];
      if (variation) {
        row.packaging = variation.PackageType?.Name || '';
        const pricing = variation.StandardPricing || [];
        row.priceBreaks = pricing.length > 0 ? `${pricing.length} tiers` : 'N/A';
        row.currency = 'USD';
      }

      row.stockQty = product.QuantityAvailable || variation?.QuantityAvailable || '';
      row.leadTime = product.ManufacturerLeadWeeks || '';
      row.regions = 'US,GLOBAL';
    }
  }

  // Mouser
  if (provider === 'mouser' && content.data?.SearchResults?.Parts) {
    const part = content.data.SearchResults.Parts[0];
    if (part) {
      row.manufacturer = part.Manufacturer || '';
      row.description = part.Description || '';
      row.package = part.Package || '';
      row.packaging = part.Packaging || '';
      row.stockQty = part.AvailabilityInStock || part.Availability || '';
      row.leadTime = part.LeadTime || '';
      row.url = part.ProductDetailUrl || '';
      row.priceBreaks = part.PriceBreaks?.length > 0 ? `${part.PriceBreaks.length} tiers` : 'N/A';
      row.currency = part.PriceBreaks?.[0]?.Currency || 'USD';
      row.regions = 'US';
    }
  }

  // TME
  if (provider === 'tme' && content.data?.Data?.ProductList) {
    const product = content.data.Data.ProductList[0];
    if (product) {
      row.manufacturer = product.Producer || '';
      row.description = product.Description || '';
      row.stockQty = product.Amount || '';
      row.url = product.ProductInformationPage || '';
      row.priceBreaks = product.PriceList?.length > 0 ? `${product.PriceList.length} tiers` : 'N/A';
      row.currency = 'PLN';
      row.regions = 'EU';
    }
  }

  // Farnell
  if (provider === 'farnell' && content.data?.products) {
    const product = content.data.products[0];
    if (product) {
      row.manufacturer = product.brandName || '';
      row.description = product.displayName || product.translatedManufacturerPartNumber || '';
      row.package = product.packSize || '';
      row.stockQty = product.inventoryCode || product.availability?.freeStock || '';
      row.url = `https://uk.farnell.com/${product.id}`;
      row.priceBreaks = product.prices?.length > 0 ? `${product.prices.length} tiers` : 'N/A';
      row.currency = 'GBP';
      row.regions = 'EU,UK';
    }
  }

  rows.push(row);
}

// CSV
const csvHeader = 'provider,mpn,priceBreaks,currency,stockQty,manufacturer,description,package,packaging,regions,leadTime,url\n';
const csvRows = rows.map(r =>
  `${r.provider},${r.mpn},"${r.priceBreaks}",${r.currency},${r.stockQty},"${r.manufacturer}","${r.description}",${r.package},${r.packaging},${r.regions},${r.leadTime},"${r.url}"`
).join('\n');

fs.writeFileSync(path.join(outDir, 'coverage-matrix.csv'), csvHeader + csvRows);
fs.writeFileSync(path.join(outDir, 'coverage-matrix.json'), JSON.stringify(rows, null, 2));

console.log(`\n✓ Coverage matrix generated:`);
console.log(`  ${outDir}/coverage-matrix.csv`);
console.log(`  ${outDir}/coverage-matrix.json`);
console.log(`\n📊 Summary:`);
console.log(`  Total: ${rows.length} provider×MPN combinations`);
console.log(`  Providers: ${[...new Set(rows.map(r => r.provider))].join(', ')}`);
console.log(`  MPNs: ${[...new Set(rows.map(r => r.mpn))].join(', ')}\n`);
