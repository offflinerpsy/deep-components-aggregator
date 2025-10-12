/* analyze-project.mjs - Анализ проекта для v0 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function analyzeProject() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Создай папку для артефактов
  const artifactsDir = '/opt/deep-agg/v0-analysis-artifacts';
  await mkdir(artifactsDir, { recursive: true });
  await mkdir(join(artifactsDir, 'screenshots'), { recursive: true });

  console.log('Анализирую проект...');

  // 1. ГЛАВНАЯ СТРАНИЦА
  console.log('1. Скриншот главной страницы...');
  await page.goto('http://127.0.0.1:3000');
  await page.waitForTimeout(2000); // Жди загрузки анимаций
  await page.screenshot({
    path: join(artifactsDir, 'screenshots', '1-main-page.png'),
    fullPage: true
  });

  // Собери информацию о главной
  const mainPageInfo = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      hasSearchInput: !!document.querySelector('input[name="q"], input[type="text"]'),
      hasLogo: !!document.querySelector('.logo, svg[class*="logo"]'),
      backgroundAnimation: getComputedStyle(document.body).animation || 'none',
      bodyClasses: document.body.className,
      mainElements: Array.from(document.querySelectorAll('main > *')).map(el => ({
        tag: el.tagName,
        classes: el.className,
        id: el.id
      }))
    };
  });

  // 2. СТРАНИЦА ПОИСКА
  console.log('2. Скриншот страницы поиска...');

  // Введи тестовый запрос
  const searchInput = page.locator('input[name="q"], input[type="text"]').first();
  await searchInput.fill('LM317T');
  await searchInput.press('Enter');

  // Жди навигации и загрузки
  await page.waitForURL(/.*results.*/, { timeout: 5000 }).catch(() => { });
  await page.waitForTimeout(3000); // Жди SSE результатов

  await page.screenshot({
    path: join(artifactsDir, 'screenshots', '2-search-page.png'),
    fullPage: true
  });

  // Собери информацию о поиске
  const searchPageInfo = await page.evaluate(() => {
    const results = document.querySelectorAll('table tbody tr, [data-testid="product-row"], [class*="result-item"]');
    const thElements = Array.from(document.querySelectorAll('table th'));
    return {
      url: window.location.href,
      resultsCount: results.length,
      hasTable: !!document.querySelector('table'),
      hasPriceColumn: thElements.some(th => th.textContent.includes('Цена')) || !!document.querySelector('[class*="price"]'),
      hasRegionColumn: thElements.some(th => th.textContent.includes('Регион')) || !!document.querySelector('[class*="region"]'),
      tableColumns: thElements.map(th => th.textContent.trim()),
      hasSSEIndicator: !!document.querySelector('[class*="live"], [class*="sse"]'),
      hasRuEnBadge: !!document.querySelector('[class*="ru-en"], [class*="badge"]'),
      glassEffect: Array.from(document.querySelectorAll('[class*="glass"]')).length
    };
  });

  // 3. КАРТОЧКА ТОВАРА
  console.log('3. Скриншот карточки товара...');

  // Кликни на первый результат или перейди напрямую
  const firstLink = page.locator('table tbody tr:first-child a, [data-testid="product-row"]:first-child a').first();
  if (await firstLink.count() > 0) {
    await firstLink.click();
  } else {
    await page.goto('http://127.0.0.1:3000/product/LM317T');
  }

  await page.waitForTimeout(3000);

  await page.screenshot({
    path: join(artifactsDir, 'screenshots', '3-product-page.png'),
    fullPage: true
  });

  // Собери информацию о карточке
  const productPageInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const links = Array.from(document.querySelectorAll('a'));
    return {
      url: window.location.href,
      hasProductImage: !!document.querySelector('img[alt], img[src*="api/image"]'),
      hasTabs: !!document.querySelector('[role="tablist"]') || buttons.some(b => b.className.includes('tab')),
      tabsCount: document.querySelectorAll('[role="tab"]').length || buttons.filter(b => b.className.includes('tab')).length,
      hasCharacteristicsTable: !!document.querySelector('table'),
      hasOrderButton: buttons.some(b => b.textContent.includes('Добавить') || b.textContent.includes('Заказ')),
      hasPriceBlock: !!document.querySelector('[class*="price"]'),
      hasDatasheetLink: links.some(a => a.href.includes('pdf') || a.textContent.includes('Datasheet')),
      glassEffect: Array.from(document.querySelectorAll('[class*="glass"]')).length,
      mainSections: Array.from(document.querySelectorAll('main > div')).map(div => ({
        classes: div.className,
        hasTable: !!div.querySelector('table'),
        hasButton: !!div.querySelector('button')
      }))
    };
  });

  // Сохрани всю информацию
  await writeFile(
    join(artifactsDir, 'main-page-info.json'),
    JSON.stringify(mainPageInfo, null, 2)
  );

  await writeFile(
    join(artifactsDir, 'search-page-info.json'),
    JSON.stringify(searchPageInfo, null, 2)
  );

  await writeFile(
    join(artifactsDir, 'product-page-info.json'),
    JSON.stringify(productPageInfo, null, 2)
  );

  await browser.close();
  console.log('✅ Скриншоты сохранены в:', artifactsDir);
}

analyzeProject().catch(console.error);
