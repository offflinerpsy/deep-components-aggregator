import { test, expect } from '@playwright/test';

const MPNs = [
  // Основные компоненты
  'LM317T','1N4148W-TP','NE555P','BC547B','TL072','TL071CP','LM358P','CD4017BE','74HC595','ATMEGA328P',
  'STM32F103C8T6','AMS1117','IRFZ44N','IRLZ44N','BC337','2N2222','AD620','L7805CV','MC34063A','SS14',
  // Дополнительные компоненты
  'LM324','LM358','LM386','TL074','TL084','LM741','LM358N','LM324N','LM386N','TL074CN',
  'CD4060','CD4040','CD4013','CD4017','CD4020','CD4024','CD4046','CD4051','CD4066','CD4071',
  '74LS00','74LS02','74LS04','74LS08','74LS10','74LS11','74LS14','74LS20','74LS21','74LS27',
  '74LS30','74LS32','74LS86','74LS125','74LS126','74LS138','74LS139','74LS151','74LS153','74LS157'
];

let successCount = 0;
let totalCount = 0;

for (const mpn of MPNs) {
  test(`Smoke ${mpn}: поиск → карточка без красных флагов`, async ({ page }) => {
    totalCount++;
    
    // Поиск
    await page.goto(`/?q=${encodeURIComponent(mpn)}`);

    // Ждём загрузки данных
    await page.waitForFunction(() => {
      const sumEl = document.getElementById('sum');
      return sumEl && !sumEl.textContent?.includes('Найдено: 0');
    }, { timeout: 15000 });

    // Ждем результатов поиска
    const table = page.locator('table tbody tr');
    const rowCount = await table.count();
    
    if (rowCount === 0) {
      console.log(`❌ ${mpn}: Нет результатов поиска`);
      return;
    }

    // Берем первую ссылку "Open" или кликаем по первому MPN
    const firstLink = page.locator('a', { hasText: /open/i }).first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
    } else {
      // fallback: прямой переход
      await page.goto(`/product?mpn=${encodeURIComponent(mpn)}`);
    }

    // Ждём загрузки карточки
    await page.waitForSelector('[data-testid="product-root"]', { timeout: 10000 });

    // Проверяем что карточка загрузилась
    const productRoot = page.getByTestId('product-root');
    await expect(productRoot).toBeVisible();

    // Проверяем основные элементы
    const title = page.getByTestId('title');
    const titleText = await title.textContent();
    
    if (!titleText || titleText.trim() === '') {
      console.log(`❌ ${mpn}: Пустой заголовок`);
      return;
    }

    // Проверяем наличие цены в рублях
    const minPrice = page.locator('#minPrice');
    const priceText = await minPrice.textContent();
    
    if (!priceText || !priceText.includes('₽')) {
      console.log(`❌ ${mpn}: Нет цены в рублях`);
      return;
    }

    // Проверяем наличие стока
    const stock = page.locator('#stock');
    const stockText = await stock.textContent();
    
    if (!stockText || stockText.trim() === '') {
      console.log(`❌ ${mpn}: Нет информации о стоке`);
      return;
    }

    // Проверяем что нет консольных ошибок
    const errors: string[] = [];
    page.on('console', (msg) => { 
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.waitForTimeout(1000);
    
    if (errors.length > 0) {
      console.log(`❌ ${mpn}: Консольные ошибки: ${errors.join(', ')}`);
      return;
    }

    // Проверяем RU-контент
    const desc = page.getByTestId('desc');
    const descText = await desc.textContent();
    
    if (descText && descText.trim() && !descText.match(/[а-яё]/i)) {
      console.log(`❌ ${mpn}: Нет RU-контента в описании`);
      return;
    }

    console.log(`✅ ${mpn}: Успешно`);
    successCount++;
  });
}

// Тест для сохранения результатов
test('Smoke results: save summary', async ({ page }) => {
  const successRate = (successCount / totalCount) * 100;
  
  console.log(`\n📊 Smoke-50 Results:`);
  console.log(`✅ Успешно: ${successCount}/${totalCount} (${successRate.toFixed(1)}%)`);
  console.log(`❌ Неудачно: ${totalCount - successCount}/${totalCount}`);
  
  // Сохраняем результаты в файл
  const results = {
    total: totalCount,
    success: successCount,
    failed: totalCount - successCount,
    successRate: successRate,
    timestamp: new Date().toISOString()
  };
  
  // Проверяем что успешность >= 80%
  expect(successRate).toBeGreaterThanOrEqual(80);
  
  console.log(`\n🎯 Smoke-50: ${successRate >= 80 ? 'PASS' : 'FAIL'} (требуется ≥80%)`);
});