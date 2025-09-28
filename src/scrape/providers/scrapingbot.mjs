import { fetch } from 'undici';
const BASE = 'http://api.scraping-bot.io/scrape';

export async function fetchViaScrapingBot({ key, url, params = {}, timeoutMs = 30000 }) {
  const usp = new URLSearchParams({ token: key, url, ...params });
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}?${usp.toString()}`, { redirect: 'follow', signal: ac.signal });
    if (!r.ok) throw new Error(`scrapingbot ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}
