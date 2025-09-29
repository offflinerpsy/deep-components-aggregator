// test-providers.mjs
import { fetchViaScraperAPI } from './adapters/providers/scraperapi.mjs';
import { fetchViaScrapingBee } from './adapters/providers/scrapingbee.mjs';
import { fetchDirect } from './adapters/providers/direct.mjs';
import { PROVIDER_CONFIG } from './config/providers.mjs';

console.log('🧪 Тестирование провайдеров...');

async function testScraperAPI() {
  console.log('\n📡 Тестирую ScraperAPI...');
  const result = await fetchViaScraperAPI({
    key: PROVIDER_CONFIG.SCRAPERAPI_KEY,
    url: 'https://www.chipdip.ru/search?searchtext=LM317',
    timeout: 10000
  });
  
  console.log('ScraperAPI result:', result.ok ? 'SUCCESS' : 'FAILED');
  if (!result.ok) {
    console.log('Error:', result.reason, result.code);
  } else {
    console.log('HTML bytes:', result.data.bytes);
    console.log('Status:', result.data.status);
  }
}

async function testScrapingBee() {
  console.log('\n🐝 Тестирую ScrapingBee...');
  const result = await fetchViaScrapingBee({
    key: PROVIDER_CONFIG.SCRAPINGBEE_KEYS[0],
    url: 'https://www.chipdip.ru/search?searchtext=LM317',
    timeout: 10000
  });
  
  console.log('ScrapingBee result:', result.ok ? 'SUCCESS' : 'FAILED');
  if (!result.ok) {
    console.log('Error:', result.reason, result.code);
  } else {
    console.log('HTML bytes:', result.data.bytes);
    console.log('Status:', result.data.status);
  }
}

async function testDirect() {
  console.log('\n🌐 Тестирую Direct...');
  const result = await fetchDirect({
    url: 'https://www.chipdip.ru/search?searchtext=LM317',
    timeout: 10000
  });
  
  console.log('Direct result:', result.ok ? 'SUCCESS' : 'FAILED');
  if (!result.ok) {
    console.log('Error:', result.reason, result.code);
  } else {
    console.log('HTML bytes:', result.data.bytes);
    console.log('Status:', result.data.status);
  }
}

async function runTests() {
  await testDirect(); // Сначала direct, так как он не требует API ключей
  await testScraperAPI();
  await testScrapingBee();
  console.log('\n✅ Тестирование завершено');
}

runTests().catch(console.error);
