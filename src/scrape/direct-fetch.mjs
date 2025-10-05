import { fetch } from 'undici';

/**
 * Выполняет прямой HTTP-запрос без использования провайдеров скрапинга
 * Для отладки и тестирования
 * @param {string} url URL для запроса
 * @param {object} options Опции запроса
 * @returns {Promise<object>} Результат запроса
 */
export async function directFetch(url, options = {}) {
  const { timeout = 9500, headers = {} } = options;

  console.log(`[DIRECT] Fetching ${url} directly`);

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        ...headers
      },
      signal: controller.signal
    });

    clearTimeout(id);

    const html = await response.text();

    console.log(`[DIRECT] Response from ${url}: ${response.status} (${html.length} bytes)`);

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      html
    };
  } catch (error) {
    console.error(`[DIRECT] Error fetching ${url}:`, error);

    return {
      ok: false,
      status: error.name === 'AbortError' ? 'timeout' : 'network_error',
      statusText: error.message,
      error
    };
  }
}
