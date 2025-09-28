import {fetch} from 'undici';
import {pick} from './rotator.mjs';

export const get = async (url) => {
  const key = pick('scraperapi'); if (!key) return {status: 'no-key'};
  const u = new URL('http://api.scraperapi.com/');
  u.searchParams.set('api_key', key);
  u.searchParams.set('url', url);
  u.searchParams.set('country_code','ru');          // если допустимо
  const r = await fetch(u);
  if (!r.ok) return {status:'bad', code:r.status};
  const html = await r.text();
  return {status:'ok', html, provider:'scraperapi'};
};