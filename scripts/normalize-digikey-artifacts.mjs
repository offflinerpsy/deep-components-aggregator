#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { normDigiKey } from '../src/integrations/digikey/normalize.mjs';

const argDate = process.argv.find((arg) => arg.startsWith('--date='));
const selectedDate = argDate ? argDate.split('=')[1] : new Date().toISOString().slice(0, 10);

if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(selectedDate)) {
  console.error(`Invalid date format: ${selectedDate}. Expected YYYY-MM-DD.`);
  process.exit(1);
}

const artifactsRoot = path.resolve('docs/_artifacts', selectedDate, 'srx-03-prices');
const rawDir = path.join(artifactsRoot, 'raw');
const outDir = path.join(artifactsRoot, 'after');

if (!fs.existsSync(rawDir)) {
  console.error(`Raw directory not found: ${rawDir}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const digikeyFiles = fs
  .readdirSync(rawDir)
  .filter((name) => name.startsWith('digikey-') && name.endsWith('.json'))
  .sort();

if (digikeyFiles.length === 0) {
  console.error(`No Digi-Key raw files in ${rawDir}`);
  process.exit(1);
}

const extractProducts = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.Products)) return payload.Products;
  if (Array.isArray(payload.raw?.Products)) return payload.raw.Products;
  if (Array.isArray(payload.data?.Products)) return payload.data.Products;
  return [];
};

const summary = [];

for (const fileName of digikeyFiles) {
  const filePath = path.join(rawDir, fileName);
  const rawPayload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const products = extractProducts(rawPayload);
  const normalized = products.map(normDigiKey).filter(Boolean);
  const outputName = fileName.replace(/\.json$/, '-normalized.json');
  const outputPath = path.join(outDir, outputName);
  fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2));
  summary.push({
    input: path.relative(process.cwd(), filePath),
    products: products.length,
    normalized: normalized.length,
    output: path.relative(process.cwd(), outputPath)
  });
}

const summaryPath = path.join(artifactsRoot, 'normalize-report.json');
fs.writeFileSync(summaryPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  date: selectedDate,
  files: summary
}, null, 2));

console.log(`Normalized ${summary.length} Digi-Key artifact file(s).`);
console.log(`Summary → ${summaryPath}`);
