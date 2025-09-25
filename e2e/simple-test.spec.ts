import { test, expect } from "@playwright/test";

test("Простая проверка загрузки страницы", async ({ page }) => {
  await page.goto("http://127.0.0.1:9201/product?mpn=1N4148W-TP");
  
  // Ждем появления основных элементов HTML
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("main.grid")).toBeVisible();
  
  // Проверяем что JavaScript загружен
  await page.waitForFunction(() => typeof window.main === 'function' || document.querySelector('#h1').textContent !== '');
  
  // Скриншот для диагностики
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  
  console.log('Page title:', await page.title());
  console.log('H1 text:', await page.locator('#h1').textContent());
});
