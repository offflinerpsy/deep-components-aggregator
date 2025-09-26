import * as cheerio from 'cheerio';

/**
 * Преобразует относительный URL в абсолютный
 * @param {string} baseUrl Базовый URL страницы
 * @param {string} href Относительная ссылка
 * @returns {string} Абсолютный URL
 */
function toAbsoluteUrl(baseUrl, href) {
  if (!href) return '';
  try {
    return new URL(href, baseUrl).toString();
  } catch (error) {
    return href; // Возвращаем исходную ссылку если не удалось преобразовать
  }
}

/**
 * Основная функция парсинга HTML-контента страницы ChipDip
 * @param {string} html HTML-код страницы
 * @param {string} pageUrl URL страницы, с которой был взят HTML
 * @returns {{ok: true, doc: object}|{ok: false, reason: string}}
 */
export function chipdipHtmlToCanon(html, pageUrl) {
  if (!html || !pageUrl) {
    return { ok: false, reason: "Отсутствует HTML или URL страницы" };
  }

  try {
    const $ = cheerio.load(html);

    // Извлекаем основную информацию
    const title = $('h1[itemprop="name"]').first().text().trim();
    if (!title) {
      return { ok: false, reason: "Не найден заголовок товара" };
    }

    const description = $('div[itemprop="description"]').text().trim();

    // Извлекаем изображения
    const images = [];
    $('span#productphoto').each((_, el) => {
      const href = $(el).attr('data-fancybox-href');
      if (href) {
        images.push(toAbsoluteUrl(pageUrl, href));
      }
    });

    // Извлекаем документацию (PDF)
    const datasheets = [];
    $('a.download__link').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.toLowerCase().includes('.pdf')) {
        datasheets.push(toAbsoluteUrl(pageUrl, href));
      }
    });

    // Извлекаем технические характеристики
    const technical_specs = {};
    $('table#productparams tr').each((_, tr) => {
      const key = $(tr).find('td.product__param-name').text().trim();
      const value = $(tr).find('td.product__param-value').text().trim();
      if (key && value) {
        technical_specs[key] = value;
      }
    });

    // Извлекаем MPN
    const mpn = $('span[itemprop="mpn"]').first().text().trim();

    // Формируем результирующий документ
    const doc = {
      mpn: mpn || title.split(',')[0].trim(),
      title,
      description,
      images,
      datasheets,
      technical_specs,
      package: technical_specs['Корпус'] || '',
      manufacturer: technical_specs['Производитель'] || '',
      source: { name: "chipdip", url: pageUrl },
    };

    // Проверяем что есть полезный контент
    if (!doc.description && Object.keys(doc.technical_specs).length === 0) {
      return { ok: false, reason: "Нет полезного контента (описания или характеристик)" };
    }

    return { ok: true, doc };

  } catch (error) {
    return { ok: false, reason: `Ошибка парсинга: ${error.message}` };
  }
}
