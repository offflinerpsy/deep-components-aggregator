#!/usr/bin/env node
// Quick debug script to test production search

const PROD_URL = 'http://5.129.228.88:9201';

async function testSearch(query) {
  console.log(`\n🔍 Testing: "${query}"`);
  
  try {
    const response = await fetch(`${PROD_URL}/api/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

// Test with simple English query
testSearch('resistor').then(() => {
  console.log('\n✅ Test complete');
});
