// src/search/autocompleteOrchestrator.mjs
// Оркестратор подсказок от всех провайдеров
// Нормализация, параллельные вызовы, дедупликация, сортировка

import { mouserSuggest } from '../integrations/suggest/mouser.suggest.mjs';
import { digikeySuggest } from '../integrations/suggest/digikey.suggest.mjs';
import { farnellSuggest } from '../integrations/suggest/farnell.suggest.mjs';
import { tmeSuggest } from '../integrations/suggest/tme.suggest.mjs';

/**
 * @typedef {Object} SuggestRow
 * @property {string} mpn
 * @property {string} [title]
 * @property {string} [manufacturer]
 * @property {'mouser'|'digikey'|'farnell'|'tme'} source
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
 * @returns {Promise<SuggestRow[]>}
 */
async function fetchFromProviders(q) {
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
        providersHit: []
      }
    };
  }

  // Нормализация
  const normalized = normalizeQuery(q);

  // Fetch от провайдеров
  const allResults = await fetchFromProviders(normalized);

  // Дедупликация
  const deduplicated = deduplicateByMpn(allResults);

  // Сортировка
  const sorted = sortSuggestions(deduplicated, normalized);

  // Первые 20
  const top20 = sorted.slice(0, 20);

  const latencyMs = Date.now() - startTime;

  // Провайдеры, которые вернули результаты
  const providersHit = [...new Set(top20.map(r => r.source))];

  return {
    suggestions: top20,
    meta: {
      q: normalized,
      latencyMs,
      providersHit
    }
  };
}
