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
    const tableRows = page.locator('.results-table tbody tr').filter({ hasNotClass: 'product-card-row' });
    await expect(tableRows).toHaveCount(1, { gte: true, timeout: 10000 });

    // Проверяем, что в результатах есть LM317
    const firstRow = tableRows.first();
    await expect(firstRow).toContainText('LM317');
  });

  // Тест для проверки поиска на кириллице
  test('should search with cyrillic query', async ({ page }) => {
    // Переходим на страницу поиска
    await page.goto('/ui/search.html');

    // Вводим запрос на кириллице
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('транзистор');

    // Нажимаем на кнопку поиска
    const searchButton = page.locator('#searchButton');
    await searchButton.click();

    // Ожидаем появления сообщения о поиске
    const messages = page.locator('#messages .message-box');
    await expect(messages.first()).toContainText('Ищем в источниках', { timeout: 5000 });

    // Ожидаем появления результатов поиска
    const tableRows = page.locator('.results-table tbody tr').filter({ hasNotClass: 'product-card-row' });
    await expect(tableRows).toHaveCount(1, { gte: true, timeout: 15000 });
  });

  // Тест для проверки раскрытия карточки товара
  test('should expand product card on button click', async ({ page }) => {
    // Переходим на страницу поиска с параметром q
    await page.goto('/ui/search.html?q=LM317');

    // Ожидаем появления результатов поиска
    const resultsTable = page.locator('.results-table');
    await expect(resultsTable).toBeVisible({ timeout: 10000 });

    // Находим кнопку "Открыть" в первой строке
    const expandButton = page.locator('.buy-button').filter({ hasText: 'Открыть' }).first();
    await expect(expandButton).toBeVisible({ timeout: 5000 });

    // Нажимаем на кнопку
    await expandButton.click();

    // Проверяем, что карточка товара отображается
    const productCard = page.locator('.product-card-expanded.active');
    await expect(productCard).toBeVisible({ timeout: 5000 });

    // Проверяем содержимое карточки
    await expect(productCard).toContainText('Производитель');
    await expect(productCard).toContainText('Описание');
    await expect(productCard).toContainText('Технические характеристики');
  });

  // Тест для проверки полного потока поиска и просмотра карточки
  test('full flow: search for "транзистор", view product card', async ({ page }) => {
    // Переходим на страницу поиска
    await page.goto('/ui/search.html');

    // Вводим запрос на кириллице
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('транзистор');

    // Нажимаем на кнопку поиска
    const searchButton = page.locator('#searchButton');
    await searchButton.click();

    // Ожидаем появления результатов поиска
    const tableRows = page.locator('.results-table tbody tr').filter({ hasNotClass: 'product-card-row' });
    await expect(tableRows).toHaveCount(1, { gte: true, timeout: 15000 });

    // Находим кнопку "Открыть" в первой строке
    const expandButton = page.locator('.buy-button').filter({ hasText: 'Открыть' }).first();
    await expect(expandButton).toBeVisible({ timeout: 5000 });

    // Нажимаем на кнопку
    await expandButton.click();

    // Проверяем, что карточка товара отображается
    const productCard = page.locator('.product-card-expanded.active');
    await expect(productCard).toBeVisible({ timeout: 5000 });

    // Проверяем основные элементы карточки
    await expect(productCard.locator('.product-card-price')).toBeVisible();
    await expect(productCard.locator('.product-card-stock')).toBeVisible();
    await expect(productCard.locator('.product-card-meta')).toContainText('Производитель');

    // Делаем скриншот карточки товара
    await productCard.screenshot({ path: 'test-results/product-card.png' });
  });
});
