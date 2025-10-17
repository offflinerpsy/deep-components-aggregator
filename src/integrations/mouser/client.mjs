import { postJSON } from '../../utils/fetchWithRetry.mjs';

const BASE = 'https://api.mouser.com/api/v1';

const post = (path, { apiKey, body }) => {
  const u = new URL(BASE + path);
  u.searchParams.set('apiKey', apiKey || '');
  return postJSON(u.toString(), body)
    .then(r => {
      const errors = r?.data?.Errors;
      if (Array.isArray(errors) && errors.length > 0) {
        // Treat Mouser embedded Errors array as failure
        const msg = errors.map(e => e?.Message || e?.Code || 'Unknown').join('; ');
        throw new Error(`Mouser API error: ${msg}`);
      }
      return r;
    })
    .catch(err => {
      // Pass through error (no try/catch swallowing) so orchestrator records provider error
      throw err;
    });
};

export const mouserSearchByKeyword = ({ apiKey, q, records = 50, startingRecord = 0 }) => {
  return post('/search/keyword', { apiKey, body: { SearchByKeywordRequest: { keyword: q, records, startingRecord } } });
};

export const mouserSearchByPartNumber = ({ apiKey, mpn }) => {
  return post('/search/partnumber', { apiKey, body: { SearchByPartNumberRequest: { MouserPartNumber: mpn } } })
    .then(r => {
      const parts = r?.data?.SearchResults?.Parts;
      if (Array.isArray(parts) && parts.length > 0) return r;
      return mouserSearchByKeyword({ apiKey, q: mpn, records: 25, startingRecord: 0 });
    });
};