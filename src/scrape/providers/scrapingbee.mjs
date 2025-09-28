import { fetch } from 'undici';

/**
 * Выполняет запрос через ScrapingBee
 * @param {string} url URL для скрапинга
 * @param {object} options Дополнительные опции
 * @param {number} options.timeoutMs Таймаут запроса в миллисекундах
 * @param {object} options.params Дополнительные параметры для ScrapingBee
 * @returns {Promise<object>} Результат запроса
 */
export const get = async (url) => {
  return await fetchHtml(url);
};

export async function fetchHtml(url, { timeoutMs = 12000, params = {} } = {}) {
  const key = process.env.SCRAPINGBEE_KEY;

  // Создаем URL для запроса
  const apiUrl = new URL('https://app.scrapingbee.com/api/v1/');
  apiUrl.searchParams.set('api_key', key);
  apiUrl.searchParams.set('url', url);
  apiUrl.searchParams.set('render_js', 'false'); // Дешевле без JS

  // Добавляем дополнительные параметры
  for (const [key, value] of Object.entries(params)) {
    apiUrl.searchParams.set(key, value);
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
