export function fetchViaScrapingBee({ key, url, timeout = 10000, render = false, premium = false, stealth = false, wait = null, solveCaptcha = false }) {
  const u = new URL('https://app.scrapingbee.com/api/v1');
  u.searchParams.set('api_key', key);
  u.searchParams.set('url', url);
  
  // JavaScript rendering
  if (render) u.searchParams.set('render_js', 'true');
  
  // Premium proxy (residential IPs) - bypasses most bot detection
  if (premium) u.searchParams.set('premium_proxy', 'true');
  
  // Stealth proxy - advanced bot detection bypass
  if (stealth) u.searchParams.set('stealth_proxy', 'true');
  
  // Solve CAPTCHA automatically (costs extra credits)
  if (solveCaptcha) u.searchParams.set('solve_captcha', 'true');
  
  // Wait for JS to load (milliseconds)
  if (wait) u.searchParams.set('wait', String(wait));
  
  // Don't block resources (load everything for full rendering)
  u.searchParams.set('block_resources', 'false');
  
  return fetch(u.toString(), { signal: AbortSignal.timeout(timeout) })
    .then(r => r.text().then(text => ({ ok: r.ok, status: r.status, text })))
    .catch(() => ({ ok: false, status: 0, text: '' }));
}
