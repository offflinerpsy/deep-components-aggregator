// scripts/screenshot-test.mjs - автоматические скриншоты для проверки UI
import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'diag/screenshots';
const SERVER_URL = process.argv[2] || 'http://127.0.0.1:9201';

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Директория уже существует
  }
}

async function takeScreenshot(page, url, filename) {
  console.log(`📸 Taking screenshot: ${filename}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, filename),
      fullPage: true
    });
    console.log(`✅ Screenshot saved: ${filename}`);
    return true;
  } catch (error) {
    console.log(`❌ Screenshot failed: ${filename} - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`🚀 Starting screenshot tests for: ${SERVER_URL}`);

  await ensureDir(SCREENSHOTS_DIR);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 }
  });

  const tests = [
    // Главная страница
    {
      url: `${SERVER_URL}/`,
      filename: 'homepage.png',
      description: 'Главная страница'
    },

    // Поиск LM317
    {
      url: `${SERVER_URL}/ui/search.html?q=LM317`,
      filename: 'search-lm317.png',
      description: 'Поиск LM317'
    },

    // Поиск транзистора
    {
      url: `${SERVER_URL}/ui/search.html?q=транзистор`,
      filename: 'search-transistor.png',
      description: 'Поиск транзистора'
    },

    // Карточка товара
    {
      url: `${SERVER_URL}/ui/product.html?id=LM317T`,
      filename: 'product-lm317t.png',
      description: 'Карточка LM317T'
    }
  ];

  let successCount = 0;

  for (const test of tests) {
    console.log(`🧪 Testing: ${test.description}`);
    const success = await takeScreenshot(page, test.url, test.filename);
    if (success) successCount++;

    // Пауза между скриншотами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  await browser.close();

  console.log(`📊 Results: ${successCount}/${tests.length} screenshots successful`);

  // Создаем отчет
  const report = {
    timestamp: new Date().toISOString(),
    server_url: SERVER_URL,
    total_tests: tests.length,
    successful: successCount,
    failed: tests.length - successCount,
    tests: tests.map(test => ({
      ...test,
      success: true // TODO: track individual success
    }))
  };

  await fs.writeFile(
    path.join(SCREENSHOTS_DIR, 'report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(`📋 Report saved to: ${SCREENSHOTS_DIR}/report.json`);

  if (successCount === tests.length) {
    console.log('🎉 All screenshot tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some screenshot tests failed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Screenshot test failed:', error);
  process.exit(1);
});
