/**
 * HTTP-роуты для живого поиска
 * @module src/live/http
 */

import { nanoid } from 'nanoid';
import { searchIndex } from '../core/search.mjs';
import { search as chipDipSearch } from './strategies/chipdip-search.mjs';
import { ingestProduct } from './ingest.mjs';
import { recordSearch } from '../db/sqlite.mjs';
import { shouldThrottleQuery } from '../scrape/rotator.mjs';
import { createDiagnostics } from '../ops/diag.mjs';

/**
 * Обработчик для SSE-запросов живого поиска
 * @param {Object} req - HTTP-запрос
 * @param {Object} res - HTTP-ответ
 */
export async function liveSearchHandler(req, res) {
  // Устанавливаем заголовки для SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  // Получаем параметры запроса
  const query = String(req.query.q || '').trim();
  const limit = parseInt(req.query.limit || '20', 10);
  const timeout = parseInt(req.query.timeout || '10000', 10);
  
  // Проверяем наличие запроса
  if (!query) {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: 'Q_REQUIRED' })}\n\n`);
    res.end();
    return;
  }
  
  // Генерируем ID для поиска
  const searchId = nanoid();
  
  // Создаем объект для диагностики
  const diagnostics = createDiagnostics(query, { id: searchId });
  diagnostics.startPhase('init');
  
  // Отправляем начальное сообщение для поддержания соединения
  res.write(':\n\n');
  
  // Отправляем событие начала поиска
  res.write(`event: start\n`);
  res.write(`data: ${JSON.stringify({ query, searchId })}\n\n`);
  
  // Счетчик найденных элементов
  let foundItems = 0;
  
  // Множество для отслеживания уникальных MPN
  const seenMpns = new Set();
  
  // Функция для отправки события
  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Функция для обработки найденного элемента
  const processItem = (item) => {
    // Проверяем, не видели ли мы уже этот MPN
    if (item.mpn && seenMpns.has(item.mpn)) {
      return;
    }
    
    // Добавляем MPN в множество
    if (item.mpn) {
      seenMpns.add(item.mpn);
    }
    
    // Отправляем элемент
    sendEvent('item', item);
    foundItems++;
    
    // Отмечаем в диагностике
    diagnostics.itemEmitted(item);
  };
  
  // Функция для отправки заметки
  const sendNote = (message) => {
    sendEvent('note', { message });
    diagnostics.addEvent('note', message);
  };
  
  try {
    // Проверяем, не нужно ли ограничить запрос
    if (shouldThrottleQuery(query, 60000)) {
      sendNote(`Запрос "${query}" уже выполнялся недавно. Используем кэшированные результаты.`);
      diagnostics.addEvent('throttled', `Query "${query}" throttled`);
    }
    
    // Завершаем фазу инициализации
    diagnostics.endPhase('init');
    
    // Шаг A: Поиск в локальном индексе
    diagnostics.startPhase('local_search');
    sendNote(`Поиск в локальном индексе...`);
    
    const localResults = await searchIndex(query, { limit });
    
    diagnostics.addEvent('local_search_results', `Found ${localResults.count} items in local index`);
    diagnostics.endPhase('local_search');
    
    // Если есть локальные результаты, отправляем их
    if (localResults.count > 0) {
      sendNote(`Найдено ${localResults.count} товаров в локальном индексе.`);
      
      // Отправляем локальные результаты
      for (const item of localResults.hits) {
        processItem(item.document);
      }
    } else {
      sendNote(`В локальном индексе ничего не найдено. Выполняем поиск в ChipDip...`);
    }
    
    // Шаг B: Живой поиск в ChipDip
    diagnostics.startPhase('live_search');
    
    // Устанавливаем таймаут для поиска
    const searchTimeout = setTimeout(() => {
      sendNote(`Превышен таймаут поиска (${timeout}ms). Возвращаем текущие результаты.`);
      diagnostics.addEvent('timeout', `Search timeout after ${timeout}ms`);
      
      // Завершаем поиск
      finishSearch('timeout');
    }, timeout);
    
    // Функция для завершения поиска
    const finishSearch = (reason) => {
      // Отменяем таймаут, если он еще активен
      clearTimeout(searchTimeout);
      
      // Завершаем фазу живого поиска
      diagnostics.endPhase('live_search');
      
      // Обновляем запись в базе данных
      recordSearch(searchId, query, 'live', foundItems);
      
      // Отправляем событие завершения
      sendEvent('done', {
        count: foundItems,
        reason,
        trace: diagnostics.sessionDir
      });
      
      // Сохраняем диагностику
      diagnostics.save();
      
      // Закрываем соединение
      res.end();
    };
    
    // Выполняем поиск в ChipDip
    const chipDipResults = await chipDipSearch(query, { diagnostics });
    
    if (!chipDipResults.ok) {
      sendNote(`Не удалось выполнить поиск в ChipDip: ${chipDipResults.error}`);
      diagnostics.addEvent('chipdip_search_error', chipDipResults.error);
      
      // Если нет локальных результатов и поиск в ChipDip не удался, завершаем поиск
      if (localResults.count === 0) {
        finishSearch('error');
        return;
      }
    } else if (chipDipResults.links.length === 0) {
      sendNote(`Поиск в ChipDip не дал результатов.`);
      diagnostics.addEvent('chipdip_no_results', 'No results from ChipDip search');
      
      // Если нет локальных результатов и нет результатов в ChipDip, завершаем поиск
      if (localResults.count === 0) {
        finishSearch('no_results');
        return;
      }
    } else {
      // Есть ссылки на продукты ChipDip
      sendNote(`Найдено ${chipDipResults.links.length} потенциальных товаров в ChipDip.`);
      diagnostics.addEvent('chipdip_links', `Found ${chipDipResults.links.length} product links`);
      
      // Ограничиваем количество ссылок для обработки
      const maxLinks = Math.min(chipDipResults.links.length, limit - foundItems);
      const linksToProcess = chipDipResults.links.slice(0, maxLinks);
      
      // Обрабатываем каждую ссылку
      for (const productUrl of linksToProcess) {
        try {
          // Проверяем, не истек ли таймаут
          if (Date.now() - diagnostics.startTime > timeout * 0.9) {
            sendNote(`Превышен таймаут обработки. Прекращаем обработку ссылок.`);
            diagnostics.addEvent('processing_timeout', `Processing timeout after ${Date.now() - diagnostics.startTime}ms`);
            break;
          }
          
          // Получаем и обрабатываем продукт
          diagnostics.addEvent('processing_link', `Processing link: ${productUrl}`);
          const product = await ingestProduct(productUrl, { diagnostics });
          
          if (product) {
            processItem(product);
          } else {
            diagnostics.addEvent('product_processing_failed', `Failed to process product: ${productUrl}`);
          }
        } catch (error) {
          diagnostics.addEvent('product_processing_error', `Error processing product ${productUrl}: ${error.message}`);
          console.error(`[LIVE] Error processing product ${productUrl}:`, error);
        }
      }
    }
    
    // Завершаем поиск
    finishSearch('complete');
  } catch (error) {
    // Логируем ошибку
    console.error(`[LIVE] Error during live search for "${query}":`, error);
    diagnostics.addEvent('fatal_error', `Fatal error: ${error.message}`, { stack: error.stack });
    
    // Отправляем сообщение об ошибке
    sendEvent('error', { message: `Произошла ошибка при поиске: ${error.message}` });
    
    // Обновляем запись в базе данных
    recordSearch(searchId, query, 'live', foundItems);
    
    // Сохраняем диагностику
    diagnostics.save();
    
    // Закрываем соединение
    res.end();
  }
  
  // Обработчик закрытия соединения
  req.on('close', () => {
    console.log(`[LIVE] SSE connection closed for query "${query}"`);
    diagnostics.addEvent('connection_closed', 'SSE connection closed by client');
    diagnostics.save();
  });
}

export default {
  liveSearchHandler
};