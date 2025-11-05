// src/search/autocompleteOrchestrator.mjs
// Оркестратор подсказок от всех провайдеров
// Нормализация, параллельные вызовы, дедупликация, сортировка, кэширование

import { mouserSuggest } from '../integrations/suggest/mouser.suggest.mjs';
import { digikeySuggest } from '../integrations/suggest/digikey.suggest.mjs';
import { farnellSuggest } from '../integrations/suggest/farnell.suggest.mjs';
import { tmeSuggest } from '../integrations/suggest/tme.suggest.mjs';
import { parseComponentSpecs, isSpecsSearch, specsToSearchQuery } from './parseComponentSpecs.mjs';
import { mouserSearchByKeyword } from '../integrations/mouser/client.mjs';

let dbInstance = null;

/**
 * Инициализация DB (вызывается из server.js)
 * @param {import('better-sqlite3').Database} db
 */
export function initAutocompleteDb(db) {
  dbInstance = db;
}

/**
 * Читает из кэша autocomplete
 * @param {string} query - нормализованный запрос
 * @returns {SuggestRow[] | null} - массив подсказок или null если не найдено/протухло
 */
function readFromCache(query) {
  if (!dbInstance) return null;

  try {
    const row = dbInstance.prepare(
      'SELECT results, created_at, ttl FROM autocomplete_cache WHERE query = ?'
    ).get(query);

    if (!row) return null;

    const now = Date.now();
    const expiryTime = row.created_at + (row.ttl * 1000);

    // Протухло?
    if (now > expiryTime) {
      // Удаляем протухшую запись
      dbInstance.prepare('DELETE FROM autocomplete_cache WHERE query = ?').run(query);
      return null;
    }

    // Парсим JSON
    return JSON.parse(row.results);
  } catch (e) {
    console.error('[autocomplete-cache] Read error:', e);
    return null;
  }
}

/**
 * Сохраняет в кэш autocomplete
 * @param {string} query - нормализованный запрос
 * @param {SuggestRow[]} suggestions - массив подсказок
 * @param {number} ttl - TTL в секундах (по умолчанию 3600 = 1 час)
 */
function writeToCache(query, suggestions, ttl = 3600) {
  if (!dbInstance) return;

  try {
    const results = JSON.stringify(suggestions);
    const created_at = Date.now();

    dbInstance.prepare(`
      INSERT OR REPLACE INTO autocomplete_cache (query, results, created_at, ttl)
      VALUES (?, ?, ?, ?)
    `).run(query, results, created_at, ttl);
  } catch (e) {
    console.error('[autocomplete-cache] Write error:', e);
  }
}

/**
 * @typedef {Object} SuggestRow
 * @property {string} mpn
 * @property {string} [title]
 * @property {string} [manufacturer]
 * @property {'mouser'|'digikey'|'farnell'|'tme'} source
 * @property {number} [min_price_rub] - Минимальная цена с наценкой (опционально, если провайдер вернул)
 */

/**
 * Нормализация запроса
 * @param {string} q
 * @returns {string}
 */
function normalizeQuery(q) {
  if (!q) return '';
  
  // Трим
  q = q.trim();
  
  // Если выглядит как MPN (только латиница/цифры/дефисы) → uppercase
  if (/^[A-Za-z0-9\-_.]{2,}$/.test(q)) {
    return q.toUpperCase();
  }
  
  // Иначе как есть
  return q;
}

/**
 * Дедупликация по MPN (case-insensitive)
 * @param {SuggestRow[]} rows
 * @returns {SuggestRow[]}
 */
function deduplicateByMpn(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const mpnLower = row.mpn.toLowerCase();
    if (seen.has(mpnLower)) return false;
    seen.add(mpnLower);
    return true;
  });
}

/**
 * Сортировка:
 * 1. По начальному совпадению префикса (startsWith)
 * 2. По длине MPN
 * 3. По приоритету источника (mouser > farnell > tme > digikey)
 * @param {SuggestRow[]} rows
 * @param {string} q
 * @returns {SuggestRow[]}
 */
function sortSuggestions(rows, q) {
  const qLower = q.toLowerCase();
  const sourcePriority = { mouser: 1, farnell: 2, tme: 3, digikey: 4 };
  
  return rows.sort((a, b) => {
    const aStartsWith = a.mpn.toLowerCase().startsWith(qLower);
    const bStartsWith = b.mpn.toLowerCase().startsWith(qLower);
    
    // Сначала те, что начинаются с префикса
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    // Потом по длине (короче = выше)
    if (a.mpn.length !== b.mpn.length) {
      return a.mpn.length - b.mpn.length;
    }
    
    // Потом по приоритету источника
    return (sourcePriority[a.source] || 99) - (sourcePriority[b.source] || 99);
  });
}

/**
 * Параллельный вызов провайдеров с троттлингом
 * Максимум 3 провайдера параллельно
 * @param {string} q
 * @param {boolean} isSpecs - Поиск по характеристикам?
 * @returns {Promise<SuggestRow[]>}
 */
async function fetchFromProviders(q, isSpecs = false) {
  // Если поиск по характеристикам — используем keyword search вместо suggest
  if (isSpecs) {
    return fetchByKeywordSearch(q);
  }

  // Приоритет: Mouser > Farnell > TME > DigiKey (DK — тяжелый из-за OAuth)
  const providers = [
    { name: 'mouser', fn: mouserSuggest },
    { name: 'farnell', fn: farnellSuggest },
    { name: 'tme', fn: tmeSuggest },
    { name: 'digikey', fn: digikeySuggest }
  ];

  // Первая волна: 3 провайдера
  const firstWave = providers.slice(0, 3).map(p => 
    p.fn(q).catch(() => [])
  );

  const firstResults = await Promise.all(firstWave);
  const combined = firstResults.flat();

  // Если уже >= 15 подсказок, пропускаем DigiKey
  if (combined.length >= 15) {
    return combined;
  }

  // Вторая волна: DigiKey (если нужно)
  await new Promise(resolve => setTimeout(resolve, 100)); // 100ms задержка
  const digiKeyResults = await digikeySuggest(q).catch(() => []);

  return [...combined, ...digiKeyResults];
}

/**
 * Поиск по характеристикам через keyword search
 * Возвращает только Mouser (у него лучший keyword search)
 * @param {string} q - Нормализованный запрос
 * @returns {Promise<SuggestRow[]>}
 */
async function fetchByKeywordSearch(q) {
  const apiKey = process.env.MOUSER_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await mouserSearchByKeyword({ 
      apiKey, 
      q, 
      records: 10,  // Топ-10 для автодополнения
      startingRecord: 0 
    });

    const parts = response?.data?.SearchResults?.Parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      return [];
    }

    // Мапим в SuggestRow формат
    return parts.slice(0, 10).map(part => ({
      mpn: part.MouserPartNumber || part.ManufacturerPartNumber || '',
      title: part.Description || '',
      manufacturer: part.Manufacturer || '',
      source: 'mouser'
    })).filter(r => r.mpn);

  } catch (err) {
    console.error('[autocomplete-specs] Mouser keyword search error:', err.message);
    return [];
  }
}

/**
 * Главная функция оркестратора
 * @param {string} q - Поисковый запрос
 * @returns {Promise<{suggestions: SuggestRow[], meta: Object}>}
 */
export async function orchestrateAutocomplete(q) {
  const startTime = Date.now();
  
  // Guard: пустой/короткий запрос
  if (!q || q.length < 2) {
    return {
      suggestions: [],
      meta: {
        q,
        latencyMs: 0,
        providersHit: [],
        cached: false,
        specsDetected: false
      }
    };
  }

  // Парсим характеристики
  const specs = parseComponentSpecs(q);
  const isSpecs = isSpecsSearch(specs);

  // Если это поиск по характеристикам — преобразуем в keyword запрос
  let normalized = normalizeQuery(q);
  if (isSpecs) {
    normalized = specsToSearchQuery(specs);
  }

  // Проверка кэша
  const cached = readFromCache(normalized);
  if (cached) {
    const latencyMs = Date.now() - startTime;
    const providersHit = [...new Set(cached.map(r => r.source))];
    
    return {
      suggestions: cached,
      meta: {
        q: normalized,
        originalQuery: q,
        latencyMs,
        providersHit,
        cached: true,
        specsDetected: isSpecs,
        specs: isSpecs ? specs : undefined
      }
    };
  }

  // Fetch от провайдеров
  const allResults = await fetchFromProviders(normalized, isSpecs);

  // Дедупликация
  const deduplicated = deduplicateByMpn(allResults);

  // Сортировка
  const sorted = sortSuggestions(deduplicated, normalized);

  // Первые 20
  const top20 = sorted.slice(0, 20);

  // Сохраняем в кэш (TTL 1 час)
  writeToCache(normalized, top20, 3600);

  const latencyMs = Date.now() - startTime;

  // Провайдеры, которые вернули результаты
  const providersHit = [...new Set(top20.map(r => r.source))];

  return {
    suggestions: top20,
    meta: {
      q: normalized,
      originalQuery: q,
      latencyMs,
      providersHit,
      cached: false,
      specsDetected: isSpecs,
      specs: isSpecs ? specs : undefined
    }
  };
}
