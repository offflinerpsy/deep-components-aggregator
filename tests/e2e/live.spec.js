import { test, expect } from '@playwright/test';

/**
 * E2E тесты для функциональности живого поиска
 */
test.describe('Live Search E2E Tests', () => {

  // Тест для проверки загрузки страницы поиска
  test('should load search page', async ({ page }) => {
    await page.goto('/ui/search.html');

    // Проверяем заголовок страницы
    await expect(page).toHaveTitle(/Поиск компонентов/);

    // Проверяем наличие поля поиска и кнопки
    const searchInput = page.locator('#searchInput');
    const searchButton = page.locator('#searchButton');

    await expect(searchInput).toBeVisible();
    await expect(searchButton).toBeVisible();
  });

  // Тест для проверки локального поиска
  test('should display local search results', async ({ page }) => {
    // Переходим на страницу поиска с параметром q
    await page.goto('/ui/search.html?q=LM317');

    // Проверяем, что поле поиска заполнено
    const searchInput = page.locator('#searchInput');
    await expect(searchInput).toHaveValue('LM317');

    // Ожидаем появления результатов поиска
    const resultsTable = page.locator('.results-table');
    await expect(resultsTable).toBeVisible({ timeout: 10000 });

    // Проверяем наличие хотя бы одной строки с результатами
    const tableRows = page.locator('.results-table tbody tr');
    await expect(tableRows).toHaveCount(1, { gte: true, timeout: 10000 });

    // Проверяем, что в результатах есть LM317
    const firstRow = tableRows.first();
    await expect(firstRow).toContainText('LM317');
  });

  // Тест для проверки раскрытия карточки товара
  test('should expand product card on button click', async ({ page }) => {
    // Переходим на страницу поиска с параметром q
    await page.goto('/ui/search.html?q=LM317');

    // Ожидаем появления результатов поиска
    const resultsTable = page.locator('.results-table');
    await expect(resultsTable).toBeVisible({ timeout: 10000 });

    // Находим кнопку "Открыть" в первой строке
    const expandButton = page.locator('.expand-button').first();
    await expect(expandButton).toBeVisible();

    // Нажимаем на кнопку
    await expandButton.click();

    // Проверяем, что карточка товара отображается
    const productCard = page.locator('.product-card-expanded.active');
    await expect(productCard).toBeVisible({ timeout: 5000 });

    // Проверяем содержимое карточки
    await expect(productCard).toContainText('LM317');
    await expect(productCard).toContainText('Производитель');
    await expect(productCard).toContainText('Описание');
  });

  // Тест для проверки живого поиска с SSE
  test('should receive SSE events during live search', async ({ page }) => {
    // Включаем перехват запросов
    await page.route('**/api/live/search**', async (route) => {
      // Пропускаем запрос, но отслеживаем его
      const url = route.request().url();
      console.log(`Intercepted SSE request: ${url}`);
      await route.continue();
    });

    // Переходим на страницу поиска
    await page.goto('/ui/search.html');

    // Вводим запрос в поле поиска
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('1N4148');

    // Нажимаем на кнопку поиска
    const searchButton = page.locator('#searchButton');
    await searchButton.click();

    // Ожидаем появления сообщения о начале поиска
    const messages = page.locator('#messages .message-box');
    await expect(messages.first()).toContainText('Запускаю поиск', { timeout: 5000 });

    // Ожидаем появления результатов поиска
    const tableRows = page.locator('.results-table tbody tr');
    await expect(tableRows).toHaveCount(1, { gte: true, timeout: 15000 });
  });

  // Тест для проверки API здоровья
  test('should check API health', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  // Тест для проверки API поиска
  test('should check API search', async ({ request }) => {
    const response = await request.get('/api/search?q=LM317');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.items).toBeDefined();
  });

  // Тест для проверки API продукта
  test('should check API product', async ({ request }) => {
    const response = await request.get('/api/product?mpn=LM317');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.mpn).toBeDefined();
  });
});
