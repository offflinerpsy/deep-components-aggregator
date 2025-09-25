import { test, expect } from '@playwright/test';

test('Карточка 1N4148W-TP: блоки как в макете и с данными', async ({ page }) => {
  await page.goto('/product?mpn=1N4148W-TP');

  const gallery = page.getByTestId('gallery');
  const meta    = page.getByTestId('meta');
  const order   = page.getByTestId('order');
  const desc    = page.getByTestId('desc');
  const docs    = page.getByTestId('docs');
  const specs   = page.getByTestId('specs');

  await expect(gallery).toBeVisible();
  await expect(meta).toBeVisible();
  await expect(order).toBeVisible();

  // Геометрия: gallery < meta < order по X; specs ниже desc
  const gb = await gallery.boundingBox(); 
  const mb = await meta.boundingBox();
  const ob = await order.boundingBox();   
  const db = await desc.boundingBox();
  const sb = await specs.boundingBox();
  
  expect(gb!.x).toBeLessThan(mb!.x); 
  expect(mb!.x).toBeLessThanOrEqual(ob!.x);
  if (sb && db) expect(sb.y).toBeGreaterThanOrEqual(db.y);

  // Контент: H1, ≥1 PDF или IMG, ≥3 строки ТТХ, цена > 0, есть регион
  await expect(page.locator('#h1')).toHaveText(/.+/);
  
  const pdfCnt = await page.locator('.pdfs a').count();
  const imgSrc = await page.locator('#img-main').getAttribute('src');
  expect(Boolean(pdfCnt || imgSrc)).toBeTruthy();
  
  expect(await page.locator('#specs-body tr').count()).toBeGreaterThan(2);
  await expect(page.locator('#minRub')).not.toHaveText(/^(0\.00|NaN|—)$/);
  expect(await page.locator('.regions .badge').count()).toBeGreaterThanOrEqual(1);
});

test('Карточка LM317T: sticky заказ и aspect-ratio изображения', async ({ page }) => {
  await page.goto('/product?mpn=LM317T');

  // Проверяем sticky заказ
  const order = page.getByTestId('order');
  await expect(order).toBeVisible();
  
  // Проверяем что изображение имеет правильное соотношение сторон
  const img = page.locator('#img-main');
  await expect(img).toBeVisible();
  
  const imgBox = await img.boundingBox();
  if (imgBox) {
    // aspect-ratio 4:3 означает ширина/высота ≈ 1.33
    const ratio = imgBox.width / imgBox.height;
    expect(ratio).toBeCloseTo(4/3, 1);
  }
  
  // Проверяем что заказ остается видимым при прокрутке
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(order).toBeVisible();
});
