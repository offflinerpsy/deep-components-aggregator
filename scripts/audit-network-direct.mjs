#!/usr/bin/env node
/**
 * Direct Network Test (without proxy)
 */

import { fetch } from 'undici';
import fs from 'node:fs';

const TARGETS = [
  'https://www.digikey.com',
  'https://www.mouser.com',
  'https://www.element14.com',
  'https://www.tme.eu'
];

async function testDomain(url) {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    });
    const latency = Date.now() - start;
    return {
      url,
      status: response.status,
      latency_ms: latency,
      ok: response.ok
    };
  } catch (error) {
    return {
      url,
      status: 0,
      latency_ms: Date.now() - start,
      ok: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🌐 Testing direct connectivity (without proxy)...\n');
  
  const results = [];
  for (const url of TARGETS) {
    console.log(`Testing ${url}...`);
    const result = await testDomain(url);
    results.push(result);
    const status = result.ok ? '✅' : '❌';
    console.log(`${status} ${result.status} (${result.latency_ms}ms)${result.error ? ` - ${result.error}` : ''}\n`);
  }

  // Update network.json with direct results
  const networkPath = 'docs/_artifacts/audit-2025-10-04/network.json';
  const networkData = JSON.parse(fs.readFileSync(networkPath, 'utf8'));
  networkData.direct_tests = results;
  networkData.direct_connectivity = results.filter(r => r.ok).length === results.length;
  
  fs.writeFileSync(networkPath, JSON.stringify(networkData, null, 2));
  console.log(`✅ Updated ${networkPath} with direct test results`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
