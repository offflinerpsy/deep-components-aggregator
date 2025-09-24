import { chromium } from 'playwright';

/**
 * Парсит детальную информацию о компоненте с сайта ChipDip
 * @param {string} mpn - Номер компонента для поиска
 * @returns {Promise<Object>} Информация о компоненте
 */
export async function parseChipDip(mpn) {
  const browser = await chromium.launch({
    headless: true // Запускаем в headless режиме для производительности
  });

  try {
    // Открываем новую страницу
    const page = await browser.newPage();

    // Переходим на страницу поиска
    const searchUrl = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(mpn)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle' });

    // Ждем и кликаем по первому результату
    const firstResultSelector = 'a.link.item-card__name';
    await page.waitForSelector(firstResultSelector);
    await page.click(firstResultSelector);

    // Ждем загрузки страницы товара
    await page.waitForSelector('h1.product-title');

    // Собираем все данные
    const data = await page.evaluate(() => {
      // Вспомогательная функция для безопасного извлечения текста
      const safeText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };

      // Заголовок
      const title = safeText('h1.product-title');

      // Описание
      const description = safeText('.product-description-text');

      // Изображения
      const images = Array.from(document.querySelectorAll('.product-gallery__thumb-image'))
        .map(img => img.getAttribute('data-big-image-src'))
        .filter(Boolean);

      // Datasheet'ы
      const datasheets = Array.from(document.querySelectorAll('.product-reference a[data-datasheet]'))
        .map(a => {
          const href = a.getAttribute('href');
          return href ? `https://www.chipdip.ru${href}` : null;
        })
        .filter(Boolean);

      // Технические характеристики
      const technical_specs = {};
      document.querySelectorAll('.product-params__table tr').forEach(row => {
        const name = row.querySelector('.product-params__name')?.textContent.trim();
        const value = row.querySelector('.product-params__value')?.textContent.trim();
        if (name && value) {
          technical_specs[name] = value;
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