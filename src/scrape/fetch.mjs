import { fetch } from 'undici';

/**
 * Выполняет HTTP-запрос с таймаутом
 * @param {string} url URL для запроса
 * @param {object} options Опции запроса
 * @returns {Promise<object>} Результат запроса
 */
export async function fetchWithTimeout(url, options = {}) {
  const { timeout = 10000, ...fetchOptions } = options;

  // Создаем контроллер для таймаута
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    console.log(`[FETCH] Requesting ${url}`);
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });

    clearTimeout(id);

    // Получаем текст ответа
    const text = await response.text();

    console.log(`[FETCH] Response from ${url}: ${response.status} (${text.length} bytes)`);

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      text
    };
  } catch (error) {
    clearTimeout(id);
    console.error(`[FETCH] Error fetching ${url}:`, error.message);

    return {
      ok: false,
      status: error.name === 'AbortError' ? 'timeout' : 'network_error',
      statusText: error.message,
      error
    };
  }
}
