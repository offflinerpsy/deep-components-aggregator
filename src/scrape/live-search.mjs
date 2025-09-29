import { fetchHtmlCached } from './cache.mjs';
import { parseChipDipSearch } from '../parsers/chipdip/search.mjs';
import { parseChipDipSearchList } from '../parsers/chipdip/search-list.mjs';
import { parsePromelecSearch } from '../parsers/promelec/search.mjs';
import { DiagnosticsCollector } from '../core/diagnostics.mjs';
import { normCanon } from '../core/canon.mjs';
import { toRUB } from '../currency/cbr.mjs';
import { directFetch } from './direct-fetch.mjs';

/**
 * Выполняет поиск в реальном времени с использованием нескольких провайдеров
 * @param {object} options Параметры поиска
 * @param {string} options.query Поисковый запрос
 * @param {function} options.onItem Функция обратного вызова для каждого найденного элемента
 * @param {function} options.onNote Функция обратного вызова для заметок
 * @param {function} options.onError Функция обратного вызова для ошибок
 * @param {function} options.onEnd Функция обратного вызова при завершении
 * @param {number} options.timeout Общий таймаут в миллисекундах
 * @param {number} options.maxItems Максимальное количество элементов
 * @returns {Promise<object>} Результат поиска
 */
export async function liveSearch({
  query,
  onItem,
  onNote,
  onError,
  onEnd,
  timeout = 10000,
  maxItems = 20
}) {
  // Создаем сборщик диагностики
  const diagnostics = new DiagnosticsCollector(query);
  diagnostics.addEvent('start', `Starting live search for "${query}"`);

  // Определяем тип запроса (MPN или текстовый)
  const isMpnQuery = isMpnLikeQuery(query);
  diagnostics.addEvent('query_type', `Query type: ${isMpnQuery ? 'MPN' : 'text'}`);

  // Создаем таймер для общего таймаута
  const timeoutId = setTimeout(() => {
    diagnostics.addEvent('timeout', `Search timeout after ${timeout}ms`);
    onEnd && onEnd({ reason: 'timeout' });
  }, timeout);

  // Счетчик найденных элементов
  let itemCount = 0;

  // Множество для отслеживания уникальных MPN
  const seenMpns = new Set();

  // Функция для обработки найденного элемента
  const processItem = (item) => {
    // Проверяем, не превышен ли лимит
    if (itemCount >= maxItems) {
      return false;
    }

    // Проверяем, не видели ли мы уже этот MPN
    if (item.mpn && seenMpns.has(item.mpn)) {
      return false;
    }

    // Добавляем MPN в множество
    if (item.mpn) {
      seenMpns.add(item.mpn);
    }

    // Преобразуем цену в рубли, если нужно
    if (item.price && item.currency && item.currency !== 'RUB') {
      const rubPrice = toRUB(item.price, item.currency);
      if (rubPrice !== null) {
        item.price_rub = Math.round(rubPrice);
      }
    } else if (item.price && item.currency === 'RUB') {
      item.price_rub = item.price;
    }

    // Нормализуем продукт
    const normCanondItem = normCanon(item);

    // Вызываем обратный вызов
    onItem && onItem(normCanondItem);

    // Увеличиваем счетчик
    itemCount++;

    // Добавляем событие в диагностику
    diagnostics.addEvent('item', `Found item ${itemCount}: ${normCanondItem.mpn || 'unknown'}`);

    // Возвращаем true, если можно продолжать
    return itemCount < maxItems;
  };

  try {
    // Запускаем поиск в зависимости от типа запроса
    try {
      onNote && onNote({ message: "Выполняем поиск в реальном времени..." });
      diagnostics.addEvent('search_start', `Starting real-time search for "${query}"`);

      if (isMpnQuery) {
        // Для MPN запросов используем старый поиск
        const [chipDipResult, promelecResult] = await Promise.allSettled([
          searchChipDip(query, diagnostics, processItem),
          searchPromelec(query, diagnostics, processItem)
        ]);

        if (chipDipResult.status === 'rejected' && promelecResult.status === 'rejected') {
          onNote && onNote({ message: "Не удалось выполнить поиск ни в одном из источников" });
        }
      } else {
        // Для текстовых запросов используем новый поиск списков
        const [chipDipResult, promelecResult] = await Promise.allSettled([
          searchChipDipText(query, diagnostics, processItem),
          searchPromelec(query, diagnostics, processItem)
        ]);

        if (chipDipResult.status === 'rejected' && promelecResult.status === 'rejected') {
          onNote && onNote({ message: "Не удалось выполнить поиск ни в одном из источников" });
        }
      }
    } catch (error) {
      // Игнорируем ошибки, так как они уже обрабатываются в поисковых функциях
    }

    // Если не нашли ни одного элемента, отправляем заметку
    if (itemCount === 0) {
      diagnostics.addEvent('empty', 'No items found');
      onNote && onNote({ message: 'По вашему запросу ничего не найдено' });
    }
  } catch (error) {
    diagnostics.addEvent('error', `Search error: ${error.message}`);
    onError && onError({ error: error.message });
  } finally {
    // Очищаем таймер
    clearTimeout(timeoutId);

    // Сохраняем диагностику
    const tracePath = diagnostics.save();

    // Отправляем событие завершения
    onEnd && onEnd({
      count: itemCount,
      trace: tracePath,
      query
    });
  }

  return {
    count: itemCount,
    query
  };
}

/**
 * Определяет, похож ли запрос на MPN
 * @param {string} query Поисковый запрос
 * @returns {boolean} true если запрос похож на MPN
 */
function isMpnLikeQuery(query) {
  const trimmed = query.trim();

  // Проверяем на кириллические символы
  if (/[а-яё]/i.test(trimmed)) {
    return false;
  }

  // Проверяем на типичные паттерны MPN
  const mpnPatterns = [
    /^[A-Z0-9-]+$/,  // Только буквы, цифры и дефисы
    /^[A-Z]{2,4}[0-9]+/,  // 2-4 буквы + цифры
    /^[A-Z]+[0-9]+[A-Z]*[0-9]*/,  // Буквы + цифры + опциональные буквы/цифры
  ];

  return mpnPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Выполняет текстовый поиск в ChipDip
 * @param {string} query Поисковый запрос
 * @param {DiagnosticsCollector} diagnostics Сборщик диагностики
 * @param {function} processItem Функция обработки найденного элемента
 * @returns {Promise<void>}
 */
async function searchChipDipText(query, diagnostics, processItem) {
  try {
    diagnostics.addEvent('chipdip_text', `Searching ChipDip text results for "${query}"`);

    // Формируем URL для поиска
    const url = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(query)}`;

    // Получаем HTML
    const startTime = Date.now();
    const result = await fetchHtmlCached(url, { diagnostics });
    const fetchTime = Date.now() - startTime;

    // Добавляем информацию о провайдере в диагностику
    diagnostics.addProvider('chipdip_text', url, result.ok, fetchTime, result.usedKey);

    // Парсим результаты
    const html = result.html || '';
    const results = parseChipDipSearchList(html, 'https://www.chipdip.ru', query, diagnostics);

    // Добавляем событие в диагностику
    diagnostics.addEvent('chipdip_text', `Found ${results.length} text items on ChipDip`);

    // Обрабатываем каждый результат
    for (const result of results) {
      // Добавляем источник
      result.source = 'chipdip';

      // Обрабатываем элемент
      const shouldContinue = processItem(result);

      // Если достигли лимита, прекращаем обработку
      if (!shouldContinue) {
        break;
      }
    }
  } catch (error) {
    diagnostics.addEvent('chipdip_text', `ChipDip text search error: ${error.message}`, { error: true });
    throw error;
  }
}

/**
 * Выполняет поиск в ChipDip (MPN)
 * @param {string} query Поисковый запрос
 * @param {DiagnosticsCollector} diagnostics Сборщик диагностики
 * @param {function} processItem Функция обработки найденного элемента
 * @returns {Promise<void>}
 */
async function searchChipDip(query, diagnostics, processItem) {
  try {
    diagnostics.addEvent('chipdip', `Searching ChipDip for "${query}"`);

    // Формируем URL для поиска
    const url = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(query)}`;

    // Получаем HTML
    const startTime = Date.now();
    // Используем прямой запрос для отладки
    //const result = await directFetch(url);
    const result = await fetchHtmlCached(url, { diagnostics });
    const fetchTime = Date.now() - startTime;

    // Добавляем информацию о провайдере в диагностику
    diagnostics.addProvider('chipdip', url, result.ok, fetchTime, result.usedKey);

    // Парсим результаты
    const html = result.html || '';
    const results = parseChipDipSearch(html, 'https://www.chipdip.ru');

    // Добавляем событие в диагностику
    diagnostics.addEvent('chipdip', `Found ${results.length} items on ChipDip`);

    // Обрабатываем каждый результат
    for (const result of results) {
      // Добавляем источник
      result.source = 'chipdip';

      // Обрабатываем элемент
      const shouldContinue = processItem(result);

      // Если достигли лимита, прекращаем обработку
      if (!shouldContinue) {
        break;
      }
    }
  } catch (error) {
    diagnostics.addEvent('chipdip', `ChipDip search error: ${error.message}`, { error: true });
    throw error; // Пробрасываем ошибку дальше
  }
}

/**
 * Выполняет поиск в Promelec
 * @param {string} query Поисковый запрос
 * @param {DiagnosticsCollector} diagnostics Сборщик диагностики
 * @param {function} processItem Функция обработки найденного элемента
 * @returns {Promise<void>}
 */
async function searchPromelec(query, diagnostics, processItem) {
  try {
    diagnostics.addEvent('promelec', `Searching Promelec for "${query}"`);

    // Формируем URL для поиска
    const url = `https://www.promelec.ru/search/?text=${encodeURIComponent(query)}`;

    // Получаем HTML
    const startTime = Date.now();
    // Используем прямой запрос для отладки
    //const result = await directFetch(url);
    const result = await fetchHtmlCached(url, { diagnostics });
    const fetchTime = Date.now() - startTime;

    // Добавляем информацию о провайдере в диагностику
    diagnostics.addProvider('promelec', url, result.ok, fetchTime, result.usedKey);

    // Парсим результаты
    const html = result.html || '';
    const results = parsePromelecSearch(html, 'https://www.promelec.ru');

    // Добавляем событие в диагностику
    diagnostics.addEvent('promelec', `Found ${results.length} items on Promelec`);

    // Обрабатываем каждый результат
    for (const result of results) {
      // Обрабатываем элемент
      const shouldContinue = processItem(result);

      // Если достигли лимита, прекращаем обработку
      if (!shouldContinue) {
        break;
      }
    }
  } catch (error) {
    diagnostics.addEvent('promelec', `Promelec search error: ${error.message}`, { error: true });
    throw error; // Пробрасываем ошибку дальше
  }
}
