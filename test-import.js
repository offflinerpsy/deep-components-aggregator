// Тестируем импорты
console.log('Testing imports...');

try {
  console.log('1. Importing fetcher...');
  const { fetchChipDipPageHtml } = await import('./src/services/fetcher.js');
  console.log('✅ Fetcher imported successfully');
  
  console.log('2. Importing chipdip adapter...');
  const { chipdipHtmlToCanon } = await import('./src/adapters/chipdip/html-to-canon.js');
  console.log('✅ ChipDip adapter imported successfully');
  
  console.log('3. All imports successful!');
  
} catch (error) {
  console.error('❌ Import error:', error.message);
  console.error('Full error:', error);
}