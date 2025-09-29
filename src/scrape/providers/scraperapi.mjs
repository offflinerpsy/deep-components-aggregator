/**
 * ScraperAPI провайдер для скрапинга
 * @module src/scrape/providers/scraperapi
 */

import { fetch } from 'undici';

/**
 * Получить HTML страницы через ScraperAPI
 * @param {string} url - URL страницы для скрапинга
 * @param {Object} [options] - Опции запроса
 * @param {number} [options.timeoutMs=12000] - Таймаут запроса в миллисекундах
 * @param {string} [options.key] - API ключ для ScraperAPI
 * @param {Object} [options.params={}] - Дополнительные параметры для ScraperAPI
 * @returns {Promise<Object>} Результат запроса
 */
export async function fetchHtml(url, { timeoutMs = 12000, key, params = {} } = {}) {
  if (!key) {
    return {
      ok: false,
      status: 'config_error',
      error: 'API ключ ScraperAPI не указан',
      provider: 'scraperapi'
    };
  }

  // Формируем URL для запроса
  const apiUrl = new URL('http://api.scraperapi.com');
  apiUrl.searchParams.set('api_key', key);
  apiUrl.searchParams.set('url', url);

  // Добавляем параметры по умолчанию
  apiUrl.searchParams.set('render', 'false'); // Без JS-рендеринга для экономии кредитов
  apiUrl.searchParams.set('keep_headers', 'true'); // Сохраняем заголовки для аутентичности
  apiUrl.searchParams.set('country_code', 'ru'); // Используем российские прокси

  // Параметры для обработки ошибок
  apiUrl.searchParams.set('retry_404', 'false'); // Не повторять запрос при 404
  apiUrl.searchParams.set('retry_num', '1'); // Одна повторная попытка при ошибке

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
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        provider: 'scraperapi',
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
        provider: 'scraperapi',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    return {
      ok: true,
      status: response.status,
      html,
      provider: 'scraperapi',
      usedKey: key?.slice(0, 8) + '...'
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        ok: false,
        status: 'timeout',
        provider: 'scraperapi',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    return {
      ok: false,
      status: 'error',
      error: error.message,
      provider: 'scraperapi',
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
