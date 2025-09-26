import { test, expect } from '@playwright/test';

for (const q of ['LM317T', '1N4148', 'резистор', 'транзистор']) {
  test(`search "${q}" returns rows`, async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('search-input').fill(q);
    await page.getByTestId('search-submit').click();
    const rows = page.getByTestId('search-table').locator('tbody tr');
    await expect(rows).toHaveCount(10);
  });
}
