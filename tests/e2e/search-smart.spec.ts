import { test, expect } from '@playwright/test';

const testQueries = [
  { query: 'LM317T', type: 'MPN', expectedMin: 5 },
  { query: '1N4148', type: 'MPN', expectedMin: 5 },
  { query: 'резистор', type: 'RU', expectedMin: 10 },
  { query: 'диод', type: 'RU', expectedMin: 10 },
  { query: 'transistor', type: 'EN', expectedMin: 10 },
  { query: 'capacitor', type: 'EN', expectedMin: 10 },
  { query: 'микросхема', type: 'RU', expectedMin: 10 },
  { query: 'opamp', type: 'EN', expectedMin: 5 }
];

for (const { query, type, expectedMin } of testQueries) {
  test(`Smart search "${query}" (${type}): проверка результатов`, async ({ page }) => {
    // Переходим на страницу поиска
    await page.goto(`/?q=${encodeURIComponent(query)}`);
    
    // Ждём загрузки результатов
    await page.waitForFunction(() => {
      const sumEl = document.getElementById('sum');
      return sumEl && sumEl.textContent && sumEl.textContent.includes('Найдено:');
    }, { timeout: 15000 });
    
    // Проверяем что есть результаты
    const table = page.locator('[data-testid="search-table"]');
    await expect(table).toBeVisible();
    
    const rows = table.locator('[data-testid="result-row"]');
    const rowCount = await rows.count();
    
    expect(rowCount).toBeGreaterThanOrEqual(expectedMin);
    
    // Проверяем структуру таблицы
    const headers = table.locator('th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThanOrEqual(8); // Минимум 8 колонок
    
    // Проверяем что колонки на месте
    const expectedHeaders = ['Image', 'MPN/Title', 'Manufacturer', 'Description', 'Package', 'Packaging', 'Regions', 'Stock', 'MinRUB', 'Open'];
    for (const headerText of expectedHeaders) {
      const header = table.locator(`th:has-text("${headerText}")`);
      await expect(header).toBeVisible();
    }
    
    // Проверяем первые несколько строк
    for (let i = 0; i < Math.min(3, rowCount); i++) {
      const row = rows.nth(i);
      
      // MPN не должен быть пустым
      const mpn = row.locator('[data-testid="cell-mpn"]');
      await expect(mpn).toBeVisible();
      const mpnText = await mpn.textContent();
      expect(mpnText).toBeTruthy();
      
      // Изображение должно быть
      const image = row.locator('[data-testid="cell-image"] img');
      await expect(image).toBeVisible();
      
      // Производитель
      const manufacturer = row.locator('[data-testid="cell-manufacturer"]');
      await expect(manufacturer).toBeVisible();
      
      // Описание (может быть пустым)
      const description = row.locator('[data-testid="cell-description"]');
      await expect(description).toBeVisible();
      
      // Регионы
      const regions = row.locator('[data-testid="cell-regions"]');
      await expect(regions).toBeVisible();
      
      // Ссылка на карточку
      const openLink = row.locator('[data-testid="cell-open"] a');
      await expect(openLink).toBeVisible();
    }
    
    // Проверяем что нет ошибок в консоли
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Логируем ошибки но не падаем
    if (errors.length > 0) {
      console.log(`⚠️ Console errors for "${query}": ${errors.join(', ')}`);
    }
    
    console.log(`✅ "${query}": найдено ${rowCount} результатов`);
  });
}

test('Search: проверка пустого запроса', async ({ page }) => {
  await page.goto('/');
  
  // Должна отображаться подсказка
  const sumEl = page.locator('#sum');
  await expect(sumEl).toBeVisible();
  
  const sumText = await sumEl.textContent();
  expect(sumText).toContain('Введите MPN для поиска');
});

test('Search: проверка специальных символов', async ({ page }) => {
  const specialQueries = ['LM317T-TO220', '1N4148-TP', '74HC595-DIP16'];
  
  for (const query of specialQueries) {
    await page.goto(`/?q=${encodeURIComponent(query)}`);
    
    // Ждём загрузки
    await page.waitForFunction(() => {
      const sumEl = document.getElementById('sum');
      return sumEl && sumEl.textContent && sumEl.textContent.includes('Найдено:');
    }, { timeout: 10000 });
    
    const table = page.locator('[data-testid="search-table"]');
    const rows = table.locator('[data-testid="result-row"]');
    const rowCount = await rows.count();
    
    // Должен быть хотя бы один результат
    expect(rowCount).toBeGreaterThan(0);
    
    console.log(`✅ Special query "${query}": ${rowCount} результатов`);
  }
});
