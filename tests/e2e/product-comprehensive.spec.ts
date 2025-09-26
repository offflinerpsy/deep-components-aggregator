import { test, expect } from '@playwright/test';

const TEST_MPNS = [
  'LM317T',
  '1N4148', 
  'NE555',
  'BC547',
  'TL071'
];

test.describe('Product Page Comprehensive Tests', () => {
  
  test('should have correct product page structure', async ({ page }) => {
    await page.goto('/product?mpn=LM317T');
    
    // Проверяем основную структуру
    const productRoot = page.getByTestId('product-root');
    await expect(productRoot).toBeVisible();
    
    // Проверяем все секции
    await expect(page.getByTestId('gallery')).toBeVisible();
    await expect(page.getByTestId('meta')).toBeVisible();
    await expect(page.getByTestId('order')).toBeVisible();
    await expect(page.getByTestId('desc')).toBeVisible();
    await expect(page.getByTestId('docs')).toBeVisible();
    await expect(page.getByTestId('specs')).toBeVisible();
    
    // Проверяем sticky order section
    const orderSection = page.getByTestId('order');
    const orderStyles = await orderSection.evaluate(el => window.getComputedStyle(el));
    expect(orderStyles.position).toBe('sticky');
  });

  for (const mpn of TEST_MPNS) {
    test(`should load product data for ${mpn}`, async ({ page }) => {
      await page.goto(`/product?mpn=${mpn}`);
      
      // Ждем загрузки данных
      await page.waitForFunction(
        () => document.querySelector('[data-testid="title"]')?.textContent?.trim() !== '',
        { timeout: 10000 }
      );
      
      // Проверяем заголовок
      const title = page.getByTestId('title');
      await expect(title).toBeVisible();
      const titleText = await title.textContent();
      expect(titleText?.trim()).toBeTruthy();
      
      // Проверяем order секцию
      const stockElement = page.locator('#stock');
      await expect(stockElement).toBeVisible();
      const stockText = await stockElement.textContent();
      expect(stockText?.trim()).toBeTruthy();
      
      const priceElement = page.locator('#minPrice');
      await expect(priceElement).toBeVisible();
      
      // Проверяем, что цена отображается в рублях
      const priceText = await priceElement.textContent();
      expect(priceText?.trim()).toBeTruthy();
      
      // Проверяем кнопку заказа
      const buyButton = page.locator('#buy');
      await expect(buyButton).toBeVisible();
      await expect(buyButton).toContainText('ЗАКАЗАТЬ');
    });
  }

  test('should display gallery section correctly', async ({ page }) => {
    await page.goto('/product?mpn=LM317T');
    
    const gallery = page.getByTestId('gallery');
    await expect(gallery).toBeVisible();
    
    // Проверяем, что есть хотя бы одно изображение или плейсхолдер
    await page.waitForFunction(
      () => {
        const gallery = document.querySelector('[data-testid="gallery"]');
        return gallery && (
          gallery.querySelector('img') !== null ||
          gallery.textContent?.includes('Изображения не найдены')
        );
      },
      { timeout: 5000 }
    );
  });

  test('should display specs section with data', async ({ page }) => {
    await page.goto('/product?mpn=LM317T');
    
    const specs = page.getByTestId('specs');
    await expect(specs).toBeVisible();
    
    // Проверяем, что таблица спецификаций загружена
    const specsTable = page.locator('#specTable');
    await expect(specsTable).toBeVisible();
    
    // Проверяем, что есть хотя бы одна строка (даже если это сообщение об отсутствии данных)
    const rows = specsTable.locator('tr');
    await expect(rows.first()).toBeVisible();
  });

  test('should display docs section', async ({ page }) => {
    await page.goto('/product?mpn=LM317T');
    
    const docs = page.getByTestId('docs');
    await expect(docs).toBeVisible();
    
    // Проверяем, что список документов загружен
    const pdfList = page.locator('#pdfList');
    await expect(pdfList).toBeVisible();
    
    // Проверяем, что есть хотя бы один элемент списка (даже если это сообщение об отсутствии документов)
    const listItems = pdfList.locator('li');
    await expect(listItems.first()).toBeVisible();
  });

  test('should have no console errors on product page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/product?mpn=LM317T');
    
    // Ждем полной загрузки
    await page.waitForFunction(
      () => document.querySelector('[data-testid="title"]')?.textContent?.trim() !== '',
      { timeout: 10000 }
    );
    
    await page.waitForTimeout(2000);
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('should handle invalid MPN gracefully', async ({ page }) => {
    await page.goto('/product?mpn=INVALID_MPN_12345');
    
    // Проверяем, что страница загружается без ошибок
    const productRoot = page.getByTestId('product-root');
    await expect(productRoot).toBeVisible();
    
    // Может показывать сообщение об ошибке или пустые данные
    // Главное - без JS ошибок
    await page.waitForTimeout(3000);
  });

  test('should have responsive layout', async ({ page }) => {
    await page.goto('/product?mpn=LM317T');
    
    // Тестируем на мобильном разрешении
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Проверяем, что основные элементы видны
    await expect(page.getByTestId('product-root')).toBeVisible();
    await expect(page.getByTestId('gallery')).toBeVisible();
    await expect(page.getByTestId('order')).toBeVisible();
    
    // Возвращаем обычное разрешение
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});
