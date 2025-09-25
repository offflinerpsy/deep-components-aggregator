import { test, expect } from '@playwright/test';

const MPNs = [
  'LM317T', '1N4148', 'NE555', 'BC547', 'TL071', 'CD4017', 
  '74HC595', 'IRFZ44N', '7805', 'AMS1117', 'ATmega328P', 'ESP32'
];

for (const mpn of MPNs) {
  test(`Product content ${mpn}: RU-контент загружается корректно`, async ({ page }) => {
    // Переходим на карточку товара
    await page.goto(`/product?mpn=${encodeURIComponent(mpn)}`);
    
    // Ждем загрузки карточки
    await page.waitForSelector('[data-testid="product-root"]', { timeout: 15000 });
    
    const root = page.getByTestId('product-root');
    await expect(root).toBeVisible();
    
    // Ждем загрузки заголовка
    await page.waitForFunction(() => {
      const titleEl = document.querySelector('[data-testid="title"]');
      return titleEl && titleEl.textContent && titleEl.textContent.trim() !== '';
    }, { timeout: 15000 });
    
    // Проверяем основные элементы
    const title = page.getByTestId('title');
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText).toBeTruthy();
    expect(titleText).toContain(mpn);
    
    // Проверяем описание (должно быть RU-контент)
    const desc = page.getByTestId('desc');
    if (await desc.isVisible()) {
      const descText = await desc.textContent();
      expect(descText).toBeTruthy();
      expect(descText.length).toBeGreaterThan(10);
    }
    
    // Проверяем технические характеристики
    const specs = page.getByTestId('specs');
    if (await specs.isVisible()) {
      const specsText = await specs.textContent();
      expect(specsText).toBeTruthy();
      expect(specsText.length).toBeGreaterThan(10);
    }
    
    // Проверяем PDF документы
    const docs = page.getByTestId('docs');
    if (await docs.isVisible()) {
      const pdfLinks = docs.locator('a[href$=".pdf"]');
      const pdfCount = await pdfLinks.count();
      if (pdfCount > 0) {
        expect(pdfCount).toBeGreaterThan(0);
      }
    }
    
    // Проверяем изображение
    const gallery = page.getByTestId('gallery');
    if (await gallery.isVisible()) {
      const images = gallery.locator('img');
      const imgCount = await images.count();
      if (imgCount > 0) {
        expect(imgCount).toBeGreaterThan(0);
      }
    }
    
    // Проверяем отсутствие ошибок консоли
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.waitForTimeout(1000);
    expect(errors, `Console errors: ${errors.join('\\n')}`).toHaveLength(0);
  });
}

test('Search results contain RU descriptions', async ({ page }) => {
  await page.goto('/?q=LM317T');
  
  // Ждем результатов
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  
  const table = page.getByRole('table');
  const rows = await table.getByRole('row').count();
  
  // Должно быть минимум 5 результатов
  expect(rows).toBeGreaterThan(5);
  
  // Проверяем что есть описания
  const firstRow = table.getByRole('row').nth(1);
  const descCell = firstRow.getByRole('cell').nth(3); // description
  const descText = await descCell.textContent();
  
  // Проверяем что описание не пустое
  expect(descText).toBeTruthy();
  expect(descText.length).toBeGreaterThan(10);
});
