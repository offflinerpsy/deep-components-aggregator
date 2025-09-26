import { test, expect } from '@playwright/test';

for (const q of ['LM317T', '1N4148', 'резистор', 'транзистор']) {
  test(`search "${q}" returns rows`, async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(q)}`);
    
    // Ждем загрузки данных
    await page.waitForFunction(() => {
      const sumEl = document.getElementById('sum');
      return sumEl && sumEl.textContent && sumEl.textContent.includes('Найдено:');
    }, { timeout: 15000 });
    
    // Проверяем что есть хотя бы один результат
    const rows = page.getByTestId('search-table').locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
}
