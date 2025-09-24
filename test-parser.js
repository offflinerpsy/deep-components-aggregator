import { parseChipDip } from './src/parsers/chipdip.js';

// Самовызывающаяся асинхронная функция для тестирования
(async () => {
  try {
    // Тестовый MPN
    const testMpn = 'LM317T';
    
    console.log(`Начинаем парсинг для MPN: ${testMpn}`);
    const result = await parseChipDip(testMpn);
    
    console.log('Результат парсинга:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  }
})();
