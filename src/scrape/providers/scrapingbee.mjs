import {fetch} from 'undici';
import {pick} from './rotator.mjs';

export const get = async (url) => {
  const key = pick('scrapingbee'); if (!key) return {status: 'no-key'};
  const u = new URL('https://app.scrapingbee.com/api/v1/');
  u.searchParams.set('api_key', key);
  u.searchParams.set('url', url);
  u.searchParams.set('render_js', 'false');         // дешёвле без JS
  const r = await fetch(u, {method:'GET'});
  if (!r.ok) return {status: 'bad', code: r.status};
  const html = await r.text(); 
  return {status:'ok', html, provider:'scrapingbee'};
};