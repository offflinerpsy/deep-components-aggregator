import { fetch } from 'undici';
const BASE = 'http://api.scraping-bot.io/scrape';

export async function fetchViaScrapingBot({ key, url, params = {} }) {
  const usp = new URLSearchParams({ token: key, url, ...params });
  const r = await fetch(`${BASE}?${usp.toString()}`, { redirect: 'follow' });
  if (!r.ok) throw new Error(`scrapingbot ${r.status}`);
  return await r.text();
}
