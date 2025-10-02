// test-live-search.mjs
import { buildTargets } from './src/targets/chipdip.mjs';
import { makeRotator } from './lib/rotator.mjs';
import { fetchViaScraperAPI } from './adapters/providers/scraperapi.mjs';
import { fetchViaScrapingBee } from './adapters/providers/scrapingbee.mjs';
import { fetchDirect } from './adapters/providers/direct.mjs';
import { parseListing } from './src/parsers/chipdip/parse-listing.mjs';
import { parseProduct } from './src/parsers/chipdip/parse-product.mjs';
import { isOk } from './lib/result.mjs';
import { PROVIDER_CONFIG } from './config/providers.mjs';

console.log('🚀 Тестирование полной системы live-search...');

function pickBeeKey() {
  const keys = PROVIDER_CONFIG.SCRAPINGBEE_KEYS;
  if (keys.length === 0) return "";
  const i = Math.floor(Math.random() * keys.length);
  return keys[i];
}

async function testLiveSearch(query) {
  console.log(`\n🔍 Тестирую запрос: "${query}"`);

  // 1. Строим цели
  const targets = buildTargets(query);
  console.log('🎯 Цели:', targets);

  // 2. Создаем ротатор провайдеров
  const providers = makeRotator([
    { name: "scraperapi", fn: (t) => fetchViaScraperAPI({ key: PROVIDER_CONFIG.SCRAPERAPI_KEY, url: t, timeout: 10000 }) },
    { name: "scrapingbee", fn: (t) => fetchViaScrapingBee({ key: pickBeeKey(), url: t, timeout: 10000 }) },
    { name: "direct", fn: (t) => fetchDirect({ url: t, timeout: 10000 }) },
  ]);

  let foundItems = [];

  // 3. Обрабатываем каждую цель
  for (const target of targets) {
    console.log(`\n📡 Обрабатываю: ${target}`);

    const availableProviders = providers.nextUsable();
    if (availableProviders.length === 0) {
      console.log('❌ Нет доступных провайдеров');
      continue;
    }

    // Пробуем провайдеров последовательно
    for (const provider of availableProviders) {
      console.log(`  🔄 Пробую провайдер: ${provider.name}`);

      const result = await provider.fn(target);
      if (isOk(result)) {
        console.log(`  ✅ ${provider.name} успешно, байт: ${result.data.bytes}`);
        providers.markOk(provider.name);

        // Парсим результат
        const parsed = target.includes("/product/")
          ? parseProduct({ html: result.data.html, sourceUrl: target })
          : parseListing({ html: result.data.html, sourceUrl: target });

        if (isOk(parsed)) {
          console.log(`  📊 Парсинг успешен, найдено: ${Array.isArray(parsed.data) ? parsed.data.length : 1} элементов`);
          foundItems.push(...(Array.isArray(parsed.data) ? parsed.data : [parsed.data]));
          break; // Достаточно одного успешного провайдера для этой цели
        } else {
          console.log(`  ❌ Парсинг не удался: ${parsed.reason}`);
        }
      } else {
        console.log(`  ❌ ${provider.name} не удался: ${result.reason}`);
        providers.markFail(provider.name);
      }
    }
  }

  console.log(`\n📈 Итого найдено: ${foundItems.length} товаров`);
  if (foundItems.length > 0) {
    console.log('🏆 Первый товар:', {
      title: foundItems[0].title,
      mpn: foundItems[0].mpn,
      brand: foundItems[0].brand,
      source: foundItems[0].source
    });
  }

  return foundItems;
}

async function runTests() {
  const queries = ['LM317', '1N4148', 'транзистор'];

  for (const query of queries) {
    await testLiveSearch(query);
  }

  console.log('\n✅ Все тесты завершены');
}

runTests().catch(console.error);
