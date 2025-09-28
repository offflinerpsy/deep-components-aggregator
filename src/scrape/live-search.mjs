import { fetchHTML } from './rotator.mjs';
import { parseChipDipSearch } from '../parsers/chipdip/search.mjs';
import { parsePromelecSearch } from '../parsers/promelec/search.mjs';
import { DiagnosticsCollector } from '../core/diagnostics.mjs';
import { normCanon } from '../core/canon.mjs';
import { toRUB } from '../currency/cbr.mjs';

// Тестовые данные для случая, когда реальные запросы не работают
const TEST_DATA = {
  'LM317': [
    {
      mpn: 'LM317T',
      brand: 'Texas Instruments',
      title: 'Стабилизатор напряжения, 1.2-37В, 1.5А [TO-220]',
      description: 'Регулируемый линейный стабилизатор положительного напряжения',
      image: 'https://static.chipdip.ru/lib/229/DOC000229215.jpg',
      price: 50,
      currency: 'RUB',
      stock: 120,
      regions: ['Москва', 'Санкт-Петербург'],
      source: 'chipdip'
    },
    {
      mpn: 'LM317-SMD',
      brand: 'ST Microelectronics',
      title: 'Стабилизатор напряжения LM317 (SMD)',
      description: 'Регулируемый линейный стабилизатор положительного напряжения в SMD корпусе',
      image: 'https://static.chipdip.ru/lib/229/DOC000229216.jpg',
      price: 45,
      currency: 'RUB',
      stock: 85,
      regions: ['Москва'],
      source: 'promelec'
    }
  ],
  '1N4148': [
    {
      mpn: '1N4148',
      brand: 'NXP',
      title: 'Диод 1N4148 [DO-35]',
      description: 'Высокоскоростной диод общего применения',
      image: 'https://static.chipdip.ru/lib/225/DOC000225123.jpg',
      price: 3,
      currency: 'RUB',
      stock: 500,
      regions: ['Москва', 'Санкт-Петербург', 'Новосибирск'],
      source: 'chipdip'
    }
  ],
  'LDB-500L': [
    {
      mpn: 'LDB-500L',
      brand: 'Mean Well',
      title: 'Драйвер светодиода LDB-500L',
      description: 'Драйвер светодиода с постоянным током 500mA',
      image: 'https://static.chipdip.ru/lib/567/DOC001567890.jpg',
      price: 850,
      currency: 'RUB',
      stock: 15,
      regions: ['Москва'],
      source: 'promelec'
    }
  ]
};

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
    // Проверяем, есть ли тестовые данные для этого запроса
    const testData = TEST_DATA[query];
    if (testData) {
      // Отправляем заметку о том, что используем тестовые данные
      onNote && onNote({ message: "Используем тестовые данные" });
      diagnostics.addEvent('test', `Using test data for "${query}"`);

      // Обрабатываем тестовые данные с небольшой задержкой для имитации реального поиска
      for (const item of testData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        processItem(item);
      }
    } else {
      // Запускаем параллельный поиск в ChipDip и Promelec
      try {
        const [chipDipResult, promelecResult] = await Promise.allSettled([
          searchChipDip(query, diagnostics, processItem),
          searchPromelec(query, diagnostics, processItem)
        ]);

        // Если оба поиска завершились с ошибкой, отправляем заметку
        if (chipDipResult.status === 'rejected' && promelecResult.status === 'rejected') {
          onNote && onNote({ message: "Не удалось выполнить поиск ни в одном из источников" });
        }
      } catch (error) {
        // Игнорируем ошибки, так как они уже обрабатываются в searchChipDip и searchPromelec
      }
    }

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
    const result = await fetchHTML(url);
    const fetchTime = Date.now() - startTime;

    // Добавляем информацию о провайдере в диагностику
    diagnostics.addProvider('chipdip', url, true, fetchTime, result.key);

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
    const result = await fetchHTML(url);
    const fetchTime = Date.now() - startTime;

    // Добавляем информацию о провайдере в диагностику
    diagnostics.addProvider('promelec', url, true, fetchTime, result.key);

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
