// scripts/test-chipdip-parser.mjs - тестирование реального ChipDip парсера
import { searchChipDip } from '../src/adapters/chipdip.js';

const testQueries = ['LM317', '1N4148', 'BC547', 'NE555', 'TL072'];

async function testParser() {
  console.log('🧪 Testing real ChipDip parser...\n');
  
  // Включаем отладочные логи
  process.env.DEBUG_PARSER = 'true';
  
  for (const query of testQueries) {
    console.log(`🔍 Testing query: "${query}"`);
    console.log('─'.repeat(50));
    
    const startTime = Date.now();
    const results = await searchChipDip(query, 5); // берем первые 5 результатов
    const elapsed = Date.now() - startTime;
    
    console.log(`⏱️  Completed in ${elapsed}ms`);
    console.log(`📊 Found ${results.length} results\n`);
    
    if (results.length > 0) {
      results.forEach((item, i) => {
        console.log(`${i + 1}. ${item.title}`);
        console.log(`   MPN: ${item.mpn} | Brand: ${item.brand}`);
        console.log(`   Price: ${item.price_min_rub}₽ | Stock: ${item.offers[0]?.stock || 0}`);
        console.log(`   URL: ${item.url}`);
        console.log(`   ID: ${item.id}\n`);
      });
    } else {
      console.log('❌ No results found\n');
    }
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('✅ ChipDip parser testing completed!');
}

testParser().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
