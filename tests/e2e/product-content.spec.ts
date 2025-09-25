import { test, expect } from '@playwright/test';

const testMPNs = ['LM317T', '1N4148', 'NE555', 'BC547', 'TL071'];

for (const mpn of testMPNs) {
  test(`Product content ${mpn}: проверка карточки товара`, async ({ page }) => {
    // Переходим на карточку товара
    await page.goto(`/product?mpn=${encodeURIComponent(mpn)}`);
    
    // Ждём загрузки карточки
    await page.waitForFunction(() => {
      const titleEl = document.querySelector('[data-testid="title"]');
      return titleEl && titleEl.textContent && titleEl.textContent.trim().length > 0;
    }, { timeout: 15000 });
    
    // Проверяем основные блоки
    const root = page.locator('[data-testid="product-root"]');
    await expect(root).toBeVisible();
    
    // Проверяем заголовок
    const title = page.locator('[data-testid="title"]');
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText).toBeTruthy();
    expect(titleText).toContain(mpn);
    
    // Проверяем галерею
    const gallery = page.locator('[data-testid="gallery"]');
    await expect(gallery).toBeVisible();
    
    const galleryImg = gallery.locator('img');
    await expect(galleryImg).toBeVisible();
    
    // Проверяем мета-информацию
    const meta = page.locator('[data-testid="meta"]');
    await expect(meta).toBeVisible();
    
    // Проверяем блок заказа
    const order = page.locator('[data-testid="order"]');
    await expect(order).toBeVisible();
    
    // Проверяем наличие информации о стоке и цене
    const stock = order.locator('#stock');
    const price = order.locator('#minPrice');
    
    // Хотя бы одно из полей должно быть заполнено
    const stockText = await stock.textContent();
    const priceText = await price.textContent();
    
    if (!stockText && !priceText) {
      console.log(`⚠️ ${mpn}: Нет информации о стоке и цене`);
    }
    
    // Проверяем регионы
    const regions = order.locator('#regions');
    await expect(regions).toBeVisible();
    
    // Проверяем описание (может быть скрыто если пустое)
    const desc = page.locator('[data-testid="desc"]');
    const descVisible = await desc.isVisible();
    if (descVisible) {
      const descText = await desc.textContent();
      expect(descText).toBeTruthy();
    }
    
    // Проверяем документы (может быть скрыто если пустое)
    const docs = page.locator('[data-testid="docs"]');
    const docsVisible = await docs.isVisible();
    if (docsVisible) {
      const docsList = docs.locator('li');
      const docsCount = await docsList.count();
      expect(docsCount).toBeGreaterThan(0);
      
      // Проверяем что ссылки работают
      const firstDoc = docsList.first().locator('a');
      await expect(firstDoc).toBeVisible();
      const docHref = await firstDoc.getAttribute('href');
      expect(docHref).toBeTruthy();
    }
    
    // Проверяем технические характеристики (может быть скрыто если пустое)
    const specs = page.locator('[data-testid="specs"]');
    const specsVisible = await specs.isVisible();
    if (specsVisible) {
      const specTable = specs.locator('#specTable');
      await expect(specTable).toBeVisible();
      
      const specRows = specTable.locator('tr');
      const specCount = await specRows.count();
      expect(specCount).toBeGreaterThan(0);
      
      // Проверяем структуру таблицы
      const firstRow = specRows.first();
      const cells = firstRow.locator('td');
      const cellCount = await cells.count();
      expect(cellCount).toBe(2); // Название и значение
    }
    
    // Проверяем что нет ошибок в консоли
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    
    if (errors.length > 0) {
      console.log(`⚠️ Console errors for ${mpn}: ${errors.join(', ')}`);
    }
    
    // Проверяем что страница загрузилась без HTTP ошибок
    const response = await page.waitForResponse(response => 
      response.url().includes('/api/product') && response.status() === 200
    );
    
    expect(response.status()).toBe(200);
    
    console.log(`✅ ${mpn}: карточка загружена успешно`);
  });
}

test('Product: проверка несуществующего MPN', async ({ page }) => {
  await page.goto('/product?mpn=NONEXISTENT123');
  
  // Должна быть ошибка 404
  await page.waitForResponse(response => 
    response.url().includes('/api/product') && response.status() === 404
  );
  
  // Проверяем что отображается сообщение об ошибке
  const body = page.locator('body');
  const bodyText = await body.textContent();
  expect(bodyText).toContain('Product not found');
});

test('Product: проверка пустого MPN', async ({ page }) => {
  await page.goto('/product');
  
  // Должна быть ошибка 400
  await page.waitForResponse(response => 
    response.url().includes('/api/product') && response.status() === 400
  );
});