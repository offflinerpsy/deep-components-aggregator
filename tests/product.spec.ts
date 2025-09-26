import { test, expect } from '@playwright/test';

test('product card has image, pdf, specs and RUB price', async ({ page }) => {
  await page.goto('/product?mpn=LM317T');
  
  // Ждем загрузки карточки
  await page.waitForFunction(() => {
    const titleEl = document.querySelector('[data-testid="title"]');
    return titleEl && titleEl.textContent && titleEl.textContent.trim() !== '';
  }, { timeout: 15000 });
  
  await expect(page.getByTestId('gallery')).toBeVisible();
  await expect(page.getByTestId('gallery').locator('img')).toBeVisible();
  const docs = page.getByTestId('docs').locator('a');
  await expect(docs).toHaveCount(1); // API возвращает 1 документ
  const specs = page.getByTestId('specs').locator('tr');
  await expect(specs).toHaveCount(5); // API возвращает 5 спецификаций
  await expect(page.locator('#minPrice')).toContainText('₽');
  const errors = await page.evaluate(() => window.__consoleErrors || []);
  expect(errors.length).toBe(0);
});
