#!/usr/bin/env node

const mpns = ['2N3904', 'STM32F103C8T6', 'LM358'];
const providers = ['mouser', 'digikey', 'tme', 'farnell'];

async function testMPN(mpn) {
  const res = await fetch(`http://localhost:9201/api/search?q=${encodeURIComponent(mpn)}`);
  const data = await res.json();

  console.log(`\n=== ${mpn} ===`);
  console.log(`Total: ${data.rows?.length || 0} rows`);

  const bySrc = {};
  (data.rows || []).forEach(r => {
    if (!bySrc[r.source]) bySrc[r.source] = 0;
    bySrc[r.source]++;
  });

  providers.forEach(p => {
    const count = bySrc[p] || 0;
    const sample = (data.rows || []).find(r => r.source === p);
    const hasPrice = sample?.min_price > 0;
    const hasStock = sample?.stock > 0;
    const hasPriceBreaks = sample?.price_breaks?.length > 0;
    const rubPrice = sample?.min_price_rub;

    console.log(`  ${p.padEnd(8)}: ${count} rows | price: ${hasPrice ? '✓' : '✗'} | stock: ${hasStock ? '✓' : '✗'} | breaks: ${hasPriceBreaks ? '✓' : '✗'} | rub: ${rubPrice || '—'}`);
  });
}

(async () => {
  for (const mpn of mpns) {
    await testMPN(mpn);
  }
})();
