#!/usr/bin/env node

import { chromium } from 'playwright';

async function checkLoader() {
  console.log('🚀 Запускаю браузер...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🔍 Открываю https://prosnab.tech/');
  await page.goto('https://prosnab.tech/');

  console.log('⏳ Жду поисковую строку...');
  await page.waitForSelector('.search-box', { timeout: 5000 });

  console.log('⌨️  Ввожу "processor"...');
  await page.fill('.search-box input[type="text"]', 'processor');

  console.log('🎯 Нажимаю Enter...');
  await page.press('.search-box input[type="text"]', 'Enter');

  // Ждём 500ms и проверяем лоадер
  await page.waitForTimeout(500);
  
  const loaderVisible = await page.locator('.page-loader-overlay').isVisible();
  console.log(`\n📊 ЛОАДЕР ВИДЕН: ${loaderVisible ? '✅ ДА' : '❌ НЕТ'}`);

  if (loaderVisible) {
    const boxes = await page.locator('.page-loader-box').count();
    console.log(`📦 Квадратиков: ${boxes}/6`);
    
    const bgColor = await page.locator('.page-loader-overlay').evaluate(
      el => window.getComputedStyle(el).backgroundColor
    );
    console.log(`🎨 Цвет фона: ${bgColor}`);
  }

  // Ждём пока лоадер пропадёт
  console.log('\n⏱️  Жду пока лоадер исчезнет...');
  const start = Date.now();
  await page.waitForSelector('.page-loader-overlay', { state: 'hidden', timeout: 10000 });
  const duration = Date.now() - start;
  console.log(`✅ Лоадер показывался ${duration}ms`);

  // Проверяем результаты
  await page.waitForTimeout(500);
  const resultsVisible = await page.locator('table').isVisible().catch(() => false);
  console.log(`📋 Результаты видны: ${resultsVisible ? '✅ ДА' : '❌ НЕТ'}`);

  console.log('\n✅ Тест завершён. Закрываю через 3 секунды...');
  await page.waitForTimeout(3000);

  await browser.close();
}

checkLoader().catch(console.error);
