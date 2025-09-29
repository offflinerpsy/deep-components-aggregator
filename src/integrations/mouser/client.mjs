// Без try/catch. Используем undici (fetch стандарта WHATWG).
import { fetch } from 'undici';

const BASE = 'https://api.mouser.com/api/v1';

const json = (r) => r.text().then(t => {
  if (!t) return { };
  // Ответы у Mouser — JSON; делаем безопасный parse без try/catch:
  return Promise.resolve().then(() => JSON.parse(t)).catch(() => ({}));
});

const post = (path, { apiKey, body }) => {
  const u = new URL(BASE + path);
  u.searchParams.set('apiKey', apiKey);
  return fetch(u.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => json(r).then(data => ({ ok: r.ok, status: r.status, data })))
    .catch(() => ({ ok: false, status: 0, data: {} }));
};

// Поиск по ключевому слову (Search by Keyword). До 50 результатов/запрос.
export function mouserSearchByKeyword({ apiKey, q, records = 50, startingRecord = 0 }) {
  const body = {
    SearchByKeywordRequest: {
      keyword: q,
      records,
      startingRecord
      // Доп. опции (при необходимости): searchOptions, searchWithYourSignUpLanguage
      // Пример формата см. в API UI/доках.
    }
  };
  return post('/search/keyword', { apiKey, body });
}

// Поиск по номеру детали (Search by Part Number).
export function mouserSearchByPartNumber({ apiKey, mpn }) {
  // Встречаются два варианта имени корневого объекта в статьях/ответах:
  // 1) SearchByPartnumberRequest + MouserPartNumber
  // 2) SearchByPartRequest + MouserPartNumber
  // Делаем последовательный fallback без try/catch.
  const v1 = post('/search/partnumber', {
    apiKey,
    body: { SearchByPartnumberRequest: { MouserPartNumber: mpn } }
  });
  return v1.then(r => (r && r.ok && r.data && r.data.SearchResults) ? r
    : post('/search/partnumber', { apiKey, body: { SearchByPartRequest: { MouserPartNumber: mpn } } })
  );
}
