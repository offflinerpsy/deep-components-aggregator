// test-parsers.mjs
import { parseListing } from './src/parsers/chipdip/parse-listing.mjs';
import { parseProduct } from './src/parsers/chipdip/parse-product.mjs';
import { fetchDirect } from './adapters/providers/direct.mjs';

console.log('🧪 Тестирование парсеров...');

async function testListingParser() {
  console.log('\n📋 Тестирую парсер листинга...');
  
  const result = await fetchDirect({
    url: 'https://www.chipdip.ru/search?searchtext=LM317',
    timeout: 10000
  });
  
  if (!result.ok) {
    console.log('❌ Не удалось получить HTML для тестирования');
    return;
  }
  
  const parsed = parseListing({
    html: result.data.html,
    sourceUrl: 'https://www.chipdip.ru/search?searchtext=LM317'
  });
  
  console.log('Parse result:', parsed.ok ? 'SUCCESS' : 'FAILED');
  if (parsed.ok) {
    console.log('Found items:', parsed.data.length);
    if (parsed.data.length > 0) {
      console.log('First item:', {
        title: parsed.data[0].title,
        mpn: parsed.data[0].mpn,
        brand: parsed.data[0].brand,
        price_rub: parsed.data[0].price_min_rub
      });
    }
  } else {
    console.log('Error:', parsed.reason);
  }
}

async function testProductParser() {
  console.log('\n🔍 Тестирую парсер карточки...');
  
  const result = await fetchDirect({
    url: 'https://www.chipdip.ru/product/lm317',
    timeout: 10000
  });
  
  if (!result.ok) {
    console.log('❌ Не удалось получить HTML для тестирования');
    return;
  }
  
  const parsed = parseProduct({
    html: result.data.html,
    sourceUrl: 'https://www.chipdip.ru/product/lm317'
  });
  
  console.log('Parse result:', parsed.ok ? 'SUCCESS' : 'FAILED');
  if (parsed.ok) {
    console.log('Product:', {
      title: parsed.data.title,
      mpn: parsed.data.mpn,
      brand: parsed.data.brand,
      images: parsed.data.images?.length || 0,
      pdfs: parsed.data.pdfs?.length || 0
    });
  } else {
    console.log('Error:', parsed.reason);
  }
}

async function runTests() {
  await testListingParser();
  await testProductParser();
  console.log('\n✅ Тестирование завершено');
}

runTests().catch(console.error);
