import { test, expect } from '@playwright/test';

test('product card has image, pdf, specs and RUB price', async ({ page }) => {
  await page.goto('/product?mpn=LM317T');
  await expect(page.getByTestId('gallery')).toBeVisible();
  await expect(page.getByTestId('gallery').locator('img')).toBeVisible();
  const docs = page.getByTestId('docs').locator('a');
  await expect(docs).toHaveCount(1);
  const specs = page.getByTestId('specs').locator('tr');
  await expect(specs).toHaveCount(5);
  await expect(page.locator('#minPrice')).toContainText('₽');
  const errors = await page.evaluate(() => window.__consoleErrors || []);
  expect(errors.length).toBe(0);
});
