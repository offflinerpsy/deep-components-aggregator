import { fetch } from 'undici';
const BASE = 'https://app.scrapingbee.com/api/v1/';

export async function fetchViaScrapingBee({ key, url, params = {}, timeoutMs = 30000 }) {
  const usp = new URLSearchParams({ api_key: key, url, ...params });
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}?${usp.toString()}`, { redirect: 'follow', signal: ac.signal });
    if (!r.ok) throw new Error(`scrapingbee ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}
