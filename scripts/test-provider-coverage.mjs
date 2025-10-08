#!/usr/bin/env node
/**
 * Provider Coverage Test
 * Tests multiple products across all providers and analyzes data quality
 */

import { promises as fs } from 'fs';

const TEST_PRODUCTS = [
  '2N3904',           // BJT transistor (popular)
  'STM32F407VGT6',    // MCU (complex part)
  'LM358',            // Op-amp (generic)
  'DS1307',           // RTC (specialized)
  '1N4007'            // Diode (simple)
];

const API_BASE = 'http://localhost:9201';

async function testProduct(mpn) {
  const url = `${API_BASE}/api/search?q=${encodeURIComponent(mpn)}&fresh=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok || !data.rows) {
      return { mpn, error: 'Invalid response', results: [] };
    }

    // Group by source
    const bySource = {};
    for (const item of data.rows) {
      const src = item.source || 'unknown';
      if (!bySource[src]) {
        bySource[src] = [];
      }
      bySource[src].push(item);
    }

    // Analyze each provider
    const analysis = {};
    for (const [source, items] of Object.entries(bySource)) {
      const sample = items[0]; // First result as sample

      analysis[source] = {
        count: items.length,
        has_price: items.filter(i => i.min_price > 0).length,
        has_stock: items.filter(i => i.stock > 0).length,
        has_datasheet: items.filter(i => i.datasheet_url).length,
        has_image: items.filter(i => i.image_url).length,
        has_description: items.filter(i => i.description_short || i.title).length,
        avg_price_rub: items.filter(i => i.min_price_rub).reduce((sum, i) => sum + i.min_price_rub, 0) / items.filter(i => i.min_price_rub).length || 0,
        sample_title: sample?.title?.substring(0, 80) || '',
        sample_desc: sample?.description_short?.substring(0, 100) || '',
        sample_stock: sample?.stock || 0,
        sample_price_rub: sample?.min_price_rub || 0
      };
    }

    return {
      mpn,
      total: data.rows.length,
      providers: Object.keys(bySource).sort(),
      analysis
    };

  } catch (error) {
    return {
      mpn,
      error: error.message,
      results: []
    };
  }
}

async function main() {
  console.log('🧪 Testing Provider Coverage\n');
  console.log(`Products: ${TEST_PRODUCTS.join(', ')}\n`);
  console.log('='.repeat(80) + '\n');

  const results = [];

  for (const mpn of TEST_PRODUCTS) {
    console.log(`Testing: ${mpn}...`);
    const result = await testProduct(mpn);
    results.push(result);

    if (result.error) {
      console.log(`  ❌ ERROR: ${result.error}\n`);
      continue;
    }

    console.log(`  Total results: ${result.total}`);
    console.log(`  Providers: ${result.providers.join(', ')}`);

    for (const [source, data] of Object.entries(result.analysis)) {
      console.log(`\n  📦 ${source.toUpperCase()}:`);
      console.log(`     Count: ${data.count} items`);
      console.log(`     Pricing: ${data.has_price}/${data.count} (avg ₽${Math.round(data.avg_price_rub)})`);
      console.log(`     Stock: ${data.has_stock}/${data.count}`);
      console.log(`     Datasheet: ${data.has_datasheet}/${data.count}`);
      console.log(`     Images: ${data.has_image}/${data.count}`);
      console.log(`     Description: ${data.has_description}/${data.count}`);
      console.log(`     Sample: ${data.sample_title}`);
    }

    console.log('\n' + '-'.repeat(80) + '\n');
  }

  // Save detailed results
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = `docs/_artifacts/${timestamp}/provider-coverage-test.json`;

  await fs.mkdir(`docs/_artifacts/${timestamp}`, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));

  console.log(`\n✅ Detailed results saved to: ${outputPath}\n`);

  // Summary table
  console.log('='.repeat(80));
  console.log('SUMMARY TABLE\n');
  console.log('Product'.padEnd(20) + 'Total'.padEnd(8) + 'DigiKey'.padEnd(10) + 'Mouser'.padEnd(10) + 'Farnell'.padEnd(10) + 'TME');
  console.log('-'.repeat(80));

  for (const r of results) {
    if (r.error) continue;
    const row = r.mpn.padEnd(20) +
      String(r.total).padEnd(8) +
      String(r.analysis.digikey?.count || 0).padEnd(10) +
      String(r.analysis.mouser?.count || 0).padEnd(10) +
      String(r.analysis.farnell?.count || 0).padEnd(10) +
      String(r.analysis.tme?.count || 0);
    console.log(row);
  }

  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
