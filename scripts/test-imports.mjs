// Проверка API модулей
console.log('Testing API modules...');

try {
  console.log('1. Importing mountSearch...');
  const { default: mountSearch } = await import('./src/api/search.mjs');
  console.log('✅ mountSearch imported');
  
  console.log('2. Importing mountProduct...');
  const { default: mountProduct } = await import('./src/api/product.mjs');
  console.log('✅ mountProduct imported');
  
  console.log('\n✅ ALL IMPORTS OK!');
} catch (e) {
  console.error('❌ ERROR:', e.message);
  console.error(e.stack);
}
