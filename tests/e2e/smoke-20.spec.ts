import { test, expect } from '@playwright/test';

const MPNs = [
  'LM317T','1N4148W-TP','NE555P','BC547B','TL072','TL071CP','LM358P','CD4017BE','74HC595','ATMEGA328P',
  'STM32F103C8T6','AMS1117','IRFZ44N','IRLZ44N','BC337','2N2222','AD620','L7805CV','MC34063A','SS14'
];

for (const mpn of MPNs) {
  test(`Smoke ${mpn}: поиск → карточка без красных флагов`, async ({ page }) => {
    // Поиск
    await page.goto(`/?q=${encodeURIComponent(mpn)}`);

    // Ждём загрузки данных
    await page.waitForFunction(() => {
      const sumEl = document.getElementById('sum');
      return sumEl && !sumEl.textContent?.includes('Найдено: 0');
    }, { timeout: 15000 });

    // Ждем результатов поиска
    const table = page.locator('table tbody tr');
    expect(await table.count()).toBeGreaterThan(0);

    // Берем первую ссылку "Open" или кликаем по первому MPN
    const firstLink = page.locator('a', { hasText: /open/i }).first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
    } else {
      // fallback: прямой переход
      await page.goto(`/product?mpn=${encodeURIComponent(mpn)}`);
    }
    
    // Проверяем что карточка загрузилась
    await expect(page.getByTestId('order')).toBeVisible();
    await expect(page.locator('#h1')).toHaveText(/.+/);
    
    // Проверяем отсутствие критических ошибок
    const h1Text = await page.locator('#h1').textContent();
    expect(h1Text).not.toContain('нет данных');
    expect(h1Text).not.toContain('ошибка');
  });
}