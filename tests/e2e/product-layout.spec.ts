// tests/e2e/product-layout.spec.ts - Проверка layout карточки продукта
import { test, expect } from '@playwright/test';

test.describe('Product Layout Contract', () => {
  test('Карточка LM317T: все блоки видимы и grid layout работает', async ({ page }) => {
    await page.goto('/product?mpn=LM317T');

    // Ждём загрузки данных
    await page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="title"]');
      return title && title.textContent && title.textContent.trim() !== '';
    }, { timeout: 20000 });

    const root = page.getByTestId('product-root');
    await expect(root).toBeVisible();

    // Проверяем видимость всех основных блоков
    const blocks = ['gallery', 'meta', 'order', 'desc', 'docs', 'specs'];
    
    for (const blockName of blocks) {
      const block = page.getByTestId(blockName);
      await expect(block).toBeVisible();
    }

    // Проверяем что в gallery есть картинка или плейсхолдер
    const gallery = page.getByTestId('gallery');
    const hasImg = await gallery.locator('img').count() > 0;
    const hasPlaceholder = await gallery.textContent();
    
    expect(hasImg || (hasPlaceholder && hasPlaceholder.includes('IMAGE'))).toBeTruthy();

    // Проверяем что в order есть цена в ₽
    const priceElement = page.locator('#minPrice');
    const priceText = await priceElement.textContent();
    expect(priceText).toMatch(/₽/);
    expect(priceText).not.toBe('—');

    // Проверяем qty input в order
    const qtyInput = page.locator('#qty');
    await expect(qtyInput).toBeVisible();
    expect(await qtyInput.getAttribute('type')).toBe('number');
    expect(await qtyInput.getAttribute('min')).toBe('1');
  });

  test('Карточка: sticky order block и aspect-ratio gallery', async ({ page }) => {
    await page.goto('/product?mpn=LM317T');

    await page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="title"]');
      return title && title.textContent && title.textContent.trim() !== '';
    }, { timeout: 15000 });

    // Проверяем что order блок имеет position: sticky
    const orderBlock = page.getByTestId('order');
    const orderPosition = await orderBlock.evaluate(el => getComputedStyle(el).position);
    expect(orderPosition).toBe('sticky');

    const orderTop = await orderBlock.evaluate(el => getComputedStyle(el).top);
    expect(orderTop).toBe('16px');

    // Проверяем что gallery имеет aspect-ratio 4/3
    const gallery = page.getByTestId('gallery');
    const aspectRatio = await gallery.evaluate(el => getComputedStyle(el).aspectRatio);
    expect(aspectRatio).toBe('4 / 3');

    // Если есть изображение, проверяем object-fit: contain
    const img = gallery.locator('img');
    if (await img.count() > 0) {
      const objectFit = await img.evaluate(el => getComputedStyle(el).objectFit);
      expect(objectFit).toBe('contain');
    }
  });

  test('Карточка: ≥1 PDF в docs, ≥5 строк ТТХ в specs', async ({ page }) => {
    await page.goto('/product?mpn=LM317T');

    await page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="title"]');
      return title && title.textContent && title.textContent.trim() !== '';
    }, { timeout: 15000 });

    // Проверяем docs секцию
    const docsSection = page.getByTestId('docs');
    
    // Если docs видима, должна содержать ≥1 PDF ссылку
    if (await docsSection.isVisible() && !(await docsSection.getAttribute('hidden'))) {
      const pdfLinks = docsSection.locator('a[href*="pdf"], a:has-text("PDF")');
      const pdfCount = await pdfLinks.count();
      expect(pdfCount).toBeGreaterThanOrEqual(1);
    }

    // Проверяем specs секцию
    const specsSection = page.getByTestId('specs');
    
    // Если specs видима, должна содержать ≥5 строк ТТХ
    if (await specsSection.isVisible() && !(await specsSection.getAttribute('hidden'))) {
      const specRows = specsSection.locator('table tr');
      const rowCount = await specRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(5);
    }
  });

  test('Карточка: region badges отображаются корректно', async ({ page }) => {
    await page.goto('/product?mpn=LM317T');

    await page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="title"]');
      return title && title.textContent && title.textContent.trim() !== '';
    }, { timeout: 15000 });

    const regionBadges = page.getByTestId('region-badges');
    const badges = regionBadges.locator('.badge');
    const badgeCount = await badges.count();

    // Если есть регионы, проверяем их валидность
    if (badgeCount > 0) {
      for (let i = 0; i < badgeCount; i++) {
        const badgeText = await badges.nth(i).textContent();
        expect(['EU', 'US', 'ASIA']).toContain(badgeText);
      }
    }
  });

  test('Карточка: нет консольных ошибок', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      // Фильтруем chrome-extension шум
      if (type === 'error' && !text.includes('chrome-extension://')) {
        errors.push(text);
      }
    });

    await page.goto('/product?mpn=LM317T');
    
    await page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="title"]');
      return title && title.textContent && title.textContent.trim() !== '';
    }, { timeout: 15000 });

    // Даём время на полную загрузку всех ресурсов
    await page.waitForTimeout(2000);

    expect(errors, `Console errors found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('Карточка: пустые секции скрываются', async ({ page }) => {
    // Используем редкий компонент который может не иметь всех данных
    await page.goto('/product?mpn=RARE_COMPONENT_TEST');

    // Ждём завершения загрузки (может быть 404 или частичные данные)
    await page.waitForTimeout(5000);

    const productRoot = page.getByTestId('product-root');
    
    // Если продукт найден, проверяем скрытие пустых блоков
    if (await productRoot.isVisible()) {
      const sections = ['desc', 'docs', 'specs'];
      
      for (const sectionName of sections) {
        const section = page.getByTestId(sectionName);
        const isHidden = await section.getAttribute('hidden');
        const isEmpty = await section.evaluate(el => !el.textContent?.trim());
        
        // Если секция пустая, она должна быть скрыта
        if (isEmpty) {
          expect(isHidden).not.toBeNull();
        }
      }
    }
  });
});
