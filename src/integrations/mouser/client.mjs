import { postJSON } from '../../utils/fetchWithRetry.mjs';

const BASE = 'https://api.mouser.com/api/v1';

const post = (path, { apiKey, body }) => {
  const u = new URL(BASE + path);
  u.searchParams.set('apiKey', apiKey);
  return postJSON(u.toString(), body).catch(() => ({ ok: false, status: 0, data: {} }));
};

export const mouserSearchByKeyword = ({ apiKey, q, records = 50, startingRecord = 0 }) =>
  post('/search/keyword', { apiKey, body: { SearchByKeywordRequest: { keyword: q, records, startingRecord } } });

export const mouserSearchByPartNumber = ({ apiKey, mpn }) => {
  return post('/search/partnumber', { apiKey, body: { SearchByPartnumberRequest: { MouserPartNumber: mpn } } });
};