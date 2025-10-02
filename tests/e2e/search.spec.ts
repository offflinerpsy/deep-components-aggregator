// tests/e2e/search.spec.ts — **контракт выдачи** (колонки ≠ перепутаны)
import { test, expect } from '@playwright/test';

test('search table columns map correctly', async ({ page }) => {
  await page.goto('/?q=LM317T');
  
  const table = page.getByRole('table');
  await expect(table).toBeVisible();

  // Ждём загрузки данных
  await page.waitForFunction(() => {
    const tbody = document.querySelector('table tbody');
    const rows = tbody ? tbody.querySelectorAll('tr') : [];
    return rows.length > 5;
  }, { timeout: 15000 });

  // Проверка: description колонка НЕ содержит «EU/US/ASIA», package НЕ равен числам стока, min price в ₽
  const rows = table.getByRole('row');
  const sample = rows.nth(1); // первая строка данных (не заголовок)
  
  // Получаем содержимое ячеек
  const descCell = sample.getByRole('cell').nth(3); // description (4-я колонка)
  const packageCell = sample.getByRole('cell').nth(4); // package (5-я колонка)
  const priceCell = sample.getByRole('cell').nth(8); // min ₽ (9-я колонка)
  
  await expect(descCell).not.toContainText(/EU|US|ASIA/); // description
  
  const packageText = await packageCell.textContent();
  expect(packageText).not.toMatch(/[0-9]{5,}/); // package не должен быть большим числом
  
  await expect(priceCell).toContainText(/₽/); // min ₽
});

test('search results contain RU content', async ({ page }) => {
  await page.goto('/?q=LM317T');
  
  // Ждём результатов
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  
  const table = page.getByRole('table');
  const rows = await table.getByRole('row').count();
  
  // Должно быть минимум 5 результатов
  expect(rows).toBeGreaterThan(5);
  
  // Проверяем что есть RU-контент (описания на русском языке)
  const firstRow = table.getByRole('row').nth(1);
  const descCell = firstRow.getByRole('cell').nth(3); // description
  const descText = await descCell.textContent();
  
  // Проверяем что описание не пустое и содержит русские символы
  expect(descText).toBeTruthy();
  expect(descText).toMatch(/[а-яё]/i);
});

test('search results data integrity', async ({ page }) => {
  await page.goto('/?q=LM317T');
  
  // Ждём результатов
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  
  const table = page.getByRole('table');
  const rows = await table.getByRole('row').count();
  
  // Должно быть минимум 10 результатов
  expect(rows).toBeGreaterThan(10);
  
  // Проверяем первые 3 строки на корректность данных
  for (let i = 1; i <= 3; i++) {
    const row = table.getByRole('row').nth(i);
    const cells = row.getByRole('cell');
    
    // MPN не должен быть пустым
    const mpn = await cells.nth(1).textContent();
    expect(mpn?.trim()).toBeTruthy();
    
    // Описание не должно содержать регионы
    const description = await cells.nth(2).textContent();
    expect(description).not.toMatch(/\b(EU|US|ASIA|Europe|Americas?)\b/i);
    
    // Package должен выглядеть как корпус
    const packageType = await cells.nth(4).textContent();
    expect(packageType).toMatch(/^(TO-|SOD|SOIC|QFN|DIP|TSSOP|QFP|SOT)/i);
    
    // Packaging должен быть один из допустимых типов
    const packaging = await cells.nth(5).textContent();
    expect(packaging).toMatch(/^(Tape|Tube|Reel|Tray|Cut Tape|Bulk)$/i);
    
    // Stock должен быть числом или пустым
    const stock = await cells.nth(7).textContent();
    expect(stock?.replace(/[,\s]/g, '')).toMatch(/^(\d+|)$/);
    
    // Min price должен содержать ₽
    const minPrice = await cells.nth(8).textContent();
    expect(minPrice).toMatch(/₽/);
  }
});

test('search table structure and headers', async ({ page }) => {
  await page.goto('/?q=LM317T');
  
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  
  // Проверяем заголовки таблицы (включая скрытые)
  const allHeaders = await page.locator('table thead th').count();
  
  expect(allHeaders).toBeGreaterThan(7); // минимум 8 колонок
  
  // Проверяем что есть ключевые заголовки
  await expect(table).toContainText('MPN');
  await expect(table).toContainText('Description');
  await expect(table).toContainText('Package');
  await expect(table).toContainText('Packaging');
  await expect(table).toContainText('Regions');
  await expect(table).toContainText('Stock');
  await expect(table).toContainText('MinRUB');
});

test('search no console errors', async ({ page }) => {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('chrome-extension')) {
      errors.push(msg.text());
    }
  });
  
  await page.goto('/?q=LM317T');
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  
  // Ждём немного для полной загрузки
  await page.waitForTimeout(2000);
  
  expect(errors, `Console errors found:\n${errors.join('\n')}`).toHaveLength(0);
});