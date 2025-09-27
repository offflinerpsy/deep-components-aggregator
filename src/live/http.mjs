import { candidates } from './candidates.mjs';
import { snapSearch } from './snapshot.mjs';

export async function handleLiveSearch(req, res, q) {
  // SSE заголовки уже установлены в server.js, не дублируем
  
  // Фаза 1: попытка live поиска с таймаутом
  res.write(`event: note\ndata: ${JSON.stringify({phase:"live_search_start"})}\n\n`);
  
  let liveResults = [];
  
  // Пытаемся получить live результаты с таймаутом 3 секунды
  const livePromise = new Promise(async (resolve) => {
    const { searchOEMsTrade } = await import('../../adapters/oemstrade.js');
    const results = await searchOEMsTrade(q);
    resolve(results || []);
  });
  
  const timeoutPromise = new Promise(resolve => {
    setTimeout(() => resolve([]), 3000);
  });
  
  liveResults = await Promise.race([livePromise, timeoutPromise]);
  
  // Фаза 2: отправляем результаты или фолбэк
  if (liveResults.length > 0) {
    res.write(`event: results\ndata: ${JSON.stringify({
      ok: true, 
      query: q, 
      count: liveResults.length, 
      items: liveResults
    })}\n\n`);
  } else {
    // Фолбэк на локальный поиск
    res.write(`event: note\ndata: ${JSON.stringify({phase:"fallback_to_local"})}\n\n`);
    const r = await fetch(`http://127.0.0.1:9201/api/search?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    res.write(`event: results\ndata: ${JSON.stringify(j)}\n\n`);
  }

  res.end();
}
