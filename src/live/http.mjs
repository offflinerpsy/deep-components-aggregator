import { candidates } from './candidates.mjs';
import { snapSearch } from './snapshot.mjs';

export async function handleLiveSearch(req, res, q) {
  // SSE заголовки
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // Фаза 1: старт
  res.write(`event: tick\ndata: ${JSON.stringify({phase:"start", q})}\n\n`);

  const items = [];

  // Фаза 2: live поиск
  const urls = await candidates(q);
  for (const url of urls) {
    const productUrls = await snapSearch(url, {limit: 5});
    // Здесь должен быть парсинг карточек из productUrls
    // Пока добавляем заглушки
    items.push({ url, title: "Live result", mpn: q });
  }

  // Фаза 3: фолбэк если пусто
  if (items.length === 0) {
    const r = await fetch(`http://127.0.0.1:9201/api/search?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    res.write(`event: results\ndata: ${JSON.stringify(j)}\n\n`);
  } else {
    res.write(`event: results\ndata: ${JSON.stringify({ok:true, query:q, count:items.length, items})}\n\n`);
  }

  res.end();
}
