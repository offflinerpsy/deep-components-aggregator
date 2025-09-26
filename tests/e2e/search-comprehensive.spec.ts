import { test, expect } from '@playwright/test';

const TEST_QUERIES = [
  { query: 'LM317T', expectedMin: 10, type: 'MPN' },
  { query: '1N4148', expectedMin: 5, type: 'MPN' },
  { query: 'резистор', expectedMin: 0, type: 'RU_GENERIC' }, // Может не найти результатов
  { query: 'транзистор', expectedMin: 1, type: 'RU_GENERIC' },
  { query: 'диод', expectedMin: 1, type: 'RU_GENERIC' }
];

test.describe('Search Comprehensive Tests', () => {
  
  test('should have correct search table structure', async ({ page }) => {
    await page.goto('/');
    
    // Проверяем структуру таблицы
    const table = page.getByTestId('search-table');
    await expect(table).toBeVisible();
    
    // Проверяем заголовки колонок
    await expect(page.getByTestId('col-image')).toContainText('Image');
    await expect(page.getByTestId('col-mpn')).toContainText('MPN/Title');
    await expect(page.getByTestId('col-manufacturer')).toContainText('Manufacturer');
    await expect(page.getByTestId('col-description')).toContainText('Description');
    await expect(page.getByTestId('col-package')).toContainText('Package');
    await expect(page.getByTestId('col-packaging')).toContainText('Packaging');
    await expect(page.getByTestId('col-regions')).toContainText('Regions');
    await expect(page.getByTestId('col-stock')).toContainText('Stock');
    await expect(page.getByTestId('col-minrub')).toContainText('MinRUB');
    await expect(page.getByTestId('col-open')).toContainText('Open');
  });

  for (const testCase of TEST_QUERIES) {
    test(`should search for "${testCase.query}" and return ≥${testCase.expectedMin} results`, async ({ page }) => {
      await page.goto('/');
      
      // Выполняем поиск
      await page.getByPlaceholder('Введите MPN').fill(testCase.query);
      await page.getByRole('button', { name: 'Поиск' }).click();
      
      // Ждем результатов или сообщения об их отсутствии
      await page.waitForFunction(
        () => {
          const rows = document.querySelectorAll('[data-testid="result-row"]');
          const summary = document.querySelector('#sum')?.textContent || '';
          return rows.length > 0 || summary.includes('Найдено: 0');
        },
        { timeout: 10000 }
      );
      
      // Проверяем количество результатов
      const resultRows = page.getByTestId('result-row');
      const count = await resultRows.count();
      expect(count).toBeGreaterThanOrEqual(testCase.expectedMin);
      
      // Проверяем структуру первой строки (только если есть результаты)
      if (count > 0) {
        const firstRow = resultRows.first();
        
        // Изображение
        const image = firstRow.getByTestId('cell-image').locator('img');
        await expect(image).toBeVisible();
        
        // MPN/Title
        const mpnCell = firstRow.getByTestId('cell-mpn');
        await expect(mpnCell).toBeVisible();
        const mpnLink = mpnCell.locator('a');
        await expect(mpnLink).toBeVisible();
        
        // Цена в рублях
        const priceCell = firstRow.getByTestId('cell-minrub');
        await expect(priceCell).toBeVisible();
        
        // Проверяем, что цена не пустая (должна быть либо цена, либо "—")
        const priceText = await priceCell.textContent();
        expect(priceText?.trim()).toBeTruthy();
        
        // Open ссылка
        const openCell = firstRow.getByTestId('cell-open');
        const openLink = openCell.locator('a');
        await expect(openLink).toBeVisible();
        await expect(openLink).toContainText('Open');
      }
    });
  }

  test('should have no console errors during search', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.getByPlaceholder('Введите MPN').fill('LM317T');
    await page.getByRole('button', { name: 'Поиск' }).click();
    
    await page.waitForSelector('[data-testid="result-row"]', { timeout: 10000 });
    
    // Ждем немного для завершения всех запросов
    await page.waitForTimeout(2000);
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('should handle empty search gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Пытаемся выполнить пустой поиск
    await page.getByRole('button', { name: 'Поиск' }).click();
    
    // Проверяем, что нет ошибок
    const summaryText = await page.locator('#sum').textContent();
    expect(summaryText).toContain('Найдено: 0');
  });

  test('should navigate to product page from search results', async ({ page }) => {
    await page.goto('/');
    
    // Выполняем поиск
    await page.getByPlaceholder('Введите MPN').fill('LM317T');
    await page.getByRole('button', { name: 'Поиск' }).click();
    
    await page.waitForSelector('[data-testid="result-row"]', { timeout: 10000 });
    
    // Кликаем по первой ссылке
    const firstRow = page.getByTestId('result-row').first();
    const openLink = firstRow.getByTestId('cell-open').locator('a');
    
    await openLink.click();
    
    // Проверяем, что перешли на страницу товара
    await expect(page).toHaveURL(/\/product\?mpn=/);
    
    // Проверяем основные элементы страницы товара
    await expect(page.getByTestId('product-root')).toBeVisible();
    await expect(page.getByTestId('gallery')).toBeVisible();
    await expect(page.getByTestId('meta')).toBeVisible();
    await expect(page.getByTestId('order')).toBeVisible();
  });
});
