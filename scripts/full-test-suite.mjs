// scripts/full-test-suite.mjs - полное тестирование на 10 рандомных товарах
import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

const SERVER_URL = process.argv[2] || 'http://127.0.0.1:9201';
const RESULTS_DIR = 'test-results';
const TEST_MPNS = [
  'LM317T', 'NE555P', 'LM358N', 'TL431', '1N4148', 
  '2N2222A', 'BC547B', 'MAX232CPE', 'LM7805CT', 'STM32F103C8T6'
];

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Директория уже существует
  }
}

async function testAPI(mpn) {
  console.log(`🧪 Testing API for: ${mpn}`);
  
  try {
    const response = await fetch(`${SERVER_URL}/api/search?q=${encodeURIComponent(mpn)}`);
    const data = await response.json();
    
    return {
      mpn: mpn,
      api_success: response.ok,
      status_code: response.status,
      results_count: data.count || 0,
      has_results: data.items && data.items.length > 0,
      first_item: data.items ? data.items[0] : null,
      response_time: Date.now() // Simplified timing
    };
  } catch (error) {
    return {
      mpn: mpn,
      api_success: false,
      error: error.message,
      results_count: 0,
      has_results: false
    };
  }
}

async function testProductPage(browser, mpn) {
  console.log(`🔍 Testing product page for: ${mpn}`);
  
  const page = await browser.newPage();
  
  try {
    await page.goto(`${SERVER_URL}/ui/product.html?id=${encodeURIComponent(mpn)}`, {
      waitUntil: 'networkidle',
      timeout: 15000
    });
    
    // Проверяем основные элементы страницы
    const title = await page.textContent('h1').catch(() => null);
    const gallery = await page.locator('[data-testid="gallery"], .gallery').count();
    const specs = await page.locator('[data-testid="specs"] tr, .specs tr').count();
    const price = await page.textContent('[data-testid="price"], .price').catch(() => null);
    const buyButton = await page.locator('[data-testid="buy-button"], .buy-button').count();
    
    // Делаем скриншот
    const screenshotPath = path.join(RESULTS_DIR, 'screenshots', `product-${mpn}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    await page.close();
    
    return {
      mpn: mpn,
      page_success: true,
      has_title: !!title,
      title: title,
      gallery_images: gallery,
      specs_count: specs,
      has_price: !!price,
      price: price,
      has_buy_button: buyButton > 0,
      screenshot: screenshotPath
    };
    
  } catch (error) {
    await page.close();
    return {
      mpn: mpn,
      page_success: false,
      error: error.message
    };
  }
}

async function testSearchPage(browser, mpn) {
  console.log(`📋 Testing search page for: ${mpn}`);
  
  const page = await browser.newPage();
  
  try {
    await page.goto(`${SERVER_URL}/ui/search.html?q=${encodeURIComponent(mpn)}`, {
      waitUntil: 'networkidle',
      timeout: 15000
    });
    
    // Ждем загрузки результатов
    await page.waitForSelector('.results-table tbody tr, .no-results', { timeout: 10000 });
    
    const resultsCount = await page.locator('.results-table tbody tr').count();
    const hasNoResults = await page.locator('.no-results').count() > 0;
    
    // Делаем скриншот
    const screenshotPath = path.join(RESULTS_DIR, 'screenshots', `search-${mpn}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    await page.close();
    
    return {
      mpn: mpn,
      search_success: true,
      results_in_table: resultsCount,
      has_no_results_message: hasNoResults,
      screenshot: screenshotPath
    };
    
  } catch (error) {
    await page.close();
    return {
      mpn: mpn,
      search_success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log(`🚀 Starting full test suite on: ${SERVER_URL}`);
  console.log(`📦 Testing ${TEST_MPNS.length} products`);
  
  await ensureDir(RESULTS_DIR);
  await ensureDir(path.join(RESULTS_DIR, 'screenshots'));
  
  const browser = await chromium.launch({ headless: true });
  const results = [];
  
  let apiSuccessCount = 0;
  let searchSuccessCount = 0;
  let productSuccessCount = 0;
  
  for (const mpn of TEST_MPNS) {
    console.log(`\n🔄 Testing: ${mpn}`);
    
    const testResult = {
      mpn: mpn,
      timestamp: new Date().toISOString()
    };
    
    // 1. Тест API
    const apiResult = await testAPI(mpn);
    testResult.api = apiResult;
    if (apiResult.api_success) apiSuccessCount++;
    
    // 2. Тест страницы поиска
    const searchResult = await testSearchPage(browser, mpn);
    testResult.search = searchResult;
    if (searchResult.search_success) searchSuccessCount++;
    
    // 3. Тест страницы товара
    const productResult = await testProductPage(browser, mpn);
    testResult.product = productResult;
    if (productResult.page_success) productSuccessCount++;
    
    results.push(testResult);
    
    // Пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  await browser.close();
  
  // Статистика
  const stats = {
    total_tests: TEST_MPNS.length,
    api_success_rate: (apiSuccessCount / TEST_MPNS.length * 100).toFixed(1),
    search_success_rate: (searchSuccessCount / TEST_MPNS.length * 100).toFixed(1),
    product_success_rate: (productSuccessCount / TEST_MPNS.length * 100).toFixed(1),
    api_successful: apiSuccessCount,
    search_successful: searchSuccessCount,
    product_successful: productSuccessCount,
    timestamp: new Date().toISOString(),
    server_url: SERVER_URL
  };
  
  // Сохраняем результаты
  const report = {
    stats: stats,
    results: results
  };
  
  await fs.writeFile(
    path.join(RESULTS_DIR, 'full-test-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  // Выводим статистику
  console.log('\n📊 FINAL STATISTICS:');
  console.log(`🌐 Server: ${SERVER_URL}`);
  console.log(`📦 Total tests: ${stats.total_tests}`);
  console.log(`🔌 API success: ${stats.api_successful}/${stats.total_tests} (${stats.api_success_rate}%)`);
  console.log(`🔍 Search success: ${stats.search_successful}/${stats.total_tests} (${stats.search_success_rate}%)`);
  console.log(`📄 Product success: ${stats.product_successful}/${stats.total_tests} (${stats.product_success_rate}%)`);
  
  // Детали по каждому товару
  console.log('\n📋 DETAILED RESULTS:');
  for (const result of results) {
    const api = result.api.api_success ? '✅' : '❌';
    const search = result.search.search_success ? '✅' : '❌';
    const product = result.product.page_success ? '✅' : '❌';
    console.log(`${result.mpn}: API ${api} Search ${search} Product ${product}`);
  }
  
  console.log(`\n📁 Results saved to: ${RESULTS_DIR}/full-test-report.json`);
  console.log(`📸 Screenshots saved to: ${RESULTS_DIR}/screenshots/`);
  
  // Exit code based on overall success
  const overallSuccess = (apiSuccessCount + searchSuccessCount + productSuccessCount) / (TEST_MPNS.length * 3);
  if (overallSuccess >= 0.8) {
    console.log('🎉 Tests PASSED (≥80% success rate)');
    process.exit(0);
  } else {
    console.log('❌ Tests FAILED (<80% success rate)');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
