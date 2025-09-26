import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем список MPN для тестирования
const smokeList = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../smoke/smoke-30.json'), 'utf-8')
) as string[];

const PASS_THRESHOLD = 0.8; // 80% должны пройти
const REQUIRED_PASSES = Math.ceil(smokeList.length * PASS_THRESHOLD);

test.describe('Smoke-30 Test Suite', () => {
  let passCount = 0;
  let results: Array<{ mpn: string, passed: boolean, reason?: string }> = [];

  test.afterAll(async () => {
    // Сохраняем результаты
    const report = {
      timestamp: new Date().toISOString(),
      total: smokeList.length,
      passed: passCount,
      failed: smokeList.length - passCount,
      passRate: (passCount / smokeList.length * 100).toFixed(1) + '%',
      threshold: (PASS_THRESHOLD * 100) + '%',
      success: passCount >= REQUIRED_PASSES,
      results: results
    };

    const reportPath = path.join(__dirname, '../../reports/smoke-30-results.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n🎯 SMOKE-30 RESULTS:`);
    console.log(`   Passed: ${passCount}/${smokeList.length} (${report.passRate})`);
    console.log(`   Threshold: ${report.threshold}`);
    console.log(`   Status: ${report.success ? '✅ PASS' : '❌ FAIL'}`);

    // Проверяем порог
    expect(passCount).toBeGreaterThanOrEqual(REQUIRED_PASSES);
  });

  for (const mpn of smokeList) {
    test(`Smoke test for ${mpn}`, async ({ page }) => {
      let testPassed = false;
      let failureReason = '';

      try {
        // 1. Поиск должен найти результаты
        await page.goto('/');
        await page.getByPlaceholder('Введите MPN').fill(mpn);
        await page.getByRole('button', { name: 'Поиск' }).click();

        // Ждем результатов или сообщения об отсутствии результатов
        await page.waitForFunction(
          () => {
            const rows = document.querySelectorAll('[data-testid="result-row"]');
            const summary = document.querySelector('#sum')?.textContent || '';
            return rows.length > 0 || summary.includes('Найдено: 0');
          },
          { timeout: 15000 }
        );

        const resultRows = await page.getByTestId('result-row').count();
        
        if (resultRows === 0) {
          failureReason = 'No search results found';
        } else {
          // 2. Переходим на страницу первого товара
          const firstRow = page.getByTestId('result-row').first();
          const openLink = firstRow.getByTestId('cell-open').locator('a');
          await openLink.click();

          // 3. Проверяем базовую структуру страницы товара
          await page.waitForSelector('[data-testid="product-root"]', { timeout: 10000 });

          const title = page.getByTestId('title');
          await expect(title).toBeVisible();

          const titleText = await title.textContent();
          if (!titleText?.trim()) {
            failureReason = 'Product title is empty';
          } else {
            // 4. Проверяем основные секции
            await expect(page.getByTestId('gallery')).toBeVisible();
            await expect(page.getByTestId('meta')).toBeVisible();
            await expect(page.getByTestId('order')).toBeVisible();

            // 5. Проверяем, что есть цена
            const priceElement = page.locator('#minPrice');
            await expect(priceElement).toBeVisible();
            
            testPassed = true;
          }
        }
      } catch (error) {
        failureReason = error instanceof Error ? error.message : 'Unknown error';
      }

      // Записываем результат
      results.push({
        mpn,
        passed: testPassed,
        reason: testPassed ? undefined : failureReason
      });

      if (testPassed) {
        passCount++;
      }

      // Мягкая проверка - не падаем на отдельных тестах
      if (!testPassed) {
        console.log(`⚠️  ${mpn}: ${failureReason}`);
      } else {
        console.log(`✅ ${mpn}: OK`);
      }
    });
  }
});