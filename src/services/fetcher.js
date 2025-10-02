import { chromium } from 'playwright';

/**
 * Загружает HTML страницы товара с ChipDip.ru с помощью Playwright
 * @param {string} mpn - Артикул товара для поиска
 * @returns {Promise<{ok: true, html: string, url: string}|{ok: false, error: string}>}
 */
export async function fetchChipDipPageHtml(mpn) {
  if (!mpn || typeof mpn !== 'string' || mpn.trim().length === 0) {
    return { ok: false, error: 'Invalid MPN provided' };
  }

  let browser;
  let page;

  try {
    // Запускаем браузер
    browser = await chromium.launch({
      headless: true, // Запускаем в headless режиме для производительности
      timeout: 30000
    });

    // Создаем новую страницу
    page = await browser.newPage();

    // Устанавливаем User-Agent для избежания блокировки
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Переходим на страницу поиска ChipDip
    const searchUrl = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(mpn)}`;
    console.log(`🔍 Fetching ChipDip search page: ${searchUrl}`);
    
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Ждем появления результатов поиска
    await page.waitForTimeout(2000);

    // Ищем первую ссылку на товар в результатах поиска
    const firstProductLink = await page.locator('a[href*="/product/"]').first();
    
    if (!(await firstProductLink.count())) {
      return { ok: false, error: 'No products found in search results' };
    }

    // Получаем URL первого товара
    const productUrl = await firstProductLink.getAttribute('href');
    let fullProductUrl;
    
    if (productUrl.startsWith('http')) {
      fullProductUrl = productUrl;
    } else {
      fullProductUrl = `https://www.chipdip.ru${productUrl}`;
    }

    console.log(`📄 Navigating to product page: ${fullProductUrl}`);

    // Переходим на страницу товара
    await page.goto(fullProductUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Дополнительное ожидание для полной загрузки страницы
    await page.waitForTimeout(3000);

    // Получаем полный HTML код страницы
    const html = await page.content();

    console.log(`✅ Successfully fetched HTML for ${mpn} (${html.length} characters)`);

    return {
      ok: true,
      html,
      url: fullProductUrl
    };

  } catch (error) {
    console.error(`❌ Error fetching ChipDip page for ${mpn}:`, error.message);
    return { 
      ok: false, 
      error: `Failed to fetch page: ${error.message}` 
    };

  } finally {
    // Обязательно закрываем браузер
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.warn('Warning: Failed to close page:', e.message);
      }
    }
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.warn('Warning: Failed to close browser:', e.message);
      }
    }
  }
}
