#!/usr/bin/env node

import { parseChipdipFile } from '../../adapters/chipdip.fromDom.mjs';
import fs from 'fs';
import path from 'path';

const SNAPSHOT_DIR = 'snapshots/chipdip';
const OUTPUT_DIR = 'data/products/chipdip';

async function main() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    console.log(`Snapshot directory not found: ${SNAPSHOT_DIR}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.html'));
  console.log(`Processing ${files.length} snapshot files...`);
  
  let processed = 0;
  let failed = 0;
  
  for (const file of files) {
    const filepath = path.join(SNAPSHOT_DIR, file);
    const product = parseChipdipFile(filepath);
    
    if (!product) {
      console.log(`Failed to parse: ${file}`);
      failed++;
      continue;
    }
    
    const outputFile = path.join(OUTPUT_DIR, `${path.basename(file, '.html')}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(product, null, 2));
    
    console.log(`Parsed: ${file} -> ${product.title || 'No title'}`);
    processed++;
  }
  
  console.log(`Completed: ${processed} products parsed, ${failed} failed`);
  console.log(`Products saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
