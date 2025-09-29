// find-real-urls.mjs
import { fetchDirect } from './adapters/providers/direct.mjs';
import * as cheerio from 'cheerio';

console.log('🔍 Ищу реальные URL карточек...');

async function findRealUrls() {
  const result = await fetchDirect({
    url: 'https://www.chipdip.ru/search?searchtext=LM317',
    timeout: 10000
  });
  
  if (!result.ok) {
    console.log('❌ Не удалось получить HTML');
    return;
  }
  
  const $ = cheerio.load(result.data.html);
  const urls = [];
  
  $('a[href*="/product/"]').each((_, a) => {
    const href = $(a).attr('href');
    if (href && !urls.includes(href)) {
      urls.push(href);
    }
  });
  
  console.log(`Найдено ${urls.length} ссылок на карточки:`);
  urls.slice(0, 5).forEach((url, i) => {
    console.log(`${i + 1}. ${url}`);
  });
  
  // Тестируем первую ссылку
  if (urls.length > 0) {
    const testUrl = urls[0].startsWith('http') ? urls[0] : `https://www.chipdip.ru${urls[0]}`;
    console.log(`\n🧪 Тестирую: ${testUrl}`);
    
    const testResult = await fetchDirect({ url: testUrl, timeout: 10000 });
    console.log('Result:', testResult.ok ? 'SUCCESS' : 'FAILED');
    if (testResult.ok) {
      console.log('HTML bytes:', testResult.data.bytes);
      console.log('Status:', testResult.data.status);
    } else {
      console.log('Error:', testResult.reason);
    }
  }
}

findRealUrls().catch(console.error);
