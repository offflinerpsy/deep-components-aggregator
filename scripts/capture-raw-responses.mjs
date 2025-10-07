#!/usr/bin/env node
/**
 * Захватить сырые ответы от всех настроенных провайдеров
 * Для тестовых MPN: DS12C887+, 2N3904, STM32F103C8T6
 */

import 'dotenv/config';
import '../src/bootstrap/proxy.mjs'; // Enable global proxy for providers
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testMPNs = ['DS12C887+', '2N3904', 'STM32F103C8T6'];
const outputDir = path.join(__dirname, '..', 'docs', '_artifacts', new Date().toISOString().split('T')[0], 'providers', 'raw');

fs.mkdirSync(outputDir, { recursive: true });

console.log(`\n📦 Capturing raw responses to: ${outputDir}\n`);

// DigiKey
if (process.env.DIGIKEY_CLIENT_ID && process.env.DIGIKEY_CLIENT_SECRET) {
  console.log('✅ DigiKey configured');
  const { digikeySearch } = await import('../src/integrations/digikey/client.mjs');

  for (const mpn of testMPNs) {
    try {
      console.log(`  → DigiKey search: ${mpn}`);
      const result = await digikeySearch({
        clientId: process.env.DIGIKEY_CLIENT_ID,
        clientSecret: process.env.DIGIKEY_CLIENT_SECRET,
        keyword: mpn,
        limit: 5
      });

      const outFile = path.join(outputDir, `digikey-${mpn.replace(/\+/g, 'plus')}.json`);
      fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
      console.log(`    ✓ Saved: ${path.basename(outFile)}`);
    } catch (error) {
      console.error(`    ✗ DigiKey ${mpn}: ${error.message}`);
    }
  }
} else {
  console.log('❌ DigiKey: No credentials');
}

// Mouser
if (process.env.MOUSER_API_KEY) {
  console.log('✅ Mouser configured');
  const { mouserSearchByKeyword } = await import('../src/integrations/mouser/client.mjs');

  for (const mpn of testMPNs) {
    try {
      console.log(`  → Mouser search: ${mpn}`);
      const result = await mouserSearchByKeyword({
        apiKey: process.env.MOUSER_API_KEY,
        q: mpn,
        records: 5
      });

      const outFile = path.join(outputDir, `mouser-${mpn.replace(/\+/g, 'plus')}.json`);
      fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
      console.log(`    ✓ Saved: ${path.basename(outFile)}`);
    } catch (error) {
      console.error(`    ✗ Mouser ${mpn}: ${error.message}`);
    }
  }
} else {
  console.log('❌ Mouser: No API key');
}

// TME
if (process.env.TME_TOKEN && process.env.TME_SECRET) {
  console.log('✅ TME configured');
  const { tmeSearchProducts } = await import('../src/integrations/tme/client.mjs');

  for (const mpn of testMPNs) {
    try {
      console.log(`  → TME search: ${mpn}`);
      const result = await tmeSearchProducts({
        token: process.env.TME_TOKEN,
        secret: process.env.TME_SECRET,
        query: mpn,
        country: 'PL',
        language: 'EN'
      });

      const outFile = path.join(outputDir, `tme-${mpn.replace(/\+/g, 'plus')}.json`);
      fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
      console.log(`    ✓ Saved: ${path.basename(outFile)}`);
    } catch (error) {
      console.error(`    ✗ TME ${mpn}: ${error.message}`);
    }
  }
} else {
  console.log('❌ TME: No credentials');
}

// Farnell
if (process.env.FARNELL_API_KEY) {
  console.log('✅ Farnell configured');
  const { farnellByKeyword } = await import('../src/integrations/farnell/client.mjs');

  for (const mpn of testMPNs) {
    try {
      console.log(`  → Farnell search: ${mpn}`);
      const result = await farnellByKeyword({
        apiKey: process.env.FARNELL_API_KEY,
        region: process.env.FARNELL_REGION || 'uk.farnell.com',
        q: mpn,
        limit: 5
      });

      const outFile = path.join(outputDir, `farnell-${mpn.replace(/\+/g, 'plus')}.json`);
      fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
      console.log(`    ✓ Saved: ${path.basename(outFile)}`);
    } catch (error) {
      console.error(`    ✗ Farnell ${mpn}: ${error.message}`);
    }
  }
} else {
  console.log('❌ Farnell: No API key');
}

console.log(`\n✓ Raw responses captured to ${outputDir}\n`);
