// Без try/catch.
export function fetchViaScraperAPI({ key, url, timeout = 10000, country = 'ru', session = 0, render = false }) {
  const u = new URL('https://api.scraperapi.com');
  u.searchParams.set('api_key', key);
  u.searchParams.set('url', url);
  if (country) u.searchParams.set('country_code', country); // RU гео
  if (session) u.searchParams.set('session_number', String(session)); // пиннинг IP на пагинацию
  if (render) u.searchParams.set('render', 'true'); // по умолчанию false — нам не нужен JS-рендер
  return fetch(u.toString(), { signal: AbortSignal.timeout(timeout) })
    .then(r => r.text().then(text => ({ ok: r.ok, status: r.status, text })))
    .catch(() => ({ ok: false, status: 0, text: '' }));
}
