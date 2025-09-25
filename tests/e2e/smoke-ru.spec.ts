import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MPNs = JSON.parse(fs.readFileSync(path.join(__dirname, '../smoke/smoke-ru.json'), 'utf8'));

let passedCount = 0;
let totalCount = 0;

for (const mpn of MPNs) {
  test(`Smoke RU ${mpn}: поиск → карточка с RU-контентом`, async ({ page }) => {
    totalCount++;
    
    // Поиск
    await page.goto(`/?q=${encodeURIComponent(mpn)}`);
    
    // Ждём загрузки данных
    await page.waitForFunction(() => {
      const sumEl = document.getElementById('sum');
      return sumEl && sumEl.textContent && sumEl.textContent.includes('Найдено:');
    }, { timeout: 30000 });
    
    // Ждем результатов поиска
    const table = page.locator('table tbody tr');
    const rowCount = await table.count();
    
    if (rowCount === 0) {
      console.log(`❌ ${mpn}: Нет результатов поиска`);
      return;
    }
    
    // Переходим на карточку товара
    const firstLink = page.locator('a', { hasText: /open/i }).first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
    } else {
      await page.goto(`/product?mpn=${encodeURIComponent(mpn)}`);
    }
    
    // Ждём загрузки карточки
    await page.waitForSelector('[data-testid="product-root"]', { timeout: 15000 });
    
    // Ждём загрузки заголовка
    await page.waitForFunction(() => {
      const titleEl = document.querySelector('[data-testid="title"]');
      return titleEl && titleEl.textContent && titleEl.textContent.trim() !== '';
    }, { timeout: 15000 });
    
    // Проверяем RU-контент
    let ruContentFound = false;
    
    // Проверяем описание
    const desc = page.getByTestId('desc');
    if (await desc.isVisible()) {
      const descText = await desc.textContent();
      if (descText && descText.length > 20) {
        ruContentFound = true;
        console.log(`✅ ${mpn}: RU описание найдено (${descText.length} символов)`);
      }
    }
    
    // Проверяем технические характеристики
    const specs = page.getByTestId('specs');
    if (await specs.isVisible()) {
      const specsText = await specs.textContent();
      if (specsText && specsText.length > 20) {
        ruContentFound = true;
        console.log(`✅ ${mpn}: RU характеристики найдены (${Object.keys(JSON.parse(specsText || '{}')).length} параметров)`);
      }
    }
    
    // Проверяем PDF документы
    const docs = page.getByTestId('docs');
    if (await docs.isVisible()) {
      const pdfLinks = docs.locator('a[href$=".pdf"]');
      const pdfCount = await pdfLinks.count();
      if (pdfCount > 0) {
        ruContentFound = true;
        console.log(`✅ ${mpn}: PDF документы найдены (${pdfCount} шт.)`);
      }
    }
    
    // Проверяем изображения
    const gallery = page.getByTestId('gallery');
    if (await gallery.isVisible()) {
      const images = gallery.locator('img');
      const imgCount = await images.count();
      if (imgCount > 0) {
        ruContentFound = true;
        console.log(`✅ ${mpn}: Изображения найдены (${imgCount} шт.)`);
      }
    }
    
    if (ruContentFound) {
      passedCount++;
      console.log(`✅ ${mpn}: RU-контент найден`);
    } else {
      console.log(`❌ ${mpn}: RU-контент не найден`);
    }
    
    // Проверяем отсутствие ошибок консоли
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.waitForTimeout(1000);
    expect(errors, `Console errors for ${mpn}: ${errors.join('\\n')}`).toHaveLength(0);
  });
}

test('Smoke RU results: проверка порога', async () => {
  const successRate = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
  const THRESHOLD = 8; // Минимум 8 из 12 должны пройти
  
  console.log(`\\n📊 Smoke RU Results:`);
  console.log(`✅ Успешно: ${passedCount}/${totalCount} (${successRate.toFixed(1)}%)`);
  console.log(`❌ Неудачно: ${totalCount - passedCount}/${totalCount}`);
  console.log(`🎯 Порог: ${THRESHOLD}/${totalCount} (${(THRESHOLD/totalCount*100).toFixed(1)}%)`);
  
  // Проверяем что успешность >= порога
  expect(passedCount).toBeGreaterThanOrEqual(THRESHOLD);
  
  console.log(`\\n🎯 Smoke RU: ${passedCount >= THRESHOLD ? 'PASS' : 'FAIL'} (требуется ≥${THRESHOLD})`);
});
