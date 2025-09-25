// tests/e2e/smoke-50.spec.ts - Smoke test для 50 популярных MPN
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// 50 популярных MPN для smoke тестирования
const MPNs = [
  "LM317T","1N4148W-TP","NE555P","BC547B","BC337","TL071CP","TL072","LM358P","LM7805","AMS1117-3.3",
  "74HC595","74HC165","CD4017BE","2N2222A","2N3904","2N3906","IRFZ44N","IRLZ44N","IRF540N","AO3400A",
  "SS14","SS34","BAT54","BSS138","BS170","PC817","MOC3021","ULN2003A","L293D","MAX485",
  "MAX232","DS18B20","CH340G","TP4056","MT3608","XL4015","LM2596S","A4988","DRV8825","MP1584EN",
  "ESP32-WROOM-32","NRF24L01+","ATMEGA328P-PU","STM32F103C8T6","PIC16F628A","CD4051BE","74HC14","74HC04","AMS1117-5.0","SSD1306"
];

// Результаты smoke тестов
interface SmokeResult {
  mpn: string;
  status: 'success' | 'partial' | 'fail';
  searchFound: boolean;
  productLoaded: boolean;
  hasImage: boolean;
  hasDescription: boolean;
  hasPdf: boolean;
  techSpecsCount: number;
  error?: string;
  duration: number;
}

const smokeResults: SmokeResult[] = [];

// Функция для сохранения результатов
async function saveResults() {
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const resultsPath = path.join(reportsDir, 'smoke-50.json');
  
  const summary = {
    timestamp: new Date().toISOString(),
    total: smokeResults.length,
    success: smokeResults.filter(r => r.status === 'success').length,
    partial: smokeResults.filter(r => r.status === 'partial').length,
    fail: smokeResults.filter(r => r.status === 'fail').length,
    results: smokeResults
  };
  
  fs.writeFileSync(resultsPath, JSON.stringify(summary, null, 2));
  console.log(`Smoke results saved to: ${resultsPath}`);
}

// Основные smoke тесты
for (const mpn of MPNs) {
  test(`Smoke ${mpn}: поиск → карточка`, async ({ page }) => {
    const startTime = Date.now();
    
    const result: SmokeResult = {
      mpn,
      status: 'fail',
      searchFound: false,
      productLoaded: false,
      hasImage: false,
      hasDescription: false,
      hasPdf: false,
      techSpecsCount: 0,
      duration: 0
    };

    try {
      // 1. Поиск
      await page.goto(`/?q=${encodeURIComponent(mpn)}`);
      
      // Ждём загрузки результатов с таймаутом
      try {
        await page.waitForFunction(() => {
          const sumEl = document.getElementById('sum');
          return sumEl && !sumEl.textContent?.includes('Найдено: 0');
        }, { timeout: 15000 });
        
        result.searchFound = true;
      } catch (e) {
        result.error = 'Search timeout or no results';
        result.duration = Date.now() - startTime;
        smokeResults.push(result);
        return;
      }

      // Проверяем что есть результаты
      const rows = page.getByTestId('result-row');
      const rowCount = await rows.count();
      
      if (rowCount === 0) {
        result.error = 'No search results found';
        result.duration = Date.now() - startTime;
        smokeResults.push(result);
        return;
      }

      // 2. Переход на карточку продукта
      const firstOpenLink = rows.first().getByTestId('cell-open').locator('a');
      
      if (await firstOpenLink.count() > 0) {
        await firstOpenLink.click();
      } else {
        // Fallback: прямой переход
        await page.goto(`/product?mpn=${encodeURIComponent(mpn)}`);
      }

      // Ждём загрузки карточки
      try {
        await page.waitForFunction(() => {
          const title = document.querySelector('[data-testid="title"]');
          return title && title.textContent && title.textContent.trim() !== '';
        }, { timeout: 15000 });
        
        result.productLoaded = true;
      } catch (e) {
        result.error = 'Product page load timeout';
        result.duration = Date.now() - startTime;
        smokeResults.push(result);
        return;
      }

      // 3. Проверяем базовые инварианты
      
      // Изображение или плейсхолдер
      const gallery = page.getByTestId('gallery');
      const hasImg = await gallery.locator('img').count() > 0;
      const hasPlaceholder = (await gallery.textContent())?.includes('IMAGE');
      result.hasImage = hasImg || !!hasPlaceholder;

      // Описание
      const desc = page.getByTestId('desc');
      const descText = await desc.textContent();
      result.hasDescription = !!descText && descText.trim() !== '' && !desc.getAttribute('hidden');

      // PDF документы
      const docs = page.getByTestId('docs');
      const pdfLinks = docs.locator('a[href*="pdf"], a:has-text("PDF")');
      result.hasPdf = await pdfLinks.count() > 0;

      // Технические характеристики
      const specs = page.getByTestId('specs');
      const specRows = specs.locator('table tr');
      result.techSpecsCount = await specRows.count();

      // 4. Определяем статус
      const hasMinimalContent = result.hasImage && result.productLoaded;
      const hasGoodContent = hasMinimalContent && (result.hasDescription || result.hasPdf || result.techSpecsCount >= 3);

      if (hasGoodContent) {
        result.status = 'success';
      } else if (hasMinimalContent) {
        result.status = 'partial';
      } else {
        result.status = 'fail';
        result.error = 'Insufficient content';
      }

    } catch (error) {
      result.error = `Exception: ${error.message}`;
      result.status = 'fail';
    } finally {
      result.duration = Date.now() - startTime;
      smokeResults.push(result);
    }
  });
}

// Финальный тест для сохранения результатов
test('Smoke results: save summary', async () => {
  await saveResults();
  
  const total = smokeResults.length;
  const success = smokeResults.filter(r => r.status === 'success').length;
  const partial = smokeResults.filter(r => r.status === 'partial').length;
  const fail = smokeResults.filter(r => r.status === 'fail').length;
  
  const successRate = ((success + partial) / total) * 100;
  
  console.log(`\n=== SMOKE TEST SUMMARY ===`);
  console.log(`Total: ${total}`);
  console.log(`Success: ${success} (${(success/total*100).toFixed(1)}%)`);
  console.log(`Partial: ${partial} (${(partial/total*100).toFixed(1)}%)`);
  console.log(`Fail: ${fail} (${(fail/total*100).toFixed(1)}%)`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  
  // Критерий приёмки: ≥80% success/partial
  expect(successRate).toBeGreaterThanOrEqual(80);
  
  // Не должно быть фатальных падений у большинства
  const fatalFails = smokeResults.filter(r => r.status === 'fail' && !r.searchFound).length;
  expect(fatalFails).toBeLessThan(total * 0.2); // Максимум 20% фатальных падений
});
