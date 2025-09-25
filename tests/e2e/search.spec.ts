import { test, expect } from '@playwright/test';

test('search table has many offers and stable columns', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox').fill('LM317T');
  await page.getByRole('button', { name: /поиск/i }).click();

  const table = page.getByRole('table');
  await expect(table).toBeVisible();

  // ожидание достаточного количества строк
  const rows = table.getByRole('row');
  await expect(rows).toHaveCountGreaterThan(10); // OEMsTrade обычно даёт много позиций

  // проверка ключевых заголовков
  const headers = await table.getByRole('columnheader').allInnerTexts();
  expect(headers).toEqual(expect.arrayContaining(['MPN / Title','Manufacturer','Package','Packaging','Regions','Stock','Min ₽']));
});
