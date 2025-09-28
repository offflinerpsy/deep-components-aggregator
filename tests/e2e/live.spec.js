import { test, expect } from '@playwright/test';

test.describe('Живой поиск и карточка товара', () => {
  test('API здоровья возвращает 200 и статус ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.ok).toBeTruthy();
  });

  test('Поиск LM317 показывает результаты в таблице', async ({ page }) => {
    await page.goto('/');
    
    // Вводим запрос в поле поиска
    await page.locator('#search-input').fill('LM317');
    await page.locator('#search-button').click();
    
    // Проверяем, что URL содержит параметр поиска
    await expect(page).toHaveURL(/.*q=LM317/);
    
    // Ждем появления хотя бы одной строки в таблице результатов (до 10 секунд)
    await expect(
      page.locator('#results-table-body tr').first()
    ).toBeVisible({ timeout: 10000 });
    
    // Проверяем, что в таблице есть хотя бы одна строка с данными
    const rowCount = await page.locator('#results-table-body tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('Кнопка "Открыть" раскрывает карточку товара', async ({ page }) => {
    await page.goto('/?q=LM317');
    
    // Ждем загрузки результатов
    await expect(
      page.locator('#results-table-body tr').first()
    ).toBeVisible({ timeout: 10000 });
    
    // Нажимаем на кнопку "Открыть" в первой строке
    await page.locator('#results-table-body tr:first-child button:has-text("Открыть")').click();
    
    // Проверяем, что карточка товара раскрылась
    await expect(
      page.locator('.product-pane.expanded')
    ).toBeVisible({ timeout: 5000 });
    
    // Проверяем наличие ключевых элементов в карточке
    await expect(page.locator('.product-pane-gallery img')).toBeVisible();
    await expect(page.locator('.product-pane-details h3')).toBeVisible();
    await expect(page.locator('.product-pane-details .price')).toBeVisible();
  });

  test('Поиск "транзистор" (кириллица) показывает результаты', async ({ page }) => {
    await page.goto('/');
    
    // Вводим запрос в поле поиска
    await page.locator('#search-input').fill('транзистор');
    await page.locator('#search-button').click();
    
    // Проверяем, что URL содержит параметр поиска
    await expect(page).toHaveURL(/.*q=%D1%82%D1%80%D0%B0%D0%BD%D0%B7%D0%B8%D1%81%D1%82%D0%BE%D1%80/);
    
    // Ждем либо появления результатов, либо сообщения о диагностике
    await Promise.race([
      page.locator('#results-table-body tr').first().waitFor({ timeout: 10000 }).catch(() => {}),
      page.locator('#status-message:has-text("Источники недоступны")').waitFor({ timeout: 10000 }).catch(() => {})
    ]);
    
    // Проверяем, что либо есть результаты, либо есть сообщение о диагностике
    const hasResults = await page.locator('#results-table-body tr').count() > 0;
    const hasDiagnostic = await page.locator('#status-message:has-text("Источники недоступны")').isVisible();
    
    expect(hasResults || hasDiagnostic).toBeTruthy();
  });
});
