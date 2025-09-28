import { fetch } from 'undici';
const BASE = 'https://app.scrapingbee.com/api/v1/';

export async function fetchViaScrapingBee({ key, url, params = {} }) {
  const usp = new URLSearchParams({ api_key: key, url, ...params });
  const r = await fetch(`${BASE}?${usp.toString()}`, { redirect: 'follow' });
  if (!r.ok) throw new Error(`scrapingbee ${r.status}`);
  return await r.text();
}
