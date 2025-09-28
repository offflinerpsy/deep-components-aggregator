import { fetchHTML } from './rotator.mjs';
import { parseChipDipSearch } from '../parsers/chipdip/search.mjs';
import { parsePromelecSearch } from '../parsers/promelec/search.mjs';
import { DiagnosticsCollector } from '../core/diagnostics.mjs';
import { normCanon } from '../core/canon.mjs';
import { toRUB } from '../currency/cbr.mjs';

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
      const rubPrice = toRUB({ amount: item.price, currency: item.currency });
      if (rubPrice !== null) {
        item.price_rub = Math.round(rubPrice);
      }
    } else if (item.price && item.currency === 'RUB') {
      item.price_rub = item.price;
    }
    
    // Вызываем обратный вызов
    onItem && onItem(item);
    
    // Увеличиваем счетчик
    itemCount++;
    
    // Добавляем событие в диагностику
    diagnostics.addEvent('item', `Found item ${itemCount}: ${item.mpn || 'unknown'}`);
    
    // Возвращаем true, если можно продолжать
    return itemCount < maxItems;
  };
  
  try {
    // Запускаем параллельный поиск в ChipDip
    const chipDipPromise = searchChipDip(query, diagnostics, processItem);
    
    // Запускаем параллельный поиск в Promelec
    const promelecPromise = searchPromelec(query, diagnostics, processItem);
    
    // Ждем завершения всех поисков
    await Promise.allSettled([chipDipPromise, promelecPromise]);
    
    // Если не нашли ни одного элемента, отправляем заметку
    if (itemCount === 0) {
      diagnostics.addEvent('empty', 'No items found');
      onNote && onNote({ message: 'No items found' });
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
 * Выполняет поиск в ChipDip
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
    const html = await fetchHTML(url);
    const fetchTime = Date.now() - startTime;
    
    // Добавляем информацию о провайдере в диагностику
    diagnostics.addProvider('chipdip', url, true, fetchTime);
    
    // Парсим результаты
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
    const html = await fetchHTML(url);
    const fetchTime = Date.now() - startTime;
    
    // Добавляем информацию о провайдере в диагностику
    diagnostics.addProvider('promelec', url, true, fetchTime);
    
    // Парсим результаты
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
  }
}
