import { chromium } from 'playwright';

/**
 * Парсит информацию о компоненте с сайта ChipDip
 * @param {string} mpn - Номер компонента для поиска
 * @returns {Promise<{title: string, imageUrl: string}>} Информация о компоненте
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

    // Получаем URL изображения
    const imageSelector = 'img.product-gallery__image';
    const imageUrl = await page.$eval(imageSelector, el => el.src);

    return {
      title,
      imageUrl
    };
  } catch (error) {
    console.error('Ошибка при парсинге ChipDip:', error);
    throw new Error(`Ошибка при парсинге ChipDip: ${error.message}`);
  } finally {
    // Закрываем браузер в любом случае
    await browser.close();
  }
}
