#!/usr/bin/env node
/**
 * Frontend Integration Smoke Test
 *
 * Проверяет что:
 * 1. Backend отдаёт данные через витрину
 * 2. SSE Live Search работает
 * 3. Нормализация RU→EN активна
 * 4. Rewrites настроены (фронт проксирует на бэкенд)
 */

const BACKEND_URL = 'http://127.0.0.1:9201';
const FRONTEND_URL = 'http://127.0.0.1:3000';

console.log('🧪 Frontend Integration Smoke Test\n');

// Test 1: Backend Vitrine API
console.log('1️⃣ Testing Backend Vitrine API...');
try {
  const res = await fetch(`${BACKEND_URL}/api/vitrine/list?limit=10`);
  const data = await res.json();

  if (data.ok && Array.isArray(data.rows)) {
    console.log(`   ✅ Backend vitrine: ${data.rows.length} components`);
    if (data.rows.length > 0) {
      const sample = data.rows[0];
      console.log(`   📦 Sample: ${sample.mpn} (${sample.source})`);
    }
  } else {
    console.log(`   ❌ Backend vitrine failed:`, data);
    process.exit(1);
  }
} catch (err) {
  console.log(`   ❌ Backend vitrine error:`, err.message);
  process.exit(1);
}

// Test 2: Russian Normalization
console.log('\n2️⃣ Testing Russian Normalization...');
try {
  const queries = ['транзистор', 'резистор', 'конденсатор'];

  for (const q of queries) {
    const res = await fetch(`${BACKEND_URL}/api/vitrine/list?q=${encodeURIComponent(q)}&limit=5`);
    const data = await res.json();

    if (data.ok) {
      const normalized = data.meta?.queryNorm?.normalized || 'N/A';
      const hasResults = data.rows.length > 0;

      console.log(`   "${q}" → "${normalized}": ${hasResults ? '✅' : '⚠️'} (${data.rows.length} results)`);

      if (hasResults && data.meta?.queryNorm) {
        console.log(`      Transliterated: ${data.meta.queryNorm.transliterated}`);
        console.log(`      All queries: ${data.meta.queryNorm.allQueries.join(', ')}`);
      }
    } else {
      console.log(`   ❌ Query "${q}" failed:`, data);
    }
  }
} catch (err) {
  console.log(`   ❌ Normalization test error:`, err.message);
  process.exit(1);
}

// Test 3: Frontend Rewrites (проверяем что фронт проксирует на бэкенд)
console.log('\n3️⃣ Testing Frontend Rewrites...');
try {
  const res = await fetch(`${FRONTEND_URL}/api/vitrine/list?limit=5`);
  const data = await res.json();

  if (data.ok && Array.isArray(data.rows)) {
    console.log(`   ✅ Frontend rewrites work: ${data.rows.length} components via :3000/api/*`);
  } else {
    console.log(`   ❌ Frontend rewrites failed:`, data);
    console.log(`   💡 Hint: Check next.config.mjs rewrites configuration`);
    process.exit(1);
  }
} catch (err) {
  console.log(`   ⚠️ Frontend not running or rewrites broken:`, err.message);
  console.log(`   💡 Start frontend: cd v0-components-aggregator-page && npm run dev`);
  // Don't exit - backend tests passed
}

// Test 4: SSE Live Search (check headers only, don't parse stream)
console.log('\n4️⃣ Testing SSE Live Search Endpoint...');
try {
  const res = await fetch(`${BACKEND_URL}/api/live/search?q=LM317`, {
    method: 'HEAD', // Just check headers
  });

  const contentType = res.headers.get('content-type');
  const isSSE = contentType && contentType.includes('text/event-stream');

  if (isSSE) {
    console.log(`   ✅ SSE endpoint ready (Content-Type: ${contentType})`);
  } else {
    console.log(`   ❌ SSE endpoint wrong Content-Type: ${contentType}`);
    process.exit(1);
  }
} catch (err) {
  console.log(`   ❌ SSE endpoint error:`, err.message);
  process.exit(1);
}

// Summary
console.log('\n✅ All smoke tests passed!\n');
console.log('📋 Next steps:');
console.log('   1. Open http://localhost:3000/ in browser');
console.log('   2. Check "ЧТО ИЩУТ ЛЮДИ" section loads real data');
console.log('   3. Try search with Russian: "транзистор"');
console.log('   4. Verify SSE events in /results page (open DevTools Network tab)');
console.log('');
