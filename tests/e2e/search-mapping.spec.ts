// tests/e2e/search-mapping.spec.ts - Проверка корректности маппинга колонок поиска
import { test, expect } from '@playwright/test';

test.describe('Search Mapping Contract', () => {
  test('Поиск LM317T: ≥20 строк и корректный маппинг колонок', async ({ page }) => {
    await page.goto('/?q=LM317T');

    // Ждём загрузки результатов
    await page.waitForFunction(() => {
      const sumEl = document.getElementById('sum');
      return sumEl && !sumEl.textContent?.includes('Найдено: 0');
    }, { timeout: 20000 });

    const table = page.getByTestId('search-table');
    await expect(table).toBeVisible();

    // Проверяем что есть ≥20 строк результатов
    const rows = page.getByTestId('result-row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(20);

    // Проверяем первые 5 строк на корректность маппинга
    for (let i = 0; i < Math.min(5, rowCount); i++) {
      const row = rows.nth(i);

      // col-desc НЕ должен содержать токены регионов/валют
      const descCell = row.getByTestId('cell-description');
      const descText = await descCell.textContent();
      if (descText && descText !== '—') {
        expect(descText).not.toMatch(/\b(RU|EU|US|ASIA)\b/);
        expect(descText).not.toMatch(/[₽$€]/);
      }

      // col-packaging НЕ должен содержать числа стока/цену
      const packagingCell = row.getByTestId('cell-packaging');
      const packagingText = await packagingCell.textContent();
      if (packagingText && packagingText !== '—') {
        expect(packagingText).not.toMatch(/\d{4,}/); // большие числа (сток)
        expect(packagingText).not.toMatch(/[₽$€]/); // валюты
      }

      // col-region должен содержать только регионы
      const regionCell = row.getByTestId('cell-regions');
      const regionBadges = regionCell.locator('.badge');
      const badgeCount = await regionBadges.count();
      
      for (let j = 0; j < badgeCount; j++) {
        const badgeText = await regionBadges.nth(j).textContent();
        // Допускаем формат "EU" или "EU +3"
        expect(badgeText).toMatch(/^(EU|US|ASIA)(\s\+\d+)?$/);
      }

      // col-price должен содержать ₽
      const priceCell = row.getByTestId('cell-minrub');
      const priceText = await priceCell.textContent();
      if (priceText && priceText !== '—') {
        expect(priceText).toContain('₽');
      }
    }
  });

  test('Поиск: заголовки таблицы корректно маппятся', async ({ page }) => {
    await page.goto('/?q=LM317T');

    // Проверяем наличие всех обязательных заголовков колонок
    const headers = [
      'col-image',
      'col-mpn', 
      'col-manufacturer',
      'col-description',
      'col-package',
      'col-packaging',
      'col-regions',
      'col-stock',
      'col-minrub',
      'col-open'
    ];

    for (const headerTestId of headers) {
      const header = page.getByTestId(headerTestId);
      await expect(header).toBeVisible();
    }
  });

  test('Поиск: нет консольных ошибок', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      // Фильтруем шумные chrome-extension ошибки
      if (type === 'error' && !text.includes('chrome-extension://')) {
        errors.push(text);
      }
    });

    await page.goto('/?q=LM317T');
    
    // Ждём полной загрузки
    await page.waitForFunction(() => {
      const sumEl = document.getElementById('sum');
      return sumEl && !sumEl.textContent?.includes('Найдено: 0');
    }, { timeout: 15000 });

    expect(errors, `Console errors found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('Поиск: ссылки на карточки работают', async ({ page }) => {
    await page.goto('/?q=LM317T');

    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('[data-testid="result-row"]');
      return rows.length > 0;
    }, { timeout: 15000 });

    // Проверяем что ссылки в колонке MPN ведут на карточки
    const firstMpnLink = page.getByTestId('result-row').first().getByTestId('cell-mpn').locator('a').first();
    await expect(firstMpnLink).toBeVisible();
    
    const href = await firstMpnLink.getAttribute('href');
    expect(href).toMatch(/\/product\?mpn=/);

    // Проверяем что ссылки в колонке Open тоже работают
    const firstOpenLink = page.getByTestId('result-row').first().getByTestId('cell-open').locator('a');
    await expect(firstOpenLink).toBeVisible();
    
    const openHref = await firstOpenLink.getAttribute('href');
    expect(openHref).toMatch(/\/product\?mpn=/);
  });
});
