#!/usr/bin/env node
/**
 * Network Audit Script
 * Tests WARP proxy connectivity and target domains
 */

import { fetch } from 'undici';
import { ProxyAgent } from 'undici';
import fs from 'node:fs';

const WARP_PROXY = 'http://127.0.0.1:40000';
const TARGETS = [
  'https://www.digikey.com',
  'https://www.mouser.com',
  'https://www.element14.com',
  'https://www.tme.eu'
];

async function getIP(useProxy = false) {
  try {
    const options = useProxy ? { dispatcher: new ProxyAgent(WARP_PROXY) } : {};
    const response = await fetch('https://api.ipify.org?format=json', {
      ...options,
      signal: AbortSignal.timeout(9500) // 9.5s max (WARP limit)
    });
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return `ERROR: ${error.message}`;
  }
}

async function testDomain(url, useProxy = false) {
  const start = Date.now();
  try {
    const options = useProxy ? { dispatcher: new ProxyAgent(WARP_PROXY) } : {};
    const response = await fetch(url, {
      method: 'HEAD',
      ...options,
      signal: AbortSignal.timeout(9500)
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
  console.log('🔍 Network Audit Starting...\n');

  // Test IP addresses
  console.log('📡 Testing IP addresses...');
  const directIP = await getIP(false);
  console.log(`  Direct IP: ${directIP}`);
  
  const proxyIP = await getIP(true);
  console.log(`  Via Proxy IP: ${proxyIP}\n`);

  // Test target domains via proxy
  console.log('🌐 Testing target domains via proxy...');
  const results = [];
  for (const url of TARGETS) {
    console.log(`  Testing ${url}...`);
    const result = await testDomain(url, true);
    results.push(result);
    const status = result.ok ? '✅' : '❌';
    console.log(`  ${status} ${result.status} (${result.latency_ms}ms)${result.error ? ` - ${result.error}` : ''}`);
  }

  // Build final report
  const report = {
    warp_proxy: WARP_PROXY,
    proxy_mode: 'http',
    via_proxy_ip: proxyIP,
    direct_ip: directIP,
    proxy_active: proxyIP !== directIP && !proxyIP.startsWith('ERROR'),
    cloudflare_timeout_limit: '10 seconds',
    cloudflare_docs: 'https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/configure-warp/route-traffic/warp-architecture/#connect',
    targets: results,
    tested_at: new Date().toISOString()
  };

  // Save to artifacts
  const outputPath = 'docs/_artifacts/audit-2025-10-04/network.json';
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  
  console.log(`\n✅ Report saved to ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`  WARP Proxy: ${report.proxy_active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
  console.log(`  Successful tests: ${results.filter(r => r.ok).length}/${results.length}`);
  
  // Exit code based on proxy status
  process.exit(report.proxy_active ? 0 : 1);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
