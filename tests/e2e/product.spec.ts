import { test, expect } from '@playwright/test';

test('product card layout matches reference blocks', async ({ page }) => {
  await page.goto('/product?mpn=LM317T');

  // слева — изображение/кнопка PDF
  await expect(page.getByRole('img').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /pdf/i })).toBeVisible();

  // центр — заголовок/описание/таблица ТТХ
  await expect(page.getByRole('heading')).toBeVisible();
  const specs = page.getByRole('table', { name: /технические параметры/i });
  await expect(specs).toBeVisible();

  // справа — наличие/цена ₽/регионы/qty/кнопка
  await expect(page.getByText(/Наличие/i)).toBeVisible();
  await expect(page.getByText(/Минимальная цена/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /заказать/i })).toBeEnabled();
});
