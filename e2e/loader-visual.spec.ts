import { test, expect } from '@playwright/test';

test('Page loader должен показываться 3 секунды на /results', async ({ page }) => {
  // 1. Открываем главную
  await page.goto('https://prosnab.tech/');
  
  // 2. Ждём появления поисковой строки
  await page.waitForSelector('.search-box', { timeout: 5000 });
  
  // 3. Вводим запрос
  await page.fill('.search-box input[type="text"]', 'processor');
  
  // 4. Отправляем форму
  const navigationPromise = page.waitForURL('**/results?q=processor', { timeout: 10000 });
  await page.press('.search-box input[type="text"]', 'Enter');
  await navigationPromise;
  
  // 5. ПРОВЕРЯЕМ ЧТО ЛОАДЕР ВИДЕН
  const loaderStart = Date.now();
  const loader = await page.locator('.page-loader-overlay');
  
  // Лоадер должен быть виден
  await expect(loader).toBeVisible({ timeout: 500 });
  console.log('✅ Лоадер появился');
  
  // 6. Проверяем наличие градиентных квадратиков
  const boxes = await page.locator('.page-loader-box');
  const boxCount = await boxes.count();
  expect(boxCount).toBe(6);
  console.log('✅ 6 квадратиков видны');
  
  // 7. Ждём пока лоадер исчезнет (должно быть ~3 секунды)
  await expect(loader).toBeHidden({ timeout: 5000 });
  const loaderDuration = Date.now() - loaderStart;
  
  console.log(`⏱️  Лоадер показывался ${loaderDuration}ms`);
  
  // Должно быть >= 2900ms (с учетом погрешности)
  expect(loaderDuration).toBeGreaterThanOrEqual(2900);
  expect(loaderDuration).toBeLessThan(4000);
  
  // 8. Проверяем что результаты видны
  await expect(page.locator('.glass-card')).toBeVisible({ timeout: 2000 });
  console.log('✅ Результаты отображены');
});

test('Скриншот лоадера', async ({ page }) => {
  await page.goto('https://prosnab.tech/');
  await page.waitForSelector('.search-box');
  await page.fill('.search-box input[type="text"]', 'processor');
  
  // Отправляем форму
  await page.press('.search-box input[type="text"]', 'Enter');
  
  // Ждём появления лоадера
  await page.waitForSelector('.page-loader-overlay', { timeout: 1000 });
  
  // Делаем скриншот
  await page.screenshot({ 
    path: 'docs/_artifacts/loader-screenshot.png',
    fullPage: true
  });
  
  console.log('📸 Скриншот сохранён: docs/_artifacts/loader-screenshot.png');
});
