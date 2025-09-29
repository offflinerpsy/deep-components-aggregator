export function fetchViaScrapingBee({ key, url, timeout = 10000, render = false }) {
  const u = new URL('https://app.scrapingbee.com/api/v1');
  u.searchParams.set('api_key', key);
  u.searchParams.set('url', url);
  if (render) u.searchParams.set('render_js', 'true'); // по умолчанию не нужен
  return fetch(u.toString(), { signal: AbortSignal.timeout(timeout) })
    .then(r => r.text().then(text => ({ ok: r.ok, status: r.status, text })))
    .catch(() => ({ ok: false, status: 0, text: '' }));
}
