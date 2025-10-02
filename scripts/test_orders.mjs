// Orders Backend Test Runner
// Manual tests from tests/orders.spec.md

import { request } from 'undici';

const BASE_URL = 'http://localhost:9201';

let testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

function log(msg) {
  console.log(`[TEST] ${msg}`);
}

function logPass(test) {
  console.log(`✅ PASS: ${test}`);
  testResults.passed++;
  testResults.total++;
}

function logFail(test, reason) {
  console.error(`❌ FAIL: ${test}`);
  console.error(`   Reason: ${reason}`);
  testResults.failed++;
  testResults.total++;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Suite 1: Health Check
async function testHealthCheck() {
  log('Testing health check endpoint...');
  try {
    const { statusCode, body } = await request(`${BASE_URL}/api/health`);
    const data = await body.json();
    
    if (statusCode !== 200) {
      logFail('Health check', `Expected 200, got ${statusCode}`);
      return;
    }
    
    if (data.version !== '3.1') {
      logFail('Health check', `Expected version 3.1, got ${data.version}`);
      return;
    }
    
    if (!data.features?.orders || !data.features?.metrics) {
      logFail('Health check', 'Missing features.orders or features.metrics');
      return;
    }
    
    logPass('Health check returns correct version and features');
  } catch (error) {
    logFail('Health check', error.message);
  }
}

// Test Suite 2: POST /api/order (Valid)
async function testMinimalValidOrder() {
  log('Testing minimal valid order...');
  try {
    const { statusCode, body } = await request(`${BASE_URL}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Test User Minimal',
          contact: {
            email: 'minimal@example.com'
          }
        },
        item: {
          mpn: 'ATMEGA328P-PU',
          manufacturer: 'Microchip',
          qty: 10
        }
      })
    });
    
    const data = await body.json();
    
    if (statusCode !== 201) {
      logFail('Minimal valid order', `Expected 201, got ${statusCode}. Response: ${JSON.stringify(data)}`);
      return;
    }
    
    if (!data.ok || !data.orderId) {
      logFail('Minimal valid order', `Missing orderId. Response: ${JSON.stringify(data)}`);
      return;
    }
    
    // Verify UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.orderId)) {
      logFail('Minimal valid order', `Invalid UUID format: ${data.orderId}`);
      return;
    }
    
    logPass('Minimal valid order returns 201 with UUID');
  } catch (error) {
    logFail('Minimal valid order', error.message);
  }
}

async function testPhoneContactOnly() {
  log('Testing phone contact only...');
  try {
    const { statusCode, body } = await request(`${BASE_URL}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Phone Test User',
          contact: {
            phone: '+79261234567'
          }
        },
        item: {
          mpn: 'NE555',
          manufacturer: 'Texas Instruments',
          qty: 50
        }
      })
    });
    
    if (statusCode !== 201) {
      logFail('Phone contact only', `Expected 201, got ${statusCode}`);
      return;
    }
    
    logPass('Phone contact only accepted');
  } catch (error) {
    logFail('Phone contact only', error.message);
  }
}

async function testTelegramContactOnly() {
  log('Testing Telegram contact only...');
  try {
    const { statusCode, body } = await request(`${BASE_URL}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Telegram Test User',
          contact: {
            telegram: '@test_user'
          }
        },
        item: {
          mpn: 'ESP32-WROOM-32',
          manufacturer: 'Espressif',
          qty: 20
        }
      })
    });
    
    if (statusCode !== 201) {
      logFail('Telegram contact only', `Expected 201, got ${statusCode}`);
      return;
    }
    
    logPass('Telegram contact only accepted');
  } catch (error) {
    logFail('Telegram contact only', error.message);
  }
}

// Test Suite 3: POST /api/order (Invalid)
async function testMissingCustomerName() {
  log('Testing missing customer name...');
  try {
    const { statusCode, body } = await request(`${BASE_URL}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          contact: {
            email: 'test@example.com'
          }
        },
        item: {
          mpn: 'TEST-001',
          manufacturer: 'Test',
          qty: 1
        }
      })
    });
    
    const data = await body.json();
    
    if (statusCode !== 400) {
      logFail('Missing customer name', `Expected 400, got ${statusCode}`);
      return;
    }
    
    if (data.error !== 'validation_error') {
      logFail('Missing customer name', `Expected validation_error, got ${data.error}`);
      return;
    }
    
    logPass('Missing customer name rejected with 400');
  } catch (error) {
    logFail('Missing customer name', error.message);
  }
}

async function testNoContactMethods() {
  log('Testing no contact methods...');
  try {
    const { statusCode, body } = await request(`${BASE_URL}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'No Contact User',
          contact: {}
        },
        item: {
          mpn: 'TEST-002',
          manufacturer: 'Test',
          qty: 1
        }
      })
    });
    
    const data = await body.json();
    
    if (statusCode !== 400) {
      logFail('No contact methods', `Expected 400, got ${statusCode}`);
      return;
    }
    
    logPass('No contact methods rejected with 400');
  } catch (error) {
    logFail('No contact methods', error.message);
  }
}

async function testInvalidEmailFormat() {
  log('Testing invalid email format...');
  try {
    const { statusCode, body } = await request(`${BASE_URL}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Invalid Email User',
          contact: {
            email: 'not-an-email'
          }
        },
        item: {
          mpn: 'TEST-003',
          manufacturer: 'Test',
          qty: 1
        }
      })
    });
    
    const data = await body.json();
    
    if (statusCode !== 400) {
      logFail('Invalid email format', `Expected 400, got ${statusCode}`);
      return;
    }
    
    logPass('Invalid email format rejected with 400');
  } catch (error) {
    logFail('Invalid email format', error.message);
  }
}

async function testInvalidPhoneFormat() {
  log('Testing invalid phone format...');
  try {
    const { statusCode, body } = await request(`${BASE_URL}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Invalid Phone User',
          contact: {
            phone: '89161234567' // Missing + at start
          }
        },
        item: {
          mpn: 'TEST-004',
          manufacturer: 'Test',
          qty: 1
        }
      })
    });
    
    const data = await body.json();
    
    if (statusCode !== 400) {
      logFail('Invalid phone format', `Expected 400, got ${statusCode}`);
      return;
    }
    
    logPass('Invalid phone format rejected with 400');
  } catch (error) {
    logFail('Invalid phone format', error.message);
  }
}

async function testInvalidQuantity() {
  log('Testing invalid quantity (zero)...');
  try {
    const { statusCode, body } = await request(`${BASE_URL}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Zero Qty User',
          contact: {
            email: 'test@example.com'
          }
        },
        item: {
          mpn: 'TEST-005',
          manufacturer: 'Test',
          qty: 0
        }
      })
    });
    
    const data = await body.json();
    
    if (statusCode !== 400) {
      logFail('Invalid quantity', `Expected 400, got ${statusCode}`);
      return;
    }
    
    logPass('Invalid quantity (zero) rejected with 400');
  } catch (error) {
    logFail('Invalid quantity', error.message);
  }
}

// Test Suite 4: Metrics
async function testMetricsEndpoint() {
  log('Testing metrics endpoint...');
  try {
    const { statusCode, body, headers } = await request(`${BASE_URL}/api/metrics`);
    const text = await body.text();
    
    if (statusCode !== 200) {
      logFail('Metrics endpoint', `Expected 200, got ${statusCode}`);
      return;
    }
    
    if (!headers['content-type']?.includes('text/plain')) {
      logFail('Metrics endpoint', `Wrong Content-Type: ${headers['content-type']}`);
      return;
    }
    
    if (!text.includes('orders_total')) {
      logFail('Metrics endpoint', 'Missing orders_total metric');
      return;
    }
    
    if (!text.includes('orders_by_status')) {
      logFail('Metrics endpoint', 'Missing orders_by_status metric');
      return;
    }
    
    logPass('Metrics endpoint returns Prometheus format');
  } catch (error) {
    logFail('Metrics endpoint', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('\n🧪 Orders Backend Test Suite');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log('='.repeat(60) + '\n');
  
  // Wait for server to be ready
  await sleep(1000);
  
  // Health check
  await testHealthCheck();
  await sleep(100);
  
  // Valid orders
  await testMinimalValidOrder();
  await sleep(100);
  await testPhoneContactOnly();
  await sleep(100);
  await testTelegramContactOnly();
  await sleep(100);
  
  // Invalid orders
  await testMissingCustomerName();
  await sleep(100);
  await testNoContactMethods();
  await sleep(100);
  await testInvalidEmailFormat();
  await sleep(100);
  await testInvalidPhoneFormat();
  await sleep(100);
  await testInvalidQuantity();
  await sleep(100);
  
  // Metrics
  await testMetricsEndpoint();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`Total:  ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');
  
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\n❌ Test runner crashed:', error);
  process.exit(1);
});
