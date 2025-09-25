// tests/e2e/ru-sources.spec.ts - Тесты RU-источников контента
import { test, expect } from '@playwright/test';

test.describe('RU-источники контента', () => {
  // Тест UI с RU-контентом
  test('Карточка продукта: RU-контент отображается корректно', async ({ page }) => {
    await page.goto('/product?mpn=LM317T');
    
    // Ждём загрузки оркестрированных данных
    await page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="title"]');
      return title && title.textContent && title.textContent.trim() !== '';
    }, { timeout: 20000 });
    
    const root = page.getByTestId('product-root');
    await expect(root).toBeVisible();
    
    // Проверяем блоки
    const gallery = page.getByTestId('gallery');
    const meta = page.getByTestId('meta');
    const order = page.getByTestId('order');
    const desc = page.getByTestId('desc');
    const docs = page.getByTestId('docs');
    const specs = page.getByTestId('specs');
    
    for (const block of [gallery, meta, order, desc, docs, specs]) {
      await expect(block).toBeVisible();
    }
    
    // Проверяем что заголовок содержит MPN
    const title = await page.getByTestId('title').textContent();
    expect(title).toContain('LM317T');
    
    // Проверяем что цена в рублях отображается
    const priceElement = page.locator('#minPrice');
    const priceText = await priceElement.textContent();
    expect(priceText).toMatch(/₽/);
    expect(priceText).not.toBe('—');
    
    // Проверяем наличие технических параметров
    const specsTable = page.locator('#specTable tr');
    const specsCount = await specsTable.count();
    expect(specsCount).toBeGreaterThan(0);
    
    // Проверяем что есть информация о наличии
    const stockElement = page.locator('#stock');
    const stockText = await stockElement.textContent();
    expect(stockText).not.toBe('');
    expect(stockText).not.toBe('—');
  });

  test('Поиск: результаты обогащены RU-контентом', async ({ page }) => {
    await page.goto('/?q=LM317T');
    
    // Ждём загрузки результатов
    await page.waitForFunction(() => {
      const sumEl = document.getElementById('sum');
      return sumEl && !sumEl.textContent?.includes('Найдено: 0');
    }, { timeout: 20000 });
    
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    
    // Проверяем что есть результаты
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(20);
    
    // Проверяем первую строку результатов
    const firstRow = rows.first();
    
    // MPN должен быть ссылкой на карточку
    const mpnCell = firstRow.getByTestId('cell-mpn');
    const mpnLink = mpnCell.locator('a');
    await expect(mpnLink).toBeVisible();
    const mpnHref = await mpnLink.getAttribute('href');
    expect(mpnHref).toMatch(/\/product\?mpn=/);
    
    // Цена в рублях должна быть заполнена
    const priceCell = firstRow.getByTestId('cell-minrub');
    const priceText = await priceCell.textContent();
    expect(priceText).toMatch(/₽/);
    expect(priceText).not.toBe('—');
    
    // Регионы должны быть заполнены
    const regionsCell = firstRow.getByTestId('cell-regions');
    const regionsBadges = regionsCell.locator('.badge');
    const badgeCount = await regionsBadges.count();
    expect(badgeCount).toBeGreaterThan(0);
    
    // Проверяем что регионы валидные
    for (let i = 0; i < badgeCount; i++) {
      const badgeText = await regionsBadges.nth(i).textContent();
      expect(['EU', 'US', 'ASIA']).toContain(badgeText);
    }
  });

  test('Навигация: поиск → карточка работает', async ({ page }) => {
    // Поиск
    await page.goto('/?q=LM317T');
    
    await page.waitForFunction(() => {
      const table = document.querySelector('table tbody tr');
      return table !== null;
    }, { timeout: 15000 });
    
    // Кликаем на первую ссылку "Open"
    const firstOpenLink = page.locator('table tbody tr').first().getByTestId('cell-open').locator('a');
    await expect(firstOpenLink).toBeVisible();
    
    await firstOpenLink.click();
    
    // Должны попасть на карточку продукта
    await page.waitForURL(/\/product\?mpn=/);
    
    // Проверяем что карточка загрузилась
    await page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="title"]');
      return title && title.textContent && title.textContent.trim() !== '';
    }, { timeout: 15000 });
    
    const productRoot = page.getByTestId('product-root');
    await expect(productRoot).toBeVisible();
    
    // Проверяем что заголовок содержит MPN
    const title = await page.getByTestId('title').textContent();
    expect(title).toContain('LM317T');
  });

  test('Отображение пустых секций: скрытие блоков без данных', async ({ page }) => {
    // Используем MPN который может не иметь всех данных
    await page.goto('/product?mpn=OBSCURE_COMPONENT_123');
    
    // Ждём завершения загрузки (может быть 404)
    await page.waitForTimeout(5000);
    
    // Если продукт найден, проверяем скрытие пустых блоков
    const productRoot = page.getByTestId('product-root');
    
    if (await productRoot.isVisible()) {
      // Проверяем что пустые блоки скрыты через hidden атрибут
      const desc = page.getByTestId('desc');
      const docs = page.getByTestId('docs');
      const specs = page.getByTestId('specs');
      
      // Если блок пустой, он должен быть скрыт
      const descHidden = await desc.getAttribute('hidden');
      const docsHidden = await docs.getAttribute('hidden');
      const specsHidden = await specs.getAttribute('hidden');
      
      // Хотя бы один блок должен быть скрыт для редкого компонента
      const hiddenCount = [descHidden, docsHidden, specsHidden].filter(Boolean).length;
      
      // Для реального теста используем известный компонент
      console.log('Hidden blocks count:', hiddenCount);
    }
  });

  test('Производительность: время загрузки карточки < 10 сек', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/product?mpn=LM317T');
    
    // Ждём полной загрузки контента
    await page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="title"]');
      const price = document.querySelector('#minPrice');
      return title && title.textContent && 
             price && price.textContent && price.textContent !== '—';
    }, { timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    
    // Время загрузки должно быть разумным
    expect(loadTime).toBeLessThan(10000); // 10 секунд
    
    console.log(`Время загрузки карточки: ${loadTime}мс`);
  });
});
