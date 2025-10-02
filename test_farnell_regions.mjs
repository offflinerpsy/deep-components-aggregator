/**
 * Тест Farnell API с разными вариантами поиска
 */

import { farnellByMPN, farnellByKeyword } from './src/integrations/farnell/client.mjs';
import dotenv from 'dotenv';

dotenv.config();

const FARNELL_KEY = process.env.FARNELL_API_KEY;
const FARNELL_REGION = process.env.FARNELL_REGION || 'uk.farnell.com';

// Проверим разные регионы и популярные товары
const TEST_REGIONS = ['uk.farnell.com', 'us.newark.com'];
const TEST_PRODUCTS = [
  { name: 'Arduino Uno', mpn: 'A000066', keyword: 'Arduino Uno' },
  { name: 'Raspberry Pi 4', mpn: 'RPI4-MODBP-8GB', keyword: 'Raspberry Pi 4' },
  { name: 'STM32', mpn: 'STM32F407VGT6', keyword: 'STM32F407' },
  { name: 'ATMega328', mpn: 'ATMEGA328P-PU', keyword: 'ATMEGA328' },
];

async function testFarnellProduct(region, product, searchType = 'mpn') {
  const searchFunc = searchType === 'mpn' ? farnellByMPN : farnellByKeyword;
  const searchValue = searchType === 'mpn' ? product.mpn : product.keyword;
  
  console.log(`\n   ${searchType.toUpperCase()}: ${searchValue}`);
  
  try {
    const result = await searchFunc({
      apiKey: FARNELL_KEY,
      region: region,
      q: searchValue,
      limit: 5
    });
    
    if (!result.ok) {
      console.log(`   ❌ API Error: ${result.status}`);
      return { ok: false, status: result.status };
    }
    
    const productCount = result.data?.premierFarnellPartNumberReturn?.numberOfResults || 0;
    console.log(`   📦 Найдено: ${productCount}`);
    
    if (productCount === 0) {
      return { ok: false, count: 0 };
    }
    
    const products = result.data.premierFarnellPartNumberReturn?.products || [];
    if (products.length > 0) {
      const p = products[0];
      console.log(`   ✅ ${p.sku} - ${p.displayName}`);
      console.log(`      Brand: ${p.brandName}`);
      console.log(`      Attributes: ${p.attributes?.length || 0}`);
      console.log(`      Images: ${p.images?.length || 0}`);
      
      return { 
        ok: true, 
        count: productCount,
        specs: p.attributes?.length || 0,
        images: p.images?.length || 0
      };
    }
    
    return { ok: false, count: productCount, noProducts: true };
    
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log('🟠 Тестирование Farnell API\n');
  console.log(`API Key: ${FARNELL_KEY?.substring(0, 10)}...`);
  console.log('='.repeat(60));
  
  const results = {};
  
  for (const region of TEST_REGIONS) {
    console.log(`\n🌍 Регион: ${region}`);
    results[region] = {};
    
    for (const product of TEST_PRODUCTS) {
      console.log(`\n📦 ${product.name}`);
      
      // Пробуем и MPN и keyword
      const mpnResult = await testFarnellProduct(region, product, 'mpn');
      const keywordResult = await testFarnellProduct(region, product, 'keyword');
      
      results[region][product.name] = {
        mpn: mpnResult,
        keyword: keywordResult
      };
    }
  }
  
  // Анализ
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГИ\n');
  
  for (const region of TEST_REGIONS) {
    const successMPN = Object.values(results[region])
      .filter(r => r.mpn.ok).length;
    const successKeyword = Object.values(results[region])
      .filter(r => r.keyword.ok).length;
      
    console.log(`\n🌍 ${region}:`);
    console.log(`   MPN search: ${successMPN}/${TEST_PRODUCTS.length} успешно`);
    console.log(`   Keyword search: ${successKeyword}/${TEST_PRODUCTS.length} успешно`);
    
    if (successMPN > 0 || successKeyword > 0) {
      console.log(`   ✅ Регион работает!`);
      
      // Покажем что нашли
      Object.entries(results[region]).forEach(([name, result]) => {
        if (result.mpn.ok) {
          console.log(`      ${name}: ${result.mpn.specs} specs, ${result.mpn.images} images (MPN)`);
        } else if (result.keyword.ok) {
          console.log(`      ${name}: ${result.keyword.specs} specs, ${result.keyword.images} images (Keyword)`);
        }
      });
    } else {
      console.log(`   ❌ Ничего не найдено`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 РЕКОМЕНДАЦИЯ:\n');
  
  const bestRegion = TEST_REGIONS.find(region => {
    const successMPN = Object.values(results[region]).filter(r => r.mpn.ok).length;
    const successKeyword = Object.values(results[region]).filter(r => r.keyword.ok).length;
    return successMPN > 0 || successKeyword > 0;
  });
  
  if (bestRegion) {
    console.log(`   Использовать регион: ${bestRegion}`);
    
    const mpnWorks = Object.values(results[bestRegion]).some(r => r.mpn.ok);
    const keywordWorks = Object.values(results[bestRegion]).some(r => r.keyword.ok);
    
    if (mpnWorks && keywordWorks) {
      console.log(`   Стратегия: попробовать MPN first, fallback на keyword`);
    } else if (mpnWorks) {
      console.log(`   Стратегия: только MPN search`);
    } else {
      console.log(`   Стратегия: только keyword search`);
    }
  } else {
    console.log(`   ❌ Farnell API не работает ни в одном регионе`);
    console.log(`   Проверить: API key, rate limits, доступность сервиса`);
  }
}

main().catch(console.error);
