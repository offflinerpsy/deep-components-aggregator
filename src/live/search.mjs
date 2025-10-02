import { nanoid } from 'nanoid';
import fs from 'node:fs';
import path from 'node:path';
import { fetchHtmlCached } from '../scrape/cache.mjs';
import { extractProductLinks } from '../parsers/chipdip/listing.mjs';
import { toCanon } from '../parsers/chipdip/product.mjs';
import { saveProduct } from '../core/store.mjs';
import { searchIndex } from '../core/search.mjs';
import { recordSearch } from '../db/sqlite.mjs';
import { addScrapeTask, addParseTask } from './queue.mjs';
import { classifyQuery, findChipDipUrl } from './query.mjs';

// Создание директории для диагностики
const diagDir = path.resolve('_diag');
try {
  fs.mkdirSync(diagDir, { recursive: true });
} catch (error) {
  console.error(`Error creating _diag directory: ${error.message}`);
}

/**
 * Создает файл диагностики для поискового запроса
 * @param {string} query Поисковый запрос
 * @param {string} searchId ID поиска
 * @returns {Object} Объект с путями к файлам диагностики
 */
const createDiagnosticFiles = (query, searchId) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionDir = path.join(diagDir, timestamp);
    fs.mkdirSync(sessionDir, { recursive: true });

    const traceFilePath = path.join(sessionDir, 'trace.txt');
    const traceStream = fs.createWriteStream(traceFilePath, { flags: 'a' });

    // Записываем начальную информацию
    traceStream.write(`query=${query}\n`);
    traceStream.write(`searchId=${searchId}\n`);
    traceStream.write(`timestamp=${timestamp}\n`);
    traceStream.write(`phase=start\n\n`);

    return {
      sessionDir,
      traceFilePath,
      traceStream,
      timestamp
    };
  } catch (error) {
    console.error(`Error creating diagnostic files: ${error.message}`);
    return null;
  }
};

/**
 * Записывает событие в файл диагностики
 * @param {fs.WriteStream} traceStream Поток для записи
 * @param {string} event Название события
 * @param {Object} data Данные события
 */
const logDiagnosticEvent = (traceStream, event, data) => {
  if (!traceStream) return;

  try {
    const timestamp = new Date().toISOString();
    traceStream.write(`[${timestamp}] ${event}\n`);

    if (data) {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      traceStream.write(`${dataStr}\n\n`);
    }
  } catch (error) {
    console.error(`Error writing diagnostic event: ${error.message}`);
  }
};

/**
 * Выполняет живой поиск по ChipDip
 * @param {Object} options Опции поиска
 * @returns {Promise<void>}
 */
export const liveSearch = async (options) => {
  const {
    query,
    maxItems = 10,
    timeout = 8000,
    onItem = () => {},
    onNote = () => {},
    onError = () => {},
    onEnd = () => {}
  } = options;

  // Генерируем уникальный ID для поиска
  const searchId = nanoid();

  // Создаем файлы для диагностики
  const diag = createDiagnosticFiles(query, searchId);

  // Классифицируем запрос
  const queryInfo = classifyQuery(query);
  logDiagnosticEvent(diag?.traceStream, 'query_classified', queryInfo);

  // Записываем поиск в базу данных
  recordSearch(searchId, query, queryInfo.type, 0);

  // Отправляем заметку о начале поиска
  onNote({ message: `Начинаем поиск по запросу "${query}" (тип: ${queryInfo.type})` });

  try {
    // Сначала проверяем локальный индекс
    const localResults = await searchIndex(query, { limit: maxItems });
    logDiagnosticEvent(diag?.traceStream, 'local_search', {
      count: localResults.count,
      hits: localResults.hits.length
    });

    if (localResults.count > 0) {
      onNote({ message: `Найдено ${localResults.count} товаров в локальном индексе.` });

      // Отправляем локальные результаты
      for (const item of localResults.hits) {
        onItem(item);
      }

      // Если нашли достаточно результатов, завершаем поиск
      if (localResults.count >= maxItems) {
        onNote({ message: `Поиск завершен. Найдено ${localResults.count} товаров в локальном индексе.` });
        onEnd({ count: localResults.count, source: 'local' });

        // Обновляем запись в базе данных
        recordSearch(searchId, query, queryInfo.type, localResults.count);

        // Закрываем диагностический файл
        if (diag?.traceStream) {
          logDiagnosticEvent(diag.traceStream, 'search_completed', {
            source: 'local',
            count: localResults.count
          });
          diag.traceStream.end();
        }

        return;
      }

      onNote({ message: `Продолжаем поиск в ChipDip для получения дополнительных результатов...` });
    } else {
      onNote({ message: `В локальном индексе ничего не найдено. Выполняем поиск в ChipDip...` });
    }

    // Определяем URL для поиска в ChipDip
    let targetUrl;
    if (queryInfo.type === 'chipdip_url') {
      targetUrl = queryInfo.url;
      logDiagnosticEvent(diag?.traceStream, 'using_direct_url', targetUrl);
    } else {
      targetUrl = findChipDipUrl(queryInfo.type, queryInfo.original);
      logDiagnosticEvent(diag?.traceStream, 'search_url_generated', targetUrl);
    }

    // Устанавливаем таймаут для поиска
    const searchTimeout = setTimeout(() => {
      onNote({ message: `Превышен таймаут поиска (${timeout}ms). Возвращаем текущие результаты.` });
      logDiagnosticEvent(diag?.traceStream, 'search_timeout', { timeout });

      // Обновляем запись в базе данных с текущим количеством найденных товаров
      recordSearch(searchId, query, queryInfo.type, foundItems);

      onEnd({ count: foundItems, source: 'timeout' });

      // Закрываем диагностический файл
      if (diag?.traceStream) {
        diag.traceStream.end();
      }
    }, timeout);

    // Счетчик найденных товаров
    let foundItems = localResults.count;

    // Выполняем поиск в ChipDip
    const scrapeTask = async () => {
      logDiagnosticEvent(diag?.traceStream, 'fetching_search_page', targetUrl);
      return fetchHtmlCached(targetUrl);
    };

    const searchResult = await addScrapeTask(scrapeTask, {
      url: targetUrl,
      id: `search-${searchId}`
    });

    if (!searchResult.ok) {
      logDiagnosticEvent(diag?.traceStream, 'search_page_fetch_error', {
        status: searchResult.status,
        error: searchResult.error
      });

      onNote({ message: `Не удалось получить результаты поиска: ${searchResult.status || searchResult.error}` });

      clearTimeout(searchTimeout);
      onEnd({ count: foundItems, source: 'error' });

      // Обновляем запись в базе данных
      recordSearch(searchId, query, queryInfo.type, foundItems);

      // Закрываем диагностический файл
      if (diag?.traceStream) {
        diag.traceStream.end();
      }

      return;
    }

    // Если это прямая ссылка на продукт, обрабатываем её
    if (queryInfo.type === 'chipdip_url') {
      logDiagnosticEvent(diag?.traceStream, 'processing_direct_product', targetUrl);

      const parseTask = async () => {
        return toCanon({ url: targetUrl, html: searchResult.html });
      };

      const product = await addParseTask(parseTask, {
        url: targetUrl,
        id: `parse-${searchId}`
      });

      if (product) {
        logDiagnosticEvent(diag?.traceStream, 'product_parsed', {
          mpn: product.mpn,
          brand: product.brand,
          title: product.title
        });

        // Сохраняем продукт
        const savedProduct = await saveProduct(product);

        if (savedProduct) {
          foundItems++;
          onItem(savedProduct);
          onNote({ message: `Найден товар: ${savedProduct.mpn || savedProduct.title}` });
        }
      } else {
        logDiagnosticEvent(diag?.traceStream, 'product_parse_failed', targetUrl);
        onNote({ message: `Не удалось обработать товар по ссылке: ${targetUrl}` });
      }
    } else {
      // Извлекаем ссылки на товары из результатов поиска
      const productLinks = extractProductLinks(searchResult.html);
      logDiagnosticEvent(diag?.traceStream, 'product_links_extracted', {
        count: productLinks.length,
        links: productLinks
      });

      if (productLinks.length === 0) {
        onNote({ message: `Поиск в ChipDip не дал результатов.` });
      } else {
        onNote({ message: `Найдено ${productLinks.length} потенциальных товаров в ChipDip.` });

        // Ограничиваем количество ссылок
        const limitedLinks = productLinks.slice(0, maxItems - foundItems);

        // Обрабатываем каждую ссылку на товар
        for (const productUrl of limitedLinks) {
          // Проверяем, не истек ли таймаут
          if (Date.now() - diag.timestamp > timeout) {
            logDiagnosticEvent(diag?.traceStream, 'processing_timeout', {
              processed: foundItems - localResults.count,
              remaining: limitedLinks.length - (foundItems - localResults.count)
            });
            break;
          }

          logDiagnosticEvent(diag?.traceStream, 'processing_product_link', productUrl);

          // Получаем HTML страницы товара
          const productScrapeTask = async () => {
            return fetchHtmlCached(productUrl);
          };

          const productResult = await addScrapeTask(productScrapeTask, {
            url: productUrl,
            id: `product-${nanoid(6)}`
          });

          if (!productResult.ok) {
            logDiagnosticEvent(diag?.traceStream, 'product_fetch_error', {
              url: productUrl,
              status: productResult.status,
              error: productResult.error
            });
            onNote({ message: `Не удалось получить страницу товара: ${productUrl}` });
            continue;
          }

          // Парсим страницу товара
          const productParseTask = async () => {
            return toCanon({ url: productUrl, html: productResult.html });
          };

          const product = await addParseTask(productParseTask, {
            url: productUrl,
            id: `parse-${nanoid(6)}`
          });

          if (!product) {
            logDiagnosticEvent(diag?.traceStream, 'product_parse_failed', productUrl);
            onNote({ message: `Не удалось обработать товар по ссылке: ${productUrl}` });
            continue;
          }

          logDiagnosticEvent(diag?.traceStream, 'product_parsed', {
            mpn: product.mpn,
            brand: product.brand,
            title: product.title
          });

          // Сохраняем продукт
          const savedProduct = await saveProduct(product);

          if (savedProduct) {
            foundItems++;
            onItem(savedProduct);
          } else {
            logDiagnosticEvent(diag?.traceStream, 'product_save_failed', {
              url: productUrl,
              mpn: product.mpn
            });
            onNote({ message: `Не удалось сохранить товар: ${product.mpn || product.title}` });
          }
        }
      }
    }

    // Отменяем таймаут, так как поиск завершен
    clearTimeout(searchTimeout);

    // Обновляем запись в базе данных
    recordSearch(searchId, query, queryInfo.type, foundItems);

    // Отправляем итоговое сообщение
    onNote({ message: `Поиск завершен. Всего найдено товаров: ${foundItems}` });
    onEnd({
      count: foundItems,
      source: 'complete',
      trace: diag ? `${diag.timestamp}/trace.txt` : null
    });

    // Закрываем диагностический файл
    if (diag?.traceStream) {
      logDiagnosticEvent(diag.traceStream, 'search_completed', {
        totalFound: foundItems,
        localFound: localResults.count,
        liveFound: foundItems - localResults.count
      });
      diag.traceStream.end();
    }
  } catch (error) {
    // Логируем ошибку
    console.error(`[LIVE SEARCH ERROR] for "${query}": ${error.message}`);
    logDiagnosticEvent(diag?.traceStream, 'fatal_error', {
      message: error.message,
      stack: error.stack
    });

    // Отправляем сообщение об ошибке
    onError({ message: `Произошла ошибка при поиске: ${error.message}` });

    // Обновляем запись в базе данных
    recordSearch(searchId, query, queryInfo.type, 0);

    // Закрываем диагностический файл
    if (diag?.traceStream) {
      diag.traceStream.end();
    }
  }
};

export default {
  liveSearch
};
