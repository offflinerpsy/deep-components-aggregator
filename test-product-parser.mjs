// test-product-parser.mjs
import { parseProduct } from './src/parsers/chipdip/parse-product.mjs';
import { fetchDirect } from './adapters/providers/direct.mjs';

console.log('🔍 Тестирование парсера карточки...');

async function testProductParser() {
  const testUrl = 'https://www.chipdip.ru/product/lm317-d2pak-to263-sj-9001916011';

  console.log(`📡 Получаю HTML: ${testUrl}`);
  const result = await fetchDirect({ url: testUrl, timeout: 10000 });

  if (!result.ok) {
    console.log('❌ Не удалось получить HTML');
    return;
  }

  console.log('✅ HTML получен, байт:', result.data.bytes);

  const parsed = parseProduct({
    html: result.data.html,
    sourceUrl: testUrl
  });

  console.log('\n📊 Результат парсинга:');
  console.log('Parse result:', parsed.ok ? 'SUCCESS' : 'FAILED');

  if (parsed.ok) {
    console.log('\n📋 Данные товара:');
    console.log('- Title:', parsed.data.title);
    console.log('- MPN:', parsed.data.mpn);
    console.log('- Brand:', parsed.data.brand);
    console.log('- Description:', parsed.data.description?.slice(0, 100) + '...');
    console.log('- Images:', parsed.data.images?.length || 0);
    console.log('- PDFs:', parsed.data.pdfs?.length || 0);
    console.log('- Specs keys:', Object.keys(parsed.data.specs || {}).length);

    if (parsed.data.pdfs && parsed.data.pdfs.length > 0) {
      console.log('- First PDF:', parsed.data.pdfs[0]);
    }
  } else {
    console.log('❌ Error:', parsed.reason);
  }
}

testProductParser().catch(console.error);
