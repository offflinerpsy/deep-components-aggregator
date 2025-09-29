// test-urls.mjs
import { fetchDirect } from './adapters/providers/direct.mjs';

console.log('🔍 Тестирование URL карточек...');

async function testUrls() {
  const urls = [
    'https://www.chipdip.ru/product/lm317',
    'https://www.chipdip.ru/product/lm317-d2pak-to263-sj',
    'https://www.chipdip.ru/product/lm317-to220',
  ];
  
  for (const url of urls) {
    console.log(`\n📡 Тестирую: ${url}`);
    const result = await fetchDirect({ url, timeout: 10000 });
    console.log('Result:', result.ok ? 'SUCCESS' : 'FAILED');
    if (result.ok) {
      console.log('HTML bytes:', result.data.bytes);
      console.log('Status:', result.data.status);
      if (result.data.html.includes('h1')) {
        console.log('✅ Содержит заголовки - возможно рабочая карточка');
      }
    } else {
      console.log('Error:', result.reason);
    }
  }
}

testUrls().catch(console.error);
