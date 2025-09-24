import { chromium } from 'playwright';

/**
 * Парсит детальную информацию о компоненте с сайта ChipDip
 * @param {string} mpn - Номер компонента для поиска
 * @returns {Promise<Object>} Информация о компоненте
 */
export async function parseChipDip(mpn) {
  const browser = await chromium.launch();

  try {
    // Открываем новую страницу
    const page = await browser.newPage();

    // Переходим на страницу поиска
    const searchUrl = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(mpn)}`;
    await page.goto(searchUrl);

    // Ждем и кликаем по первому результату
    const firstResultSelector = 'a.link.item-card__name';
    await page.waitForSelector(firstResultSelector);
    await page.click(firstResultSelector);

    // Ждем загрузки страницы товара
    const titleSelector = 'h1.product-title';
    await page.waitForSelector(titleSelector);

    // Получаем заголовок
    const title = await page.$eval(titleSelector, el => el.textContent.trim());

    // Получаем описание
    let description = null;
    try {
      description = await page.$eval('div.product-description__text p', el => el.textContent.trim());
    } catch (e) {
      console.log('Описание не найдено');
    }

    // Получаем все изображения
    const images = await page.$$eval('img.product-gallery__thumb-image', 
      elements => elements.map(el => el.getAttribute('data-big-image-src')).filter(Boolean)
    );

    // Получаем все datasheet'ы
    const datasheets = await page.$$eval('a[data-datasheet]', 
      elements => elements.map(el => {
        const href = el.getAttribute('href');
        return href ? `https://www.chipdip.ru${href}` : null;
      }).filter(Boolean)
    );

    // Получаем технические характеристики
    const technical_specs = await page.$$eval('.product-params__table tr', 
      rows => {
        const specs = {};
        rows.forEach(row => {
          const name = row.querySelector('.product-params__name')?.textContent.trim();
          const value = row.querySelector('.product-params__value')?.textContent.trim();
          if (name && value) {
            specs[name] = value;
          }
        });
        return specs;
      }
    );

    // Формируем итоговый объект
    const result = {
      title,
      description,
      images: images.length > 0 ? images : null,
      datasheets: datasheets.length > 0 ? datasheets : null,
      technical_specs: Object.keys(technical_specs).length > 0 ? technical_specs : null
    };

    // Удаляем пустые поля
    Object.keys(result).forEach(key => {
      if (result[key] === null) {
        delete result[key];
      }
    });

    return result;

  } catch (error) {
    console.error('Ошибка при парсинге ChipDip:', error);
    throw new Error(`Ошибка при парсинге ChipDip: ${error.message}`);
  } finally {
    // Закрываем браузер в любом случае
    await browser.close();
  }
}