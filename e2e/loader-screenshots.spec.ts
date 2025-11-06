import { test } from '@playwright/test';

test('Детальные скриншоты лоадера', async ({ page }) => {
  await page.goto('https://prosnab.tech/');
  await page.waitForSelector('.search-box');
  await page.fill('.search-box input[type="text"]', 'processor');
  
  // Скриншот 1: До отправки формы
  await page.screenshot({ 
    path: 'docs/_artifacts/01-before-submit.png',
    fullPage: true
  });
  console.log('📸 Скриншот 1: До отправки');
  
  // Отправляем форму
  await page.press('.search-box input[type="text"]', 'Enter');
  
  // Ждём 100ms и делаем скриншот лоадера
  await page.waitForTimeout(100);
  await page.screenshot({ 
    path: 'docs/_artifacts/02-loader-appears.png',
    fullPage: true
  });
  console.log('📸 Скриншот 2: Лоадер появился (100ms)');
  
  // Через 1.5 секунды
  await page.waitForTimeout(1400);
  await page.screenshot({ 
    path: 'docs/_artifacts/03-loader-middle.png',
    fullPage: true
  });
  console.log('📸 Скриншот 3: Середина анимации (1.5s)');
  
  // Ждём пока лоадер исчезнет
  await page.waitForSelector('.page-loader-overlay', { state: 'hidden', timeout: 5000 });
  await page.waitForTimeout(200);
  
  await page.screenshot({ 
    path: 'docs/_artifacts/04-results-shown.png',
    fullPage: true
  });
  console.log('📸 Скриншот 4: Результаты показаны');
  
  console.log('\n✅ Все скриншоты сохранены в docs/_artifacts/');
});
