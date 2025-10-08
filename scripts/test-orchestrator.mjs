#!/usr/bin/env node
// Test orchestrator with p-queue and timeout logic

import { orchestrateProviderSearch } from '../src/search/providerOrchestrator.mjs';

console.log('🧪 Testing orchestrator with p-queue + timeout');
console.log('=' .repeat(60));

// Mock keys (no actual API calls will succeed, but we test the flow)
const mockKeys = {
  mouser: 'test-key',
  digikeyClientId: 'test-id',
  digikeyClientSecret: 'test-secret',
  tmeToken: 'test-token',
  tmeSecret: 'test-secret',
  farnell: 'test-key',
  farnellRegion: 'uk.farnell.com'
};

const startTime = Date.now();

try {
  const result = await orchestrateProviderSearch('LM358', mockKeys);
  
  const elapsed = Date.now() - startTime;
  
  console.log('\n✅ Orchestrator completed');
  console.log(`⏱️  Total elapsed: ${elapsed}ms`);
  console.log(`📊 Total rows: ${result.rows.length}`);
  console.log(`🔌 Providers: ${result.providers.length}`);
  
  console.log('\n📋 Provider summary:');
  result.providers.forEach(p => {
    const status = p.status === 'ok' ? '✅' : '❌';
    console.log(`  ${status} ${p.provider}: ${p.status} (${p.elapsed_ms || 0}ms)`);
    if (p.message) console.log(`     Error: ${p.message}`);
  });
  
  console.log('\n🎯 Test expectations:');
  console.log(`  - All providers should fail (no real API keys)`);
  console.log(`  - Each provider should have timeout/error logged`);
  console.log(`  - Total time should be < 10s (PROVIDER_TIMEOUT)`);
  console.log(`  - Metrics should be incremented (check /api/metrics)`);
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
