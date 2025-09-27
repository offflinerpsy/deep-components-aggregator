// src/live/http.mjs - обработчик SSE live search с прокси
import { proxyManager } from '../proxy/proxy-manager.js';

export async function handleLiveSearch(req, res, q) {
  console.log(`🔍 Live search started for: "${q}"`);
  
  // Фаза 1: Инициализация
  res.write(`event: note\ndata: ${JSON.stringify({phase:"init", query: q})}\n\n`);
  
  let totalResults = 0;
  const searchSources = ['oemstrade', 'chipdip', 'elitan']; // расширили список источников
  
  // Фаза 2: Поиск по источникам с прокси
  for (const source of searchSources) {
    res.write(`event: note\ndata: ${JSON.stringify({phase:"searching", source})}\n\n`);
    
    const results = await searchWithSource(source, q);
    
    if (results.length > 0) {
      console.log(`🔍 Found ${results.length} results from ${source}`);
      
      // Стримим каждый результат отдельно для мгновенного отображения
      for (const item of results) {
        res.write(`event: item\ndata: ${JSON.stringify(item)}\n\n`);
        totalResults++;
      }
    }
    
    // Небольшая пауза между источниками
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Фаза 3: Завершение
  if (totalResults > 0) {
    res.write(`event: note\ndata: ${JSON.stringify({phase:"complete", total: totalResults})}\n\n`);
  } else {
    // Фолбэк на локальный поиск
    res.write(`event: note\ndata: ${JSON.stringify({phase:"fallback_local"})}\n\n`);
    
    const fallbackResults = await searchLocal(q);
    if (fallbackResults.length > 0) {
      res.write(`event: results\ndata: ${JSON.stringify({
        ok: true,
        query: q,
        count: fallbackResults.length,
        items: fallbackResults
      })}\n\n`);
    }
  }
  
  res.write(`event: done\ndata: ${JSON.stringify({query: q, total: totalResults})}\n\n`);
  res.end();
}

// Поиск с конкретным источником через прокси
async function searchWithSource(source, query) {
  const startTime = Date.now();
  
  if (source === 'oemstrade') {
    const { searchOEMsTrade } = await import('../../adapters/oemstrade.js');
    
    // Устанавливаем прокси для этого источника
    const proxyUrl = await proxyManager.getBestProxy();
    if (proxyUrl) {
      process.env.HTTPS_PROXY = proxyUrl;
      console.log(`🔄 Using proxy for OEMsTrade: ${proxyUrl}`);
    }
    
    const results = await searchOEMsTrade(query);
    const elapsed = Date.now() - startTime;
    
    console.log(`⏱️ OEMsTrade search completed in ${elapsed}ms, found ${results.length} items`);
    return results || [];
  }
  
  if (source === 'chipdip') {
    const { searchChipDip } = await import('../adapters/chipdip.js');
    
    const proxyUrl = await proxyManager.getBestProxy();
    if (proxyUrl) {
      process.env.HTTPS_PROXY = proxyUrl;
      console.log(`🔄 Using proxy for ChipDip: ${proxyUrl}`);
    }
    
    const results = await searchChipDip(query);
    const elapsed = Date.now() - startTime;
    
    console.log(`⏱️ ChipDip search completed in ${elapsed}ms, found ${results.length} items`);
    return results || [];
  }
  
  if (source === 'elitan') {
    const { searchElitan } = await import('../adapters/elitan.js');
    
    const proxyUrl = await proxyManager.getBestProxy();
    if (proxyUrl) {
      process.env.HTTPS_PROXY = proxyUrl;
      console.log(`🔄 Using proxy for Elitan: ${proxyUrl}`);
    }
    
    const results = await searchElitan(query);
    const elapsed = Date.now() - startTime;
    
    console.log(`⏱️ Elitan search completed in ${elapsed}ms, found ${results.length} items`);
    return results || [];
  }
  
  return [];
}

// Локальный поиск как фолбэк
async function searchLocal(query) {
  const response = await fetch(`http://127.0.0.1:9201/api/search?q=${encodeURIComponent(query)}`);
  
  if (!response.ok) {
    console.log(`❌ Local search failed: ${response.status}`);
    return [];
  }
  
  const data = await response.json();
  return data.items || data.hits || [];
}
