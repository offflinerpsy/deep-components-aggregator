import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { nanoid } from 'nanoid';

import { searchIndex } from '../core/search.mjs';
import { loadProduct } from '../core/store.mjs';
import { getRates } from '../currency/cbr.mjs';
import { search } from '../live/search.mjs';
import { ingestProduct } from '../live/ingest.mjs';
import { classifyQuery, QueryType } from '../live/query.mjs';

// Получаем путь к директории модуля
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// Создаем роутер
const router = express.Router();

// Карта задач
const pendingTasks = new Map();

/**
 * Подсчитывает количество записей в кэше
 * @returns {number} Количество записей
 */
function countCacheEntries() {
  const root = path.join(rootDir, 'data/cache/html');
  let count = 0;

  if (!fs.existsSync(root)) {
    return 0;
  }

  try {
    const level1 = fs.readdirSync(root, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const d1 of level1) {
      const p1 = path.join(root, d1.name);
      const level2 = fs.readdirSync(p1, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const d2 of level2) {
        const p2 = path.join(p1, d2.name);
        const files = fs.readdirSync(p2)
          .filter(f => f.endsWith('.html'));

        count += files.length;
      }
    }

    return count;
  } catch (error) {
    console.error(`Ошибка при подсчете записей в кэше: ${error.message}`);
    return 0;
  }
}

/**
 * Подсчитывает количество продуктов
 * @returns {number} Количество продуктов
 */
function countProducts() {
  const dir = path.join(rootDir, 'data/db/products');

  if (!fs.existsSync(dir)) {
    return 0;
  }

  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'));

    return files.length;
  } catch (error) {
    console.error(`Ошибка при подсчете продуктов: ${error.message}`);
    return 0;
  }
}

/**
 * Получает возраст индекса
 * @returns {number} Возраст индекса в миллисекундах или -1, если индекс не существует
 */
function getIndexAge() {
  const indexFile = path.join(rootDir, 'data/idx/search-index.json');

  if (!fs.existsSync(indexFile)) {
    return -1;
  }

  try {
    const stats = fs.statSync(indexFile);
    return Date.now() - stats.mtimeMs;
  } catch (error) {
    console.error(`Ошибка при получении возраста индекса: ${error.message}`);
    return -1;
  }
}

/**
 * Получает возраст курсов валют
 * @returns {number} Возраст курсов в миллисекундах или -1, если курсы не существуют
 */
function getRatesAge() {
  const ratesFile = path.join(rootDir, 'data/rates.json');

  if (!fs.existsSync(ratesFile)) {
    return -1;
  }

  try {
    const stats = fs.statSync(ratesFile);
    return Date.now() - stats.mtimeMs;
  } catch (error) {
    console.error(`Ошибка при получении возраста курсов валют: ${error.message}`);
    return -1;
  }
}

/**
 * Запускает фоновую задачу ингеста
 * @param {string} query Поисковый запрос
 * @param {string} taskId ID задачи
 */
function startBackgroundIngest(query, taskId) {
  const worker = spawn('node', ['scripts/ingest-chipdip-urls.mjs', '--query', query, '--limit', '5'], {
    detached: true,
    stdio: 'ignore'
  });

  worker.unref();

  // Обновляем статус задачи
  const task = pendingTasks.get(taskId);
  if (task) {
    task.status = 'processing';
    task.startedAt = Date.now();
    pendingTasks.set(taskId, task);
  }
}

/**
 * Создает диагностический файл
 * @param {string} query Поисковый запрос
 * @param {object} data Данные для записи
 * @returns {string} Путь к файлу
 */
function createDiagnosticFile(query, data) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(rootDir, '_diag', ts);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, 'trace.txt');
  let content = `QUERY: ${query}\n`;
  content += `TIMESTAMP: ${new Date().toISOString()}\n`;
  content += `TYPE: ${data.type || 'unknown'}\n\n`;

  if (data.error) {
    content += `ERROR: ${data.error}\n`;
  }

  if (data.links && data.links.length > 0) {
    content += `LINKS (${data.links.length}):\n`;
    data.links.forEach((link, i) => {
      content += `  ${i + 1}. ${link}\n`;
    });
  }

  fs.writeFileSync(filePath, content);
  return filePath;
}

// API эндпоинты

/**
 * GET /api/health
 * Проверка состояния сервера
 */
router.get('/health', async (req, res) => {
  try {
    const rates = await getRates();

    res.json({
      status: 'ok',
      uptime: process.uptime(),
      ts: Date.now(),
      counters: {
        products: countProducts(),
        cacheEntries: countCacheEntries(),
        pendingTasks: pendingTasks.size
      },
      ratesAge: rates.timestamp ? Date.now() - rates.timestamp : -1,
      ratesSource: rates.source,
      indexAge: getIndexAge()
    });
  } catch (error) {
    console.error(`Ошибка при проверке состояния: ${error.message}`);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/search
 * Поиск по индексу
 */
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();

  if (!q) {
    res.status(400).json({ error: 'Q_REQUIRED' });
    return;
  }

  try {
    // Классифицируем запрос
    const classified = classifyQuery(q);

    // Выполняем поиск по индексу
    const results = await searchIndex(q, { limit: 50 });
    const items = results.hits.map(h => h.document);

    // Если результатов мало или нет, запускаем фоновую задачу ингеста
    if (items.length < 3) {
      const taskId = nanoid(8);
      const task = { id: taskId, q, type: classified.type, ts: Date.now(), status: 'pending' };
      pendingTasks.set(taskId, task);

      // Создаем диагностический файл
      createDiagnosticFile(q, {
        type: classified.type,
        itemsCount: items.length
      });

      // Запускаем фоновую задачу ингеста
      startBackgroundIngest(q, taskId);

      // Если нет результатов, возвращаем статус pending
      if (items.length === 0) {
        res.json({
          status: 'pending',
          count: 0,
          items: [],
          taskId
        });
        return;
      }
    }

    res.json({
      status: 'ok',
      count: items.length,
      items
    });
  } catch (error) {
    console.error(`Ошибка при поиске: ${error.message}`);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/task/:id
 * Проверка статуса задачи
 */
router.get('/task/:id', (req, res) => {
  const id = req.params.id;
  const task = pendingTasks.get(id);

  if (!task) {
    res.status(404).json({ error: 'TASK_NOT_FOUND' });
    return;
  }

  res.json(task);
});

/**
 * GET /api/product
 * Получение информации о продукте
 */
router.get('/product', async (req, res) => {
  const mpn = String(req.query.mpn || '').trim();
  const url = String(req.query.url || '').trim();

  if (!mpn && !url) {
    res.status(400).json({ error: 'MPN_OR_URL_REQUIRED' });
    return;
  }

  try {
    // Если указан MPN, пытаемся загрузить продукт из базы
    if (mpn) {
      const product = loadProduct(mpn);

      if (product) {
        res.json(product);
        return;
      }
    }

    // Если указан URL или продукт не найден по MPN, выполняем ингест
    if (url) {
      const result = await ingestProduct(url);

      if (result.ok) {
        res.json(result.product);
        return;
      }

      res.status(500).json({
        status: 'error',
        error: result.error
      });
      return;
    }

    res.status(404).json({ error: 'NOT_FOUND' });
  } catch (error) {
    console.error(`Ошибка при получении продукта: ${error.message}`);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/live/search
 * Живой поиск с SSE
 */
router.get('/live/search', async (req, res) => {
  const q = String(req.query.q || '').trim();

  if (!q) {
    res.status(400).json({ error: 'Q_REQUIRED' });
    return;
  }

  // Устанавливаем заголовки для SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Генерируем ID для запроса
  const requestId = crypto.randomUUID();

  // Отправляем начальное сообщение
  res.write(':\n\n');
  res.write(`event: start\n`);
  res.write(`data: ${JSON.stringify({ id: requestId, query: q })}\n\n`);

  try {
    // Классифицируем запрос
    const classified = classifyQuery(q);

    // Выполняем поиск
    const searchResult = await search(q);

    // Создаем диагностический файл
    const diagFile = createDiagnosticFile(q, {
      type: classified.type,
      links: searchResult.links
    });

    // Если поиск успешен и есть ссылки
    if (searchResult.ok && searchResult.links && searchResult.links.length > 0) {
      // Отправляем сообщение о найденных ссылках
      res.write(`event: note\n`);
      res.write(`data: ${JSON.stringify({ message: `Найдено ${searchResult.links.length} ссылок` })}\n\n`);

      // Обрабатываем каждую ссылку
      for (const url of searchResult.links) {
        try {
          // Выполняем ингест продукта
          const result = await ingestProduct(url);

          // Если ингест успешен, отправляем продукт
          if (result.ok) {
            res.write(`event: item\n`);
            res.write(`data: ${JSON.stringify(result.product)}\n\n`);
          } else {
            // Если ингест не удался, отправляем сообщение об ошибке
            res.write(`event: note\n`);
            res.write(`data: ${JSON.stringify({ message: `Ошибка при обработке ${url}: ${result.error}` })}\n\n`);
          }
        } catch (error) {
          console.error(`Ошибка при обработке ${url}: ${error.message}`);
          res.write(`event: note\n`);
          res.write(`data: ${JSON.stringify({ message: `Ошибка при обработке ${url}: ${error.message}` })}\n\n`);
        }
      }
    } else {
      // Если поиск не удался или нет ссылок, отправляем сообщение
      res.write(`event: note\n`);
      res.write(`data: ${JSON.stringify({ message: searchResult.error || 'Ничего не найдено' })}\n\n`);

      // Отправляем диагностическое сообщение
      res.write(`event: diagnostic\n`);
      res.write(`data: ${JSON.stringify({ file: diagFile })}\n\n`);
    }

    // Отправляем сообщение о завершении
    res.write(`event: done\n`);
    res.write(`data: ${JSON.stringify({ id: requestId, query: q })}\n\n`);
  } catch (error) {
    console.error(`Ошибка при живом поиске: ${error.message}`);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  } finally {
    // Закрываем соединение
    res.end();
  }
});

/**
 * POST /api/order
 * Оформление заказа
 */
router.use(express.json());
router.post('/order', (req, res) => {
  const { mpn, qty, fio, email, messenger } = req.body || {};

  if (!mpn || !qty || !email) {
    res.status(400).json({ error: 'BAD_FORM' });
    return;
  }

  try {
    const id = Date.now().toString(36);
    const orderDir = path.join(rootDir, 'data/orders');
    const orderPath = path.join(orderDir, `${id}.json`);

    // Создаем директорию, если она не существует
    if (!fs.existsSync(orderDir)) {
      fs.mkdirSync(orderDir, { recursive: true });
    }

    // Сохраняем заказ
    fs.writeFileSync(orderPath, JSON.stringify({
      id,
      ts: Date.now(),
      mpn,
      qty,
      fio,
      email,
      messenger
    }, null, 2));

    res.json({ ok: true, id });
  } catch (error) {
    console.error(`Ошибка при оформлении заказа: ${error.message}`);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

export default router;
