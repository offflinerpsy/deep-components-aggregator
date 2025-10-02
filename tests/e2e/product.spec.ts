// tests/e2e/product.spec.ts — **контракт карточки** (семантика + позиция + контент)
import { test, expect } from '@playwright/test';

test('product layout & data contract', async ({ page }) => {
  await page.goto('/product?mpn=1N4148W-TP');

  const root = page.getByTestId('product-root');
  await expect(root).toBeVisible();

  // семантика блоков
  const g = page.getByTestId('gallery');
  const m = page.getByTestId('meta');
  const o = page.getByTestId('order');
  const d = page.getByTestId('desc');
  const dc = page.getByTestId('docs');
  const s = page.getByTestId('specs');

  for (const el of [g, m, o, d, dc, s]) {
    await expect(el).toBeVisible({ visible: true });
  }

  // содержимое по канону
  await expect(page.getByTestId('title')).not.toBeEmpty(); // заголовок заполнен
  await expect(page.locator('#minPrice')).not.toHaveText('');      // цена в ₽ есть
  await expect(page.locator('#stock')).not.toHaveText('');         // наличие есть
  await expect(page.locator('#pkg')).not.toHaveText('');           // корпус есть

  // отсутствие консольных ошибок страницы
  const errors: string[] = [];
  page.on('console', (msg) => { 
    if (msg.type() === 'error') errors.push(msg.text()); 
  });
  
  await page.waitForTimeout(1000);
  expect(errors, errors.join('\n')).toHaveLength(0);
});

test('product sticky order block positioning', async ({ page }) => {
  await page.goto('/product?mpn=LM317T');
  
  const order = page.getByTestId('order');
  await expect(order).toBeVisible();
  
  // Проверяем что order блок имеет sticky позиционирование
  const orderStyles = await order.evaluate((el) => {
    const styles = window.getComputedStyle(el);
    return {
      position: styles.position,
      top: styles.top,
      gridArea: styles.gridArea
    };
  });
  
  expect(orderStyles.position).toBe('sticky');
  expect(orderStyles.gridArea).toBe('order');
});

test('product grid areas layout contract', async ({ page }) => {
  await page.goto('/product?mpn=LM317T');
  
  // Проверяем что все блоки имеют правильные grid-area
  const gallery = page.getByTestId('gallery');
  const meta = page.getByTestId('meta');
  const order = page.getByTestId('order');
  const desc = page.getByTestId('desc');
  const docs = page.getByTestId('docs');
  const specs = page.getByTestId('specs');
  
  const gridAreas = await Promise.all([
    gallery.evaluate(el => window.getComputedStyle(el).gridArea),
    meta.evaluate(el => window.getComputedStyle(el).gridArea),
    order.evaluate(el => window.getComputedStyle(el).gridArea),
    desc.evaluate(el => window.getComputedStyle(el).gridArea),
    docs.evaluate(el => window.getComputedStyle(el).gridArea),
    specs.evaluate(el => window.getComputedStyle(el).gridArea)
  ]);
  
  expect(gridAreas).toEqual(['gallery', 'meta', 'order', 'desc', 'docs', 'specs']);
});

test('product data mapping correctness', async ({ page }) => {
  await page.goto('/product?mpn=1N4148W-TP'); // используем MPN который точно работает
  
  // Ждём загрузки данных
  await page.waitForFunction(() => {
    const title = document.querySelector('[data-testid="title"]');
    return title && title.textContent && title.textContent.trim() !== '';
  }, { timeout: 15000 });
  
  // Проверяем что данные правильно маппятся в DOM
  const title = await page.getByTestId('title').textContent();
  const manufacturer = await page.locator('#manufacturer').textContent();
  const pkg = await page.locator('#pkg').textContent();
  const stock = await page.locator('#stock').textContent();
  const minPrice = await page.locator('#minPrice').textContent();
  
  // Контракт данных
  expect(title).toBeTruthy(); // заголовок не пустой
  // manufacturer может быть пустым для некоторых товаров
  expect(pkg).toBeTruthy(); // корпус должен быть
  expect(stock).toMatch(/\d+/); // должно содержать цифры
  expect(minPrice).toMatch(/₽/); // должно содержать символ рубля
});

test('product contains RU content', async ({ page }) => {
  await page.goto('/product?mpn=LM317T');

  const root = page.getByTestId('product-root');
  await expect(root).toBeVisible();

  // Проверяем что есть RU-контент
  const title = page.getByTestId('title');
  const titleText = await title.textContent();
  expect(titleText).toBeTruthy();
  expect(titleText).toMatch(/[а-яё]/i);

  // Проверяем описание
  const desc = page.getByTestId('desc');
  const descText = await desc.textContent();
  if (descText && descText.trim()) {
    expect(descText).toMatch(/[а-яё]/i);
  }

  // Проверяем технические параметры
  const specs = page.getByTestId('specs');
  const specsText = await specs.textContent();
  if (specsText && specsText.trim()) {
    expect(specsText).toMatch(/[а-яё]/i);
  }
});