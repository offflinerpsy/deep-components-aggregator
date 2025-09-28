import { test, expect } from '@playwright/test';

test.describe('Модальное окно в live-search', () => {
  test('Должно открываться и закрываться корректно', async ({ page }) => {
    // Переходим на страницу поиска с заданным запросом
    await page.goto('/live-search.html?q=LM317');
    
    // Ждем загрузки результатов
    await page.waitForSelector('.results-table tr', { timeout: 10000 });
    
    // Делаем скриншот результатов поиска
    await page.screenshot({ path: 'screenshots/search-results.png' });
    
    // Нажимаем на кнопку "Открыть" у первого результата
    const openButton = page.locator('.results-table tr:first-child button:has-text("Открыть")');
    await expect(openButton).toBeVisible();
    await openButton.click();
    
    // Проверяем, что модальное окно открылось
    const modal = page.locator('#product-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Делаем скриншот открытого модального окна
    await page.screenshot({ path: 'screenshots/modal-open.png' });
    
    // Проверяем наличие содержимого в модальном окне
    await expect(page.locator('.product-card')).toBeVisible();
    await expect(page.locator('.product-meta h2')).not.toBeEmpty();
    
    // Проверяем работу кнопки закрытия
    const closeButton = page.locator('#modal-close');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    
    // Проверяем, что модальное окно закрылось
    await expect(modal).toBeHidden({ timeout: 5000 });
    
    // Делаем скриншот после закрытия модального окна
    await page.screenshot({ path: 'screenshots/after-close.png' });
    
    // Снова открываем модальное окно
    await openButton.click();
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Проверяем закрытие при клике вне модального окна
    await page.mouse.click(10, 10); // Клик в верхнем левом углу (вне модального окна)
    
    // Проверяем, что модальное окно закрылось
    await expect(modal).toBeHidden({ timeout: 5000 });
  });
  
  test('Должно отображать правильные данные товара', async ({ page }) => {
    // Переходим на страницу поиска с заданным запросом
    await page.goto('/live-search.html?q=LM317');
    
    // Ждем загрузки результатов
    await page.waitForSelector('.results-table tr', { timeout: 10000 });
    
    // Сохраняем данные первого товара из таблицы
    const mpn = await page.locator('.results-table tr:first-child .mpn').textContent();
    const title = await page.locator('.results-table tr:first-child .title').textContent();
    const brand = await page.locator('.results-table tr:first-child td:nth-child(3)').textContent();
    
    // Нажимаем на кнопку "Открыть" у первого результата
    const openButton = page.locator('.results-table tr:first-child button:has-text("Открыть")');
    await openButton.click();
    
    // Проверяем, что модальное окно открылось
    const modal = page.locator('#product-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Проверяем, что данные в модальном окне соответствуют данным из таблицы
    await expect(page.locator('.product-meta h2')).toContainText(title || '');
    await expect(page.locator('.product-meta .mpn')).toContainText(mpn || '');
    await expect(page.locator('.product-meta .brand')).toContainText(brand || '');
    
    // Проверяем наличие других элементов в модальном окне
    await expect(page.locator('.product-gallery')).toBeVisible();
    await expect(page.locator('.product-order')).toBeVisible();
    
    // Делаем скриншот модального окна с данными
    await page.screenshot({ path: 'screenshots/modal-data.png' });
    
    // Закрываем модальное окно
    await page.locator('#modal-close').click();
    await expect(modal).toBeHidden({ timeout: 5000 });
  });
});
