// scripts/research-sites.mjs - исследование реальной структуры сайтов для парсеров
import { chromium } from 'playwright';
import fs from 'fs';

const sites = [
  {
    name: 'ChipDip',
    searchUrl: 'https://www.chipdip.ru/search?searchtext=LM317',
    productUrl: 'https://www.chipdip.ru/product/lm317t'
  },
  {
    name: 'Elitan',
    searchUrl: 'https://www.elitan.ru/search.php?q=LM317',
    productUrl: 'https://www.elitan.ru/catalog/item/lm317'
  }
];

async function researchSite(site) {
  console.log(`\n🔍 Researching ${site.name}...`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Исследуем страницу поиска
  console.log(`📄 Loading search page: ${site.searchUrl}`);

  try {
    await page.goto(site.searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // ждем полной загрузки

    // Сохраняем скриншот
    await page.screenshot({ path: `reports/research-${site.name.toLowerCase()}-search.png`, fullPage: true });

    // Сохраняем HTML
    const html = await page.content();
    await fs.promises.writeFile(`reports/research-${site.name.toLowerCase()}-search.html`, html);

    // Анализируем структуру результатов поиска
    console.log(`📊 Analyzing search results structure for ${site.name}:`);

    // Ищем контейнеры товаров
    const productSelectors = [
      '.product-card', '.item-card', '.product-item', '.item',
      '.search-result', '.result-item', '.product', '.goods-item',
      '[class*="product"]', '[class*="item"]', '[class*="card"]'
    ];

    for (const selector of productSelectors) {
      const count = await page.$$eval(selector, els => els.length).catch(() => 0);
      if (count > 0) {
        console.log(`  ✅ Found ${count} elements with selector: ${selector}`);

        // Анализируем первый элемент
        const firstElement = await page.$(selector);
        if (firstElement) {
          const text = await firstElement.textContent();
          const html = await firstElement.innerHTML();

          console.log(`  📝 First element text: ${text?.slice(0, 100)}...`);
          console.log(`  🏷️ First element HTML structure:`);
          console.log(html?.slice(0, 500) + '...');
        }
      }
    }

    // Ищем ссылки на товары
    const links = await page.$$eval('a[href*="product"], a[href*="item"], a[href*="catalog"]',
      links => links.map(l => ({ href: l.href, text: l.textContent?.trim() }))
    );

    console.log(`🔗 Found ${links.length} product links:`);
    links.slice(0, 3).forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.text} -> ${link.href}`);
    });

    // Если есть товары, переходим на первый
    if (links.length > 0) {
      const firstProductUrl = links[0].href;
      console.log(`\n📦 Loading product page: ${firstProductUrl}`);

      await page.goto(firstProductUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Сохраняем скриншот и HTML товара
      await page.screenshot({ path: `reports/research-${site.name.toLowerCase()}-product.png`, fullPage: true });
      const productHtml = await page.content();
      await fs.promises.writeFile(`reports/research-${site.name.toLowerCase()}-product.html`, productHtml);

      // Анализируем структуру товара
      console.log(`📋 Analyzing product page structure:`);

      // Ищем основные элементы товара
      const productElements = {
        title: ['h1', '.product-title', '.title', '.name'],
        price: ['.price', '.cost', '.product-price', '[class*="price"]'],
        description: ['.description', '.desc', '.product-desc'],
        specs: ['.specs', '.characteristics', '.params', '.technical'],
        images: ['img[src*="product"]', '.gallery img', '.product-images img'],
        brand: ['.brand', '.manufacturer', '.vendor'],
        mpn: ['.mpn', '.partnumber', '.article', '.sku']
      };

      for (const [element, selectors] of Object.entries(productElements)) {
        for (const selector of selectors) {
          const found = await page.$(selector);
          if (found) {
            const text = await found.textContent();
            console.log(`  ✅ ${element}: ${selector} -> "${text?.slice(0, 100)}..."`);
            break;
          }
        }
      }
    }

  } catch (error) {
    console.log(`❌ Error researching ${site.name}: ${error.message}`);
  }

  await browser.close();
  console.log(`✅ Research completed for ${site.name}`);
}

// Исследуем все сайты
async function main() {
  console.log('🚀 Starting site research...');

  // Создаем папку для отчетов
  await fs.promises.mkdir('reports', { recursive: true });

  for (const site of sites) {
    await researchSite(site);
    await new Promise(resolve => setTimeout(resolve, 5000)); // пауза между сайтами
  }

  console.log('\n🎉 Site research completed! Check reports/ folder for screenshots and HTML files.');
}

main().catch(console.error);
