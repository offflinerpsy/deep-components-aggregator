/**
 * ScrapingBee провайдер для скрапинга
 * @module src/scrape/providers/scrapingbee
 */

import { fetch } from 'undici';

/**
 * Получить HTML страницы через ScrapingBee
 * @param {string} url - URL страницы для скрапинга
 * @param {Object} [options] - Опции запроса
 * @param {number} [options.timeoutMs=12000] - Таймаут запроса в миллисекундах
 * @param {string} [options.key] - API ключ для ScrapingBee
 * @param {Object} [options.params={}] - Дополнительные параметры для ScrapingBee
 * @returns {Promise<Object>} Результат запроса
 */
export async function fetchHtml(url, { timeoutMs = 12000, key, params = {} } = {}) {
  if (!key) {
    return {
      ok: false,
      status: 'config_error',
      error: 'API ключ ScrapingBee не указан',
      provider: 'scrapingbee'
    };
  }

  // Формируем URL для запроса
  const apiUrl = new URL('https://app.scrapingbee.com/api/v1/');
  apiUrl.searchParams.set('api_key', key);
  apiUrl.searchParams.set('url', url);

  // Параметры по умолчанию для экономии кредитов и надежности
  apiUrl.searchParams.set('render_js', 'false'); // Без JS-рендеринга
  apiUrl.searchParams.set('premium_proxy', 'true'); // Используем премиум прокси
  apiUrl.searchParams.set('country_code', 'ru'); // Российские прокси
  apiUrl.searchParams.set('block_ads', 'true'); // Блокируем рекламу для ускорения
  apiUrl.searchParams.set('block_resources', 'true'); // Блокируем лишние ресурсы
  apiUrl.searchParams.set('stealth_proxy', 'true'); // Скрытый режим прокси

  // Добавляем дополнительные параметры
  for (const [paramKey, paramValue] of Object.entries(params)) {
    apiUrl.searchParams.set(paramKey, paramValue);
  }

  // Создаем контроллер для таймаута
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        provider: 'scrapingbee',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    const html = await response.text();

    // Проверка на наличие признаков блокировки или капчи
    if (
      html.includes('captcha') ||
      html.includes('CAPTCHA') ||
      html.includes('blocked') ||
      html.includes('Доступ ограничен')
    ) {
      return {
        ok: false,
        status: 'captcha_detected',
        provider: 'scrapingbee',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    return {
      ok: true,
      status: response.status,
      html,
      provider: 'scrapingbee',
      usedKey: key?.slice(0, 8) + '...'
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        ok: false,
        status: 'timeout',
        provider: 'scrapingbee',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    return {
      ok: false,
      status: 'error',
      error: error.message,
      provider: 'scrapingbee',
      usedKey: key?.slice(0, 8) + '...'
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Получить HTML страницы (алиас для fetchHtml)
 * @param {string} url - URL страницы для скрапинга
 * @param {Object} [options] - Опции запроса
 * @returns {Promise<Object>} Результат запроса
 */
export const get = async (url, options) => {
  return await fetchHtml(url, options);
};

export default { fetchHtml, get };
