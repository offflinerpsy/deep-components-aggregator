import { fetch } from 'undici';
const BASE = 'http://api.scraperapi.com/';

export async function fetchViaScraperAPI({ key, url, params = {} }) {
  const usp = new URLSearchParams({ api_key: key, url, ...params });
  const r = await fetch(`${BASE}?${usp.toString()}`, { redirect: 'follow' });
  if (!r.ok) throw new Error(`scraperapi ${r.status}`);
  return await r.text();
}
