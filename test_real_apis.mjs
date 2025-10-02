/**
 * Тест реальных API с популярными товарами
 * Проверим TME и Farnell на товарах которые точно есть в базах
 */

import { tmeSearchProducts, tmeGetProduct } from './src/integrations/tme/client.mjs';
import { farnellByMPN, farnellByKeyword } from './src/integrations/farnell/client.mjs';
import dotenv from 'dotenv';

dotenv.config();

const TME_TOKEN = process.env.TME_TOKEN || process.env.TME_API_TOKEN;
const TME_SECRET = process.env.TME_SECRET || process.env.TME_API_SECRET;
const FARNELL_KEY = process.env.FARNELL_API_KEY;
const FARNELL_REGION = process.env.FARNELL_REGION || 'uk.farnell.com';

// Популярные товары которые точно есть в европейских дистрибьюторах
const TEST_PRODUCTS = [
  { name: 'Резистор 10K', mpn: 'CRCW080510K0FKEA', supplier: 'Vishay' },
  { name: 'Конденсатор 100nF', mpn: 'C0805C104K5RACTU', supplier: 'KEMET' },
  { name: 'STM32 MCU', mpn: 'STM32F407VGT6', supplier: 'STMicroelectronics' },
  { name: 'LM358 OpAmp', mpn: 'LM358P', supplier: 'Texas Instruments' },
];

async function testTME(product) {
  console.log(`\n🔵 TME: Тест "${product.name}" (${product.mpn})`);
  
  if (!TME_TOKEN || !TME_SECRET) {
    console.log('   ⚠️  TME_API_TOKEN или TME_API_SECRET не настроены');
    return { ok: false, reason: 'no_credentials' };
  }
  
  try {
    // 1. Поиск
    console.log(`   🔍 Поиск: ${product.mpn}`);
    const searchResult = await tmeSearchProducts({
      token: TME_TOKEN,
      secret: TME_SECRET,
      query: product.mpn,
      country: 'PL',
      language: 'EN'
    });
    
    console.log(`   📦 Результатов поиска: ${searchResult.data?.Data?.ProductList?.length || 0}`);
    
    if (!searchResult.data?.Data?.ProductList?.length) {
      console.log('   ❌ Товар не найден через Search');
      return { ok: false, reason: 'not_found_search' };
    }
    
    const firstProduct = searchResult.data.Data.ProductList[0];
    console.log(`   ✅ Найден: ${firstProduct.Symbol} - ${firstProduct.Description}`);
    
    // 2. Получение деталей
    console.log(`   📋 Получение деталей: ${firstProduct.Symbol}`);
    const detailsResult = await tmeGetProduct({
      token: TME_TOKEN,
      secret: TME_SECRET,
      symbol: firstProduct.Symbol,
      country: 'PL',
      language: 'EN'
    });
    
    if (!detailsResult.data?.Data?.ProductList?.length) {
      console.log('   ⚠️  GetProduct вернул пустой список');
      return { ok: true, hasDetails: false, searchWorks: true };
    }
    
    const details = detailsResult.data.Data.ProductList[0];
    console.log(`   ✅ Детали получены:`);
    console.log(`      - Symbol: ${details.Symbol}`);
    console.log(`      - Producer: ${details.Producer}`);
    console.log(`      - Description: ${details.Description}`);
    console.log(`      - Photos: ${details.Photo?.length || 0}`);
    console.log(`      - Parameters: ${Object.keys(details.Parameters || {}).length}`);
    
    return { 
      ok: true, 
      hasDetails: true, 
      searchWorks: true,
      specsCount: Object.keys(details.Parameters || {}).length,
      imagesCount: details.Photo?.length || 0
    };
    
  } catch (err) {
    console.log(`   ❌ Ошибка: ${err.message}`);
    if (err.cause?.status === 403) {
      console.log('   🔐 403 - Проблема с аутентификацией (HMAC signature)');
    }
    return { ok: false, reason: 'error', error: err.message };
  }
}

async function testFarnell(product) {
  console.log(`\n🟠 Farnell: Тест "${product.name}" (${product.mpn})`);
  
  if (!FARNELL_KEY) {
    console.log('   ⚠️  FARNELL_API_KEY не настроен');
    return { ok: false, reason: 'no_credentials' };
  }
  
  try {
    // 1. Поиск по MPN
    console.log(`   🔍 Поиск по MPN: ${product.mpn}`);
    const result = await farnellByMPN({
      apiKey: FARNELL_KEY,
      region: FARNELL_REGION,
      q: product.mpn,
      limit: 10
    });
    
    if (!result.ok) {
      console.log(`   ❌ API error: ${result.status}`);
      return { ok: false, reason: 'api_error', status: result.status };
    }
    
    const productCount = result.data?.premierFarnellPartNumberReturn?.numberOfResults || 0;
    console.log(`   📦 Результатов: ${productCount}`);
    
    if (productCount === 0) {
      console.log('   ❌ Товар не найден');
      return { ok: false, reason: 'not_found' };
    }
    
    const products = result.data.premierFarnellPartNumberReturn?.products || [];
    if (products.length === 0) {
      console.log('   ⚠️  numberOfResults > 0, но products пустой');
      return { ok: false, reason: 'empty_products' };
    }
    
    const prod = products[0];
    console.log(`   ✅ Найден:`);
    console.log(`      - SKU: ${prod.sku}`);
    console.log(`      - Manufacturer: ${prod.brandName}`);
    console.log(`      - Description: ${prod.displayName}`);
    console.log(`      - Images: ${prod.images?.length || 0}`);
    console.log(`      - Attributes: ${prod.attributes?.length || 0}`);
    console.log(`      - Stock: ${prod.stock?.level || 'N/A'}`);
    
    return {
      ok: true,
      specsCount: prod.attributes?.length || 0,
      imagesCount: prod.images?.length || 0,
      hasStock: !!prod.stock?.level
    };
    
  } catch (err) {
    console.log(`   ❌ Ошибка: ${err.message}`);
    return { ok: false, reason: 'error', error: err.message };
  }
}

async function main() {
  console.log('🚀 Тестирование реальных API\n');
  console.log('=' .repeat(60));
  
  const results = {
    tme: [],
    farnell: []
  };
  
  for (const product of TEST_PRODUCTS) {
    const tmeResult = await testTME(product);
    results.tme.push({ product, result: tmeResult });
    
    const farnellResult = await testFarnell(product);
    results.farnell.push({ product, result: farnellResult });
  }
  
  // Итоги
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГИ\n');
  
  const tmeSuccess = results.tme.filter(r => r.result.ok).length;
  const farnellSuccess = results.farnell.filter(r => r.result.ok).length;
  
  console.log(`🔵 TME: ${tmeSuccess}/${TEST_PRODUCTS.length} успешно`);
  results.tme.forEach(({ product, result }) => {
    if (result.ok) {
      console.log(`   ✅ ${product.name}: ${result.specsCount} specs, ${result.imagesCount} images`);
    } else {
      console.log(`   ❌ ${product.name}: ${result.reason}`);
    }
  });
  
  console.log(`\n🟠 Farnell: ${farnellSuccess}/${TEST_PRODUCTS.length} успешно`);
  results.farnell.forEach(({ product, result }) => {
    if (result.ok) {
      console.log(`   ✅ ${product.name}: ${result.specsCount} specs, ${result.imagesCount} images`);
    } else {
      console.log(`   ❌ ${product.name}: ${result.reason}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 РЕКОМЕНДАЦИЯ:\n');
  
  if (tmeSuccess > farnellSuccess) {
    console.log('   Использовать TME как primary, Farnell как fallback');
  } else if (farnellSuccess > tmeSuccess) {
    console.log('   Использовать Farnell как primary, TME как fallback');
  } else if (tmeSuccess === 0 && farnellSuccess === 0) {
    console.log('   ❌ Оба API не работают - нужно чинить конфигурацию');
  } else {
    console.log('   Оба API равнозначны - можно использовать параллельно');
  }
}

main().catch(console.error);
