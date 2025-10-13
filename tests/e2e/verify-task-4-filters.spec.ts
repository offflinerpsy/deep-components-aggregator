import { test, expect } from '@playwright/test';

test.describe('TASK 4 Verification: Filters on /results', () => {
  const BASE_URL = 'http://5.129.228.88:3000';
  const TEST_QUERY = 'C0805C104K5RACTU';

  test('Должны быть видны 4 фильтра: minPrice, maxPrice, manufacturer, inStock', async ({ page }) => {
    // Переход на страницу результатов
    await page.goto(`${BASE_URL}/results?q=${TEST_QUERY}`);

    // Ждём загрузки (PageLoader должен исчезнуть)
    await page.waitForTimeout(1000);

    // Делаем скриншот ПОЛНОЙ страницы
    await page.screenshot({
      path: '/opt/deep-agg/docs/_artifacts/ui-ux-r3-qa-20251012/results-full-page.png',
      fullPage: true
    });

    // Проверяем наличие фильтров
    const filtersBlock = page.locator('.glass').first();
    await expect(filtersBlock).toBeVisible({ timeout: 5000 });

    // Скриншот блока фильтров
    await filtersBlock.screenshot({
      path: '/opt/deep-agg/docs/_artifacts/ui-ux-r3-qa-20251012/filters-block.png'
    });

    // Проверяем каждый фильтр
    const minPriceInput = page.locator('input[placeholder*="Цена от"]');
    const maxPriceInput = page.locator('input[placeholder*="Цена до"]');
    const manufacturerInput = page.locator('input[placeholder*="Производитель"]');
    const inStockCheckbox = page.locator('input[type="checkbox"]');

    // Проверяем видимость
    await expect(minPriceInput).toBeVisible();
    await expect(maxPriceInput).toBeVisible();
    await expect(manufacturerInput).toBeVisible();
    await expect(inStockCheckbox).toBeVisible();

    // Получаем HTML структуру
    const filtersHTML = await filtersBlock.innerHTML();

    console.log('✅ Filters HTML:', filtersHTML.substring(0, 500));
    console.log('✅ All 4 filters are visible');
  });

  test('Должна быть таблица с результатами и колонка "Действия"', async ({ page }) => {
    await page.goto(`${BASE_URL}/results?q=${TEST_QUERY}`);
    await page.waitForTimeout(1000);

    // Проверяем таблицу
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    // Проверяем заголовок "Действия"
    const actionsHeader = page.locator('th:has-text("Действия")');
    await expect(actionsHeader).toBeVisible();

    // Проверяем кнопки "Купить"
    const buyButtons = page.locator('a:has-text("Купить")');
    const count = await buyButtons.count();

    console.log(`✅ Found ${count} "Купить" buttons`);

    if (count > 0) {
      // Скриншот первой кнопки
      await buyButtons.first().screenshot({
        path: '/opt/deep-agg/docs/_artifacts/ui-ux-r3-qa-20251012/buy-button.png'
      });
    }

    // Скриншот таблицы
    await table.screenshot({
      path: '/opt/deep-agg/docs/_artifacts/ui-ux-r3-qa-20251012/results-table.png'
    });
  });

  test('Проверка через API: GET /api/search/cache', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/search/cache?q=${TEST_QUERY}`);
    const data = await response.json();

    console.log('API Response status:', response.status());
    console.log('API Response data:', JSON.stringify(data, null, 2).substring(0, 1000));

    expect(response.status()).toBe(200);
  });
});
