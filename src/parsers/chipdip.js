import { chromium } from 'playwright';

/**
 * Парсит детальную информацию о компоненте с сайта ChipDip
 * @param {string} mpn - Номер компонента для поиска
 * @returns {Promise<Object>} Информация о компоненте
 */
export async function parseChipDip(mpn) {
  const browser = await chromium.launch({
    headless: true, // Возвращаемся к headless режиму для API
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  try {
    // Открываем новую страницу
    const page = await browser.newPage();

    // Устанавливаем реалистичные заголовки
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Устанавливаем таймауты
    page.setDefaultTimeout(60000);

    // Переходим на страницу поиска
    const searchUrl = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(mpn)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    // Ждем загрузки страницы
    await page.waitForTimeout(5000);

    // Ищем результаты поиска
    await page.waitForSelector('a[href*="/product/"]', { timeout: 30000 });

    // Получаем все результаты поиска
    const results = await page.$$('a[href*="/product/"]');
    if (results.length === 0) {
      throw new Error('Не найдено результатов поиска');
    }

    // Кликаем по первому результату
    await results[0].click();

    // Ждем загрузки страницы товара
    await page.waitForSelector('h1', { timeout: 30000 });

    // Собираем все данные
    const data = await page.evaluate(() => {
      // Вспомогательная функция для безопасного извлечения текста
      const safeText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };

      // Заголовок
      const title = safeText('h1.product-title, h1');

      // Описание
      const description = safeText('.product-description-text, .product-description__text, .description');

      // Изображения
      const images = Array.from(document.querySelectorAll('img[src*="chipdip"], img[data-big-image-src]'))
        .map(img => img.getAttribute('data-big-image-src') || img.src)
        .filter(Boolean);

      // Datasheet'ы - исправляем дублирование URL
      const datasheets = Array.from(document.querySelectorAll('a[href*=".pdf"], a[data-datasheet]'))
        .map(a => {
          let href = a.getAttribute('href');
          if (href) {
            // Убираем дублирование домена
            if (href.startsWith('https://www.chipdip.ru')) {
              return href;
            } else if (href.startsWith('/')) {
              return `https://www.chipdip.ru${href}`;
            } else {
              return `https://www.chipdip.ru/${href}`;
            }
          }
          return null;
        })
        .filter(Boolean);

      // Технические характеристики
      const technical_specs = {};
      document.querySelectorAll('table tr, .params tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const name = cells[0].textContent.trim();
          const value = cells[1].textContent.trim();
          if (name && value) {
            technical_specs[name] = value;
          }
        }
      });

      return {
        title,
        description,
        images,
        datasheets,
        technical_specs
      };
    });

    // Удаляем пустые поля
    Object.keys(data).forEach(key => {
      if (data[key] === null || 
          (Array.isArray(data[key]) && data[key].length === 0) ||
          (typeof data[key] === 'object' && !Array.isArray(data[key]) && Object.keys(data[key]).length === 0)) {
        delete data[key];
      }
    });

    return data;

  } catch (error) {
    console.error('Ошибка при парсинге ChipDip:', error);
    throw new Error(`Ошибка при парсинге ChipDip: ${error.message}`);
  } finally {
    await browser.close();
  }
}