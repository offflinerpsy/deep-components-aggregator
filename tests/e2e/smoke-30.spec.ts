import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MPNs = JSON.parse(fs.readFileSync(path.join(__dirname, '../smoke/smoke-30.json'), 'utf8'));

let passedCount = 0;
let totalCount = 0;

for (const mpn of MPNs) {
  test(`Smoke-30 ${mpn}: поиск → карточка с контентом`, async ({ page }) => {
    totalCount++;
    
    // Поиск
    await page.goto(`/?q=${encodeURIComponent(mpn)}`);
    
    // Ждём загрузки данных
    await page.waitForFunction(() => {
      const sumEl = document.getElementById('sum');
      return sumEl && sumEl.textContent && sumEl.textContent.includes('Найдено:');
    }, { timeout: 10000 });
    
    // Проверяем что есть результаты
    const table = page.locator('[data-testid="search-table"]');
    const rows = table.locator('[data-testid="result-row"]');
    const rowCount = await rows.count();
    
    if (rowCount === 0) {
      console.log(`❌ ${mpn}: Нет результатов поиска`);
      return;
    }
    
    // Берём первый результат
    const firstRow = rows.first();
    const mpnLink = firstRow.locator('[data-testid="cell-mpn"] a');
    await mpnLink.click();
    
    // Ждём загрузки карточки
    await page.waitForFunction(() => {
      const titleEl = document.querySelector('[data-testid="title"]');
      return titleEl && titleEl.textContent && titleEl.textContent.trim().length > 0;
    }, { timeout: 10000 });
    
    // Проверяем наличие контента
    const title = page.locator('[data-testid="title"]');
    const gallery = page.locator('[data-testid="gallery"]');
    const docs = page.locator('[data-testid="docs"]');
    const specs = page.locator('[data-testid="specs"]');
    const order = page.locator('[data-testid="order"]');
    
    let hasContent = true;
    let contentInfo = [];
    
    // Проверяем заголовок
    const titleText = await title.textContent();
    if (!titleText || titleText.trim().length === 0) {
      console.log(`❌ ${mpn}: Пустой заголовок`);
      hasContent = false;
    } else {
      contentInfo.push(`title: ${titleText.length} символов`);
    }
    
    // Проверяем галерею
    const galleryImg = gallery.locator('img');
    const hasImage = await galleryImg.count() > 0;
    if (hasImage) {
      contentInfo.push('image: есть');
    } else {
      console.log(`⚠️ ${mpn}: Нет изображения`);
    }
    
    // Проверяем документы
    const docsList = docs.locator('li');
    const docsCount = await docsList.count();
    if (docsCount > 0) {
      contentInfo.push(`docs: ${docsCount} шт`);
    } else {
      console.log(`⚠️ ${mpn}: Нет документов`);
    }
    
    // Проверяем технические характеристики
    const specRows = specs.locator('tr');
    const specCount = await specRows.count();
    if (specCount >= 5) {
      contentInfo.push(`specs: ${specCount} параметров`);
    } else {
      console.log(`⚠️ ${mpn}: Мало ТТХ (${specCount} < 5)`);
    }
    
    // Проверяем блок заказа
    const stock = order.locator('#stock');
    const price = order.locator('#minPrice');
    const hasStock = await stock.textContent();
    const hasPrice = await price.textContent();
    
    if (hasStock && hasStock.trim() !== '') {
      contentInfo.push('stock: есть');
    }
    if (hasPrice && hasPrice.trim() !== '') {
      contentInfo.push('price: есть');
    }
    
    // Проверяем консоль на ошибки
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    
    if (errors.length > 0) {
      console.log(`⚠️ ${mpn}: Ошибки в консоли: ${errors.join(', ')}`);
    }
    
    if (hasContent) {
      console.log(`✅ ${mpn}: ${contentInfo.join(', ')}`);
      passedCount++;
    } else {
      console.log(`❌ ${mpn}: Недостаточно контента`);
    }
  });
}

test('Smoke-30 results: проверка порога', async () => {
  const successRate = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
  const THRESHOLD = 24; // Минимум 24 из 30 должны пройти (80%)
  
  console.log(`\\n📊 Smoke-30 Results:`);
  console.log(`✅ Успешно: ${passedCount}/${totalCount} (${successRate.toFixed(1)}%)`);
  console.log(`❌ Неудачно: ${totalCount - passedCount}/${totalCount}`);
  console.log(`🎯 Порог: ${THRESHOLD}/${totalCount} (${(THRESHOLD/totalCount*100).toFixed(1)}%)`);
  
  // Проверяем что успешность >= порога
  expect(passedCount).toBeGreaterThanOrEqual(THRESHOLD);
  
  console.log(`\\n🎯 Smoke-30: ${passedCount >= THRESHOLD ? 'PASS' : 'FAIL'} (требуется ≥${THRESHOLD})`);
});
