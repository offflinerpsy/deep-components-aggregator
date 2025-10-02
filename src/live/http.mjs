import express from 'express';
import { liveSearch } from '../scrape/live-search.mjs';
import { DiagnosticsCollector } from '../core/diagnostics.mjs';

const router = express.Router();

/**
 * SSE-эндпоинт для живого поиска
 */
router.get('/search', async (req, res) => {
  // Устанавливаем заголовки для SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Получаем параметры запроса
  const q = String(req.query.q || '').trim();
  const limit = parseInt(req.query.limit || '20', 10);
  const timeout = parseInt(req.query.timeout || '10000', 10);

  // Если запрос пустой, возвращаем ошибку
  if (!q) {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: 'Empty query' })}\n\n`);
    res.end();
    return;
  }

  // Создаем сборщик диагностики
  const diagnostics = new DiagnosticsCollector(q);
  diagnostics.addEvent('request', `Received live search request for "${q}"`);

  // Отправляем событие начала поиска
  res.write(`event: tick\n`);
  res.write(`data: ${JSON.stringify({ phase: 'start', q })}\n\n`);

  // Множество для отслеживания уникальных MPN
  const seenMpns = new Set();

  // Запускаем живой поиск
  await liveSearch({
    query: q,
    maxItems: limit,
    timeout,
    onItem: (item) => {
      // Проверяем, не видели ли мы уже этот MPN
      if (item.mpn && seenMpns.has(item.mpn)) {
        return;
      }

      // Добавляем MPN в множество
      if (item.mpn) {
        seenMpns.add(item.mpn);
      }

      // Отправляем событие с найденным элементом
      res.write(`event: item\n`);
      res.write(`data: ${JSON.stringify(item)}\n\n`);

      diagnostics.addEvent('item_sent', `Sent item ${item.mpn || 'unknown'} to client`);
    },
    onNote: (note) => {
      // Отправляем событие с заметкой
      res.write(`event: note\n`);
      res.write(`data: ${JSON.stringify(note)}\n\n`);

      diagnostics.addEvent('note_sent', `Sent note to client: ${note.message}`);
    },
    onError: (error) => {
      // Отправляем событие с ошибкой
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify(error)}\n\n`);

      diagnostics.addEvent('error_sent', `Sent error to client: ${error.error}`, { error: true });
    },
    onEnd: (result) => {
      // Отправляем событие завершения поиска
      res.write(`event: end\n`);
      res.write(`data: ${JSON.stringify(result)}\n\n`);

      diagnostics.addEvent('end_sent', `Sent end event to client: ${result.count} items`);
      diagnostics.save();

      // Завершаем соединение
      res.end();
    }
  });

  // Обрабатываем закрытие соединения
  req.on('close', () => {
    diagnostics.addEvent('connection_closed', 'Client closed connection');
    diagnostics.save();
  });
});

export default router;
