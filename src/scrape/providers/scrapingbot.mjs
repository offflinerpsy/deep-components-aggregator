import {fetch} from 'undici';
import {pick} from './rotator.mjs';

export const get = async (url) => {
  const key = pick('scrapingbot'); if (!key) return {status:'no-key'};
  const u = new URL('https://api.scraping-bot.io/scrape');
  u.searchParams.set('token', key);
  u.searchParams.set('url', url);
  const r = await fetch(u);
  if (!r.ok) return {status:'bad', code:r.status};
  const html = await r.text();
  return {status:'ok', html, provider:'scrapingbot'};
};